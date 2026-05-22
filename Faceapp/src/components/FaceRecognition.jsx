/*
 * FaceRecognition.jsx — WebRTC & Multi-Face Migration
 * 
 * CHANGES:
 * 1. Switched source from videoCanvas to videoSource (native <video> element).
 * 2. Implemented stable spatial tracking for unknown faces to fix blinking.
 * 3. Added 2-second grace period for lost detections.
 * 4. Refactored handleServerRecognition to support MULTI-FACE array response.
 * 5. Optimized coordinate mapping and bounding box rendering.
 */

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_INSTANCE } from './services/axiosClient';
import { Camera, RefreshCw, UserCheck, AlertCircle, Trash2, Clock, History, LayoutDashboard, Database, Activity, MapPin, CameraIcon, Eye, Star, Info } from 'lucide-react';
import RecognitionWorker from './FaceRecognition.worker?worker';

const drawBoundingBox = (canvas, bbox, text, color) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const [x1, y1, x2, y2] = bbox;
  const width = x2 - x1;
  const height = y2 - y1;
  const cornerLength = 20;

  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;

  // Corners
  ctx.beginPath(); ctx.moveTo(x1, y1 + cornerLength); ctx.lineTo(x1, y1); ctx.lineTo(x1 + cornerLength, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 + width - cornerLength, y1); ctx.lineTo(x1 + width, y1); ctx.lineTo(x1 + width, y1 + cornerLength); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1 + height - cornerLength); ctx.lineTo(x1, y1 + height); ctx.lineTo(x1 + cornerLength, y1 + height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1 + width - cornerLength, y1 + height); ctx.lineTo(x1 + width, y1 + height); ctx.lineTo(x1 + width, y1 + height - cornerLength); ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = color === '#00eeff' ? 'rgba(0, 238, 255, 0.2)' : 'rgba(255, 0, 85, 0.2)';
  ctx.fillRect(x1, y1 - 35, width, 30);
  ctx.fillStyle = color;
  ctx.font = 'bold 16px Courier New';
  ctx.fillText(text.toUpperCase(), x1 + 10, y1 - 12);
};

const FaceRecognition = ({ videoSource, overlayCanvas, cameraId = 'room_camera', cameraType = 'in', isActive = true }) => {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState('⏳ Initializing recognition pipeline...');
  const [currentDetections, setCurrentDetections] = useState([]);
  const [employeeStatus, setEmployeeStatus] = useState({});
  const [allEmployees, setAllEmployees] = useState({}); // Master { id: name } mapping
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success'|'error', text: string }
  const [roiConfig, setRoiConfig] = useState({ x_min: 0.1, y_min: 0.1, x_max: 0.9, y_max: 0.9 });

  const detectionIntervalRef = useRef(null);
  const workerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const frameCounterRef = useRef(0);
  const errorCountRef = useRef(0);
  const lastDetectionRef = useRef({});
  const lastLoggedRef = useRef({});
  const lastUnknownLoggedRef = useRef({});
  const overlayCtxRef = useRef(null);
  const lastDetectionsRef = useRef([]);
  const currentROIRef = useRef(null);
  const trackedFacesRef = useRef(new Map());
  const renderLoopRef = useRef(null);
  const employeeStatusRef = useRef({});
  const allEmployeesRef = useRef({});

  const API_URL = import.meta.env.VITE_API_URL;
  const DETECTION_COOLDOWN = 1000;
  const LOG_COOLDOWN = 3000;

  useEffect(() => {
    employeeStatusRef.current = employeeStatus;
  }, [employeeStatus]);

  useEffect(() => {
    allEmployeesRef.current = allEmployees;
  }, [allEmployees]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchTodayAttendance(),
        fetchAllEmployees(),
        fetchCameraROI()
      ]);
      setIsReady(true);
      setStatus('✅ Detection active');
    };
    init();

    // Listen for attendance events from this or other components
    const handleRefresh = () => {
      console.log('🔄 FaceRecognition: refreshing attendance and employee data');
      fetchTodayAttendance();
      fetchAllEmployees();
    };
    window.addEventListener('attendance:changed', handleRefresh);

    return () => {
      if (detectionIntervalRef.current) cancelAnimationFrame(detectionIntervalRef.current);
      if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);
      window.removeEventListener('attendance:changed', handleRefresh);
    };
  }, []);

  useEffect(() => {
    if (isReady && videoSource && overlayCanvas && isActive) {
      startDetection();
    }
  }, [isReady, videoSource, overlayCanvas, isActive]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await API_INSTANCE.get(`/attendance/today`);
      if (response.data.success) {
        const statusMap = {};
        // The backend returns an array called 'summaries'
        (response.data.summaries || []).forEach(record => {
          // Use the populated userId._id or fallback to userId
          const employeeId = record.userId?._id?.toString() || record.userId?.toString();
          if (employeeId) {
            statusMap[employeeId.trim()] = record;
          }
        });
        setEmployeeStatus(statusMap);
      }
    } catch (err) {
      console.error('❌ Error fetching today attendance:', err);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await API_INSTANCE.get(`/faces`);
      // Endpoint returns direct array
      const faces = Array.isArray(response.data) ? response.data : [];
      const masterMap = {};
      faces.forEach(face => {
        if (face._id && face.name) {
          masterMap[face._id.toString().trim()] = face.name;
        }
      });
      setAllEmployees(masterMap);
    } catch (err) {
      console.error('❌ Error fetching master employees:', err);
    }
  };

  const fetchCameraROI = async () => {
    try {
      const response = await API_INSTANCE.get(`/settings`);
      if (response.data.success) {
        const settings = response.data.settings;
        const key = `camera_${cameraId}_roi`;
        if (settings[key]) {
          setRoiConfig(settings[key]);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching ROI config:', err);
    }
  };

  const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

  const renderOverlayLoop = () => {
    if (!overlayCtxRef.current || !overlayCanvas) {
      renderLoopRef.current = requestAnimationFrame(renderOverlayLoop);
      return;
    }
    const ctx = overlayCtxRef.current;
    const now = Date.now();

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Render ROI Zone (if applicable)
    if (roiConfig && cameraType === 'out') {
      const { x_min, y_min, x_max, y_max } = roiConfig;
      const rx = x_min * overlayCanvas.width;
      const ry = y_min * overlayCanvas.height;
      const rw = (x_max - x_min) * overlayCanvas.width;
      const rh = (y_max - y_min) * overlayCanvas.height;

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 238, 255, 0.5)'; // Cyan matching detection boxes
      ctx.setLineDash([15, 10]);
      ctx.lineWidth = 3;
      ctx.strokeRect(rx, ry, rw, rh);

      ctx.fillStyle = 'rgba(0, 238, 255, 0.03)';
      ctx.fillRect(rx, ry, rw, rh);

      ctx.fillStyle = 'rgba(0, 238, 255, 0.8)';
      ctx.font = 'bold 14px Courier New';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'black';
      ctx.fillText('🛡️ EXIT GEOFENCE ACTIVE', rx + 10, ry + 25);
      ctx.restore();
    }

    trackedFacesRef.current.forEach((face, key) => {
      const timeSinceLastSeen = now - face.lastSeen;

      // 1. Calculate delta time since last render frame (capped to avoid massive jumps on tab sleep)
      const dt = Math.min((now - (face.lastRenderTime || now)) / 1000, 0.1);
      face.lastRenderTime = now;

      // 2. Predict next position using velocity
      // Only apply velocity if we've seen them recently (< 500ms). Extrapolating too far looks bad.
      if (timeSinceLastSeen < 500) {
        face.targetBbox[0] += face.velocity[0] * dt;
        face.targetBbox[1] += face.velocity[1] * dt;
        face.targetBbox[2] += face.velocity[2] * dt;
        face.targetBbox[3] += face.velocity[3] * dt;
      }

      // 3. Smoothly interpolate current visible box towards the predicted target box
      // Increased smoothSpeed drastically to stick to the face rather than rubber-banding behind it
      const smoothSpeed = 0.85;
      face.currentBbox = face.currentBbox.map((val, i) => lerp(val, face.targetBbox[i], smoothSpeed));

      // 4. Handle Visibility/Opacity
      // Keep box fully visible for 1.5 seconds after last detection, then fade out
      if (timeSinceLastSeen <= 1500) {
        face.opacity = 1;
      } else {
        face.opacity -= 0.05; // Fade out quickly when lost
      }

      if (face.opacity > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, face.opacity));
        drawBoundingBox(overlayCanvas, face.currentBbox, face.name, face.color);
        ctx.restore();
      }

      // Clean up orphaned tracks
      if (face.opacity <= 0 && timeSinceLastSeen > 2000) {
        trackedFacesRef.current.delete(key);
      }
    });

    renderLoopRef.current = requestAnimationFrame(renderOverlayLoop);
  };

  const startDetection = () => {
    if (!videoSource || !overlayCanvas) return;

    // Sync overlay to video element display size
    const resizeOverlay = () => {
      overlayCanvas.width = videoSource.clientWidth || 1280;
      overlayCanvas.height = videoSource.clientHeight || 720;
      overlayCtxRef.current = overlayCanvas.getContext('2d', { willReadFrequently: true });
    };
    resizeOverlay();
    window.addEventListener('resize', resizeOverlay);

    if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);
    renderLoopRef.current = requestAnimationFrame(renderOverlayLoop);

    let lastFrameTime = 0;
    const loop = (timestamp) => {
      // If no longer active, pause the loop but don't clear the tracking completely instantly
      if (!isActive) return;

      detectionIntervalRef.current = requestAnimationFrame(loop);
      if (timestamp - lastFrameTime < 50) return;
      lastFrameTime = timestamp;
      if (!isProcessingRef.current) runDetection();
    };
    if (isActive) {
      detectionIntervalRef.current = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', resizeOverlay);
      if (detectionIntervalRef.current) cancelAnimationFrame(detectionIntervalRef.current);
      if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);
    };
  };

  const runDetection = async () => {
    if (!videoSource) return;

    // Every time detection: No frame skip
    // if (frameCounterRef.current !== 0) return;

    if (isProcessingRef.current) {
      if (frameCounterRef.current === 0) console.log('FaceRecognition: skipping runs because isProcessing is true');
      return;
    }
    isProcessingRef.current = true;

    try {
      const targetWidth = 1024;
      const targetHeight = 576;

      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = targetWidth;
      captureCanvas.height = targetHeight;
      const ctx = captureCanvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(videoSource, 0, 0, videoSource.videoWidth || videoSource.width || targetWidth, videoSource.videoHeight || videoSource.height || targetHeight, 0, 0, targetWidth, targetHeight);

      // Validation: Check for static/black frames (Brightness check)
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;
      let brightnessSum = 0;
      const step = 10;
      for (let i = 0; i < data.length; i += 4 * step) {
        brightnessSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      const meanBrightness = brightnessSum / (data.length / (4 * step));

      if (meanBrightness < 10) {
        if (renderLoopRef.current % 30 === 0) {
          console.debug(`🔦 [FaceRec ${cameraType}] Brightness too low (${meanBrightness.toFixed(2)}), skipping detection.`);
        }
        isProcessingRef.current = false;
        return;
      }

      currentROIRef.current = {
        scaleX: overlayCanvas.width / targetWidth,
        scaleY: overlayCanvas.height / targetHeight
      };

      captureCanvas.toBlob(async (blob) => {
        try {
          const formData = new FormData();
          formData.append('file', blob, 'frame.jpg');
          formData.append('camera_id', cameraId);

          const response = await axios.post(`/face-engine/recognize`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          // 🔍 DIAGNOSTIC LOG
          console.log('🧪 Face Engine Raw Recognition Results:', response.data.results);

          // Axios throws for non-2xx status codes, so we only need to check the data status here.
          // The original `if (!res.ok)` is handled by axios's error throwing.
          // The snippet's `if (response.data.status !== 'success')` is a bit general,
          // so we'll proceed with the existing logic that checks for 'skipped'/'no_motion'
          // and then processes results.

          const responseData = response.data; // Axios response data is directly available
          errorCountRef.current = 0; // Reset consecutive errors on success

          if (responseData.status === 'skipped' || responseData.status === 'no_motion') {
            return;
          }

          const faces = responseData.results || (responseData.employee_id ? [responseData] : []);

          const roi = currentROIRef.current;
          const detectedList = [];
          const now = Date.now();

          for (const face of faces) {
            if (!face.bbox) continue;

            const mappedBbox = [
              face.bbox[0] * roi.scaleX,
              face.bbox[1] * roi.scaleY,
              face.bbox[2] * roi.scaleX,
              face.bbox[3] * roi.scaleY
            ];

            const cx = (face.bbox[0] + face.bbox[2]) / 2;
            const cy = (face.bbox[1] + face.bbox[3]) / 2;
            const spatialKey = `unk_${Math.round(cx / 100)}_${Math.round(cy / 100)}`;
            const isMatch = face.employee_id != null;
            const personKey = isMatch ? face.employee_id : spatialKey;

            // Name Resolution Strategy:
            // 1. Use name from face-engine response (direct DB lookup)
            // 2. Fallback to today's attendance records (populated name)
            // 3. Fallback to master employee list
            // 4. Fallback to ID string
            const empIdStr = face.employee_id?.toString().trim();
            const nameFromEngine = face.employee_name || null;
            const nameFromAttendance = empIdStr ? employeeStatusRef.current[empIdStr]?.employeeName : null;
            const nameFromMaster = empIdStr ? allEmployeesRef.current[empIdStr] : null;

            const knownName = nameFromEngine || nameFromAttendance || nameFromMaster || face.employee_id;
            const displayName = isMatch ? knownName : 'Unknown';
            const color = isMatch ? '#00eeff' : '#ff0055';

            const existing = trackedFacesRef.current.get(personKey);
            if (existing) {
              // Calculate velocity (pixels per second) between the last known target and the new mapped bbox
              const timeDiff = (now - existing.lastSeen) / 1000;
              if (timeDiff > 0 && timeDiff < 1.0) { // Only update velocity if it's a recent track
                existing.velocity = [
                  (mappedBbox[0] - existing.targetBbox[0]) / timeDiff,
                  (mappedBbox[1] - existing.targetBbox[1]) / timeDiff,
                  (mappedBbox[2] - existing.targetBbox[2]) / timeDiff,
                  (mappedBbox[3] - existing.targetBbox[3]) / timeDiff,
                ];
              }

              existing.targetBbox = mappedBbox;
              existing.lastSeen = now;
              if (isMatch) existing.name = displayName;
            } else {
              trackedFacesRef.current.set(personKey, {
                currentBbox: [...mappedBbox],
                targetBbox: [...mappedBbox],
                velocity: [0, 0, 0, 0], // vx1, vy1, vx2, vy2
                name: displayName,
                color,
                lastSeen: now,
                lastRenderTime: now,
                opacity: 1
              });
            }

            detectedList.push({
              name: displayName,
              recognized: isMatch,
              time: new Date().toLocaleTimeString()
            });
            if (isMatch) {
              const personId = face.employee_id;
              if (!lastDetectionRef.current[personId] || now - lastDetectionRef.current[personId] >= 3000) {
                lastDetectionRef.current[personId] = now;
                if (!lastLoggedRef.current[personId] || now - lastLoggedRef.current[personId] > 10000) {
                  // Use the unified logAttendance function to ensure events are dispatched
                  logAttendance(face.employee_id, displayName, face.bbox);
                  lastLoggedRef.current[personId] = now;
                }
              }
            } else {
              // 👤 Unknown Person Logic
              if (!lastUnknownLoggedRef.current[personKey] || now - lastUnknownLoggedRef.current[personKey] > 10000) {
                lastUnknownLoggedRef.current[personKey] = now;
                logUnknownDetection(face.embedding, face.similarity, face.face_image);
              }
            }
          }

          setCurrentDetections(detectedList);

        } catch (err) {
          errorCountRef.current = (errorCountRef.current || 0) + 1;
          if (errorCountRef.current >= 5) {
            console.warn('Backend face-engine is failing repeatedly. Pausing frames for 10 seconds.');
            setTimeout(() => {
              errorCountRef.current = 0;
              isProcessingRef.current = false;
            }, 10000);
            return; // Skip the finally block to hold the lock
          }
        } finally {
          if (errorCountRef.current < 5) {
            isProcessingRef.current = false;
          }
        }
      }, 'image/jpeg', 0.85);

    } catch (err) {
      console.error('FaceRecognition top level catch:', err);
      isProcessingRef.current = false;
    }
  };

  const logAttendance = async (employeeId, employeeName, faceBbox = null) => {
    if (cameraType === 'ROOM') {
      // Room cameras don't log in/out events, they update presence state
      // Also pass faceBbox for DeepSORT track binding
      try {
        await API_INSTANCE.post(`/presence/update`, {
          employeeId,
          employeeName,
          cameraId: cameraId,
          faceBbox: faceBbox || null,
        });
        console.log(`📡 Presence updated for ${employeeName} via ROOM camera`);

        // Show a brief signal in UI that presence was updated
        setStatusMessage({
          type: 'info',
          text: `👀 ${employeeName} seen in room`
        });
        setTimeout(() => setStatusMessage(null), 2000);
      } catch (err) {
        console.error('❌ Room presence update failed:', err);
      }
      return;
    }

    try {
      const endpoint = cameraType === 'in' ? 'in' : 'out';
      const response = await API_INSTANCE.post(`/attendance/${endpoint}`, {
        userId: employeeId,
        employeeName,
        bbox: faceBbox,
        cameraId: cameraId
      });

      if (response.data.success) {
        setStatusMessage({
          type: 'success',
          text: `✅ ${employeeName}: ${response.data.message || 'Success'}`
        });
        // ✅ Signal Dashboard and other components to refresh
        window.dispatchEvent(new CustomEvent('attendance:changed', {
          detail: { employeeId, employeeName, event: endpoint }
        }));
        fetchTodayAttendance();
      } else {
        // Handle logic conflicts (already in/out) that return 200 but success:false
        const msg = response.data.message || 'Attendance log failed';
        const lowerMsg = msg.toLowerCase();
        const isInformational = lowerMsg.includes('already checked in') ||
          lowerMsg.includes('already checked out') ||
          lowerMsg.includes('no entry record');

        setStatusMessage({
          type: isInformational ? 'info' : 'error',
          text: isInformational ? `ℹ️ ${employeeName}: ${msg}` : `❌ ${employeeName}: ${msg}`
        });

        // ✅ Signal Dashboard to show status/error in Recent Activity
        window.dispatchEvent(new CustomEvent(isInformational ? 'attendance:status' : 'attendance:error', {
          detail: {
            employeeId,
            employeeName,
            message: msg,
            time: new Date().toISOString()
          }
        }));
      }
    } catch (err) {
      // Handle actual network errors or server 500s
      const msg = err.response?.data?.message || 'Network error / Server failure';
      console.error(`❌ ${msg}`);

      setStatusMessage({
        type: 'error',
        text: `❌ ${employeeName}: ${msg}`
      });

      // ✅ Signal Dashboard to show error in Recent Activity
      window.dispatchEvent(new CustomEvent('attendance:error', {
        detail: {
          employeeId,
          employeeName,
          message: msg,
          time: new Date().toISOString()
        }
      }));
    } finally {
      // Clear message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const logUnknownDetection = async (descriptor, confidence, faceImage) => {
    try {
      if (!descriptor || !faceImage) return;
  
      const response = await API_INSTANCE.post(`/unknown/log`, {
        descriptor,
        confidence,
        faceImage
      });

      if (response.data.success) {
        console.log(`👤 Unknown person logged: ${response.data.data.unknownId}`);
        // Optional: show a notification if it's a NEW unknown person
        if (response.data.data.isNew) {
          setStatusMessage({
            type: 'info',
            text: `👤 New unknown person detected`
          });
          setTimeout(() => setStatusMessage(null), 3000);
        }
      }
    } catch (err) {
      console.error('❌ Failed to log unknown person:', err);
    }
  };

  return (
    <>
      {statusMessage && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: statusMessage.type === 'success'
            ? 'rgba(30, 123, 78, 0.95)'
            : statusMessage.type === 'info'
              ? 'rgba(12, 121, 161, 0.95)' // Info Blue
              : 'rgba(211, 47, 47, 0.95)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '50px',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <i className={`fas ${statusMessage.type === 'success' ? 'fa-check-circle' : statusMessage.type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'}`}></i>
          {statusMessage.text}
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translate(-50%, 20px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

export default FaceRecognition;