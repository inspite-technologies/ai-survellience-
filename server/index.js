require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
const { spawn } = require("child_process");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

    // Drop old conflicting index (run once then can be removed)
    try {
      await mongoose.connection.db.collection('attendances').dropIndex('employeeId_1_date_1');
      console.log("✅ Dropped old index");
    } catch (e) {
      // Index might not exist, that's okay
    }
  })
  .catch(err => console.error("❌ MongoDB Error:", err));

// ==========================================
// SCHEMAS
// ==========================================

const faceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  descriptor: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now }
});

const Face = mongoose.model('Face', faceSchema, 'employees');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Face',
    required: true,
    index: true
  },
  employeeName: {
    type: String,
    required: true,
    index: true
  },
  timeIn: {
    type: Date,
    default: Date.now,
    index: true
  },
  event: {
    type: String,
    default: 'Door Entry'
  }
}, {
  timestamps: true
});

attendanceSchema.index({ userId: 1, timeIn: -1 });
attendanceSchema.index({ employeeName: 1, timeIn: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');

// ==========================================
// REAL-TIME HD STREAMING
// ==========================================
const CAMERA_CONFIG = {
  rtspUrl: "rtsp://admin:qwerty%409544@192.168.1.2:554/cam/realmonitor?channel=4&subtype=0",
  useTestPattern: false
};

let ffmpeg = null;
const activeClients = new Set();

function startFFmpeg() {
  if (ffmpeg) {
    console.log("⚠️ FFmpeg already running");
    return;
  }

  console.log("🎬 Starting HD stream...");

  let ffmpegArgs;

  if (CAMERA_CONFIG.useTestPattern) {
    ffmpegArgs = [
      "-f", "lavfi",
      "-i", "testsrc=size=1280x720:rate=25",
      "-f", "mpegts",
      "-codec:v", "mpeg1video",
      "-q:v", "2",
      "-s", "1280x720",
      "-b:v", "3000k",
      "-bf", "0",
      "-r", "25",
      "-an",
      "-"
    ];
    console.log("📺 Using TEST PATTERN (720p HD)");
  } else {
    // REAL CAMERA - High Quality MPEG1
    ffmpegArgs = [
      "-rtsp_transport", "tcp",
      "-fflags", "nobuffer",
      "-flags", "low_delay",
      "-err_detect", "ignore_err",
      "-i", CAMERA_CONFIG.rtspUrl,
      "-f", "mpegts",
      "-codec:v", "mpeg1video",
      "-q:v", "2",              // High quality (1=best, 31=worst)
      "-s", "1280x720",         // 720p HD
      "-b:v", "3000k",          // Higher bitrate for better quality
      "-maxrate", "3000k",
      "-bufsize", "1000k",
      "-r", "25",
      "-g", "50",
      "-bf", "0",
      "-an",
      "-"
    ];
    console.log("📹 Converting HEVC→MPEG1 HD (720p @ 25fps, 3Mbps)");
  }

  ffmpeg = spawn("ffmpeg", ffmpegArgs);

  ffmpeg.stdout.on("data", (data) => {
    // Broadcast to all connected clients immediately
    activeClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(data);
        } catch (e) {
          console.error("Send error:", e);
        }
      }
    });
  });

  let firstLog = true;
  ffmpeg.stderr.on("data", (data) => {
    const output = data.toString();
    if (output.includes("frame=") && firstLog) {
      console.log("✅ 720p HD stream active!");
      firstLog = false;
    }
    // Only log real errors, not HEVC warnings
    if (output.includes("error") && !output.includes("Could not find ref")) {
      console.error("FFmpeg:", output.split('\n')[0]);
    }
  });

  ffmpeg.on("close", (code) => {
    console.log(`❌ FFmpeg stopped (exit code: ${code})`);
    ffmpeg = null;

    if (activeClients.size > 0) {
      console.log("🔄 Restarting FFmpeg...");
      setTimeout(startFFmpeg, 1000);
    }
  });

  ffmpeg.on("error", (err) => {
    console.error("❌ FFmpeg error:", err);
    ffmpeg = null;
  });
}

function stopFFmpeg() {
  if (ffmpeg) {
    console.log("🛑 Stopping FFmpeg...");
    ffmpeg.kill("SIGTERM");
    ffmpeg = null;
  }
}

// WebSocket connection handler
wss.on("connection", (ws) => {
  console.log("📡 Client connected");
  activeClients.add(ws);

  if (!ffmpeg) {
    startFFmpeg();
  }

  ws.on("close", () => {
    console.log("📡 Client disconnected");
    activeClients.delete(ws);

    if (activeClients.size === 0) {
      stopFFmpeg();
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    activeClients.delete(ws);
  });
});

// ==========================================
// API ROUTES
// ==========================================

app.get("/api/faces", async (req, res) => {
  try {
    const faces = await Face.find({}, 'name descriptor createdAt');
    console.log(`📋 Retrieved ${faces.length} faces`);
    res.json(faces);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/faces/save", async (req, res) => {
  try {
    const { name, descriptor } = req.body;

    if (!name || !descriptor) {
      return res.status(400).json({
        success: false,
        message: "Name and descriptor required"
      });
    }

    const existing = await Face.findOne({ name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Face already exists"
      });
    }

    const face = new Face({ name, descriptor });
    await face.save();

    console.log(`✅ Saved: ${name}`);
    res.json({
      success: true,
      message: "Face saved",
      userId: face._id
    });
  } catch (err) {
    console.error("❌ Save error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/faces/:id", async (req, res) => {
  try {
    const face = await Face.findByIdAndDelete(req.params.id);
    if (!face) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    console.log(`🗑️ Deleted: ${face.name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/attendance/in", async (req, res) => {
  try {
    const { userId, employeeName } = req.body;

    if (!userId || !employeeName) {
      return res.status(400).json({
        success: false,
        message: "userId and employeeName required"
      });
    }

    const employee = await Face.findById(userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    const attendanceLog = new Attendance({
      userId,
      employeeName,
      event: 'Door Entry'
    });

    await attendanceLog.save();
    const totalEntries = await Attendance.countDocuments({ userId });

    console.log(`
╔═══════════════════════════════════════════╗
║  🚪 DOOR ENTRY LOGGED                     ║
╠═══════════════════════════════════════════╣
║  👤 Name:    ${employeeName.padEnd(27)} ║
║  🆔 UserID:  ${userId.toString().slice(0, 24)}║
║  ⏰ Time:    ${attendanceLog.timeIn.toLocaleString().padEnd(27)}║
║  🔢 Entry #: ${totalEntries.toString().padEnd(27)} ║
╚═══════════════════════════════════════════╝
    `);

    res.json({
      success: true,
      message: "Door opened - Entry logged",
      data: {
        userId: attendanceLog.userId,
        employeeName: attendanceLog.employeeName,
        timeIn: attendanceLog.timeIn,
        entryNumber: totalEntries
      }
    });

  } catch (err) {
    console.error("❌ Attendance log error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/attendance/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const entries = await Attendance.find({ userId }).sort({ timeIn: -1 }).limit(100);
    const totalEntries = await Attendance.countDocuments({ userId });

    res.json({ success: true, totalEntries, entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/attendance/logs", async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.timeIn = {};
      if (startDate) query.timeIn.$gte = new Date(startDate);
      if (endDate) query.timeIn.$lte = new Date(endDate);
    }

    const logs = await Attendance.find(query)
      .sort({ timeIn: -1 })
      .limit(parseInt(limit))
      .populate('userId', 'name');

    const total = await Attendance.countDocuments(query);

    res.json({ success: true, total, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/attendance/today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const entries = await Attendance.find({
      timeIn: { $gte: today, $lt: tomorrow }
    }).sort({ timeIn: -1 }).populate('userId', 'name');

    const groupedByEmployee = {};
    entries.forEach(entry => {
      const name = entry.employeeName;
      if (!groupedByEmployee[name]) {
        groupedByEmployee[name] = {
          userId: entry.userId,
          employeeName: name,
          entries: [],
          count: 0
        };
      }
      groupedByEmployee[name].entries.push({
        timeIn: entry.timeIn,
        event: entry.event
      });
      groupedByEmployee[name].count++;
    });

    res.json({
      success: true,
      date: today.toDateString(),
      totalEntries: entries.length,
      uniqueEmployees: Object.keys(groupedByEmployee).length,
      byEmployee: groupedByEmployee,
      allEntries: entries
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/attendance/stats", async (req, res) => {
  try {
    const totalLogs = await Attendance.countDocuments();
    const uniqueEmployees = await Attendance.distinct('userId');

    const frequentEntries = await Attendance.aggregate([
      { $group: { _id: '$employeeName', count: { $sum: 1 }, lastEntry: { $max: '$timeIn' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      stats: {
        totalEntries: totalLogs,
        uniqueEmployees: uniqueEmployees.length,
        topEmployees: frequentEntries
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    streaming: ffmpeg !== null,
    activeClients: activeClients.size,
    codec: "MPEG1 HD",
    source: CAMERA_CONFIG.useTestPattern ? "Test Pattern" : "RTSP Camera",
    resolution: "1280x720 @ 25fps",
    bitrate: "3000 kbps",
    streamType: "WebSocket Real-Time",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = 5001;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║   🚀 DOOR ENTRY SYSTEM - HD Real-Time Stream      ║
╠════════════════════════════════════════════════════╣
║   🌐 Server:        http://localhost:${PORT}          ║
║   📡 WebSocket:     ws://localhost:${PORT}            ║
║   🎬 Codec:         MPEG1 HD                       ║
║   📊 Resolution:    1280x720 @ 25fps               ║
║   💾 Bitrate:       3000 kbps (High Quality)       ║
║   ⚡ Latency:       <1 second (Real-Time)          ║
║   🎯 Source:        ${CAMERA_CONFIG.useTestPattern ? 'Test Pattern' : 'RTSP Camera'}                     ║
║   🔐 Database:      MongoDB                        ║
╚════════════════════════════════════════════════════╝

✅ Server ready - connect at http://localhost:5173
  `);
});

process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  stopFFmpeg();
  mongoose.connection.close();
  process.exit(0);
});