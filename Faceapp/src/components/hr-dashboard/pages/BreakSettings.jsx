import { useState, useEffect } from 'react';
import './BreakSettings.css';
import {
  getAllBreaks,
  createBreak,
  updateBreak as apiUpdateBreak,
  deleteBreak as apiDeleteBreak,
  toggleBreakStatus as apiToggleBreak,
  getBreakSettings,
  updateBreakSettings
} from '../../services/breakAPI'; // #r Added import

const BreakSettings = () => {
  const [breakSchedules, setBreakSchedules] = useState([]); // #r Initialized as empty
  const [globalSettings, setGlobalSettings] = useState({
    autoDeductBreakTime: true,
    allowFlexibleBreaks: false,
    requireApproval: false,
    sendBreakReminders: true,
    trackBreakLocation: false,
    allowBreakExtension: false,
    maxBreakExtensionMinutes: 5,
    penaltyForOvertime: false,
    notifyManagerOnOvertime: true
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedBreak, setSelectedBreak] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    icon: '☕',
    color: '#1e7b4e',
    startTime: '',
    endTime: '',
    duration: 15,
    isActive: true,
    allowedDays: [],
    isPaid: true,
    maxEmployeesAtOnce: 0,
    description: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const breakIcons = ['☕', '🍽️', '🍪', '🥤', '🍕', '🍔', '☕', '🚬', '💤', '🎮'];

  const breakColors = [
    { value: '#1e7b4e', label: 'Green' },
    { value: '#2e7d32', label: 'Dark Green' },
    { value: '#1976d2', label: 'Blue' },
    { value: '#f57c00', label: 'Orange' },
    { value: '#7b1fa2', label: 'Purple' },
    { value: '#c62828', label: 'Red' },
    { value: '#00897b', label: 'Teal' },
    { value: '#d84315', label: 'Deep Orange' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGlobalSettingChange = (setting) => {
    setGlobalSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter(d => d !== day)
        : [...prev.allowedDays, day]
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '☕',
      color: '#1e7b4e',
      startTime: '',
      endTime: '',
      duration: 15,
      isActive: true,
      allowedDays: [],
      isPaid: true,
      maxEmployeesAtOnce: 0,
      description: ''
    });
  };

  const handleAddBreak = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditBreak = (breakItem) => {
    setSelectedBreak(breakItem);
    setFormData({
      name: breakItem.name,
      icon: breakItem.icon,
      color: breakItem.color,
      startTime: breakItem.startTime,
      endTime: breakItem.endTime,
      duration: breakItem.duration,
      isActive: breakItem.isActive,
      allowedDays: breakItem.allowedDays,
      isPaid: breakItem.isPaid,
      maxEmployeesAtOnce: breakItem.maxEmployeesAtOnce,
      description: breakItem.description
    });
    setShowEditModal(true);
  };

  const handleDeleteBreak = (breakItem) => {
    setSelectedBreak(breakItem);
    setShowDeleteModal(true);
  };

  // #r Fetch data from backend on mount
  useEffect(() => {
    fetchBreaks();
    fetchSettings();
  }, []);

  const fetchBreaks = async () => {
    try {
      const response = await getAllBreaks();
      setBreakSchedules(response.data);
    } catch (err) {
      console.error('Error fetching breaks:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await getBreakSettings();
      if (response.data) setGlobalSettings(response.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const saveBreak = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.startTime || !formData.endTime) {
      alert('⚠️ Please fill in all required fields!');
      return;
    }

    if (formData.allowedDays.length === 0) {
      alert('⚠️ Please select at least one day!');
      return;
    }

    try {
      await createBreak(formData); // #r API Call
      setShowAddModal(false);
      resetForm();
      fetchBreaks(); // #r Refresh list
      alert('✅ Break schedule created successfully!');
    } catch (err) {
      console.error('Error creating break:', err);
      alert('❌ Failed to create break schedule');
    }
  };

  const updateBreak = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.startTime || !formData.endTime) {
      alert('⚠️ Please fill in all required fields!');
      return;
    }

    if (formData.allowedDays.length === 0) {
      alert('⚠️ Please select at least one day!');
      return;
    }

    try {
      await apiUpdateBreak(selectedBreak._id || selectedBreak.id, formData); // #r API Call
      setShowEditModal(false);
      resetForm();
      fetchBreaks(); // #r Refresh list
      alert('✅ Break schedule updated successfully!');
    } catch (err) {
      console.error('Error updating break:', err);
      alert('❌ Failed to update break schedule');
    }
  };

  const confirmDelete = async () => {
    try {
      await apiDeleteBreak(selectedBreak._id || selectedBreak.id); // #r API Call
      setShowDeleteModal(false);
      setSelectedBreak(null);
      fetchBreaks(); // #r Refresh list
      alert('✅ Break schedule deleted successfully!');
    } catch (err) {
      console.error('Error deleting break:', err);
      alert('❌ Failed to delete break schedule');
    }
  };

  const toggleBreakStatus = async (breakId) => {
    try {
      await apiToggleBreak(breakId); // #r API Call
      fetchBreaks(); // #r Refresh list
    } catch (err) {
      console.error('Error toggling break status:', err);
    }
  };

  const saveGlobalSettings = async () => {
    try {
      await updateBreakSettings(globalSettings); // #r API Call
      setShowSettingsModal(false);
      alert('✅ Global settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('❌ Failed to save global settings');
    }
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateTimeSlot = (start, end) => {
    const startDate = new Date(`2000-01-01T${start}`);
    const endDate = new Date(`2000-01-01T${end}`);
    const diffMs = endDate - startDate;
    const diffMins = Math.floor(diffMs / 60000);
    return `${diffMins} min window`;
  };

  const getStats = () => {
    const totalBreaks = breakSchedules.length;
    const activeBreaks = breakSchedules.filter(b => b.isActive).length;
    const totalDuration = breakSchedules
      .filter(b => b.isActive)
      .reduce((sum, b) => sum + (Number(b.duration) || 0), 0); // #r Fixed NaN issue
    const paidBreaks = breakSchedules.filter(b => b.isPaid && b.isActive).length;

    return {
      totalBreaks,
      activeBreaks,
      totalDuration,
      paidBreaks
    };
  };

  const stats = getStats();

  return (
    <div className="break-settings">
      {/* Header */}
      <div className="break-header">
        <div className="break-header-left">
          <h2>
            <i className="fas fa-coffee"></i>
            Break Schedule Settings
          </h2>
          <p>Configure and manage employee break times</p>
        </div>
        <div className="break-header-right">
          <button className="btn-settings" onClick={() => setShowSettingsModal(true)}>
            <i className="fas fa-cog"></i>
            Global Settings
          </button>
          <button className="btn-primary" onClick={handleAddBreak}>
            <i className="fas fa-plus"></i>
            Add Break Schedule
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="break-stats-grid">
        <div className="break-stat-card primary">
          <div className="break-stat-icon">
            <i className="fas fa-list"></i>
          </div>
          <div className="break-stat-content">
            <div className="break-stat-value">{stats.totalBreaks}</div>
            <div className="break-stat-label">Total Breaks</div>
          </div>
        </div>

        <div className="break-stat-card success">
          <div className="break-stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="break-stat-content">
            <div className="break-stat-value">{stats.activeBreaks}</div>
            <div className="break-stat-label">Active Breaks</div>
          </div>
        </div>

        <div className="break-stat-card info">
          <div className="break-stat-icon">
            <i className="far fa-clock"></i>
          </div>
          <div className="break-stat-content">
            <div className="break-stat-value">{stats.totalDuration} min</div>
            <div className="break-stat-label">Total Duration/Day</div>
          </div>
        </div>

        <div className="break-stat-card warning">
          <div className="break-stat-icon">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="break-stat-content">
            <div className="break-stat-value">{stats.paidBreaks}</div>
            <div className="break-stat-label">Paid Breaks</div>
          </div>
        </div>
      </div>

      {/* Break Schedules Grid */}
      <div className="breaks-grid">
        {breakSchedules.map(breakItem => (
          <div
            key={breakItem._id || breakItem.id}
            className={`break-card ${!breakItem.isActive ? 'inactive' : ''}`}
            style={{ borderTopColor: breakItem.color }}
          >
            <div className="break-card-header">
              <div className="break-icon-section">
                <div className="break-emoji" style={{ background: `${breakItem.color}20` }}>
                  {breakItem.icon}
                </div>
                <div className="break-name-section">
                  <h3>{breakItem.name}</h3>
                  <p>{breakItem.description}</p>
                </div>
              </div>
              <div className="break-toggle">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={breakItem.isActive}
                    onChange={() => toggleBreakStatus(breakItem._id || breakItem.id)}
                  />
                  <span className="slider" style={{
                    background: breakItem.isActive ? breakItem.color : '#cbd5e0'
                  }}></span>
                </label>
              </div>
            </div>

            <div className="break-card-body">
              <div className="break-time-info">
                <div className="time-section">
                  <i className="far fa-clock" style={{ color: breakItem.color }}></i>
                  <div>
                    <div className="time-label">Time Window</div>
                    <div className="time-value">
                      {formatTime(breakItem.startTime)} - {formatTime(breakItem.endTime)}
                    </div>
                    <div className="time-slot">{calculateTimeSlot(breakItem.startTime, breakItem.endTime)}</div>
                  </div>
                </div>
              </div>

              <div className="break-details-grid">
                <div className="detail-item">
                  <i className="fas fa-hourglass-half" style={{ color: breakItem.color }}></i>
                  <div>
                    <div className="detail-label">Duration</div>
                    <div className="detail-value">{breakItem.duration || 0} minutes</div>
                  </div>
                </div>

                <div className="detail-item">
                  <i className={`fas ${breakItem.isPaid ? 'fa-dollar-sign' : 'fa-ban'}`} style={{ color: breakItem.color }}></i>
                  <div>
                    <div className="detail-label">Payment</div>
                    <div className="detail-value">{breakItem.isPaid ? 'Paid' : 'Unpaid'}</div>
                  </div>
                </div>

                <div className="detail-item">
                  <i className="fas fa-users" style={{ color: breakItem.color }}></i>
                  <div>
                    <div className="detail-label">Max at Once</div>
                    <div className="detail-value">
                      {breakItem.maxEmployeesAtOnce === 0 ? 'Unlimited' : breakItem.maxEmployeesAtOnce}
                    </div>
                  </div>
                </div>

                <div className="detail-item">
                  <i className="far fa-calendar" style={{ color: breakItem.color }}></i>
                  <div>
                    <div className="detail-label">Active Days</div>
                    <div className="detail-value">{breakItem.allowedDays.length} days</div>
                  </div>
                </div>
              </div>

              <div className="break-days-section">
                <div className="days-grid">
                  {daysOfWeek.map(day => (
                    <div
                      key={day}
                      className={`day-chip ${breakItem.allowedDays.includes(day) ? 'active' : ''}`}
                      style={{
                        background: breakItem.allowedDays.includes(day) ? `${breakItem.color}20` : '#f7fafc',
                        borderColor: breakItem.allowedDays.includes(day) ? breakItem.color : '#e2e8f0',
                        color: breakItem.allowedDays.includes(day) ? breakItem.color : '#a0aec0'
                      }}
                    >
                      {day.substring(0, 3)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="break-card-footer">
              <button
                className="break-action-btn edit"
                onClick={() => handleEditBreak(breakItem)}
              >
                <i className="fas fa-edit"></i>
                Edit
              </button>
              <button
                className="break-action-btn delete"
                onClick={() => handleDeleteBreak(breakItem)}
              >
                <i className="fas fa-trash"></i>
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Add New Card */}
        <div className="break-card add-new" onClick={handleAddBreak}>
          <div className="add-new-content">
            <div className="add-icon">
              <i className="fas fa-plus"></i>
            </div>
            <h3>Add New Break</h3>
            <p>Create a new break schedule</p>
          </div>
        </div>
      </div>

      {/* Add Break Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-plus"></i>
                Add Break Schedule
              </h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={saveBreak}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Break Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Tea Break"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Icon</label>
                    <div className="icon-selector">
                      {breakIcons.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          className={`icon-btn ${formData.icon === icon ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, icon }))}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <select
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                    >
                      {breakColors.map(color => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Start Time <span className="required">*</span>
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      End Time <span className="required">*</span>
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Duration (minutes) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      min="5"
                      max="120"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Employees at Once</label>
                    <input
                      type="number"
                      name="maxEmployeesAtOnce"
                      value={formData.maxEmployeesAtOnce}
                      onChange={handleInputChange}
                      min="0"
                      max="50"
                      placeholder="0 = Unlimited"
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="isPaid"
                        checked={formData.isPaid}
                        onChange={handleInputChange}
                      />
                      <span>Paid Break</span>
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Brief description of this break..."
                      rows="3"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>
                      Allowed Days <span className="required">*</span>
                    </label>
                    <div className="days-selector">
                      {daysOfWeek.map(day => (
                        <button
                          key={day}
                          type="button"
                          className={`day-btn ${formData.allowedDays.includes(day) ? 'active' : ''}`}
                          onClick={() => handleDayToggle(day)}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <i className="fas fa-save"></i>
                  Create Break
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Break Modal */}
      {showEditModal && selectedBreak && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-edit"></i>
                Edit Break Schedule
              </h3>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={updateBreak}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Break Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Icon</label>
                    <div className="icon-selector">
                      {breakIcons.map(icon => (
                        <button
                          key={icon}
                          type="button"
                          className={`icon-btn ${formData.icon === icon ? 'active' : ''}`}
                          onClick={() => setFormData(prev => ({ ...prev, icon }))}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <select
                      name="color"
                      value={formData.color}
                      onChange={handleInputChange}
                    >
                      {breakColors.map(color => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Start Time <span className="required">*</span>
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      End Time <span className="required">*</span>
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Duration (minutes) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      min="5"
                      max="120"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Employees at Once</label>
                    <input
                      type="number"
                      name="maxEmployeesAtOnce"
                      value={formData.maxEmployeesAtOnce}
                      onChange={handleInputChange}
                      min="0"
                      max="50"
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="isPaid"
                        checked={formData.isPaid}
                        onChange={handleInputChange}
                      />
                      <span>Paid Break</span>
                    </label>
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>
                      Allowed Days <span className="required">*</span>
                    </label>
                    <div className="days-selector">
                      {daysOfWeek.map(day => (
                        <button
                          key={day}
                          type="button"
                          className={`day-btn ${formData.allowedDays.includes(day) ? 'active' : ''}`}
                          onClick={() => handleDayToggle(day)}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <i className="fas fa-save"></i>
                  Update Break
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedBreak && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header delete">
              <h3>
                <i className="fas fa-exclamation-triangle"></i>
                Confirm Deletion
              </h3>
              <button className="modal-close-btn" onClick={() => setShowDeleteModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="delete-warning">
                <div className="warning-icon">
                  <div className="warning-emoji">{selectedBreak.icon}</div>
                </div>
                <p>
                  Are you sure you want to delete <strong>{selectedBreak.name}</strong>?
                </p>
                <p className="warning-text">
                  This will remove the break schedule and all associated settings.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={confirmDelete}
              >
                <i className="fas fa-trash"></i>
                Yes, Delete Break
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-cog"></i>
                Global Break Settings
              </h3>
              <button className="modal-close-btn" onClick={() => setShowSettingsModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="settings-list">
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-name">
                      <i className="fas fa-minus-circle"></i>
                      Auto-Deduct Break Time
                    </div>
                    <div className="setting-description">
                      Automatically deduct break time from total working hours
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globalSettings.autoDeductBreakTime}
                      onChange={() => handleGlobalSettingChange('autoDeductBreakTime')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-name">
                      <i className="fas fa-random"></i>
                      Allow Flexible Breaks
                    </div>
                    <div className="setting-description">
                      Employees can take breaks outside scheduled time windows
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globalSettings.allowFlexibleBreaks}
                      onChange={() => handleGlobalSettingChange('allowFlexibleBreaks')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-name">
                      <i className="fas fa-user-check"></i>
                      Require Manager Approval
                    </div>
                    <div className="setting-description">
                      Breaks require manager approval before being granted
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globalSettings.requireApproval}
                      onChange={() => handleGlobalSettingChange('requireApproval')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-name">
                      <i className="fas fa-bell"></i>
                      Send Break Reminders
                    </div>
                    <div className="setting-description">
                      Send notifications to remind employees about break times
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globalSettings.sendBreakReminders}
                      onChange={() => handleGlobalSettingChange('sendBreakReminders')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-name">
                      <i className="fas fa-map-marker-alt"></i>
                      Track Break Location
                    </div>
                    <div className="setting-description">
                      Record employee location when taking breaks
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globalSettings.trackBreakLocation}
                      onChange={() => handleGlobalSettingChange('trackBreakLocation')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-name">
                      <i className="fas fa-clock"></i>
                      Allow Break Extension
                    </div>
                    <div className="setting-description">
                      Employees can extend their break time if needed
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globalSettings.allowBreakExtension}
                      onChange={() => handleGlobalSettingChange('allowBreakExtension')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                {globalSettings.allowBreakExtension && (
                  <div className="setting-item sub-setting">
                    <div className="setting-info">
                      <div className="setting-name">
                        <i className="fas fa-hourglass-half"></i>
                        Max Extension Minutes
                      </div>
                      <div className="setting-description">
                        Maximum additional minutes allowed for break extension
                      </div>
                    </div>
                    <input
                      type="number"
                      className="extension-input"
                      value={globalSettings.maxBreakExtensionMinutes}
                      onChange={(e) => setGlobalSettings(prev => ({
                        ...prev,
                        maxBreakExtensionMinutes: parseInt(e.target.value) || 0
                      }))}
                      min="1"
                      max="30"
                    />
                  </div>
                )}

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-name">
                      <i className="fas fa-exclamation-triangle"></i>
                      Penalty for Overtime
                    </div>
                    <div className="setting-description">
                      Apply penalties when employees exceed break duration
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globalSettings.penaltyForOvertime}
                      onChange={() => handleGlobalSettingChange('penaltyForOvertime')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-name">
                      <i className="fas fa-user-tie"></i>
                      Notify Manager on Overtime
                    </div>
                    <div className="setting-description">
                      Send alert to manager when break time is exceeded
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={globalSettings.notifyManagerOnOvertime}
                      onChange={() => handleGlobalSettingChange('notifyManagerOnOvertime')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowSettingsModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={saveGlobalSettings}
              >
                <i className="fas fa-save"></i>
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreakSettings;