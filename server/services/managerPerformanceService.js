import cron from "node-cron";
import Manager from "../models/managerSchema.js";
import ManagerPerformance from "../models/managerPerformanceSchema.js";
import { sendPushNotification } from "./notificationService.js";

/**
 * Calculates and saves monthly performance for a single manager.
 * If data for the month/year already exists, it updates it.
 */
export const calculateAndSaveMonthlyScore = async (managerId, month, year) => {
  try {
    const manager = await Manager.findById(managerId);
    if (!manager) {
        console.error(`Manager ${managerId} not found for monthly scoring.`);
        return null;
    }

    // Capture the current scores as a monthly snapshot
    const currentScores = manager.scores.toObject();
    
    // Calculate overall average
    const metrics = [
      currentScores.teamPerformance || 1,
      currentScores.attendanceRate || 1,
      currentScores.punctuality || 1,
      currentScores.taskCompletion || 1,
      currentScores.teamSatisfaction || 1,
      currentScores.leadership || 1,
      currentScores.communication || 1,
      currentScores.problemSolving || 1
    ];
    
    const overallScore = metrics.reduce((a, b) => a + b, 0) / metrics.length;

    const performanceRecord = await ManagerPerformance.findOneAndUpdate(
      { managerId, month, year },
      {
        scores: currentScores,
        overallScore: Number(overallScore.toFixed(2)),
        evaluatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Send Notification
    const tokens = (manager.fcmTokens || []).map(t => t.token);
    if (tokens.length > 0) {
      const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      await sendPushNotification(
        tokens,
        "Performance Score Generated",
        `Your performance score for ${monthLabel} ${year} is ready. Overall Score: ${performanceRecord.overallScore}`,
        {
          type: "PERFORMANCE_SCORE",
          month: String(month),
          year: String(year),
          score: String(performanceRecord.overallScore)
        },
        { userId: managerId, userType: "manager" }
      );
    }

    return performanceRecord;
  } catch (err) {
    console.error(`Error calculating monthly score for manager ${managerId}:`, err);
    throw err;
  }
};

/**
 * Runs monthly scoring for all managers.
 * Typically called for the PREVIOUS month on the 1st of each month.
 */
export const runMonthlyScoringForAllManagers = async (month, year) => {
  console.log(`🚀 [ManagerPerformance] Starting bulk scoring for ${month}/${year}`);
  try {
    const managers = await Manager.find({}, '_id');
    const results = [];
    
    for (const m of managers) {
      const result = await calculateAndSaveMonthlyScore(m._id, month, year);
      if (result) results.push(result);
    }
    
    console.log(`✅ [ManagerPerformance] Completed. Scored ${results.length} managers.`);
    return results;
  } catch (err) {
    console.error("Error in bulk monthly scoring:", err);
    throw err;
  }
};

/**
 * Registers the cron job to run on the 1st of every month at 00:00.
 */
export const startMonthlyManagerScoring = () => {
  // 0 0 1 * * (At 00:00 on day-of-month 1)
  cron.schedule("0 0 1 * *", async () => {
    const now = new Date();
    // Move to previous month
    now.setMonth(now.getMonth() - 1);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    await runMonthlyScoringForAllManagers(month, year);
  });
  
  console.log("📅 [ManagerPerformance] Cron job registered for the 1st of every month.");
};

export default {
  calculateAndSaveMonthlyScore,
  runMonthlyScoringForAllManagers,
  startMonthlyManagerScoring
};
