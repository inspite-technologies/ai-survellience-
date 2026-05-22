import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

/**
 * CameraStream – WebRTC WHEP player
 *
 * Connects to MediaMTX via the WHEP endpoint and renders the
 * live stream in a native <video> element.  An overlay <canvas>
 * is positioned on top for bounding-box rendering by FaceRecognition.
 */
const CameraStream = forwardRef(({ onStreamReady, cameraType = 'in' }, ref) => {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const personOverlayRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const pcRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryCountRef = useRef(0);
  const unmountedRef = useRef(false);

  // MediaMTX WHEP endpoint — configurable via env var
  const MEDIAMTX_URL =
    import.meta.env.VITE_MEDIAMTX_URL || 'http://localhost:8889';
  const streamPath =
    cameraType === 'in' ? 'cam-in' :
      cameraType === 'out' ? 'cam-out' :
        cameraType === 'room' ? 'cam-room' :
          'cam-room2';
  const whepUrl = `${MEDIAMTX_URL}/${streamPath}/whep`;

  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
    getOverlayCanvas: () => overlayRef.current,
    getPersonOverlayCanvas: () => personOverlayRef.current,
  }));

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      cleanup();
    };
  }, [cameraType]);

  // ─── Cleanup ────────────────────────────────────────────────
  const cleanup = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  // ─── Connect via WHEP ───────────────────────────────────────
  const connect = async () => {
    cleanup();
    if (unmountedRef.current) return;

    try {
      console.log(`🎥 [${cameraType.toUpperCase()}] Connecting to ${whepUrl}…`);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // We only receive media
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (event) => {
        if (event.track.kind === 'video' && videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log(`🔗 [${cameraType.toUpperCase()}] ICE: ${state}`);

        if (state === 'connected' || state === 'completed') {
          retryCountRef.current = 0;
          setIsConnected(true);
          setError('');
          if (onStreamReady) onStreamReady();
        }

        if (state === 'failed' || state === 'disconnected') {
          setIsConnected(false);
          scheduleRetry();
        }
      };

      // Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete (or timeout)
      await waitForIceGathering(pc, 2000);

      // POST offer to WHEP endpoint
      const res = await fetch(whepUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription.sdp,
      });

      if (!res.ok) {
        throw new Error(`WHEP ${res.status}: ${res.statusText}`);
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: answerSdp })
      );

      console.log(`✅ [${cameraType.toUpperCase()}] WebRTC session established`);
    } catch (err) {
      console.error(`❌ [${cameraType.toUpperCase()}] Connect error:`, err);
      setError(`Connection failed – retrying…`);
      scheduleRetry();
    }
  };

  // ─── ICE Gathering Helper ──────────────────────────────────
  const waitForIceGathering = (pc, timeout) =>
    new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, timeout);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          resolve();
        }
      };
    });

  // ─── Retry with Exponential Backoff ─────────────────────────
  const scheduleRetry = () => {
    if (unmountedRef.current) return;
    const delay = Math.min(1000 * 2 ** retryCountRef.current, 15000);
    retryCountRef.current += 1;
    console.log(
      `🔄 [${cameraType.toUpperCase()}] Retry #${retryCountRef.current} in ${delay}ms`
    );
    retryTimerRef.current = setTimeout(connect, delay);
  };

  // ─── Camera label / color helpers ───────────────────────────
  const getCameraLabel = () =>
    cameraType === 'in' ? '🚪 IN Camera' : '👋 OUT Camera';
  const getCameraColor = () =>
    cameraType === 'in' ? '#32a629' : '#ff9900';

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 🚀 Robust 16:9 aspect-ratio wrapper */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          aspectRatio: '16 / 9',
          background: '#000',
        }}
      >
        {/* WebRTC <video> element */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill', // Force the video to the 16:9 box to fix "skinned" look
            display: 'block',
            zIndex: 1,
          }}
        />

        {/* Overlay canvas for bounding boxes */}
        <canvas
          ref={overlayRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />

        {/* Separated canvas for person counting to avoid clearRect conflicts */}
        <canvas
          ref={personOverlayRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* Connection status overlay */}
        {!isConnected && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: error ? '#ff4444' : getCameraColor(),
              fontSize: '20px',
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.95)',
              padding: '40px 60px',
              borderRadius: '16px',
              zIndex: 100,
              border: `3px solid ${error ? '#ff4444' : getCameraColor()}`,
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '20px',
                animation: error ? 'none' : 'spin 2s linear infinite',
              }}
            >
              {error ? '⚠️' : '⏳'}
            </div>
            {error || `Connecting to ${getCameraLabel()}…`}
            <div style={{ fontSize: '14px', marginTop: '15px', color: '#888' }}>
              WebRTC HD Mode
            </div>
            <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          `}</style>
          </div>
        )}

        {/* Live indicator badge */}
        {isConnected && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '10px 16px',
              borderRadius: '8px',
              color: getCameraColor(),
              fontSize: '13px',
              fontWeight: 'bold',
              zIndex: 3,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getCameraColor(),
                  animation: 'pulse 2s infinite',
                }}
              />
              <span>{getCameraLabel()}</span>
            </div>
            <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.6; transform: scale(1.2); }
            }
          `}</style>
          </div>
        )}
      </div>{/* end 16:9 wrapper */}
    </div>
  );
});

export default CameraStream;