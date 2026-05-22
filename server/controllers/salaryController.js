import Salary from "../models/salarySchema.js";
import Face from "../models/faceSchema.js";
import { sendPushNotification } from "../services/notificationService.js";

/**
 * #r Fetch all salary records for a specific month
 */
export const getMonthlySalaries = async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM
    const query = month ? { month } : {};
    const salaries = await Salary.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: salaries
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * #r Fetch all salary change requests (records with a reason)
 */
export const getSalaryRequests = async (req, res) => {
  try {
    const requests = await Salary.find({ reason: { $exists: true, $ne: "" } })
      .populate('employeeId', 'name monthlySalary position joiningDate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * #r Process salary for an employee (calculate and store record)
 */
export const processSalary = async (req, res) => {
  try {
    const {
      employeeId,
      employeeName,
      month,
      baseSalary,
      allowances,
      bonus,
      deductions,
      overtimeHours,
      overtimeRate,
      grossSalary,
      taxAmount,
      netSalary,
      processedBy
    } = req.body;

    // #r Prevent duplicate processing for same month
    const existing = await Salary.findOne({ employeeId, month });
    if (existing && existing.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        msg: `Salary already processed for ${month}`
      });
    }

    const salary = await Salary.create({
      employeeId,
      employeeName,
      month,
      baseSalary,
      allowances,
      bonus,
      deductions,
      overtimeHours,
      overtimeRate,
      grossSalary,
      taxAmount,
      netSalary,
      processedBy,
      status: 'pending'
    });

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }
        
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length > 0) {
          const title = "Salary Processed 💰";
          const body = `Your salary for ${month} has been processed. Net amount: ${netSalary}`;
          await sendPushNotification(uniqueTokens, title, body, { 
            salaryId: salary._id.toString(), 
            type: 'salary_processed',
            screen: '/payroll'
          });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending salary processing notification:", notifErr.message);
    }

    res.status(201).json({
      success: true,
      msg: "Salary processed successfully",
      data: salary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * #r Mark salary record as paid
 */
export const markAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSalary = await Salary.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        paymentDate: new Date()
      },
      { new: true }
    );

    if (!updatedSalary) {
      return res.status(404).json({ success: false, msg: "Salary record not found" });
    }

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(updatedSalary.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }
        
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length > 0) {
          const title = "Salary Paid 💸";
          const body = `Your salary for ${updatedSalary.month} has been marked as paid.`;
          await sendPushNotification(uniqueTokens, title, body, { 
            salaryId: updatedSalary._id.toString(), 
            type: 'salary_paid',
            screen: '/payroll'
          });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending salary paid notification:", notifErr.message);
    }

    res.status(200).json({
      success: true,
      msg: "Salary marked as paid",
      data: updatedSalary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * #r Request salary change (existing logic preserved)
 */
export const salaryChange = async (req, res) => {
  try {
    const { employeeId, newSalary, reason } = req.body;
    const employee = await Face.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, msg: "Employee not found" });

    const salary = await Salary.create({
      employeeId,
      employeeName: employee.name,
      month: new Date().toISOString().slice(0, 7),
      baseSalary: Number(newSalary),
      grossSalary: Number(newSalary),
      taxAmount: 0,
      netSalary: Number(newSalary),
      reason,
      status: 'pending'
    });

    res.status(201).json({ success: true, msg: "Salary change request created", data: salary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const approveSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const salaryRequest = await Salary.findById(id);
    if (!salaryRequest) return res.status(404).json({ success: false, msg: "Salary request not found" });

    await Face.findByIdAndUpdate(salaryRequest.employeeId, { $set: { monthlySalary: Number(salaryRequest.baseSalary) } });
    await salaryRequest.save();

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(salaryRequest.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }
        
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length > 0) {
          const title = "Salary Change Approved ✅";
          const body = `Your salary change request has been approved. New base salary: ${salaryRequest.baseSalary}`;
          await sendPushNotification(uniqueTokens, title, body, { 
            salaryId: salaryRequest._id.toString(), 
            type: 'salary_approval',
            screen: '/payroll'
          });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending salary approval notification:", notifErr.message);
    }

    res.status(200).json({ success: true, msg: "Salary approved", salaryRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const salaryRequest = await Salary.findById(id);
    if (!salaryRequest) return res.status(404).json({ success: false, msg: "Salary request not found" });

    salaryRequest.status = "rejected";
    await salaryRequest.save();

    // ✅ Send Push Notification
    try {
      const employee = await Face.findById(salaryRequest.employeeId);
      if (employee) {
        const tokens = [];
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }
        
        const uniqueTokens = [...new Set(tokens)];

        if (uniqueTokens.length > 0) {
          const title = "Salary Change Rejected ❌";
          const body = `Your salary change request was rejected.`;
          await sendPushNotification(uniqueTokens, title, body, { 
            salaryId: salaryRequest._id.toString(), 
            type: 'salary_rejection',
            screen: '/payroll'
          });
        }
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending salary rejection notification:", notifErr.message);
    }

    res.status(200).json({ success: true, msg: "Salary request rejected", data: salaryRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
