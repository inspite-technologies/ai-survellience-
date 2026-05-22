import Manager from "../models/managerSchema.js";
import Face from "../models/faceSchema.js";
import Attendance from "../models/attendenceSchema.js";
import ManagerPerformance from "../models/managerPerformanceSchema.js";
import managerPerformanceService from "../services/managerPerformanceService.js";
import { sendPushNotification } from "../services/notificationService.js";

/**
 * Creates a new manager profile with default scores
 * @param {Object} req - Express request object containing manager details in body
 * @param {Object} res - Express response object
 */
const addManager = async (req, res) => {
  const { phoneNumber } = req.body;
  try {
    const isExist = await Manager.findOne({ phoneNumber });
    if (isExist) {
      return res.status(400).json({
        msg: "Manager already exist",
      });
    }
    const managerDetails = await Manager.create({
      ...req.body,
      scores: req.body.scores || {
        teamPerformance: 1,
        attendanceRate: 1,
        punctuality: 1,
        taskCompletion: 1,
        teamSatisfaction: 1,
        leadership: 1,
        communication: 1,
        problemSolving: 1
      },
      overallScore: req.body.overallScore || 1,
      lastEvaluated: req.body.lastEvaluated || new Date(),
      notes: req.body.notes || "",
      employees: req.body.employees || []
    });

    // Sync: Update assigned employees with this managerId
    if (req.body.employees && req.body.employees.length > 0) {
      await Face.updateMany(
        { _id: { $in: req.body.employees } },
        { managerId: managerDetails._id }
      );
    }

    res.status(201).json({
      msg: "Manager details added successfully",
      data: managerDetails,
    });

    // Option B: Automatically create history snapshot for new manager
    try {
      if (req.body.scores) {
        const now = new Date();
        await managerPerformanceService.calculateAndSaveMonthlyScore(
          managerDetails._id,
          now.getMonth() + 1,
          now.getFullYear()
        );
      }
    } catch (snapshotErr) {
      console.error("Failed to create initial history snapshot:", snapshotErr);
    }

  } catch (err) {
    console.error("Add Manager Error:", err);
    res.status(400).json({
      msg: err.message || "Failed to create manager",
      error: err
    });
  }
};

/**
 * Retrieves all managers from the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllManagers = async (req, res) => {
  try {
    const getManagerDetails = await Manager.find().populate("employees", "name email phoneNumber department position");
    res.status(200).json({
      msg: "store details fetched successfully",
      data: getManagerDetails,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      msg: err.message,
    });
  }
};

/**
 * Retrieves a single manager by their ID
 * @param {Object} req - Express request object with ID in params
 * @param {Object} res - Express response object
 */
const getEachManager = async (req, res) => {
  try {
    const id = req.params.id
    const isExist = await Manager.findById(id).populate("employees", "name email phoneNumber department position")
    if (isExist) {
      res.status(200).json({
        msg: 'the details of certain manager fetched successfully',
        data: isExist
      })
    } res.status(404).json({
      msg: "invalid id or id not found"
    })
  }
  catch (err) {
    console.error(err);

    res.status(500).json({
      msg: err.message,
    });
  }
}

// this one @ safana 

/**
 * Updates manager details and recalculates performance scores if provided
 * @param {Object} req - Express request object with ID in params and update data in body
 * @param {Object} res - Express response object
 */
const editManagerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const manager = await Manager.findById(id);

    if (!manager) {
      return res.status(404).json({
        msg: "Manager not found",
      });
    }

    // Update fields
    const fieldsToUpdate = [
      "fullName", "email", "phoneNumber", "branch",
      "annualSalary", "joinDate", "notes"
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        manager[field] = req.body[field];
      }
    });

    // Handle password separately (hash on save)
    if (req.body.password && req.body.password.trim().length >= 6) {
      manager.password = req.body.password;
    }

    // Calculate overall score if scores are provided
    if (req.body.scores) {
      const s = req.body.scores;
      const avg = (
        (s.teamPerformance || 1) +
        (s.attendanceRate || 1) +
        (s.punctuality || 1) +
        (s.taskCompletion || 1) +
        (s.teamSatisfaction || 1) +
        (s.leadership || 1) +
        (s.communication || 1) +
        (s.problemSolving || 1)
      ) / 8;

      manager.scores = { ...manager.scores.toObject(), ...s };
      manager.overallScore = avg;
      manager.lastEvaluated = new Date();

      // Note: Performance history snapshot & notification is handled at the end of this function
      // to ensure all edits are saved before the snapshot is taken.
    }

    // Handle employee assignments
    if (req.body.employees !== undefined) {
      const oldEmployeeIds = manager.employees.map(id => id.toString());
      const newEmployeeIds = req.body.employees;

      // 1. Remove managerId from employees no longer assigned
      const removedIds = oldEmployeeIds.filter(id => !newEmployeeIds.includes(id));
      if (removedIds.length > 0) {
        await Face.updateMany(
          { _id: { $in: removedIds } },
          { managerId: null }
        );
      }

      // 2. Add managerId to newly assigned employees
      const addedIds = newEmployeeIds.filter(id => !oldEmployeeIds.includes(id));
      if (addedIds.length > 0) {
        await Face.updateMany(
          { _id: { $in: addedIds } },
          { managerId: manager._id }
        );
      }

      manager.employees = newEmployeeIds;
    }

    await manager.save();

    // Option B: Automatically update monthly history snapshot if scores were changed
    if (req.body.scores) {
      try {
        const now = new Date();
        await managerPerformanceService.calculateAndSaveMonthlyScore(
          manager._id,
          now.getMonth() + 1,
          now.getFullYear()
        );
        console.log(`✅ [HistorySync] Updated snapshot for ${manager.fullName} (Month: ${now.getMonth() + 1})`);
      } catch (snapshotErr) {
        console.error("Failed to sync monthly history snapshot:", snapshotErr);
      }
    }

    // Populate employees before sending response
    await manager.populate("employees", "name email phoneNumber department position");

    res.status(200).json({
      msg: "Manager details updated successfully",
      data: manager,
    });

  } catch (err) {
    console.error("Edit Manager Error:", err);
    res.status(500).json({
      msg: err.message || "Failed to update manager",
    });
  }
};

/**
 * Deletes a manager profile from the database
 * @param {Object} req - Express request object with ID in params
 * @param {Object} res - Express response object
 */
const deleteManagerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteManager = await Manager.findByIdAndDelete(id);

    if (!deleteManager) {
      return res.status(404).json({
        msg: "Invalid ID or manager not found",
      });
    }

    res.status(200).json({
      msg: "Manager details deleted successfully",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message,
    });
  }
};

const getManagerScores = async (req, res) => {
  try {
    const managerId = req.managerId; // set by auth middleware

    if (!managerId) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const manager = await Manager.findById(managerId).select("scores overallScore lastEvaluated");

    if (!manager) {
      return res.status(404).json({ success: false, msg: "Manager not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        scores: manager.scores,
        overallScore: manager.overallScore,
        lastEvaluated: manager.lastEvaluated
      }
    });
  } catch (err) {
    console.error("Get Manager Scores Error:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message
    });
  }
};

/**
 * Retrieves the dashboard overview for the logged-in manager
 * @param {Object} req - Express request object with managerId attached by middleware
 * @param {Object} res - Express response object
 */
const getManagerDashboard = async (req, res) => {
  try {
    const managerId = req.managerId;
    if (!managerId) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    // 1. Get Manager Details and Assigned Team
    const manager = await Manager.findById(managerId).populate("employees", "name email phoneNumber department position isActive isVerified bonusPoints");

    if (!manager) {
      return res.status(404).json({ success: false, msg: "Manager not found" });
    }

    const employeeIds = (manager.employees || []).map(emp => emp._id);
    const totalTeam = employeeIds.length;

    // 2. Get Today's Stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendance = await Attendance.find({
      userId: { $in: employeeIds },
      date: todayStr
    });
    const presentCountToday = new Set(todayAttendance.map(a => a.userId.toString())).size;

    // 3. Get Weekly Attendance (Mon-Fri)
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Find Monday of this week
    const monday = new Date(now);
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Adjust if today is Sunday
    monday.setDate(now.getDate() + diffToMonday);
    
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const weeklyAttendance = [];

    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = weekDays[i];

      const dayAttendance = await Attendance.find({
        userId: { $in: employeeIds },
        date: dateStr
      });

      const dayPresentCount = new Set(dayAttendance.map(a => a.userId.toString())).size;
      const percentage = totalTeam > 0 ? Number((dayPresentCount / totalTeam).toFixed(2)) : 0;

      weeklyAttendance.push({
        day: dayName,
        percentage: percentage,
        isActive: dateStr === todayStr
      });
    }

    res.status(200).json({
      success: true,
      data: {
        profile: {
          fullName: manager.fullName,
          email: manager.email,
          branch: manager.branch,
          overallScore: manager.overallScore,
          lastEvaluated: manager.lastEvaluated
        },
        team: manager.employees,
        stats: {
          totalTeam: totalTeam,
          presentToday: presentCountToday,
          absentToday: totalTeam - presentCountToday
        },
        weeklyAttendance: weeklyAttendance
      }
    });
  } catch (err) {
    console.error("Get Manager Dashboard Error:", err);
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

/**
 * Retrieves filtered attendance reports for the manager's team
 * @param {Object} req - Express request object with managerId
 * @param {Object} res - Express response object
 */
const getManagerTeamAttendance = async (req, res) => {
  try {
    const managerId = req.managerId;

    // 1. Get list of assigned employee IDs
    const manager = await Manager.findById(managerId).select("employees");
    if (!manager) return res.status(404).json({ success: false, msg: "Manager not found" });

    const employeeIds = manager.employees || [];

    // 2. Fetch attendance for those employees (limit to last 30 days by default)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceRecords = await Attendance.find({
      userId: { $in: employeeIds },
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: attendanceRecords
    });
  } catch (err) {
    console.error("Get Team Attendance Error:", err);
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

/**
 * Retrieves historical monthly performance scores for the logged-in manager
 */
const getManagerPerformanceHistory = async (req, res) => {
  try {
    const managerId = req.managerId;
    if (!managerId) {
      return res.status(401).json({ success: false, msg: "Unauthorized" });
    }

    const history = await ManagerPerformance.find({ managerId })
      .sort({ year: -1, month: -1 })
      .limit(12); // Last 12 months

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (err) {
    console.error("Get Performance History Error:", err);
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

/**
 * Manually triggers monthly scoring for all managers (Admin/Testing)
 */
const triggerMonthlyScoring = async (req, res) => {
  try {
    const { month, year } = req.body;
    
    // Default to current month if not provided
    const now = new Date();
    const targetMonth = month || (now.getMonth() + 1);
    const targetYear = year || now.getFullYear();

    const results = await managerPerformanceService.runMonthlyScoringForAllManagers(targetMonth, targetYear);
    
    res.status(200).json({
      success: true,
      msg: `Performance scoring completed for ${targetMonth}/${targetYear}`,
      count: results.length,
      data: results
    });
  } catch (err) {
    console.error("Trigger Monthly Scoring Error:", err);
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

export {
  addManager,
  getAllManagers,
  getEachManager,
  editManagerDetails,
  deleteManagerDetails,
  getManagerScores,
  getManagerDashboard,
  getManagerTeamAttendance,
  getManagerPerformanceHistory,
  triggerMonthlyScoring
}