import mongoose from "mongoose";
import { ffmpeg, activeClients, CAMERA_CONFIG } from "../streaming/ffmpeg.js";

export const healthCheck = (req, res) => {
  res.json({
    status: "OK",
    streaming: ffmpeg !== null,
    activeClients: activeClients.size,
    codec: "MPEG1 HD",
    source: CAMERA_CONFIG.useTestPattern ? "Test Pattern" : "RTSP Camera",
    resolution: "1280x720 @ 25fps",
    bitrate: "3000 kbps",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected"
  });
};
