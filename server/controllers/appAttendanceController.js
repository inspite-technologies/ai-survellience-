import Attendance from "../models/attendenceSchema.js";
import Face from "../models/faceSchema.js";
import Team from "../models/teamSchema.js";
import Rating from "../models/ratingSchema.js";
import Manager from "../models/managerSchema.js";


export const getAppAttendance = async (req, res) => {
  try {
    const managerId = req.managerId;

    const selectedDate = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(selectedDate)) {
      return res.status(400).json({ success: false, msg: "Invalid date format. Use YYYY-MM-DD" });
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    let filteredEmployeeIds = null;

    if (managerId) {
      // 1. Get employees from Teams managed by this manager
      const teams = await Team.find({ manager: managerId }, "employees");
      const employeeIdsSet = new Set();
      teams.forEach(team => {
        team.employees.forEach(empId => employeeIdsSet.add(empId.toString()));
      });

      // 2. Get employees directly assigned to this manager (Manager.employees)
      const manager = await Manager.findById(managerId, "employees");
      if (manager && manager.employees) {
        manager.employees.forEach(empId => employeeIdsSet.add(empId.toString()));
      }

      // 3. Get employees who have this managerId set in their Face profile
      const directEmployees = await Face.find({ managerId: managerId }, "_id");
      directEmployees.forEach(emp => employeeIdsSet.add(emp._id.toString()));

      filteredEmployeeIds = Array.from(employeeIdsSet);
    }

    let employeeQuery = { isActive: true };
    if (filteredEmployeeIds) {
      employeeQuery._id = { $in: filteredEmployeeIds };
    }

    // 🔹 PAGINATION PARAMS
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Face.countDocuments(employeeQuery);

    const employees = await Face.find(employeeQuery, "name email phoneNumber department position")
      .skip(skip)
      .limit(limit);

    const attendanceRecords = await Attendance.find({
      event: "in",
      timeIn: { $gte: startOfDay, $lte: endOfDay },
      userId: { $in: employees.map(e => e._id) }
    }).sort({ timeIn: 1 });

    const firstInMap = {};
    attendanceRecords.forEach(record => {
      if (!firstInMap[record.userId.toString()]) {
        firstInMap[record.userId.toString()] = record.timeIn;
      }
    });

    const graceTime = new Date(startOfDay);
    graceTime.setUTCHours(4, 5, 0, 0);

    const report = employees.map(emp => {
      const firstIn = firstInMap[emp._id.toString()];
      let status = "Absent";
      let lateStatus = "";
      let checkInTime = null;

      if (firstIn) {
        checkInTime = firstIn;
        status = "Present";
        lateStatus = firstIn > graceTime ? "Late" : "";
      }

      return {
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        position: emp.position,
        status,
        lateStatus,
        checkInTime
      };
    });

    res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split("T")[0],
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      data: report
    });

  } catch (err) {
    console.error("Get App Attendance Error:", err);
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};

// @desc    Get only "Present" team members for the manager
// @route   GET /api/app-attendance/present
export const getPresentEmployees = async (req, res) => {
  try {
    const managerId = req.managerId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Get employees from Teams managed by this manager
    const teams = await Team.find({ manager: managerId }, "employees");
    const employeeIdsSet = new Set();
    teams.forEach(team => {
      team.employees.forEach(empId => employeeIdsSet.add(empId.toString()));
    });

    // 2. Get employees directly assigned to this manager (Manager.employees)
    const managerDoc = await Manager.findById(managerId, "employees");
    if (managerDoc && managerDoc.employees) {
      managerDoc.employees.forEach(empId => employeeIdsSet.add(empId.toString()));
    }

    // 3. Get employees who have this managerId set in their Face profile
    const directEmployees = await Face.find({ managerId: managerId }, "_id");
    directEmployees.forEach(emp => employeeIdsSet.add(emp._id.toString()));

    const filteredEmployeeIds = Array.from(employeeIdsSet);

    const employees = await Face.find(
      { _id: { $in: filteredEmployeeIds }, isActive: true },
      "name email department position"
    );

    const attendanceRecords = await Attendance.find({
      event: "in",
      timeIn: { $gte: startOfDay, $lte: endOfDay },
      userId: { $in: employees.map(e => e._id) }
    }).sort({ timeIn: 1 });

    const firstInMap = {};
    attendanceRecords.forEach(record => {
      if (!firstInMap[record.userId.toString()]) {
        firstInMap[record.userId.toString()] = record.timeIn;
      }
    });

    const graceTime = new Date(startOfDay);
    graceTime.setUTCHours(4, 5, 0, 0);

    const ratingsToday = await Rating.find({
      employeeId: { $in: employees.map(e => e._id) },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).select("employeeId");

    const ratedEmployeeSet = new Set(ratingsToday.map(r => r.employeeId.toString()));

    const report = employees
      .map(emp => {
        const firstIn = firstInMap[emp._id.toString()];
        let attendanceStatus = "Absent";
        let lateStatus = "";

        if (firstIn) {
          attendanceStatus = "Present";
          lateStatus = firstIn > graceTime ? "Late" : "";
        }

        const scoringStatus = ratedEmployeeSet.has(emp._id.toString())
          ? "Scored"
          : "Pending";

        return {
          _id: emp._id,
          name: emp.name,
          attendanceStatus,
          lateStatus,
          scoringStatus,
          checkInTime: firstIn
        };
      })
      .filter(emp => emp.attendanceStatus === "Present");

    const total = report.length;
    const paginatedReport = report.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      data: paginatedReport
    });

  } catch (err) {
    console.error("Get Present Employees Error:", err);
    res.status(500).json({ success: false, msg: "Server error", error: err.message });
  }
};




