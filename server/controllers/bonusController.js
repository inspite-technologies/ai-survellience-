import BonusPoints from "../models/bonusPointSchema.js";
import Face from "../models/faceSchema.js";
import { sendPushNotification } from "../services/notificationService.js";

// @desc    Add/Deduct bonus points and create record
// @route   POST /api/bonus/create
const createBonusPoints = async (req, res) => {
  try {
    const {
      employeeId,
      transactionType,
      category,
      points,
      reason,
      date
    } = req.body;

    // 1. Basic validation
    if (!employeeId || !transactionType || !category || !points || !date) {
      return res.status(400).json({
        msg: "Required fields are missing"
      });
    }

    // 2. Validate employee existence
    const employee = await Face.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        msg: "Employee not found."
      });
    }

    // 3. Create the bonus record in 'pending_allocation' status
    const bonus = await BonusPoints.create({
      employeeId,
      transactionType,
      category: 'Pending Allocation',
      points: Number(points),
      reason,
      date,
      status: 'pending_allocation'
    });

    // 4. Send Push Notification to Employee to allocate
    try {
      const tokens = [];
      if (employee.fcmToken) tokens.push(employee.fcmToken);
      if (employee.fcmTokens && employee.fcmTokens.length > 0) {
        tokens.push(...employee.fcmTokens.map(t => t.token));
      }
      
      const uniqueTokens = [...new Set(tokens)];

      if (uniqueTokens.length > 0) {
        const title = "New Bonus Points! 🎯";
        const body = `You have received ${points} bonus points. Please allocate them to a category for approval.`;
        await sendPushNotification(uniqueTokens, title, body, { 
          bonusId: bonus._id.toString(), 
          type: 'bonus_allocation_needed',
          screen: '/bonus-history'
        });
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error sending allocation notification:", notifErr.message);
    }

    res.status(201).json({
      success: true,
      msg: `Bonus points created. Employee notified to allocate.`,
      data: bonus
    });

  } catch (err) {
    console.error(err);
    if (err.name === "CastError") {
      return res.status(400).json({ msg: "Invalid Employee ID format" });
    }
    res.status(500).json({
      msg: err.message
    });
  }
};

// @desc    Get all bonus point transactions
// @route   GET /api/bonus/all
const getAllBonusPoints = async (req, res) => {
  try {
    const bonuses = await BonusPoints.find()
      .populate("employeeId", "name position department")
      .sort({ createdAt: -1 });

    res.status(200).json({
      msg: "Bonus list fetched successfully",
      data: bonuses
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message
    });
  }
};

// @desc    Get top employees by bonus points (Leaderboard)
// @route   GET /api/bonus/leaderboard
const getTopBonusEmployees = async (req, res) => {
  try {
    // We can just query Face model since we added bonusPoints field there
    const result = await Face.find({ bonusPoints: { $gt: 0 } })
      .select('name position department bonusPoints')
      .sort({ bonusPoints: -1 })
      .limit(10);

    res.status(200).json({
      msg: "Top bonus employees fetched successfully",
      data: result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message
    });
  }
};

// @desc    Get bonus history for a specific employee
// @route   GET /api/bonus/employee/:employeeId
const getEmployeeBonusHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const history = await BonusPoints.find({ employeeId })
      .sort({ createdAt: -1 });

    const employee = await Face.findById(employeeId).select('name bonusPoints');

    res.status(200).json({
      msg: "Employee bonus history fetched successfully",
      data: {
        history,
        totalPoints: employee ? employee.bonusPoints : 0,
        employeeName: employee ? employee.name : 'Unknown'
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message
    });
  }
};

// @desc    Employee allocates bonus points to a category and manager
// @route   POST /api/bonus/allocate
const allocateBonusPoints = async (req, res) => {
  try {
    const { bonusId, category, managerId } = req.body;

    const bonus = await BonusPoints.findById(bonusId);
    if (!bonus) return res.status(404).json({ msg: "Bonus record not found" });

    if (bonus.status !== 'pending_allocation') {
      return res.status(400).json({ msg: "Bonus already allocated or processed" });
    }

    bonus.allocatedCategory = category;
    bonus.category = category; // update main category field
    bonus.managerId = managerId;
    bonus.status = 'pending_approval';
    await bonus.save();

    // Notify Manager
    try {
      const ManagerModel = (await import("../models/managerSchema.js")).default;
      const manager = await ManagerModel.findById(managerId);
      const employee = await Face.findById(bonus.employeeId);
      
      const tokens = [];
      if (manager) {
        if (manager.fcmToken) tokens.push(manager.fcmToken);
        if (manager.fcmTokens && manager.fcmTokens.length > 0) {
          tokens.push(...manager.fcmTokens.map(t => t.token));
        }
      }
      
      const uniqueTokens = [...new Set(tokens)];

      if (uniqueTokens.length > 0) {
        const title = "Bonus Approval Needed 🎯";
        const body = `${employee?.name || 'An employee'} has allocated ${bonus.points} points for ${category}.`;
        await sendPushNotification(uniqueTokens, title, body, { 
          bonusId: bonus._id.toString(), 
          type: 'bonus_approval_needed',
          screen: '/bonus-history'
        });
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error notifying manager:", notifErr.message);
    }

    res.status(200).json({ success: true, msg: "Points allocated and sent for approval", data: bonus });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// @desc    Manager approves/rejects bonus points
// @route   POST /api/bonus/decide
const decideBonusPoints = async (req, res) => {
  try {
    const { bonusId, decision } = req.body; // decision: 'approved' or 'rejected'

    const bonus = await BonusPoints.findById(bonusId);
    if (!bonus) return res.status(404).json({ msg: "Bonus record not found" });

    if (bonus.status !== 'pending_approval') {
      return res.status(400).json({ msg: "Bonus not in pending_approval status" });
    }

    bonus.status = decision;
    await bonus.save();

    const employee = await Face.findById(bonus.employeeId);

    if (decision === 'approved') {
      const pointAdjustment = bonus.transactionType === 'reward' ? bonus.points : -bonus.points;
      await Face.findByIdAndUpdate(bonus.employeeId, {
        $inc: { bonusPoints: pointAdjustment }
      });
    }

    // Notify Employee of decision
    try {
      const tokens = [];
      if (employee) {
        if (employee.fcmToken) tokens.push(employee.fcmToken);
        if (employee.fcmTokens && employee.fcmTokens.length > 0) {
          tokens.push(...employee.fcmTokens.map(t => t.token));
        }
      }
      
      const uniqueTokens = [...new Set(tokens)];

      if (uniqueTokens.length > 0) {
        const title = decision === 'approved' ? "Bonus Approved! 🏆" : "Bonus Rejected ❌";
        const body = `Your ${bonus.points} points for ${bonus.allocatedCategory} have been ${decision}.`;
        await sendPushNotification(uniqueTokens, title, body, { 
          bonusId: bonus._id.toString(), 
          type: 'bonus_decision',
          screen: '/bonus-history'
        });
      }
    } catch (notifErr) {
      console.error("❌ [Notif] Error notifying employee of decision:", notifErr.message);
    }

    res.status(200).json({ success: true, msg: `Bonus ${decision}` });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// @desc    Delete a bonus point transaction
const deleteBonusPoints = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find the record
    const bonus = await BonusPoints.findById(id);
    if (!bonus) {
      return res.status(404).json({
        msg: "Bonus record not found"
      });
    }

    // 2. Calculate reversal (offset current points)
    const pointReversal = bonus.transactionType === 'reward' ? -Number(bonus.points) : Number(bonus.points);

    // 3. Update employee
    await Face.findByIdAndUpdate(bonus.employeeId, {
      $inc: { bonusPoints: pointReversal }
    });

    // 4. Delete the record
    await BonusPoints.findByIdAndDelete(id);

    res.status(200).json({
      msg: "Bonus record deleted and points reverted successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message
    });
  }
};

export {
  createBonusPoints,
  getAllBonusPoints,
  getTopBonusEmployees,
  getEmployeeBonusHistory,
  allocateBonusPoints,
  decideBonusPoints,
  deleteBonusPoints
};
