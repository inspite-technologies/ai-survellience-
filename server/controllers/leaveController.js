import LeaveManagement from "../models/leaveSchema.js";
import HR from "../models/hrSchema.js";
import Face from "../models/faceSchema.js";
import LeaveRequest from "../models/leaveRequestEmployee.js";
import mongoose from "mongoose";
import { sendPushNotification } from "../services/notificationService.js";

const applyLeaveHR = async (req, res) => {
  try {
    // akid changes: Improved debug logging
    // #r dirst: Detailed request body trace
    console.log("📥 applyLeaveHR request received:", JSON.stringify(req.body, null, 2));

    let {
      applicantType,
      employeeId,
      hrId,
      leaveType,
      startDate,
      endDate,
      isHalfDay,
      halfDayPeriod,
      reason
    } = req.body;

    // akid changes: Applicant type inference
    // #r dirst: Automatically detect HR/Employee based on present IDs
    if (!applicantType) {
      if (hrId) applicantType = 'hr';
      else if (employeeId) applicantType = 'employee';
    }

    /* ------------------ BASIC VALIDATIONS ------------------ */

    if (!applicantType || !leaveType || !startDate || !endDate) {
      console.log("❌ Validation failed in applyLeaveHR:", { applicantType, leaveType, startDate, endDate });
      return res.status(400).json({
        msg: `Validation Error: Missing ${!applicantType ? 'applicantType ' : ''}${!leaveType ? 'leaveType ' : ''}${!startDate ? 'startDate ' : ''}${!endDate ? 'endDate ' : ''}`
      });
    }

    // Validate based on applicant type
    let applicantName = '';
    let applicantId = null;

    if (applicantType === 'employee') {
      if (!employeeId) {
        return res.status(400).json({
          msg: "Employee ID is required for employee leave"
        });
      }
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          msg: "Invalid employee ID"
        });
      }
      // Verify employee exists
      const employee = await Face.findById(employeeId);
      if (!employee) {
        return res.status(404).json({
          msg: "Employee not found"
        });
      }
      applicantName = employee.name;
      applicantId = employeeId;
    } else if (applicantType === 'hr') {
      if (!hrId) {
        return res.status(400).json({
          msg: "HR ID is required for HR leave"
        });
      }
      if (!mongoose.Types.ObjectId.isValid(hrId)) {
        return res.status(400).json({
          msg: "Invalid HR ID"
        });
      }
      // Verify HR exists
      const hr = await HR.findById(hrId);
      if (!hr) {
        return res.status(404).json({
          msg: "HR user not found"
        });
      }
      applicantName = hr.name;
      applicantId = hrId;
    } else {
      return res.status(400).json({
        msg: "Invalid applicant type. Must be 'employee' or 'hr'"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({
        msg: "Start date cannot be after end date"
      });
    }

    /* ------------------ HALF DAY VALIDATION ------------------ */

    if (isHalfDay === true) {
      if (!halfDayPeriod) {
        return res.status(400).json({
          msg: "Half day period is required for half day leave"
        });
      }

      // Half-day leave must be for the same date
      if (start.toDateString() !== end.toDateString()) {
        return res.status(400).json({
          msg: "Half day leave must be applied for a single day"
        });
      }
    }

    /* ------------------ OVERLAPPING LEAVE CHECK ------------------ */

    // Build query based on applicant type
    const overlapQuery = {
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start }
        }
      ]
    };

    if (applicantType === 'employee') {
      overlapQuery.employeeId = applicantId;
      overlapQuery.applicantType = 'employee';
    } else {
      overlapQuery.hrId = applicantId;
      overlapQuery.applicantType = 'hr';
    }

    const existingLeave = await LeaveManagement.findOne(overlapQuery);

    if (existingLeave) {
      return res.status(409).json({
        msg: "Leave already applied for the selected dates"
      });
    }

    /* ------------------ CREATE LEAVE ------------------ */

    const leaveData = {
      applicantType,
      applicantName,
      leaveType,
      startDate: start,
      endDate: end,
      isHalfDay: isHalfDay || false,
      halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
      reason
    };

    // Add appropriate ID based on applicant type
    if (applicantType === 'employee') {
      leaveData.employeeId = applicantId;
    } else {
      leaveData.hrId = applicantId;
    }

    const applyLeave = await LeaveManagement.create(leaveData);

    return res.status(201).json({
      msg: "Leave applied successfully",
      leave: applyLeave
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message
    });
  }
};

const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;

    // Check LeaveManagement first
    let leave = await LeaveManagement.findById(id);
    let isAppRequest = false;

    if (!leave) {
      // Check LeaveRequest (App)
      leave = await LeaveRequest.findById(id);
      isAppRequest = true;
    }

    if (!leave) {
      return res.status(404).json({
        msg: "Leave request not found"
      });
    }

    // Check status (Case-insensitive check for robustness)
    const currentStatus = leave.status.toLowerCase();
    if (currentStatus !== "pending") {
      return res.status(400).json({
        msg: `Leave is already ${leave.status}`
      });
    }

    // Update status - Maintain source convention
    leave.status = isAppRequest ? "Approved" : "approved";
    if (isAppRequest) {
      leave.actionAt = new Date();
    }
    
    await leave.save();

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(leave.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }

        const uniqueTokens = [...new Set(tokens)];
        if (uniqueTokens.length > 0) {
          const title = "Leave Approved ✅";
          const body = `Good news! Your leave request for ${new Date(leave.startDate).toLocaleDateString()} has been approved.`;
          await sendPushNotification(uniqueTokens, title, body, { 
            leaveId: leave._id.toString(), 
            type: 'leave_approval',
            screen: '/leave-requests',
            isManager: 'false'
          }, { userId: leave.employeeId, userType: 'Face' });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending leave approval notification:", notifErr.message);
    }

    return res.status(200).json({
      msg: "Leave approved successfully",
      data: leave
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message
    });
  }
};
const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    // Check LeaveManagement first
    let leave = await LeaveManagement.findById(id);
    let isAppRequest = false;

    if (!leave) {
      // Check LeaveRequest
      leave = await LeaveRequest.findById(id);
      isAppRequest = true;
    }

    if (!leave) {
      return res.status(404).json({ msg: "Leave request not found" });
    }

    // Case-insensitive status check
    const currentStatus = leave.status.toLowerCase();
    if (currentStatus !== "pending") {
      return res.status(400).json({
        msg: `Leave is already ${leave.status}`
      });
    }

    leave.status = isAppRequest ? "Rejected" : "rejected";
    if (rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }
    if (isAppRequest) {
      leave.actionAt = new Date();
    }
    
    await leave.save();

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(leave.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }

        const uniqueTokens = [...new Set(tokens)];
        if (uniqueTokens.length > 0) {
          const title = "Leave Rejected ❌";
          const body = `Your leave request for ${new Date(leave.startDate).toLocaleDateString()} was rejected. Reason: ${leave.rejectionReason || 'Contact HR'}`;
          await sendPushNotification(uniqueTokens, title, body, { 
            leaveId: leave._id.toString(), 
            type: 'leave_rejection',
            screen: '/leave-requests',
            isManager: 'false'
          }, { userId: leave.employeeId, userType: 'Face' });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending leave rejection notification:", notifErr.message);
    }

    res.status(200).json({
      msg: "Leave rejected successfully",
      data: leave
    });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


const getAllLeaves = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch from LeaveManagement (HR created)
    const leavesHR = await LeaveManagement.find()
      .populate('employeeId', 'name email employeeId')
      .populate('hrId', 'name email');

    // Fetch from LeaveRequest (App created)
    const leavesApp = await LeaveRequest.find()
      .populate('employeeId', 'name email employeeId')
      .populate('managerId', 'fullName name email');

    // Normalize App leaves to match HR format
    const normalizedAppLeaves = leavesApp.map(leave => {
      const leaveObj = leave.toObject();
      return {
        ...leaveObj,
        applicantType: leave.managerId ? 'manager' : 'employee',
        // Map 'title' to 'leaveType' and normalize status to lowercase
        leaveType: leave.title === 'sick leave' ? 'sick' : (leave.title === 'monthly leave' ? 'casual' : (leave.title || 'sick')),
        status: leave.status ? leave.status.toLowerCase() : 'pending',
        applicantName: leave.employeeId?.name || leave.managerId?.fullName || leave.managerId?.name || 'Unknown',
        createdAt: leaveObj.createdAt || new Date(),
        isAppLeave: true // Flag to identify source
      };
    });

    // Merge and Sort by Date (descending)
    const allLeaves = [...leavesHR, ...normalizedAppLeaves].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    const total = allLeaves.length;
    const paginatedLeaves = allLeaves.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      data: paginatedLeaves
    });
  } catch (err) {
    console.error('❌ Error in getAllLeaves:', err);
    res.status(500).json({ msg: err.message });
  }
};


const applyLeaveEmployee = async (req, res) => {
  try {
    const employeeId = req.employeeId;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        msg: "Employee ID is missing"
      });
    }

    const applyLeave = await LeaveRequest.create({
      employeeId,
      ...req.body
    });

    // ✅ Notify all HR users
    try {
      const applicant = await Face.findById(employeeId);
      const applicantName = applicant ? applicant.name : "An employee";
      const hrUsers = await HR.find({});
      const allHrTokens = hrUsers.reduce((tokens, hr) => {
        if (hr.fcmToken) tokens.push(hr.fcmToken);
        if (hr.fcmTokens && hr.fcmTokens.length > 0) {
          tokens.push(...hr.fcmTokens.map(t => t.token));
        }
        return tokens;
      }, []);

      const uniqueHrTokens = [...new Set(allHrTokens)];

        if (uniqueHrTokens.length > 0) {
          const title = "New Leave Request 📝";
          const body = `${applicantName} has applied for ${req.body.title || 'leave'}.`;
          
          // Save for each HR user in database
          for (const hr of hrUsers) {
            await sendPushNotification([], title, body, {
              type: 'new_leave_request',
              leaveId: applyLeave._id.toString(),
              applicantName,
              screen: '/leave-requests',
              isManager: 'true'
            }, { userId: hr._id, userType: 'HR' });
          }

          await sendPushNotification(uniqueHrTokens, title, body, {
            type: 'new_leave_request',
            leaveId: applyLeave._id.toString(),
            applicantName,
            screen: '/leave-requests',
            isManager: 'true'
          });
          console.log(`🔔 [Notif] Sent new leave notification to ${uniqueHrTokens.length} HR tokens.`);
        }
    } catch (notifErr) {
      console.error("❌ [Notif] Error notifying HR of new leave:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      msg: "Leave applied successfully",
      data: applyLeave
    });

  } catch (error) {
    console.error("Apply Leave Error:", error);
    return res.status(400).json({
      success: false,
      msg: "Apply leave failed",
      error: error.message
    });
  }
};

const fetchEmployeeHistory = async (req, res) => {
  try {
    const employeeId = req.employeeId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await LeaveRequest.countDocuments({ employeeId });

    const history = await LeaveRequest.find({ employeeId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      data: history
    });
  } catch (error) {
    console.error("Fetch Leave History Error:", error);
    return res.status(400).json({ msg: error.message });
  }
};


const fetchLeaveRequest = async (req, res) => {
  try {
    const managerId = req.managerId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const employees = await Face.find({ managerId }, "_id name");

    if (!employees.length) {
      return res.status(404).json({ success: false, msg: "No employees found" });
    }

    const employeeIds = employees.map(emp => emp._id);

    // Filter by 'Approved' status (supporting both "Approved" and "approved")
    const total = await LeaveRequest.countDocuments({
      employeeId: { $in: employeeIds },
      status: { $in: ["Approved", "approved"] }
    });

    const approvedLeaves = await LeaveRequest.find({
      employeeId: { $in: employeeIds },
      status: { $in: ["Approved", "approved"] }
    })
      .populate("employeeId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const approvedWithDays = approvedLeaves.map(leave => {
      const diff = new Date() - new Date(leave.createdAt);
      const daysSinceApplied = Math.floor(diff / (1000 * 60 * 60 * 24));

      return {
        _id: leave._id,
        employeeName: leave.employeeId?.name || "Unknown",
        reason: leave.reason,
        status: leave.status,
        appliedOn: leave.createdAt,
        daysSinceApplied,
        startDate: leave.startDate,
        endDate: leave.endDate
      };
    });

    return res.status(200).json({
      success: true,
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      data: approvedWithDays
    });
  } catch (error) {
    console.error("Fetch Approved Leave Request Error:", error);
    return res.status(500).json({ msg: error.message });
  }
};



const approveLeaveRequest = async (req, res) => {
  try {
    const { leaveId } = req.body

    const leave = await LeaveRequest.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        msg: "Leave request not found"
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        msg: `Leave already ${leave.status.toLowerCase()}`
      });
    }

    leave.status = "Approved";
    leave.actionAt = new Date();
    await leave.save();

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(leave.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }

        const uniqueTokens = [...new Set(tokens)];
        if (uniqueTokens.length > 0) {
          const title = "Leave Approved ✅";
          const body = `Your leave request has been approved.`;
          await sendPushNotification(uniqueTokens, title, body, { 
            leaveId: leave._id.toString(), 
            type: 'leave_approval',
            screen: '/leave-requests',
            isManager: 'false'
          }, { userId: leave.employeeId, userType: 'Face' });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending leave approval notification:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      msg: "Leave approved successfully",
      data: leave
    });

  } catch (error) {
    console.error("Approve Leave Error:", error);
    return res.status(500).json({
      success: false,
      msg: "Leave approval failed",
      error: error.message
    });
  }
};

const rejectLeaveRequest = async (req, res) => {
  try {
    const { leaveId,reason } = req.body;

    const leave = await LeaveRequest.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        msg: "Leave request not found"
      });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        msg: `Leave already ${leave.status.toLowerCase()}`
      });
    }

    leave.status = "Rejected";
    leave.rejectionReason = reason || "Not specified";
    leave.actionAt = new Date();
    await leave.save();

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(leave.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }

        const uniqueTokens = [...new Set(tokens)];
        if (uniqueTokens.length > 0) {
          const title = "Leave Rejected ❌";
          const body = `Your leave request was rejected. Reason: ${leave.rejectionReason}`;
          await sendPushNotification(uniqueTokens, title, body, { 
            leaveId: leave._id.toString(), 
            type: 'leave_rejection',
            screen: '/leave-requests',
            isManager: 'false'
          }, { userId: leave.employeeId, userType: 'Face' });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending leave rejection notification:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      msg: "Leave rejected successfully",
      data: leave
    });

  } catch (error) {
    console.error("Reject Leave Error:", error);
    return res.status(500).json({
      success: false,
      msg: "Leave rejection failed",
      error: error.message
    });
  }
};

const applyLeaveManager = async (req, res) => {
  try {
    const managerId = req.managerId;

    if (!managerId) {
      return res.status(400).json({ msg: "Manager ID missing" });
    }

    const leave = await LeaveRequest.create({
      managerId,
      ...req.body
    });

    // ✅ Notify all HR users
    try {
      const ManagerModel = (await import("../models/managerSchema.js")).default;
      const applicant = await ManagerModel.findById(managerId);
      const applicantName = applicant ? (applicant.fullName || applicant.name) : "A manager";
      
      const hrUsers = await HR.find({});
      const allHrTokens = hrUsers.reduce((tokens, hr) => {
        if (hr.fcmToken) tokens.push(hr.fcmToken);
        if (hr.fcmTokens && hr.fcmTokens.length > 0) {
          tokens.push(...hr.fcmTokens.map(t => t.token));
        }
        return tokens;
      }, []);

      const uniqueHrTokens = [...new Set(allHrTokens)];

      if (uniqueHrTokens.length > 0) {
        const title = "New Manager Leave Request 📝";
        const body = `${applicantName} has applied for ${req.body.title || 'leave'}.`;
        
        // Save for each HR user in database
        for (const hr of hrUsers) {
          await sendPushNotification([], title, body, {
            type: 'new_leave_request',
            leaveId: leave._id.toString(),
            applicantName,
            screen: '/leave-requests',
            isManager: 'true'
          }, { userId: hr._id, userType: 'HR' });
        }

        await sendPushNotification(uniqueHrTokens, title, body, {
          type: 'new_leave_request',
          leaveId: leave._id.toString(),
          applicantName,
          screen: '/leave-requests',
          isManager: 'true'
        });
        console.log(`🔔 [Notif] Sent new manager leave notification to ${uniqueHrTokens.length} HR tokens.`);
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error notifying HR of new manager leave:", notifErr.message);
    }

    res.status(201).json({
      success: true,
      msg: "Manager leave applied",
      data: leave
    });

  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};
const fetchManagerHistory = async (req, res) => {
  try {
    const managerId = req.managerId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1. Get managed employees
    const employees = await Face.find({ managerId }, "_id");
    const employeeIds = employees.map(emp => emp._id);

    // 2. Query criteria: include leaves from managed employees OR specifically for the managerId
    const queryCriteria = {
      $or: [
        { employeeId: { $in: employeeIds } },
        { managerId: managerId }
      ]
    };

    const total = await LeaveRequest.countDocuments(queryCriteria);

    const history = await LeaveRequest.find(queryCriteria)
      .populate("employeeId", "name")
      .populate("managerId", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const pendingCount = await LeaveRequest.countDocuments({ ...queryCriteria, status: "Pending" });
    const approvedCount = await LeaveRequest.countDocuments({
      ...queryCriteria,
      status: { $in: ["Approved", "approved"] }
    });

    res.status(200).json({
      success: true,
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      counts: {
        pending: pendingCount,
        approved: approvedCount
      },
      data: history.map(leave => ({
        ...leave.toObject(),
        employeeName: leave.employeeId ? leave.employeeId.name : (leave.managerId ? leave.managerId.fullName : "Manager")
      }))
    });
  } catch (error) {
    console.error("Fetch Manager History Error:", error);
    res.status(500).json({ msg: error.message });
  }
};



const approveLeaveRequestManager = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.body.leaveId);

    if (!leave) return res.status(404).json({ msg: "Not found" });

    leave.status = "Approved";
    leave.actionAt = new Date();
    await leave.save();

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(leave.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }

        const uniqueTokens = [...new Set(tokens)];
        if (uniqueTokens.length > 0) {
          const title = "Leave Approved ✅";
          const body = `Your manager approved your leave request.`;
          await sendPushNotification(uniqueTokens, title, body, { 
            leaveId: leave._id.toString(), 
            type: 'leave_approval',
            screen: '/leave-requests',
            isManager: 'false'
          }, { userId: leave.employeeId, userType: 'Face' });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending leave approval notification:", notifErr.message);
    }

    res.json({ msg: "Approved", data: leave });

  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const rejectLeaveRequestManager = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.body.leaveId);

    if (!leave) return res.status(404).json({ msg: "Not found" });

    leave.status = "Rejected";
    leave.actionAt = new Date();
    await leave.save();

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(leave.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }

        const uniqueTokens = [...new Set(tokens)];
        if (uniqueTokens.length > 0) {
          const title = "Leave Rejected ❌";
          const body = `Your manager rejected your leave request.`;
          await sendPushNotification(uniqueTokens, title, body, { 
            leaveId: leave._id.toString(), 
            type: 'leave_rejection',
            screen: '/leave-requests',
            isManager: 'false'
          }, { userId: leave.employeeId, userType: 'Face' });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending leave rejection notification:", notifErr.message);
    }

    res.json({ msg: "Rejected", data: leave });

  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

const fetchPendingManagerLeavesForHR = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await LeaveRequest.countDocuments({
      managerId: { $exists: true },
      status: "Pending"
    });

    const pendingManagerLeaves = await LeaveRequest.find({
      managerId: { $exists: true },
      status: "Pending"
    })
      .populate("managerId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      meta: {
        totalRecords: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        pageSize: limit
      },
      data: pendingManagerLeaves
    });
  } catch (error) {
    console.error("Fetch Pending Manager Leaves Error:", error);
    return res.status(500).json({ msg: error.message });
  }
};






export { applyLeaveHR, approveLeave, rejectLeave, getAllLeaves, applyLeaveEmployee, fetchEmployeeHistory, fetchLeaveRequest, approveLeaveRequest, rejectLeaveRequest,applyLeaveManager,fetchManagerHistory,approveLeaveRequestManager,rejectLeaveRequestManager,fetchPendingManagerLeavesForHR }
