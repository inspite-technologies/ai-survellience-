import Shift from "../models/shiftSchema.js";
import Face from "../models/faceSchema.js";
import { sendPushNotification } from "../services/notificationService.js";

const createShift = async (req, res) => {
  try {
    const addShift = await Shift.create(req.body);
    res.status(201).json({
      msg: "shift created successfully",
      data: addShift,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      msg: err,
    });
  }
};

const assignEmployeesToShift = async (req, res) => {
  try {
    // akid changes: Look at the name badge of the shift and the friends list
    // #r dirst: Reading the labels to know who goes where
    console.log("📥 assignEmployeesToShift params:", req.params);
    console.log("📥 assignEmployeesToShift body:", req.body);
    const { id } = req.params;
    const { employeeIds } = req.body; // array of Face IDs

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "employeeIds must be a non-empty array",
      });
    }

    // Optional: validate employees exist
    const validEmployees = await Face.find({
      _id: { $in: employeeIds },
      isActive: true,
    }).select("_id");

    if (validEmployees.length !== employeeIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more employees are invalid or inactive",
      });
    }

    // 1. Find the shift to get its name and old team
    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    // 2. Clear this shift from ALL employees who were previously in it
    await Face.updateMany(
      { shiftId: id },
      { $set: { shiftId: null, shiftName: "" } }
    );

    await Face.updateMany(
      { _id: { $in: employeeIds } },
      { $set: { shiftId: id, shiftName: shift.shiftName } }
    );

    // ✅ Send Push Notifications to all assigned employees
    setTimeout(async () => {
      try {
        const employees = await Face.find({ _id: { $in: employeeIds } });
        for (const employee of employees) {
          const tokens = [];
          if (employee.fcmToken) tokens.push(employee.fcmToken);
          if (employee.fcmTokens && employee.fcmTokens.length > 0) {
            tokens.push(...employee.fcmTokens.map(t => t.token));
          }
          
          const uniqueTokens = [...new Set(tokens)];

          if (uniqueTokens.length > 0) {
            const title = "New Shift Assignment 📅";
            const body = `You have been assigned to the shift: ${shift.shiftName}`;
            await sendPushNotification(uniqueTokens, title, body, { 
              shiftId: id, 
              type: 'shift_assignment',
              screen: '/my-shifts'
            });
          }
        }
      } catch (notifErr) {
        console.error("❌ [Notif] Error sending shift assignment notifications:", notifErr.message);
      }
    }, 0);

    const updatedShift = await Shift.findById(id).populate("employeeIds", "name email department position");

    res.status(200).json({
      success: true,
      message: "Employees assigned to shift successfully",
      data: updatedShift,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllShifts = async (req, res) => {
  try {
    const allShifts = await Shift.find().populate("employeeIds", "name email department position");
    return res.status(200).json({
      msg: "fetch all shifts successfully",
      data: allShifts,
    });
  } catch (err) {
    res.status(400).json({
      err,
    });
  }
};

const updateShifts = async (req, res) => {
  try {
    const { id } = req.params;
    const updateShifts = await Shift.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updateShifts) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Shift updated successfully",
      data: updateShifts,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const deleteShift = async (req, res) => {
  try {
    const id = req.params.id;
    const deleteShift = await Shift.findByIdAndDelete(id);
    if (!deleteShift) {
      return res.status(400).json({
        msg: "invalid id or id not found",
      });
    }

    // Clear this shift from ALL employees who were in it
    await Face.updateMany(
      { shiftId: id },
      { $set: { shiftId: null, shiftName: "" } }
    );
    return res.status(200).json({
      msg: "shift deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getShiftById = async (req, res) => {
  try {
    const { id } = req.params;
    const shift = await Shift.findById(id).populate("employeeIds", "name email department position");

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: shift,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export {
  createShift,
  assignEmployeesToShift,
  getAllShifts,
  updateShifts,
  deleteShift,
  getShiftById,
};
