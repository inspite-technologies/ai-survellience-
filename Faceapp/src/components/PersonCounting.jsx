/**
 * PersonCounting.jsx — Room Occupancy Detection
 * 
 * Responsibilities:
 * 1. Capture frames from room cameras at 3-minute intervals.
 * 2. Send frames to Node backend (/api/room/count).
 * 3. Render bounding boxes for all detected persons.
 * 4. Tracks person movement continuity via DeepSORT.
 */

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// 🌐 Persistent timers outside the component to survive re-mounts
const globalLastDetectionTimes = {};
const DETECTION_INTERVAL_MS = 5000; // Room count every 5 seconds for smoother tracking

const drawPersonBox = (canvas, bbox) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const [x1, y1, x2, y2] = bbox;
    const width = x2 - x1;
    const height = y2 - y1;
    const color = '#32a629'; // Green for room occupancy tracking

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x1, y1, width, height);

    // Tag
    ctx.fillStyle = color;
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('PERSON', x1, y1 > 20 ? y1 - 5 : y1 + 15);
};

const PersonCounting = ({ videoSource, overlayCanvas, cameraId = 'room_1', isActive = true }) => {
    const [personCount, setPersonCount] = useState(0);
    const isProcessingRef = useRef(false);
    const apiIntervalRef = useRef(null);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

    // Core detection function
    const runDetection = async (force = false) => {
        if (!videoSource || !overlayCanvas || isProcessingRef.current || !isActive) return;

        // Check if video is actually ready to be captured
        if (videoSource.readyState < 2) { // HAVE_CURRENT_DATA
            if (force) {
                console.log(`⏳ [${cameraId}] Video not ready yet. Retrying in 2s...`);
                setTimeout(() => runDetection(true), 2000);
            }
            return;
        }

        const now = Date.now();
        const lastRun = globalLastDetectionTimes[cameraId] || 0;

        // Throttling: Skip if it's been less than 2 mins, unless forced (on mount)
        if (!force && (now - lastRun < DETECTION_INTERVAL_MS)) {
            return;
        }

        try {
            isProcessingRef.current = true;

            // 1. Capture Frame (1024x576)
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = 1024;
            captureCanvas.height = 576;
            const ctx = captureCanvas.getContext('2d');
            ctx.drawImage(videoSource, 0, 0, captureCanvas.width, captureCanvas.height);

            // Brightness check
            const imageData = ctx.getImageData(0, 0, captureCanvas.width, captureCanvas.height);
            const data = imageData.data;
            let brightnessSum = 0;
            const step = 50;
            for (let i = 0; i < data.length; i += 4 * step) {
                brightnessSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }
            const meanBrightness = brightnessSum / (data.length / (4 * step));

            if (meanBrightness < 10) {
                isProcessingRef.current = false;
                if (force) setTimeout(() => runDetection(true), 5000);
                return;
            }

            const imageBase64 = captureCanvas.toDataURL('image/jpeg', 0.6);

            // 2. Call Node Backend
            const response = await axios.post(`${API_URL}/room/count`, {
                imageBase64,
                cameraId
            });

            if (response.data.success) {
                globalLastDetectionTimes[cameraId] = Date.now();

                const { person_count, bounding_boxes } = response.data;
                setPersonCount(person_count);

                // 3. Render Boxes
                const overlayCtx = overlayCanvas.getContext('2d');
                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

                const scaleX = overlayCanvas.width / captureCanvas.width;
                const scaleY = overlayCanvas.height / captureCanvas.height;

                bounding_boxes.forEach(bbox => {
                    const scaledBbox = [bbox[0] * scaleX, bbox[1] * scaleY, bbox[2] * scaleX, bbox[3] * scaleY];
                    drawPersonBox(overlayCanvas, scaledBbox);
                });

                // Emit event for UI updates
                window.dispatchEvent(new CustomEvent('room:reconcile', {
                    detail: {
                        cameraId,
                        totalRoomCount: response.data.totalRoomCount,
                        expectedCount: response.data.expectedCount,
                        shouldRecognize: response.data.shouldRecognize
                    }
                }));
            }
        } catch (err) {
            console.error(`❌ [${cameraId}] Detection error:`, err.message);
        } finally {
            isProcessingRef.current = false;
        }
    };

    // Life-cycle Management
    useEffect(() => {
        let resizeListener = null;

        if (videoSource && overlayCanvas && isActive) {
            runDetection(true);

            if (apiIntervalRef.current) clearInterval(apiIntervalRef.current);
            apiIntervalRef.current = setInterval(() => runDetection(false), DETECTION_INTERVAL_MS);

            const resize = () => {
                if (!videoSource || !overlayCanvas) return;
                overlayCanvas.width = videoSource.clientWidth || 1280;
                overlayCanvas.height = videoSource.clientHeight || 720;
            };
            resize();
            window.addEventListener('resize', resize);
            resizeListener = resize;

            const handleManualTrigger = () => {
                console.log(`🎯 [${cameraId}] Manual room count triggered`);
                runDetection(true);
            };
            window.addEventListener('room:trigger-manual', handleManualTrigger);

            return () => {
                if (apiIntervalRef.current) clearInterval(apiIntervalRef.current);
                if (resizeListener) window.removeEventListener('resize', resizeListener);
                window.removeEventListener('room:trigger-manual', handleManualTrigger);
                apiIntervalRef.current = null;
            };
        }
    }, [videoSource, overlayCanvas, isActive, cameraId]);

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(0,0,0,0.7)',
            padding: '8px 12px',
            borderRadius: '8px',
            color: '#fff',
            zIndex: 10,
            borderLeft: '4px solid #32a629',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>OCCUPANCY</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {personCount} {personCount === 1 ? 'Person' : 'People'}
            </div>
        </div>
    );
};

export default PersonCounting;
