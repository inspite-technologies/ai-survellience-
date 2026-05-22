import WebSocket from "ws";
import { spawn } from "child_process";

export const CAMERA_CONFIG = {
  rtspUrl: process.env.RTSP_URL || "rtsp://admin:qwerty%409544@192.168.1.2:554/cam/realmonitor?channel=1&subtype=0",
  useTestPattern: false
};

// 👇 1. DEFINE THE PATH TO YOUR FFMPEG FILE HERE
const FFMPEG_PATH = "ffmpeg";

export let ffmpeg = null;
export const activeClients = new Set();

export function setupStreaming(server) {
  const wss = new WebSocket.Server({ server });

  function startFFmpeg() {
    if (ffmpeg) return;

    const args = CAMERA_CONFIG.useTestPattern
      ? [
        "-f", "lavfi",
        "-i", "testsrc=size=1280x720:rate=25",
        "-f", "mpegts",
        "-codec:v", "mpeg1video",
        "-"
      ]
      : [
        "-rtsp_transport", "tcp",
        "-fflags", "nobuffer",
        "-flags", "low_delay",
        "-err_detect", "ignore_err",
        "-i", CAMERA_CONFIG.rtspUrl,
        "-f", "mpegts",
        "-codec:v", "mpeg1video",
        "-q:v", "2",
        "-s", "1280x720",
        "-b:v", "3000k",
        "-maxrate", "3000k",
        "-bufsize", "1000k",
        "-r", "25",
        "-g", "50",
        "-bf", "0",
        "-an",
        "-"
      ];

    // 👇 2. USE THE PATH VARIABLE HERE INSTEAD OF "ffmpeg"
    ffmpeg = spawn(FFMPEG_PATH, args);

    ffmpeg.stdout.on("data", data => {
      activeClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });
    });

    ffmpeg.stderr.on("data", data => {
      const output = data.toString();
      // Only log genuine errors to keep console clean
      if (output.includes("error") && !output.includes("frame=")) {
        console.error("FFmpeg error:", output.split("\n")[0]);
      }
    });

    ffmpeg.on("close", code => {
      console.log(`❌ FFmpeg stopped (exit code: ${code})`);
      ffmpeg = null;
      if (activeClients.size) setTimeout(startFFmpeg, 1000);
    });

    ffmpeg.on("error", err => {
      console.error("❌ FFmpeg failed:", err);
      ffmpeg = null;
    });
  }

  function stopFFmpeg() {
    if (ffmpeg) {
      ffmpeg.kill("SIGTERM");
      ffmpeg = null;
    }
  }

  wss.on("connection", ws => {
    console.log("📡 Client connected");
    activeClients.add(ws);

    if (!ffmpeg) startFFmpeg();

    ws.on("close", () => {
      activeClients.delete(ws);
      if (!activeClients.size) stopFFmpeg();
      console.log("📡 Client disconnected");
    });

    ws.on("error", err => {
      console.error("WebSocket error:", err);
      activeClients.delete(ws);
    });
  });

  return wss;
}