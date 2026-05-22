import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaChevronDown,
  FaSync,       // Refresh
  FaCamera,     // Capture
  FaCog,        // Settings
  FaExpand,     // Fullscreen
  FaVideo,      // Camera Icon
  FaExclamationTriangle, // Warning/Offline
  FaPlus        // Add new
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL;

const CameraManagement = () => {
  // --- State ---
  const [cameras, setCameras] = useState([]);
  const [stores, setStores] = useState([]); // ✅ Real stores from Store Management
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [selectedStore, setSelectedStore] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Add Camera Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCamera, setNewCamera] = useState({ name: '', store: '', location: '', type: 'general' });

  // Fetch cameras and stores from API
  useEffect(() => {
    fetchCameras();
    fetchStores(); // ✅ Fetch real stores
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCameras, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCameras = async () => {
    try {
      const response = await axios.get(`${API_URL}/cameras`);
      if (response.data.success) {
        setCameras(response.data.cameras);
        if (!selectedCamera && response.data.cameras.length > 0) {
          setSelectedCamera(response.data.cameras[0]);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching cameras:', err);
      setError('Failed to load cameras');
      setLoading(false);
    }
  };

  // ✅ Fetch real stores from Store Management API
  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API_URL}/store`);
      if (response.data.data) {
        const storeNames = response.data.data.map(s => s.storeName).filter(Boolean);
        setStores(storeNames);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  // ✅ Add new camera
  const handleAddCamera = async () => {
    if (!newCamera.name || !newCamera.store || !newCamera.location) {
      alert('Please fill in all fields');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/cameras`, newCamera);
      if (response.data.success) {
        alert('✅ Camera added successfully!');
        fetchCameras();
        setShowAddModal(false);
        setNewCamera({ name: '', store: '', location: '', type: 'general' });
      }
    } catch (err) {
      console.error('Error adding camera:', err);
      alert('❌ Failed to add camera');
    }
  };

  // --- Logic ---
  // ✅ Use real stores from Store Management, with fallback to camera-based stores
  const uniqueStores = ['All', ...new Set([...stores, ...cameras.map(item => item.store)].filter(Boolean))];

  const filteredCameras = selectedStore === 'All'
    ? cameras
    : cameras.filter(camera => camera.store === selectedStore);

  const handleFilterChange = (e) => {
    const store = e.target.value;
    setSelectedStore(store);

    if (store !== 'All') {
      const firstCameraInStore = cameras.find(c => c.store === store);
      if (firstCameraInStore) setSelectedCamera(firstCameraInStore);
    }
  };

  return (
    <div>
      <style>{`
        /* --- Layout --- */
        .camera-layout { display: grid; grid-template-columns: 300px 1fr; gap: 20px; height: calc(100vh - 200px); }
        .camera-list { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 2px 8px rgba(22, 93, 60, 0.08); overflow-y: auto; display: flex; flex-direction: column; }
        
        /* --- Camera Item --- */
        .camera-item { padding: 16px; border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s ease; border: 2px solid transparent; }
        .camera-item:hover { background: #ebf2e9; }
        .camera-item.active { background: #bdf59a; border-color: #165d3c; }
        .camera-store-name { font-size: 14px; font-weight: 600; color: #1a252f; margin-bottom: 4px; }
        .camera-location-name { font-size: 13px; color: #5a6c7d; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .camera-status { display: flex; align-items: center; gap: 6px; font-size: 12px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.online { background: #165d3c; animation: pulse 2s infinite; }
        .status-dot.offline { background: #dc2626; }

        /* --- Viewer --- */
        .camera-viewer { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(22, 93, 60, 0.08); display: flex; flex-direction: column; }
        .viewer-header { margin-bottom: 20px; }
        .viewer-title { font-size: 20px; font-weight: 600; color: #1a252f; margin-bottom: 8px; }
        .viewer-info { display: flex; gap: 20px; font-size: 14px; color: #5a6c7d; }
        .info-item { display: flex; align-items: center; gap: 6px; }
        
        .video-container { flex: 1; background: #000; border-radius: 12px; display: flex; align-items: center; justify-content: center; min-height: 400px; position: relative; overflow: hidden; }
        .video-placeholder { color: #333; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        
        /* --- Buttons with Icons --- */
        .video-controls { display: flex; gap: 12px; margin-top: 16px; }
        .control-btn { 
          display: flex; align-items: center; gap: 8px; /* Spacing between icon and text */
          padding: 10px 20px; 
          background: #165d3c; color: white; 
          border: none; border-radius: 10px; 
          font-weight: 600; cursor: pointer; 
          transition: all 0.2s ease; 
        }
        .control-btn:hover { background: #1e7b4e; }
        .control-btn svg { font-size: 14px; } /* Adjust icon size inside button */

        /* --- Header & Dropdown --- */
        .header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
        .header-titles h2 { font-size: 24px; font-weight: 600; color: #1a252f; margin: 0 0 4px 0; }
        .header-titles p { font-size: 14px; color: #5a6c7d; margin: 0; }

        .filter-wrapper { position: relative; width: 200px; }
        .store-select {
          width: 100%; padding: 10px 16px; font-size: 14px; color: #1a252f;
          background-color: white; border: 1px solid #e2e8f0; border-radius: 10px;
          appearance: none; cursor: pointer; font-weight: 500;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05); outline: none;
        }
        .store-select:focus { border-color: #165d3c; box-shadow: 0 0 0 3px rgba(22, 93, 60, 0.1); }
        .select-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #5a6c7d; pointer-events: none; }

        @media (max-width: 1024px) { .camera-layout { grid-template-columns: 1fr; } .camera-list { max-height: 200px; } .header-section { flex-direction: column; align-items: flex-start; gap: 12px; } }
      `}</style>

      {/* Header */}
      <div className="header-section">
        <div className="header-titles">
          <h2>Camera Management</h2>
          <p>Monitor security feeds across locations</p>
        </div>

        {/* ✅ Add Camera Button */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', background: '#165d3c', color: 'white',
            border: 'none', borderRadius: '10px', fontWeight: '600',
            cursor: 'pointer', marginRight: '16px'
          }}
        >
          <FaPlus /> Add Camera
        </button>

        <div className="filter-wrapper">
          <select
            className="store-select"
            value={selectedStore}
            onChange={handleFilterChange}
          >
            {uniqueStores.map(store => (
              <option key={store} value={store}>
                {store === 'All' ? 'All Stores' : store}
              </option>
            ))}
          </select>
          <FaChevronDown className="select-icon" size={12} />
        </div>
      </div>

      {/* Main Layout */}
      <div className="camera-layout">

        {/* Camera List - Now shows ALL stores from Store Management */}
        <div className="camera-list">
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {selectedStore === 'All' ? `All Stores (${stores.length})` : selectedStore} - {filteredCameras.length} camera{filteredCameras.length !== 1 ? 's' : ''}
          </div>

          {selectedStore === 'All' ? (
            // Show ALL stores from Store Management
            stores.length > 0 ? (
              stores.map(storeName => {
                const storeCameras = cameras.filter(c => c.store === storeName);
                return (
                  <div key={storeName} style={{ marginBottom: '16px' }}>
                    {/* Store Header */}
                    <div style={{
                      fontSize: '13px', fontWeight: '700', color: '#1a252f',
                      padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px',
                      marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span>🏪 {storeName}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{storeCameras.length} cam{storeCameras.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Cameras for this store */}
                    {storeCameras.length > 0 ? (
                      storeCameras.map(camera => (
                        <div
                          key={camera._id || camera.cameraId}
                          className={`camera-item ${selectedCamera?._id === camera._id ? 'active' : ''}`}
                          onClick={() => setSelectedCamera(camera)}
                        >
                          <div className="camera-location-name">
                            <FaVideo size={12} style={{ color: '#94a3b8' }} /> {camera.location}
                          </div>
                          <div className="camera-status">
                            <span className={`status-dot ${camera.status}`}></span>
                            <span style={{ color: camera.status === 'online' ? '#165d3c' : '#dc2626' }}>{camera.status?.toUpperCase()}</span>
                            <span style={{ marginLeft: 'auto', fontSize: '11px' }}>{camera.lastCheck}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', background: '#fefce8', borderRadius: '8px', border: '1px dashed #fbbf24' }}
                        onClick={() => { setNewCamera(prev => ({ ...prev, store: storeName })); setShowAddModal(true); }}
                      >
                        No cameras yet - <span style={{ color: '#165d3c', cursor: 'pointer', fontWeight: '600' }}>+ Add Camera</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No stores found. Create stores in Store Management first.
              </div>
            )
          ) : (
            // Show cameras for selected store only
            filteredCameras.length > 0 ? (
              filteredCameras.map(camera => (
                <div
                  key={camera._id || camera.cameraId}
                  className={`camera-item ${selectedCamera?._id === camera._id ? 'active' : ''}`}
                  onClick={() => setSelectedCamera(camera)}
                >
                  <div className="camera-store-name">{camera.store}</div>
                  <div className="camera-location-name">
                    <FaVideo size={12} style={{ color: '#94a3b8' }} /> {camera.location}
                  </div>
                  <div className="camera-status">
                    <span className={`status-dot ${camera.status}`}></span>
                    <span style={{ color: camera.status === 'online' ? '#165d3c' : '#dc2626' }}>{camera.status?.toUpperCase()}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '11px' }}>{camera.lastCheck}</span>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
                onClick={() => { setNewCamera(prev => ({ ...prev, store: selectedStore })); setShowAddModal(true); }}
              >
                No cameras for this store. <span style={{ color: '#165d3c', fontWeight: '600' }}>+ Add Camera</span>
              </div>
            )
          )}
        </div>

        {/* Camera Viewer */}
        <div className="camera-viewer">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8' }}>
              <FaSync className="fa-spin" /> Loading cameras...
            </div>
          ) : !selectedCamera ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8' }}>
              <FaVideo size={64} style={{ opacity: 0.3, marginBottom: '20px' }} />
              <p>No cameras configured</p>
              <p style={{ fontSize: '12px' }}>Add cameras using the API</p>
            </div>
          ) : (
            <>
              <div className="viewer-header">
                <div className="viewer-title">{selectedCamera.store} - {selectedCamera.location}</div>
                <div className="viewer-info">
                  <span className="info-item"><FaVideo /> {selectedCamera.cameraId || `Cam #${selectedCamera._id}`}</span>
                  <span className="info-item">
                    Status:
                    <strong style={{ color: selectedCamera.status === 'online' ? '#165d3c' : '#dc2626' }}>
                      {selectedCamera.status?.toUpperCase() || 'UNKNOWN'}
                    </strong>
                  </span>
                  <span className="info-item">{selectedCamera.lastCheck}</span>
                </div>
              </div>

              <div className="video-container">
                <div className="video-placeholder">
                  {selectedCamera.status === 'online' ? (
                    <>
                      <FaVideo size={64} style={{ opacity: 0.5, color: 'white' }} />
                      <span style={{ color: '#666', fontSize: '14px' }}>Live Feed</span>
                    </>
                  ) : (
                    <>
                      <FaExclamationTriangle size={64} style={{ opacity: 0.5, color: '#ef4444' }} />
                      <span style={{ color: '#ef4444', fontSize: '14px' }}>Signal Lost</span>
                    </>
                  )}
                </div>
              </div>

              <div className="video-controls">
                <button className="control-btn" onClick={fetchCameras}>
                  <FaSync /> Refresh
                </button>
                <button className="control-btn">
                  <FaCamera /> Capture
                </button>
                <button className="control-btn">
                  <FaCog /> Settings
                </button>
                <button className="control-btn" style={{ marginLeft: 'auto' }}>
                  <FaExpand /> Fullscreen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Add Camera Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            width: '450px', maxWidth: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1a252f' }}>
              <FaPlus style={{ marginRight: '8px', color: '#165d3c' }} />
              Add New Camera
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>
                Camera Name
              </label>
              <input
                type="text"
                placeholder="e.g., Entrance Camera"
                value={newCamera.name}
                onChange={(e) => setNewCamera(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>
                Store (from Store Management)
              </label>
              <select
                value={newCamera.store}
                onChange={(e) => setNewCamera(prev => ({ ...prev, store: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box'
                }}
              >
                <option value="">-- Select a Store --</option>
                {stores.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>
                Location
              </label>
              <input
                type="text"
                placeholder="e.g., Main Entrance, Lobby, Parking"
                value={newCamera.location}
                onChange={(e) => setNewCamera(prev => ({ ...prev, location: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>
                Camera Type
              </label>
              <select
                value={newCamera.type}
                onChange={(e) => setNewCamera(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
                  borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box'
                }}
              >
                <option value="general">General</option>
                <option value="in">IN (Entry Camera)</option>
                <option value="out">OUT (Exit Camera)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 20px', background: '#f1f5f9', color: '#475569',
                  border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCamera}
                style={{
                  padding: '10px 20px', background: '#165d3c', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Add Camera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraManagement;