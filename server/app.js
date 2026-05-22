import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Routes
import attendenceRoutes from "./routes/attendenceRoutes.js";
import faceRoutes from "./routes/faceRoutes.js";
import unknownRoutes from "./routes/unknownRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import adminRoutes from './routes/adminRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import storeRoutes from './routes/storeManagementRoutes.js';
import ManagerManagement from "./routes/managerRoutes.js";
import leaveRoutes from './routes/leaveRoutes.js';
import bonusRoutes from './routes/bonusRoutes.js';
import breakRoutes from './routes/breakRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import scratchCardRoutes from './routes/scratchCardRoutes.js';
import createRoutes from './routes/appRoutes/createTeam.js';
import ratingRoutes from './routes/appRoutes/scoring.js';
import helpAndIssueRoutesWeb from './routes/ticket.js';
import appAttendanceRoutes from './routes/appRoutes/attendance.js';
import leaveRoutesEmployee from './routes/appRoutes/leaveRoutes.js';
import helpAndIssueRoutes from './routes/appRoutes/helpAndIssueRoutes.js';
import scratchCardRoutesApp from './routes/appRoutes/scratchCard.js';
import faceRecognitionRoutes from './routes/appRoutes/faceRecognition.js';
import settingsRoutes from './routes/settingsRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import presenceRoutes from './routes/presenceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// =========================================================
// 🌐 CORS Configuration
// =========================================================
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5001'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token']
};
app.use(cors(corsOptions));

// =========================================================
// 📦 Middleware — ORDER IS CRITICAL, do not rearrange
// =========================================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));


// =========================================================
// 📡 Request Logging
// =========================================================
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || 'no-content-type';
  console.log(`📡 ${req.method} ${req.path} [Type: ${contentType}]`);
  next();
});

// =========================================================
// 📁 Static Files
// =========================================================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =========================================================
// 🛣️ API Routes
// =========================================================
app.use("/api/attendance", attendenceRoutes);
app.use("/api/faces", faceRoutes);
app.use("/api/unknown", unknownRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/manager', ManagerManagement);
app.use('/api/leave', leaveRoutes);
app.use('/api/bonus', bonusRoutes);
app.use('/api/break', breakRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/scratchcards', scratchCardRoutes);
app.use('/api/tickets', helpAndIssueRoutesWeb);
app.use('/api/settings', settingsRoutes);
app.use('/api/room', roomRoutes);
app.use('/api/presence', presenceRoutes);

// App Routes
app.use('/api/createTeam', createRoutes);
app.use('/api/rating', ratingRoutes);
app.use('/api/app-attendance', appAttendanceRoutes);
app.use('/api/app-leave', leaveRoutesEmployee);
app.use('/api/help-issue', helpAndIssueRoutes);
app.use('/api/scratch-cards', scratchCardRoutesApp);
app.use('/api/app-faces', faceRecognitionRoutes);
app.use('/api/notifications', notificationRoutes);

// DIAGNOSTIC ROUTE
app.get('/api/debug-unknowns', async (req, res) => {
  try {
    const UnknownPerson = (await import("./models/UnkownPerson.js")).default;
    const all = await UnknownPerson.find().sort({ createdAt: -1 }).limit(10);
    res.json({
      count: await UnknownPerson.countDocuments(),
      lastTen: all
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// =========================================================
// ❌ Error Handler — always last
// =========================================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

export default app;