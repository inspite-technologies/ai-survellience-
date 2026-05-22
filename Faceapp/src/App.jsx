import { useState, useEffect, useRef } from 'react';
import CameraStream from './components/CameraStream';
import FaceRecognition from './components/FaceRecognition';
import PersonCounting from './components/PersonCounting';
import RegisteredFaces from './components/RegisteredFaces';
import HRDashboard from './components/hr-dashboard/HRDashboard';
import AdminDashboard from './components/admin-dashboard/adminDashboard';
import LoginPage from './components/login';
import SignupPage from './components/signup';
import { authEvents } from './components/services/axiosClient';
import { requestForToken, onMessageListener, registerTokenWithBackend } from './firebase-config';

import './App.css';

function App() {
  const [view, setView] = useState(() => localStorage.getItem('lastView') || 'login');
  const [role, setRole] = useState(() => localStorage.getItem('role') || null);
  const [activeCamera, setActiveCamera] = useState('in'); // 'in', 'out', or 'room'

  // Camera 1 (IN) states
  const [videoElementIn, setVideoElementIn] = useState(null);
  const [overlayCanvasIn, setOverlayCanvasIn] = useState(null);
  const inCameraRef = useRef(null);

  // Camera 2 (OUT) states
  const [videoElementOut, setVideoElementOut] = useState(null);
  const [overlayCanvasOut, setOverlayCanvasOut] = useState(null);
  const outCameraRef = useRef(null);

  // Camera 3 (ROOM 1) states
  const [videoElementRoom, setVideoElementRoom] = useState(null);
  const [overlayCanvasRoom, setOverlayCanvasRoom] = useState(null);
  const [personOverlayCanvasRoom, setPersonOverlayCanvasRoom] = useState(null);
  const roomCameraRef = useRef(null);

  // Camera 4 (ROOM 2) states
  const [videoElementRoom2, setVideoElementRoom2] = useState(null);
  const [overlayCanvasRoom2, setOverlayCanvasRoom2] = useState(null);
  const [personOverlayCanvasRoom2, setPersonOverlayCanvasRoom2] = useState(null);
  const room2CameraRef = useRef(null);

  const [roomShouldRecognize, setRoomShouldRecognize] = useState(false);

  const [controlsOpen, setControlsOpen] = useState(false);

  // Handle Global Auth Events (401 Unavailable)
  useEffect(() => {
    const handleAuthError = () => {
      handleLogout();
    };

    authEvents.addEventListener('auth:unauthorized', handleAuthError);

    const handleRoomReconcile = (e) => {
      setRoomShouldRecognize(e.detail.shouldRecognize);
    };
    window.addEventListener('room:reconcile', handleRoomReconcile);

    return () => {
      authEvents.removeEventListener('auth:unauthorized', handleAuthError);
      window.removeEventListener('room:reconcile', handleRoomReconcile);
    };
  }, []); // Run once on mount

  // ✅ Firebase Notifications Setup
  useEffect(() => {
    // Initial request
    requestForToken();

    const messageListener = onMessageListener()
      .then((payload) => {
        console.log('🔔 Notification received:', payload);
        if (payload.notification) {
          // You could use a toast library here, but for now we improve the alert
          const { title, body } = payload.notification;
          
          // Basic browser notification if permitted
          if (Notification.permission === 'granted') {
             new Notification(title, { body, icon: '/vite.svg' });
          } else {
             alert(`🔔 ${title}\n${body}`);
          }
        }
      })
      .catch((err) => console.error('❌ [FCM] Message listener failed:', err));

  }, [role, view]); // Re-register/check when user logs in or switches views

  // ✅ Persist View Changes
  useEffect(() => {
    if (view !== 'login' && view !== 'register') {
      localStorage.setItem('lastView', view);
    }
  }, [view]);

  // ✅ Restore session if token exists but states are empty (resilience)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    const savedView = localStorage.getItem('lastView');

    if (token && savedRole) {
      if (!role) setRole(savedRole);
      if (view === 'login' || view === 'register') {
        setView(savedView || savedRole);
      }
    }
  }, []);

  const handleStreamReadyIn = () => {
    if (inCameraRef.current) {
      setVideoElementIn(inCameraRef.current.getVideoElement());
      setOverlayCanvasIn(inCameraRef.current.getOverlayCanvas());
    }
  };

  const handleStreamReadyOut = () => {
    if (outCameraRef.current) {
      setVideoElementOut(outCameraRef.current.getVideoElement());
      setOverlayCanvasOut(outCameraRef.current.getOverlayCanvas());
    }
  };

  const handleStreamReadyRoom = () => {
    if (roomCameraRef.current) {
      setVideoElementRoom(roomCameraRef.current.getVideoElement());
      setOverlayCanvasRoom(roomCameraRef.current.getOverlayCanvas());
      setPersonOverlayCanvasRoom(roomCameraRef.current.getPersonOverlayCanvas());
    }
  };

  const handleStreamReadyRoom2 = () => {
    if (room2CameraRef.current) {
      setVideoElementRoom2(room2CameraRef.current.getVideoElement());
      setOverlayCanvasRoom2(room2CameraRef.current.getOverlayCanvas());
      setPersonOverlayCanvasRoom2(room2CameraRef.current.getPersonOverlayCanvas());
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('lastView');
    setRole(null);
    setView('login');
    setActiveCamera('in');
  };

  return (
    <div className="App">

      {/* ================= AUTHENTICATION VIEWS ================= */}

      {view === 'login' && (
        <LoginPage setView={setView} setRole={setRole} />
      )}

      {view === 'register' && (
        <SignupPage setView={setView} />
      )}

      {/* ================= MAIN APP NAVIGATION ================= */}

      {/* ✅ Only show on HR and Admin pages (not on face recognition - has its own inside) */}
      {view !== 'login' && view !== 'register' && view !== 'face' && (
        <div className="view-toggle-btn">
          <button
            className={view === 'face' ? 'active' : ''}
            onClick={() => setView('face')}
          >
            <i className="fas fa-camera"></i> Face Recognition
          </button>

          <button
            className={view === 'hr' ? 'active' : ''}
            onClick={() => setView('hr')}
          >
            <i className="fas fa-chart-line"></i> HR Dashboard
          </button>

          {role === 'admin' && (
            <button
              className={view === 'admin' ? 'active' : ''}
              onClick={() => setView('admin')}
            >
              <i className="fas fa-cog"></i> Admin Dashboard
            </button>
          )}
        </div>
      )}

      {/* ================= APPLICATION VIEWS ================= */}

      {/* 🎥 BACKGROUND FACE RECOGNITION PIPELINE */}
      {/* This is always mounted so attendance logs in background */}
      <div
        className="face-recognition-background"
        style={{
          visibility: (view === 'face' || view === 'hr' || view === 'admin') ? 'visible' : 'hidden',
          opacity: view === 'face' ? 1 : 0,
          pointerEvents: view === 'face' ? 'auto' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: view === 'face' ? 1000 : -1,
          background: '#000'
        }}
      >
        {/* ✅ CAMERA SELECTOR (Only show in face view) */}
        {view === 'face' && (
          <>
            <div className="view-toggle-btn">
              <button className="active" onClick={() => setView('face')}>
                <i className="fas fa-camera"></i> Face Recognition
              </button>
              <button onClick={() => setView('hr')}>
                <i className="fas fa-chart-line"></i> HR Dashboard
              </button>
              {role === 'admin' && (
                <button onClick={() => setView('admin')}>
                  <i className="fas fa-cog"></i> Admin Dashboard
                </button>
              )}
            </div>

            <div className="camera-selector">
              <button
                className={activeCamera === 'in' ? 'active' : ''}
                onClick={() => setActiveCamera('in')}
              >
                <i className="fas fa-door-open"></i> IN Camera
              </button>
              <button
                className={activeCamera === 'out' ? 'active' : ''}
                onClick={() => setActiveCamera('out')}
              >
                <i className="fas fa-door-closed"></i> OUT Camera
              </button>
              <button
                className={activeCamera === 'room' ? 'active' : ''}
                onClick={() => setActiveCamera('room')}
              >
                <i className="fas fa-users"></i> ROOM 1
              </button>
              <button
                className={activeCamera === 'room2' ? 'active' : ''}
                onClick={() => setActiveCamera('room2')}
              >
                <i className="fas fa-users"></i> ROOM 2
              </button>
            </div>

            <button
              className="settings-btn"
              onClick={() => setControlsOpen(!controlsOpen)}
            >
              <i className="fas fa-cog"></i>
            </button>

            {controlsOpen && (
              <div className="backdrop" onClick={() => setControlsOpen(false)}></div>
            )}

            <div className={`controls-panel ${controlsOpen ? 'open' : ''}`}>
              <div className="controls-header">
                <h3><i className="fas fa-sliders-h"></i> Control Panel</h3>
                <button className="close-btn" onClick={() => setControlsOpen(false)}>×</button>
              </div>
              <RegisteredFaces />
            </div>
          </>
        )}

        {/* ✅ ALWAYS MOUNTED STREAMS */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          opacity: (view === 'face' && activeCamera === 'in') ? 1 : 0,
          zIndex: (view === 'face' && activeCamera === 'in') ? 1 : 0,
          pointerEvents: (view === 'face' && activeCamera === 'in') ? 'auto' : 'none'
        }}>
          <CameraStream
            ref={inCameraRef}
            onStreamReady={handleStreamReadyIn}
            cameraType="in"
          />
        </div>

        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          opacity: (view === 'face' && activeCamera === 'out') ? 1 : 0,
          zIndex: (view === 'face' && activeCamera === 'out') ? 1 : 0,
          pointerEvents: (view === 'face' && activeCamera === 'out') ? 'auto' : 'none'
        }}>
          <CameraStream
            ref={outCameraRef}
            onStreamReady={handleStreamReadyOut}
            cameraType="out"
          />
        </div>

        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          opacity: (view === 'face' && activeCamera === 'room') ? 1 : 0,
          zIndex: (view === 'face' && activeCamera === 'room') ? 1 : 0,
          pointerEvents: (view === 'face' && activeCamera === 'room') ? 'auto' : 'none'
        }}>
          <CameraStream
            ref={roomCameraRef}
            onStreamReady={handleStreamReadyRoom}
            cameraType="room"
          />
        </div>

        <div style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          opacity: (view === 'face' && activeCamera === 'room2') ? 1 : 0,
          zIndex: (view === 'face' && activeCamera === 'room2') ? 1 : 0,
          pointerEvents: (view === 'face' && activeCamera === 'room2') ? 'auto' : 'none'
        }}>
          <CameraStream
            ref={room2CameraRef}
            onStreamReady={handleStreamReadyRoom2}
            cameraType="room2"
          />
        </div>

        {/* ✅ ALWAYS ACTIVE RECOGNITION LOGIC — Invisible but executing (no display:none to avoid throttling) */}
        <div style={{
          position: 'absolute',
          width: 0,
          height: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0
        }}>
          {videoElementIn && overlayCanvasIn && (
            <FaceRecognition
              videoSource={videoElementIn}
              overlayCanvas={overlayCanvasIn}
              cameraType="in"
              isActive={view !== 'login' && view !== 'register'} /* Only active after login */
            />
          )}

          {videoElementOut && overlayCanvasOut && (
            <FaceRecognition
              videoSource={videoElementOut}
              overlayCanvas={overlayCanvasOut}
              cameraId="out"
              cameraType="out"
              isActive={view !== 'login' && view !== 'register'} /* Only active after login */
            />
          )}

          {videoElementRoom && overlayCanvasRoom && personOverlayCanvasRoom && (
            <>
              <PersonCounting
                videoSource={videoElementRoom}
                overlayCanvas={personOverlayCanvasRoom}
                cameraId="room_1"
                isActive={view !== 'login' && view !== 'register'}
              />
              <FaceRecognition
                videoSource={videoElementRoom}
                overlayCanvas={overlayCanvasRoom}
                cameraId="room_1"
                cameraType="ROOM"
                isActive={(view !== 'login' && view !== 'register') && roomShouldRecognize}
              />
            </>
          )}

          {videoElementRoom2 && overlayCanvasRoom2 && personOverlayCanvasRoom2 && (
            <>
              <PersonCounting
                videoSource={videoElementRoom2}
                overlayCanvas={personOverlayCanvasRoom2}
                cameraId="room_2"
                isActive={view !== 'login' && view !== 'register'}
              />
              <FaceRecognition
                videoSource={videoElementRoom2}
                overlayCanvas={overlayCanvasRoom2}
                cameraId="room_2"
                cameraType="ROOM"
                isActive={(view !== 'login' && view !== 'register') && roomShouldRecognize}
              />
            </>
          )}
        </div>
      </div>

      {/* 🧑‍💼 HR DASHBOARD */}
      {view === 'hr' && <HRDashboard onLogout={handleLogout} />}

      {/* 🛠 ADMIN DASHBOARD */}
      {view === 'admin' && <AdminDashboard onLogout={handleLogout} />}

    </div>
  );
}

export default App;