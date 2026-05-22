import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaCog, FaUsers, FaBell, FaSave, FaShieldAlt, FaEnvelope, FaMoneyBillWave, FaSpinner, FaCheck, FaTimes, FaPlus, FaEdit, FaTrash
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL;

const Settings = () => {
  // --- State for Interactivity ---
  const [notifications, setNotifications] = useState({
    email: true,
    salary: true,
    performance: false
  });

  const [config, setConfig] = useState({
    companyName: 'Retail Corp',
    timezone: 'Asia/Kolkata',
    defaultStore: 'All Stores'
  });

  const [stores, setStores] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Role modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('view'); // 'view', 'edit', 'add'
  const [selectedRole, setSelectedRole] = useState(null);

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Reset system state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  // Fetch settings, stores, and roles on mount
  useEffect(() => {
    fetchSettings();
    fetchStores();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/roles`);
      if (response.data.success) {
        setRoles(response.data.roles);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
      // If roles not initialized, try to initialize them
      try {
        await axios.post(`${API_URL}/roles/init`);
        const retryResponse = await axios.get(`${API_URL}/roles`);
        if (retryResponse.data.success) {
          setRoles(retryResponse.data.roles);
        }
      } catch (initErr) {
        console.error('Error initializing roles:', initErr);
      }
    }
  };

  const handleManageRole = (role) => {
    setSelectedRole(role);
    setRoleModalMode('view');
    setShowRoleModal(true);
  };

  const handleEditRole = () => {
    setRoleModalMode('edit');
  };

  const handleAddRole = () => {
    setSelectedRole({
      name: '',
      accessLevel: 'Basic Access',
      permissions: {},
      description: ''
    });
    setRoleModalMode('add');
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    try {
      if (roleModalMode === 'add') {
        await axios.post(`${API_URL}/roles`, selectedRole);
        alert('✅ Role created successfully!');
      } else {
        await axios.put(`${API_URL}/roles/${selectedRole._id}`, selectedRole);
        alert('✅ Role updated successfully!');
      }
      fetchRoles();
      setShowRoleModal(false);
    } catch (err) {
      console.error('Error saving role:', err);
      alert('❌ ' + (err.response?.data?.message || 'Failed to save role'));
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await axios.delete(`${API_URL}/roles/${roleId}`);
      alert('✅ Role deleted successfully!');
      fetchRoles();
      setShowRoleModal(false);
    } catch (err) {
      console.error('Error deleting role:', err);
      alert('❌ ' + (err.response?.data?.message || 'Failed to delete role'));
    }
  };

  // Change Password Handler
  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      alert('Please fill in all password fields');
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      alert('New passwords do not match');
      return;
    }
    if (passwordData.new.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);
    try {
      await axios.put(`${API_URL}/auth/change-password`, {
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });
      alert('✅ Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err) {
      console.error('Error changing password:', err);
      alert('❌ ' + (err.response?.data?.message || 'Failed to change password'));
    } finally {
      setPasswordSaving(false);
    }
  };

  // Reset System Handler
  const handleResetSystem = async () => {
    if (resetConfirmText !== 'RESET') {
      alert('Please type RESET to confirm');
      return;
    }

    setResetting(true);
    try {
      // Reset settings to defaults
      await axios.post(`${API_URL}/settings/init`);
      // Re-fetch settings
      await fetchSettings();
      alert('✅ System settings reset to defaults!');
      setShowResetModal(false);
      setResetConfirmText('');
    } catch (err) {
      console.error('Error resetting system:', err);
      alert('❌ Failed to reset system');
    } finally {
      setResetting(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      if (response.data.success && response.data.settings) {
        const s = response.data.settings;
        setConfig({
          companyName: s.companyName || 'Retail Corp',
          timezone: s.timezone || 'Asia/Kolkata',
          defaultStore: s.defaultStore || 'All Stores'
        });
        setNotifications({
          email: s['notifications.email'] ?? true,
          salary: s['notifications.salary'] ?? true,
          performance: s['notifications.reports'] ?? false
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get(`${API_URL}/store`);
      if (response.data.data) {
        setStores(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/settings/bulk`, {
        settings: {
          companyName: config.companyName,
          timezone: config.timezone,
          defaultStore: config.defaultStore,
          'notifications.email': notifications.email,
          'notifications.salary': notifications.salary,
          'notifications.reports': notifications.performance
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('❌ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // --- Handlers ---
  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column' }}>
        <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '40px', color: '#16a34a' }} />
        <p style={{ marginTop: '16px', color: '#64748b' }}>Loading settings...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="settings-wrapper">
      <style>{`
        * { box-sizing: border-box; }
        
        .settings-wrapper {
          /* --- Color System (Clean White/Gray with Green Accents) --- */
          --primary: #16a34a;        /* Green 600 */
          --primary-hover: #15803d;  /* Green 700 */
          
          --bg-light: #f8fafc;       /* Neutral Slate-50 (Was Green Tint) */
          --bg-card: #ffffff;
          
          --text-dark: #1e293b;      /* Slate-800 */
          --text-muted: #64748b;     /* Slate-500 */
          
          --border: #e2e8f0;         /* Neutral Gray Border (Was Green Border) */
          --radius: 12px;
          --shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Neutral Shadow (Was Green Shadow) */
          
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: var(--bg-light);
          min-height: 100vh;
        }

        /* --- Header --- */
        .page-header { margin-bottom: 24px; }
        .page-title { 
          font-size: 26px; font-weight: 700; color: var(--text-dark); margin: 0 0 6px 0; letter-spacing: -0.5px;
        }
        .page-subtitle { 
          font-size: 15px; color: var(--text-muted); margin: 0; 
        }

        /* --- Grid Layout --- */
        .settings-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        /* --- Cards --- */
        .card {
          background: var(--bg-card);
          border-radius: var(--radius);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          margin-bottom: 24px;
          overflow: hidden;
        }
        .card-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
        }
        .card-title {
          font-size: 16px; font-weight: 600; color: var(--text-dark); margin: 0;
        }
        .card-icon { color: var(--primary); font-size: 18px; }
        .card-body { padding: 24px; }

        /* --- Table Styling --- */
        .table-container { overflow-x: auto; }
        .role-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 500px; }
        
        .role-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
        }
        
        .role-table td {
          padding: 16px;
          font-size: 14px;
          color: var(--text-dark);
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        
        /* Actions Alignment */
        .role-table th:last-child,
        .role-table td:last-child {
          text-align: right;
        }
        
        .role-table tr:last-child td { border-bottom: none; }
        
        /* --- Manage Button (Green Accent) --- */
        .btn-manage {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 16px;
          font-size: 13px;
          font-weight: 500;
          color: var(--primary);      
          background: white;
          border: 1px solid var(--primary);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-manage:hover {
          background: var(--primary);
          color: white;
          box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
        }

        /* --- Badges --- */
        .role-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
        }
        .badge-full { background: #dcfce7; color: #15803d; }
        .badge-high { background: #ccfbf1; color: #0f766e; }
        .badge-medium { background: #f1f5f9; color: #475569; }
        .badge-basic { background: white; color: var(--text-muted); border: 1px solid #e2e8f0; }

        /* --- Toggles & Forms --- */
        .setting-item { 
          display: flex; justify-content: space-between; align-items: center; 
          padding: 16px 0; border-bottom: 1px solid var(--border);
        }
        .setting-item:last-child { border-bottom: none; }
        
        .toggle-switch { 
          position: relative; width: 48px; height: 26px; 
          background: #cbd5e1; border-radius: 13px; cursor: pointer; transition: 0.3s; 
        }
        .toggle-switch.active { background: var(--primary); }
        .toggle-knob { 
          position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; 
          background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); 
        }
        .toggle-switch.active .toggle-knob { left: 25px; }

        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 13px; font-weight: 600; color: var(--text-dark); margin-bottom: 8px; }
        .form-input {
          width: 100%; padding: 10px 14px; border-radius: 8px; 
          border: 1px solid #e2e8f0; font-size: 14px; color: var(--text-dark); transition: 0.2s;
        }
        .form-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1); }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 20px; border-radius: 8px; font-weight: 500; font-size: 14px;
          cursor: pointer; transition: 0.2s; border: none;
        }
        .btn-primary { background: var(--primary); color: white; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2); }
        .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
        
        .btn-outline {
          background: white; border: 1px solid #e2e8f0; color: var(--text-dark);
          padding: 6px 12px; font-size: 13px; width: 100%; justify-content: flex-start;
        }
        .btn-outline:hover { background: #f8fafc; border-color: var(--primary); color: var(--primary); }

        @media (max-width: 968px) {
          .settings-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* HEADER */}
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage system configuration, user roles, and preferences</p>
      </div>

      <div className="settings-grid">

        {/* LEFT COLUMN */}
        <div className="left-column">

          {/* USER ROLES SECTION */}
          <div className="card">
            <div className="card-header">
              <FaUsers className="card-icon" />
              <h3 className="card-title">User Roles & Permissions</h3>
              <button
                className="btn-manage"
                onClick={handleAddRole}
                style={{ marginLeft: 'auto' }}
              >
                <FaPlus /> Add Role
              </button>
            </div>
            <div className="table-container">
              <table className="role-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Access Level</th>
                    <th>Users</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length > 0 ? roles.map(role => (
                    <tr key={role._id}>
                      <td><strong>{role.name}</strong></td>
                      <td>
                        <span className={`role-badge ${role.accessLevel === 'Full Access' ? 'badge-full' :
                          role.accessLevel === 'High Access' ? 'badge-high' :
                            role.accessLevel === 'Medium Access' ? 'badge-medium' : 'badge-basic'
                          }`}>
                          {role.accessLevel}
                        </span>
                      </td>
                      <td>{role.userCount || 0}</td>
                      <td><button className="btn-manage" onClick={() => handleManageRole(role)}>Manage</button></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>
                        Loading roles...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <FaCog className="card-icon" />
              <h3 className="card-title">System Configuration</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  className="form-input"
                  value={config.companyName}
                  onChange={handleConfigChange}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Time Zone</label>
                  <select
                    className="form-input"
                    name="timezone"
                    value={config.timezone}
                    onChange={handleConfigChange}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Default Store</label>
                  <select
                    className="form-input"
                    name="defaultStore"
                    value={config.defaultStore}
                    onChange={handleConfigChange}
                  >
                    <option value="All Stores">All Stores</option>
                    {stores.map(store => (
                      <option key={store._id} value={store.storeName}>{store.storeName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                {saveSuccess && (
                  <span style={{ color: '#16a34a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaCheck /> Saved!
                  </span>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  style={{ opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSave />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div >

        {/* RIGHT COLUMN */}
        < div className="right-column" >
          <div className="card">
            <div className="card-header">
              <FaBell className="card-icon" />
              <h3 className="card-title">Notifications</h3>
            </div>
            <div style={{ padding: '0 24px' }}>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>Email Alerts</h4>
                  <p>Security & updates</p>
                </div>
                <div
                  className={`toggle-switch ${notifications.email ? 'active' : ''}`}
                  onClick={() => toggleNotification('email')}
                >
                  <div className="toggle-knob"></div>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Salary Requests</h4>
                  <p>Approval notifications</p>
                </div>
                <div
                  className={`toggle-switch ${notifications.salary ? 'active' : ''}`}
                  onClick={() => toggleNotification('salary')}
                >
                  <div className="toggle-knob"></div>
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Reports</h4>
                  <p>Weekly summaries</p>
                </div>
                <div
                  className={`toggle-switch ${notifications.performance ? 'active' : ''}`}
                  onClick={() => toggleNotification('performance')}
                >
                  <div className="toggle-knob"></div>
                </div>
              </div>
            </div>

            <div className="card-body" style={{ background: '#f8fafc', borderTop: '1px solid var(--border)', padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>
                Quick Actions
              </div>
              <button
                className="btn btn-outline"
                style={{ marginBottom: '8px' }}
                onClick={() => setShowPasswordModal(true)}
              >
                <FaShieldAlt style={{ color: '#64748b' }} /> Change Password
              </button>
              <button
                className="btn btn-outline"
                style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fff' }}
                onClick={() => setShowResetModal(true)}
              >
                <FaCog style={{ color: '#dc2626' }} /> Reset System
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ROLE MANAGE MODAL */}
      {showRoleModal && selectedRole && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            width: '500px', maxWidth: '90%', maxHeight: '80vh', overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1a252f' }}>
                <FaUsers style={{ marginRight: '8px', color: '#16a34a' }} />
                {roleModalMode === 'add' ? 'Add New Role' : roleModalMode === 'edit' ? 'Edit Role' : 'Role Details'}
              </h3>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                <FaTimes />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Role Name</label>
              <input
                type="text"
                value={selectedRole.name || ''}
                disabled={roleModalMode === 'view'}
                onChange={(e) => setSelectedRole(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Access Level</label>
              <select
                value={selectedRole.accessLevel || 'Basic Access'}
                disabled={roleModalMode === 'view'}
                onChange={(e) => setSelectedRole(prev => ({ ...prev, accessLevel: e.target.value }))}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
              >
                <option value="Full Access">Full Access</option>
                <option value="High Access">High Access</option>
                <option value="Medium Access">Medium Access</option>
                <option value="Basic Access">Basic Access</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Description</label>
              <textarea
                value={selectedRole.description || ''}
                disabled={roleModalMode === 'view'}
                onChange={(e) => setSelectedRole(prev => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '60px', boxSizing: 'border-box' }}
              />
            </div>

            {roleModalMode === 'view' && selectedRole.userCount > 0 && (
              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '16px' }}>
                <strong>{selectedRole.userCount}</strong> users have this role
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              {roleModalMode === 'view' ? (
                <>
                  <button onClick={() => setShowRoleModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Close
                  </button>
                  <button onClick={handleEditRole} style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    <FaEdit /> Edit
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowRoleModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  {roleModalMode === 'edit' && !['Administrator', 'HR Manager', 'Store Manager', 'Employee'].includes(selectedRole.name) && (
                    <button onClick={() => handleDeleteRole(selectedRole._id)} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                      <FaTrash /> Delete
                    </button>
                  )}
                  <button onClick={handleSaveRole} style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    <FaSave /> Save
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            width: '400px', maxWidth: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#1a252f' }}>
                <FaShieldAlt style={{ marginRight: '8px', color: '#16a34a' }} />
                Change Password
              </h3>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                <FaTimes />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Current Password</label>
              <input
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>New Password</label>
              <input
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleChangePassword} disabled={passwordSaving} style={{ padding: '10px 20px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: passwordSaving ? 0.7 : 1 }}>
                {passwordSaving ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET SYSTEM MODAL */}
      {showResetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '24px',
            width: '400px', maxWidth: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#dc2626' }}>
                <FaCog style={{ marginRight: '8px', color: '#dc2626' }} />
                Reset System Settings
              </h3>
              <button onClick={() => setShowResetModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fecaca' }}>
              <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
                ⚠️ This will reset all system settings to their default values. This action cannot be undone.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>
                Type <strong>RESET</strong> to confirm
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Type RESET"
                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowResetModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleResetSystem}
                disabled={resetting || resetConfirmText !== 'RESET'}
                style={{
                  padding: '10px 20px', background: '#dc2626', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  opacity: (resetting || resetConfirmText !== 'RESET') ? 0.5 : 1
                }}
              >
                {resetting ? 'Resetting...' : 'Reset System'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;