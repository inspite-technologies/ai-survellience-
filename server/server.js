import "dotenv/config";
import http from "http";

import app from "./app.js";
import connectDB from "./config/db.js";
import initializeAdmin from "./utils/initializeAdmin.js";
import { startPresenceReconciliation } from "./services/presenceReconciliationService.js";
import { startOutConfirmation } from "./services/outConfirmationService.js";
import { startMonthlyManagerScoring } from "./services/managerPerformanceService.js";

// Connect to MongoDB
await connectDB();

// Initialize Admin User
await initializeAdmin();

// Start Presence Reconciliation cron
startPresenceReconciliation();

// Start OUT Confirmation background service (10s interval)
startOutConfirmation();

// Start Monthly Manager Performance Scoring (1st of every month)
startMonthlyManagerScoring();

// Create HTTP server
const server = http.createServer(app);

// =========================================================
// 🏥 Health Check Routes
// =========================================================
app.get("/api/health-check", (req, res) => {
  res.json({
    status: "OK",
    streaming: "MediaMTX (WebRTC)",
    services: {
      api: "running",
      mediamtx: "external service – check http://localhost:8889/v3/paths/list",
    },
  });
});

// =========================================================
// 🚀 Start Server
// =========================================================
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║   🚀 API SERVER READY                              ║
╠════════════════════════════════════════════════════╣
║   🌐 API:          http://localhost:${PORT}           ║
║   🎥 Streaming:    Handled by MediaMTX (WebRTC)    ║
╚════════════════════════════════════════════════════╝
  `);
});

// =========================================================
// 🛑 Graceful Shutdown
// =========================================================
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  process.exit(0);
});
