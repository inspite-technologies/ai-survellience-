import Employee from "../models/faceSchema.js";
import Rating from "../models/ratingSchema.js";
import submitAllScoring from "../models/scoringSchema.js";
import Attendance from "../models/attendenceSchema.js";
import Manager from "../models/managerSchema.js";

export const rateEmployee = async (req, res) => {
  const { employeeId, grooming, attitude, punctuality, rating } = req.body;
  const managerId = req.managerId;

  try {
    if (!employeeId) {
      return res.status(400).json({ success: false, msg: "employeeId is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, msg: "Employee not found" });
    }

    // 🔹 Get today's date range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 🔹 Check if already rated today
    const alreadyRated = await Rating.findOne({
      employeeId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (alreadyRated) {
      return res.status(400).json({
        success: false,
        msg: "Employee already rated today"
      });
    }

    // Support both flattened and nested formats
    const finalGrooming = grooming ?? rating?.grooming;
    const finalAttitude = attitude ?? rating?.attitude;
    const finalPunctuality = punctuality ?? rating?.punctuality;

    if (finalGrooming === undefined || finalAttitude === undefined) {
      return res.status(400).json({
        success: false,
        msg: "Grooming and Attitude ratings are required"
      });
    }

    // 🔹 Update Face (Employee)
    employee.grooming = finalGrooming;
    employee.attitude = finalAttitude;
    employee.punctuality = finalPunctuality;
    employee.lastEvaluated = new Date();
    await employee.save();

    // 🔹 Save history
    await Rating.create({
      employeeId: employee._id,
      managerId,
      grooming: finalGrooming,
      attitude: finalAttitude,
      punctuality: finalPunctuality
    });

   res.status(200).json({
  success: true,
  msg: "Rating submitted successfully",
  data: {
    employeeId: employee._id,
    name: employee.name,
    grooming: employee.grooming,
    attitude: employee.attitude,
    punctuality: employee.punctuality,
    lastEvaluated: employee.lastEvaluated,
    scoringStatus: "Scored"
  }
});


  } catch (err) {
    console.error("Rate Employee Error:", err);
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};


export const storeEmployeeAll = async (req, res) => {
  try {
    const managerId= req.managerId;
    const {  employeeId } = req.body;

    // Get today's date range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Check if already stored today
    const alreadyExists = await submitAllScoring.findOne({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Today's scoring already submitted"
      });
    }

    // Create new record
    const allScorings = await submitAllScoring.create({
      managerId,
      employeeId
    });

    res.status(201).json({
      success: true,
      data: allScorings
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error",error });
  }
};

export const getRatings = async (req, res) => {
  try {
    const managerId = req.managerId;
    if (!managerId) {
      return res.status(401).json({ success: false, msg: "Unauthorized - Manager ID missing" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1. Get assigned employees for this manager
    const manager = await Manager.findById(managerId).select("employees");
    if (!manager) {
      return res.status(404).json({ success: false, msg: "Manager not found" });
    }
    const assignedEmployeeIds = manager.employees || [];

    // 2. Get today's attendance for these employees
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const todayAttendance = await Attendance.find({
      userId: { $in: assignedEmployeeIds },
      date: dateStr,
      event: "in"
    }).select("userId");

    const presentEmployeeIds = todayAttendance.map(a => a.userId);

    // 3. Fetch employee details for those present
    const total = presentEmployeeIds.length;
    const employees = await Employee.find(
      { _id: { $in: presentEmployeeIds } },
      "name email grooming attitude lastEvaluated"
    )
      .skip(skip)
      .limit(limit)
      .sort({ lastEvaluated: -1 });

    // 4. Check scoring status for each present employee
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const ratingsToday = await Rating.find({
      employeeId: { $in: presentEmployeeIds },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).select("employeeId");

    const ratedIds = new Set(ratingsToday.map(r => r.employeeId.toString()));

    const data = employees.map(emp => ({
      ...emp.toObject(),
      scoringStatus: ratedIds.has(emp._id.toString()) ? "Scored" : "Pending"
    }));

    res.status(200).json({
      success: true,
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      data
    });
  } catch (err) {
    console.error("Get Ratings Error:", err);
    res.status(500).json({
      success: false,
      msg: "Server error",
      error: err.message
    });
  }
};


export const getEachEmployeeRatings = async (req, res) => {
    try {
        const employeeId = req.employeeId
        const ratings = await Rating.findOne({ employeeId }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: ratings
        });
    }
    catch (err) {
        console.error("Get Each Employee Ratings Error:", err);
        res.status(500).json({
            success: false,
            msg: "Server error",
            error: err.message
        });
    }
  }