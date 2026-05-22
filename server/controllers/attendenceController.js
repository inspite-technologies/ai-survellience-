import Attendance from "../models/attendenceSchema.js";
import DailySummary from "../models/DailySummary.js";
import Face from "../models/faceSchema.js";
import Rating from "../models/ratingSchema.js";
import LeaveManagement from "../models/leaveSchema.js";
import { detectBreakType, getBreakEmoji, getBreakLabel } from "../utils/breakUtils.js";
import {
  setPendingOut,
  getPendingOut,
  resetPendingOut,
} from "../utils/redisClient.js";
import { getCameraROI, isInsideROI } from "../config/cameraConfig.js";


// LAST EVENT
export const getLastAttendance = async (req, res) => {
  try {
    const { userId } = req.params;

    const lastRecord = await Attendance.findOne({ userId })
      .sort({ createdAt: -1 })
      .limit(1);

    if (!lastRecord) {
      return res.json({
        success: true,
        lastEvent: null,
        message: "First time entry",
      });
    }

    const minutesSince =
      (Date.now() - new Date(lastRecord.createdAt)) / 60000;

    if (minutesSince < 5) {
      return res.json({
        success: true,
        lastEvent: "cooldown",
        message: "Too soon - ignoring detection (5 min cooldown)",
        minutesSince: minutesSince.toFixed(1),
      });
    }

    res.json({
      success: true,
      lastEvent: lastRecord.event,
      time:
        lastRecord.event === "in"
          ? lastRecord.timeIn
          : lastRecord.timeOut,
      minutesSince: minutesSince.toFixed(1),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// IN
export const attendanceIn = async (req, res) => {
  try {
    const { userId, employeeName } = req.body;

    if (!userId || !employeeName) {
      return res.status(400).json({
        success: false,
        message: "userId and employeeName required",
      });
    }

    const employee = await Face.findById(userId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // ✅ CHECK FOR DOUBLE CHECK-IN
    const lastTodayRecord = await Attendance.findOne({
      userId,
      date: dateStr
    }).sort({ createdAt: -1 });

    if (lastTodayRecord && lastTodayRecord.event === 'in') {
      return res.status(200).json({
        success: false,
        message: "You are already checked in. Please check out first.",
        lastCheckIn: lastTodayRecord.timeIn
      });
    }

    const attendanceLog = new Attendance({
      userId,
      employeeName,
      timeIn: now,
      event: "in",
      breakType: "none",
      date: dateStr,
    });

    await attendanceLog.save();

    let summary = await DailySummary.findOne({ userId, date: dateStr });

    if (!summary) {
      summary = new DailySummary({
        userId,
        employeeName,
        date: dateStr,
        totalMinutes: 0,
        sessions: [],
        breaks: { tea: 0, lunch: 0, snacks: 0 },
        firstIn: now,
      });

      // ✅ CALCULATE LATE STATUS (Threshold: 9:00 AM)
      const threshold = new Date(now);
      threshold.setHours(9, 0, 0, 0);

      if (now > threshold) {
        summary.isLate = true;
        summary.lateByMinutes = Math.floor((now - threshold) / 60000);
      }

      await summary.save();
    } else if (!summary.firstIn) {
      summary.firstIn = now;

      // ✅ CALCULATE LATE STATUS (Threshold: 9:00 AM)
      const threshold = new Date(now);
      threshold.setHours(9, 0, 0, 0);

      if (now > threshold) {
        summary.isLate = true;
        summary.lateByMinutes = Math.floor((now - threshold) / 60000);
      } else {
        summary.isLate = false;
        summary.lateByMinutes = 0;
      }

      await summary.save();
    } else {
      // If it's a re-entry but firstIn was already set, 
      // we check if we should update late status (though usually it's based on firstIn)
      // For now, only firstIn determines late status.
    }

    // ✅ Update live status fields
    summary.currentStatus = 'in';
    summary.lastInTime = now;
    await summary.save();

    const totalEntries = await Attendance.countDocuments({
      userId,
      event: "in",
    });

    res.json({
      success: true,
      message: "Entry logged - Welcome!",
      data: {
        userId,
        employeeName,
        timeIn: now,
        date: dateStr,
        entryNumber: totalEntries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// OUT — Buffer detection in Redis instead of immediate MongoDB log
export const attendanceOut = async (req, res) => {
  try {
    const { userId, employeeName, bbox, cameraId = 'out' } = req.body;

    if (!userId || !employeeName) {
      return res.status(400).json({
        success: false,
        message: "userId and employeeName required",
      });
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // 1. ROI CHECK (Geofencing)
    if (bbox) {
      const roi = await getCameraROI(cameraId);
      const inside = isInsideROI(bbox, roi);

      if (!inside) {
        console.log(`📍 [Geofence] ${employeeName} detected on OUT camera but NOT in exit zone. Ignoring.`);
        return res.json({
          success: true,
          message: "Detection outside exit zone",
          inZone: false
        });
      }
      console.log(`🎯 [Geofence] ${employeeName} detected INSIDE exit zone. Proceeding with buffer.`);
    }

    // ✅ Validate: user must have checked IN today before checking OUT
    const lastTodayRecord = await Attendance.findOne({
      userId,
      date: dateStr,
    }).sort({ createdAt: -1 });

    if (!lastTodayRecord || lastTodayRecord.event === "out") {
      const breakType = detectBreakType(now);
      const breakLabel = getBreakLabel(breakType);
      const msg = lastTodayRecord
        ? breakType !== "none"
          ? `You are already checked out for ${breakLabel}.`
          : "You are already checked out."
        : "No entry record found for today";

      return res.status(200).json({
        success: false,
        message: msg,
      });
    }

    // ✅ Check if there is already a pending OUT for this person
    const existing = await getPendingOut(userId);

    if (existing) {
      // Re-detected on OUT camera — reset timer and checkCount
      await resetPendingOut(userId);
      console.log(
        `🔄 [OUT Buffer] Re-detected ${employeeName} (${userId}) on OUT camera — timer reset to 30s`
      );
      return res.json({
        success: true,
        message: "OUT detection re-buffered — timer reset to 30s",
        pending: true,
        personId: userId,
      });
    }

    // ✅ Create new pending OUT entry in Redis
    const pendingData = {
      personId: userId,
      employeeName,
      detectedAt: now.toISOString(),
      expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
      checkCount: 0,
      activeCameras: [],
    };

    const saved = await setPendingOut(userId, pendingData);

    if (!saved) {
      // Redis unavailable — fall back to immediate OUT (graceful degradation)
      console.warn(
        `⚠️ [OUT Buffer] Redis unavailable — falling back to immediate OUT for ${employeeName}`
      );
      return await _directAttendanceOut(userId, employeeName, now, dateStr, lastTodayRecord, res);
    }

    console.log(
      `⏳ [OUT Buffer] Buffered OUT for ${employeeName} (${userId}) — confirming in 30s`
    );

    res.json({
      success: true,
      message: "OUT detection buffered — confirming in 30s",
      pending: true,
      personId: userId,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * confirmAttendanceOut — Called by the background outConfirmationService
 * after 3 failed cross-checks (person not found indoors).
 * This contains the actual MongoDB write logic previously in attendanceOut.
 *
 * @param {string} userId
 * @param {string} employeeName
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const confirmAttendanceOut = async (userId, employeeName) => {
  try {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const lastTodayRecord = await Attendance.findOne({
      userId,
      date: dateStr,
    }).sort({ createdAt: -1 });

    // Guard: if already checked out or no check-in, skip
    if (!lastTodayRecord || lastTodayRecord.event === "out") {
      console.log(
        `⚠️ [OUT Confirm] Skipping ${employeeName} (${userId}) — already checked out or no entry`
      );
      return { success: false, message: "Already checked out or no entry" };
    }

    const lastInRecord = lastTodayRecord;
    const breakType = detectBreakType(now);
    const breakLabel = getBreakLabel(breakType);

    const durationMinutes = Math.floor(
      (now - new Date(lastInRecord.timeIn)) / 60000
    );

    const exitLog = new Attendance({
      userId,
      employeeName,
      timeOut: now,
      duration: durationMinutes,
      event: "out",
      breakType,
      date: dateStr,
    });

    await exitLog.save();

    let summary = await DailySummary.findOne({ userId, date: dateStr });

    if (!summary) {
      summary = new DailySummary({
        userId,
        employeeName,
        date: dateStr,
        totalMinutes: 0,
        sessions: [],
        breaks: { tea: 0, lunch: 0, snacks: 0 },
      });
    }

    // ✅ Update live status fields
    summary.currentStatus = "out";
    summary.lastOutTime = now;

    summary.sessions.push({
      timeIn: lastInRecord.timeIn,
      timeOut: now,
      duration: durationMinutes,
      breakType,
    });

    summary.totalMinutes += durationMinutes;
    summary.lastOut = now;

    if (breakType === "tea") summary.breaks.tea += durationMinutes;
    if (breakType === "lunch") summary.breaks.lunch += durationMinutes;
    if (breakType === "snacks") summary.breaks.snacks += durationMinutes;

    const h = Math.floor(summary.totalMinutes / 60);
    const m = summary.totalMinutes % 60;
    summary.totalHours = `${h}h ${m}m`;

    await summary.save();

    console.log(
      `✅ [OUT Confirm] Attendance OUT confirmed for ${employeeName} (${userId}) — ${summary.totalHours} today`
    );

    return {
      success: true,
      message: breakType !== "none" ? `Logged out for ${breakLabel}` : "Exit logged",
      data: {
        userId,
        employeeName,
        timeOut: now,
        todayTotal: summary.totalHours,
        totalMinutes: summary.totalMinutes,
        date: dateStr,
      },
    };
  } catch (err) {
    console.error(`❌ [OUT Confirm] Error for ${userId}: ${err.message}`);
    return { success: false, message: err.message };
  }
};


/**
 * _directAttendanceOut — Fallback when Redis is unavailable.
 * Performs the original immediate OUT logic via HTTP response.
 * (Private helper, not exported.)
 */
async function _directAttendanceOut(userId, employeeName, now, dateStr, lastInRecord, res) {
  const breakType = detectBreakType(now);
  const breakLabel = getBreakLabel(breakType);

  const durationMinutes = Math.floor(
    (now - new Date(lastInRecord.timeIn)) / 60000
  );

  const exitLog = new Attendance({
    userId,
    employeeName,
    timeOut: now,
    duration: durationMinutes,
    event: "out",
    breakType,
    date: dateStr,
  });

  await exitLog.save();

  let summary = await DailySummary.findOne({ userId, date: dateStr });

  if (!summary) {
    summary = new DailySummary({
      userId,
      employeeName,
      date: dateStr,
      totalMinutes: 0,
      sessions: [],
      breaks: { tea: 0, lunch: 0, snacks: 0 },
    });
  }

  summary.currentStatus = "out";
  summary.lastOutTime = now;

  summary.sessions.push({
    timeIn: lastInRecord.timeIn,
    timeOut: now,
    duration: durationMinutes,
    breakType,
  });

  summary.totalMinutes += durationMinutes;
  summary.lastOut = now;

  if (breakType === "tea") summary.breaks.tea += durationMinutes;
  if (breakType === "lunch") summary.breaks.lunch += durationMinutes;
  if (breakType === "snacks") summary.breaks.snacks += durationMinutes;

  const h = Math.floor(summary.totalMinutes / 60);
  const m = summary.totalMinutes % 60;
  summary.totalHours = `${h}h ${m}m`;

  await summary.save();

  return res.json({
    success: true,
    message: breakType !== "none" ? `Logged out for ${breakLabel}` : "Exit logged (fallback — Redis unavailable)",
    data: {
      userId,
      employeeName,
      timeOut: now,
      todayTotal: summary.totalHours,
      totalMinutes: summary.totalMinutes,
      date: dateStr,
    },
  });
}

// SUMMARY
export const getAttendanceSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    const targetDate =
      date || new Date().toISOString().split("T")[0];

    const summary = await DailySummary.findOne({
      userId,
      date: targetDate,
    }).populate("userId", "name");

    if (!summary) {
      return res.json({
        success: true,
        data: {
          totalHours: "0h 0m",
          totalMinutes: 0,
          sessions: [],
          breaks: { tea: 0, lunch: 0, snacks: 0 },
        },
      });
    }

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// TODAY
export const getTodayAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const dateStr = date || new Date().toISOString().split("T")[0];

    const summaries = await DailySummary.find({ date: dateStr })
      .populate("userId", "name")
      .sort({ totalMinutes: -1 })
      .lean();

    // ✅ Add fallback for legacy records missing currentStatus
    const processedSummaries = summaries.map(record => {
      if (!record.currentStatus) {
        const hasCheckIn = !!record.firstIn;
        const hasCheckOut = !!record.lastOut;

        // If they have a firstIn but no lastOut, or lastInTime exists without lastOutTime
        const isActive = (hasCheckIn && !hasCheckOut) || (record.lastInTime && !record.lastOutTime);
        record.currentStatus = isActive ? 'in' : 'out';
      }
      return record;
    });

    res.json({
      success: true,
      date: new Date(dateStr).toDateString(),
      totalEmployees: processedSummaries.length,
      summaries: processedSummaries,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// HISTORY
export const getAttendanceHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const entries = await Attendance.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);

    const totalEntries = await Attendance.countDocuments({ userId });

    res.json({ success: true, totalEntries, entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// LOGS
export const getAttendanceLogs = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await Attendance.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("userId", "name");

    const total = await Attendance.countDocuments(query);

    res.json({ success: true, total, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// STATS
export const getAttendanceStats = async (req, res) => {
  try {
    const totalLogs = await Attendance.countDocuments();
    const uniqueEmployees = await Attendance.distinct("userId");

    const frequentEntries = await Attendance.aggregate([
      { $match: { event: "in" } },
      {
        $group: {
          _id: "$employeeName",
          count: { $sum: 1 },
          lastEntry: { $max: "$timeIn" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      stats: {
        totalEntries: totalLogs,
        uniqueEmployees: uniqueEmployees.length,
        topEmployees: frequentEntries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CONSOLIDATED HOME DATA (Points 2-5)
export const getEmployeeHomeData = async (req, res) => {
  try {
    const userId = req.employeeId; // From userMiddleWare
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Parallel fetch for better performance
    const [summary, performance, employee] = await Promise.all([
      // 1. Today's Summary (Attendance Card & Breaks)
      DailySummary.findOne({ userId, date: targetDate }).lean(),

      // 2. Performance Scores (Latest)
      Rating.findOne({ employeeId: userId })
        .sort({ createdAt: -1 })
        .select("grooming attitude punctuality createdAt")
        .lean(),

      // 3. Employee Info
      Face.findById(userId, "name").lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        name: employee ? employee.name : "Unknown",
        today: {
          firstIn: summary ? summary.firstIn : null,
          lastOut: summary ? summary.lastOut : null,
          totalHours: summary ? summary.totalHours : "0h 0m",
        },
        breakSummary: summary ? summary.breaks : { tea: 0, lunch: 0, snacks: 0 },
        performance: performance || {
          grooming: 0,
          attitude: 0,
          punctuality: 0,
        },
      },
    });
  } catch (err) {
    console.error("Get Employee Home Data Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// MONTHLY HISTORY (Enhanced with Absent, Late, Present statuses)
export const getMonthlyAttendanceHistory = async (req, res) => {
  try {
    const userId = req.employeeId; // From userMiddleWare
    const { month, year, date, page = 1, limit = 31 } = req.query;

    const now = new Date();
    const reqDateStr = date ? date.split('T')[0] : null;
    
    // Use month/year from specifically requested date if provided, otherwise query or current
    const targetMonth = month || (reqDateStr ? reqDateStr.split('-')[1] : String(now.getMonth() + 1).padStart(2, "0"));
    const targetYear = year || (reqDateStr ? reqDateStr.split('-')[0] : String(now.getFullYear()));

    const datePrefix = `${targetYear}-${targetMonth}`;
    const dateQuery = new RegExp(`^${datePrefix}`);

    // 1. Fetch Attendance Records
    const summaries = await DailySummary.find({ userId, date: dateQuery }).lean();

    // 2. Fetch Approved Leave Records
    const startOfMonth = new Date(parseInt(targetYear), parseInt(targetMonth) - 1, 1);
    const endOfMonth = new Date(parseInt(targetYear), parseInt(targetMonth), 0, 23, 59, 59, 999);

    const leaves = await LeaveManagement.find({
      employeeId: userId,
      status: "approved",
      $or: [
        { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { $and: [{ startDate: { $lte: startOfMonth } }, { endDate: { $gte: endOfMonth } }] }
      ]
    }).lean();

    // 3. Generate Calendar for the Month
    const daysInMonth = new Date(parseInt(targetYear), parseInt(targetMonth), 0).getDate();
    const history = [];

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let totalMinutesMonthly = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${targetMonth}-${String(day).padStart(2, "0")}`;
      const dayDate = new Date(dateStr);
      dayDate.setHours(0, 0, 0, 0);

      const summary = summaries.find((s) => s.date === dateStr);
      const leave = leaves.find((l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return dayDate >= start && dayDate <= end;
      });

      let status = "Absent";
      let lateStatus = "";
      let details = {
        id: `empty-${dateStr}`, 
        checkIn: null,
        checkOut: null,
        workHours: "0h 0m",
        totalMinutes: 0,
        isLate: false,
      };

      if (summary) {
        status = "Present";
        lateStatus = summary.isLate ? "Late" : "";
        if (summary.isLate) lateCount++;
        else presentCount++;

        totalMinutesMonthly += (summary.totalMinutes || 0);

        details = {
          id: summary._id,
          checkIn: summary.firstIn,
          checkOut: summary.lastOut,
          workHours: summary.totalHours,
          totalMinutes: summary.totalMinutes,
          isLate: summary.isLate,
          lateByMinutes: summary.lateByMinutes,
          sessions: summary.sessions,
        };
      } else if (leave) {
        status = "On Leave";
        leaveCount++;
        details.id = leave._id;
        details.leaveType = leave.leaveType;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dayDate > today) {
          status = "Upcoming";
        } else {
          status = "Absent";
          absentCount++;
        }
      }

      history.push({
        date: dateStr,
        day: dayDate.toLocaleDateString('en-US', { weekday: 'long' }),
        status,
        lateStatus,
        ...details,
      });
    }

    // 🌟 4. Calculate Day Report (Flutter Top Cards & Today Widget)
    const totalWorkingDays = presentCount + lateCount;
    const totalH = Math.floor(totalMinutesMonthly / 60);
    const totalM = totalMinutesMonthly % 60;
    const totalHoursWorkedFormatted = `${totalH}h ${totalM}m`;

    const todayStr = now.toISOString().split('T')[0];
    const todayRecord = history.find(h => h.date === todayStr);

    let todayStats = {
      status: "Absent",
      time: "0h 0m",
      workHours: "0h 0m",
      overtime: "00h 00m"
    };

    if (todayRecord) {
      const minutes = todayRecord.totalMinutes || 0;
      const otMinutes = Math.max(0, minutes - 480); // 8 hours threshold
      const otH = Math.floor(otMinutes / 60);
      const otM = otMinutes % 60;

      todayStats = {
        status: todayRecord.status,
        time: todayRecord.workHours,
        workHours: todayRecord.workHours,
        overtime: `${String(otH).padStart(2, '0')}h ${String(otM).padStart(2, '0')}m`
      };
    }

    const dayReport = {
      totalWorkingDays,
      totalHoursWorked: totalHoursWorkedFormatted,
      leavesEnjoyed: leaveCount,
      ...todayStats
    };

    // 🌟 6. Response Handlers
    if (date) {
      const specificDay = history.find(h => h.date === reqDateStr);
      return res.json({
        success: true,
        dayReport,
        data: specificDay ? [specificDay] : [] // Always return a list
      });
    }

    // Default to paginated monthly history
    const p = parseInt(page);
    const l = parseInt(limit);
    const paginatedHistory = history.slice((p - 1) * l, p * l);

    res.json({
      success: true,
      dayReport,
      metadata: {
        totalDays: daysInMonth,
        presentRecords: summaries.length,
        stats: {
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          leave: leaveCount,
        },
        pagination: {
          total: history.length,
          page: p,
          limit: l,
          totalPages: Math.ceil(history.length / l),
        }
      },
      data: paginatedHistory,
    });
  } catch (err) {
    console.error("Monthly History Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
