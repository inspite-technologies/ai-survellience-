import Team from "../models/teamSchema.js";
import Manager from "../models/managerSchema.js";
import Face from "../models/faceSchema.js";
import Attendence from "../models/attendenceSchema.js"

const createTeam = async (req, res) => {
  const { teamName, manager, employees } = req.body;

  try {
    if (!teamName || !manager) {
      return res.status(400).json({ msg: "Team Name and Manager are required" });
    }

    const team = await Team.create({
      teamName,
      manager,
      employees: employees || []
    });

    if (employees && employees.length > 0) {
      await Face.updateMany(
        { _id: { $in: employees } },
        { $set: { managerId: manager } }
      );
    }

    res.status(201).json({
      success: true,
      msg: "Team created successfully",
      data: team
    });

  } catch (err) {
    console.error("Create Team Error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};


const getTeam = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // teams per page
    const skip = (page - 1) * limit;

    const total = await Team.countDocuments();

    const teams = await Team.find()
      .populate("manager", "fullName email")
      .populate("employees", "name descriptor position")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const teamsWithAttendance = await Promise.all(teams.map(async (team) => {

      const employeesWithDetails = await Promise.all(team.employees.map(async (emp) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendance = await Attendence.findOne({
          userId: emp._id,
          timeIn: { $gte: today, $lt: tomorrow }
        }).sort({ timeIn: 1 });

        return {
          _id: emp._id,
          name: emp.name,
          position: emp.position,
          descriptor: emp.descriptor,
          checkInTime: attendance ? attendance.timeIn : null,
          checkInStatus: attendance ? "Present" : "Absent"
        };
      }));

      return {
        _id: team._id,
        teamName: team.teamName,
        manager: team.manager,
        employees: employeesWithDetails,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      };
    }));

    res.status(200).json({
      success: true,
      msg: "Teams fetched successfully",
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      data: teamsWithAttendance
    });
  } catch (err) {
    console.error("Get Team Error:", err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};


export { createTeam, getTeam };
