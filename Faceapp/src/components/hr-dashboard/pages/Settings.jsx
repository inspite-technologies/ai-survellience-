import { useState, useEffect } from 'react';
import axios from 'axios';
import './Settings.css';
import { useSettings } from '../../../context/SettingsContext';

const API_URL = import.meta.env.VITE_API_URL;

const Settings = () => {
  const { updateSettings: updateGlobalSettings, refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Tech Solutions Inc.',
    companyEmail: 'contact@techsolutions.com',
    companyPhone: '+1 555-0123',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    currency: 'USD'
  });

  // Attendance Settings
  const [attendanceSettings, setAttendanceSettings] = useState({
    enableFaceRecognition: true,
    autoCheckOut: true,
    autoCheckOutTime: '18:00',
    lateArrivalThreshold: 15,
    earlyDepartureThreshold: 15,
    requireCheckOutApproval: false,
    allowManualCorrection: true,
    geoFencing: false,
    maxCheckInRadius: 100,
    trackBreakTime: true,
    companyWorkingHours: 8 // Default 8 hours
  });

  // Leave Settings
  const [leaveSettings, setLeaveSettings] = useState({
    requireApproval: true,
    autoApproveAfterDays: 0,
    allowNegativeBalance: false,
    carryForwardLeaves: true,
    maxCarryForward: 5,
    leaveRequestDeadline: 2,
    halfDayLeaveEnabled: true,
    emergencyLeaveEnabled: true,
    maxConsecutiveDays: 30
  });

  // HIDDEN from UI - Salary Settings (state kept for code integrity, tab hidden)
  const [salarySettings, setSalarySettings] = useState({
    payrollFrequency: 'monthly',
    paymentDay: 1,
    taxRate: 15,
    overtimeEnabled: true,
    overtimeMultiplier: 1.5,
    bonusEnabled: true,
    allowancesEnabled: true,
    autoProcessSalary: false,
    salarySlipEmail: true
  });

  // HIDDEN from UI - Notification Settings (state kept for code integrity, tab hidden)
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    attendanceAlerts: true,
    leaveAlerts: true,
    salaryAlerts: true,
    systemAlerts: true,
    weeklyDigest: true,
    monthlyReport: true
  });

  // HIDDEN from UI - Security Settings (state kept for code integrity, tab hidden)
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    minPasswordLength: 8,
    requireSpecialChar: true,
    requireNumber: true,
    requireUppercase: true,
    loginAttempts: 5,
    ipWhitelist: false,
    auditLog: true
  });

  // HIDDEN from UI - Appearance Settings (state kept for code integrity, tab hidden)
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    primaryColor: '#1e7b4e',
    fontSize: 'medium',
    compactMode: false,
    sidebarCollapsed: false,
    showAnimations: true,
    highContrast: false
  });

  // Only show General, Attendance, and Leave tabs
  const tabs = [
    { id: 'general', label: 'General', icon: 'fa-cog' },
    { id: 'attendance', label: 'Attendance', icon: 'fa-calendar-check' },
    { id: 'leave', label: 'Leave', icon: 'fa-plane-departure' }
    /* HIDDEN tabs - commented out as per user request
    { id: 'salary', label: 'Salary', icon: 'fa-dollar-sign' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-bell' },
    { id: 'security', label: 'Security', icon: 'fa-shield-alt' },
    { id: 'appearance', label: 'Appearance', icon: 'fa-palette' }
    */
  ];

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney'
  ];

  // Fetch settings from backend on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      if (response.data.success && response.data.settings) {
        const s = response.data.settings;
        // Update generalSettings from backend
        if (s['hr.general']) {
          setGeneralSettings(prev => ({ ...prev, ...JSON.parse(s['hr.general']) }));
        }
        // Update attendanceSettings from backend
        if (s['hr.attendance']) {
          setAttendanceSettings(prev => ({ ...prev, ...JSON.parse(s['hr.attendance']) }));
        }
        // Update leaveSettings from backend
        if (s['hr.leave']) {
          setLeaveSettings(prev => ({ ...prev, ...JSON.parse(s['hr.leave']) }));
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' }
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD'];

  const handleGeneralChange = (field, value) => {
    setGeneralSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAttendanceChange = (field, value) => {
    setAttendanceSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLeaveChange = (field, value) => {
    setLeaveSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSalaryChange = (field, value) => {
    setSalarySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field, value) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field, value) => {
    setSecuritySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAppearanceChange = (field, value) => {
    setAppearanceSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveSettings = async () => {
    setIsSaving(true);

    try {
      // Save settings to backend
      await axios.put(`${API_URL}/settings/bulk`, {
        settings: {
          'hr.general': JSON.stringify(generalSettings),
          'hr.attendance': JSON.stringify(attendanceSettings),
          'hr.leave': JSON.stringify(leaveSettings)
        }
      });

      // Update global context so all components immediately use new settings
      updateGlobalSettings(generalSettings);
      // Refresh settings from backend to ensure sync
      refreshSettings();

      alert('✅ Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('❌ Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        // Reset settings to defaults
        setGeneralSettings({
          companyName: 'Tech Solutions Inc.',
          companyEmail: 'contact@techsolutions.com',
          companyPhone: '+1 555-0123',
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          language: 'en',
          currency: 'USD'
        });
        setAttendanceSettings({
          enableFaceRecognition: true,
          autoCheckOut: true,
          autoCheckOutTime: '18:00',
          lateArrivalThreshold: 15,
          earlyDepartureThreshold: 15,
          requireCheckOutApproval: false,
          allowManualCorrection: true,
          geoFencing: false,
          maxCheckInRadius: 100,
          trackBreakTime: true
        });
        setLeaveSettings({
          requireApproval: true,
          autoApproveAfterDays: 0,
          allowNegativeBalance: false,
          carryForwardLeaves: true,
          maxCarryForward: 5,
          leaveRequestDeadline: 2,
          halfDayLeaveEnabled: true,
          emergencyLeaveEnabled: true,
          maxConsecutiveDays: 30
        });
        alert('✅ Settings reset to defaults!');
      } catch (err) {
        console.error('Error resetting settings:', err);
        alert('❌ Failed to reset settings');
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="settings-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#1e7b4e' }}></i>
          <p style={{ marginTop: '16px', color: '#64748b' }}>Loading settings...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-left">
          <h2>
            <i className="fas fa-cog"></i>
            Settings
          </h2>

        </div>
        <div className="settings-header-right">
          <button className="btn-reset" onClick={resetToDefaults}>
            <i className="fas fa-undo"></i>
            Reset to Defaults
          </button>
          <button
            className="btn-primary"
            onClick={saveSettings}
            disabled={isSaving}
          >
            <i className={isSaving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Settings Content */}
      <div className="settings-container">
        {/* Sidebar Tabs */}
        <div className="settings-sidebar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="settings-content">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3>
                <i className="fas fa-building"></i>
                General Settings
              </h3>

              <div className="settings-group">
                <h4>Company Information</h4>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Company Name</label>
                    <input
                      type="text"
                      value={generalSettings.companyName}
                      onChange={(e) => handleGeneralChange('companyName', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Company Email</label>
                    <input
                      type="email"
                      value={generalSettings.companyEmail}
                      onChange={(e) => handleGeneralChange('companyEmail', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Company Phone</label>
                    <input
                      type="tel"
                      value={generalSettings.companyPhone}
                      onChange={(e) => handleGeneralChange('companyPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Regional Settings</h4>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Timezone</label>
                    <select
                      value={generalSettings.timezone}
                      onChange={(e) => handleGeneralChange('timezone', e.target.value)}
                    >
                      {timezones.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Date Format</label>
                    <select
                      value={generalSettings.dateFormat}
                      onChange={(e) => handleGeneralChange('dateFormat', e.target.value)}
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Time Format</label>
                    <select
                      value={generalSettings.timeFormat}
                      onChange={(e) => handleGeneralChange('timeFormat', e.target.value)}
                    >
                      <option value="12h">12 Hour</option>
                      <option value="24h">24 Hour</option>
                    </select>
                  </div>



                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      value={generalSettings.currency}
                      onChange={(e) => handleGeneralChange('currency', e.target.value)}
                    >
                      {currencies.map(curr => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Settings */}
          {activeTab === 'attendance' && (
            <div className="settings-section">
              <h3>
                <i className="fas fa-calendar-check"></i>
                Attendance Settings
              </h3>

              <div className="settings-group">
                <h4>Check-In/Check-Out</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Enable Face Recognition</div>
                      <div className="setting-desc">Use AI face recognition for attendance</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={attendanceSettings.enableFaceRecognition}
                        onChange={(e) => handleAttendanceChange('enableFaceRecognition', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Auto Check-Out</div>
                      <div className="setting-desc">Automatically check out employees at end of day</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={attendanceSettings.autoCheckOut}
                        onChange={(e) => handleAttendanceChange('autoCheckOut', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  {attendanceSettings.autoCheckOut && (
                    <div className="setting-item nested">
                      <div className="setting-info">
                        <div className="setting-name">Auto Check-Out Time</div>
                      </div>
                      <input
                        type="time"
                        value={attendanceSettings.autoCheckOutTime}
                        onChange={(e) => handleAttendanceChange('autoCheckOutTime', e.target.value)}
                        className="time-input"
                      />
                    </div>
                  )}

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Require Check-Out Approval</div>
                      <div className="setting-desc">Manager must approve check-out time</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={attendanceSettings.requireCheckOutApproval}
                        onChange={(e) => handleAttendanceChange('requireCheckOutApproval', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Allow Manual Correction</div>
                      <div className="setting-desc">Employees can request attendance corrections</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={attendanceSettings.allowManualCorrection}
                        onChange={(e) => handleAttendanceChange('allowManualCorrection', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Track Break Time</div>
                      <div className="setting-desc">Monitor and log employee breaks</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={attendanceSettings.trackBreakTime}
                        onChange={(e) => handleAttendanceChange('trackBreakTime', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Thresholds & Rules</h4>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Company Working Hours (per day)</label>
                    <input
                      type="number"
                      value={attendanceSettings.companyWorkingHours || 8}
                      onChange={(e) => handleAttendanceChange('companyWorkingHours', parseFloat(e.target.value))}
                      min="1"
                      max="24"
                      step="0.5"
                    />
                  </div>

                  <div className="form-group">
                    <label>Late Arrival Threshold (minutes)</label>
                    <input
                      type="number"
                      value={attendanceSettings.lateArrivalThreshold}
                      onChange={(e) => handleAttendanceChange('lateArrivalThreshold', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Early Departure Threshold (minutes)</label>
                    <input
                      type="number"
                      value={attendanceSettings.earlyDepartureThreshold}
                      onChange={(e) => handleAttendanceChange('earlyDepartureThreshold', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* HIDDEN - Location Tracking section (commented out as per user request)
              <div className="settings-group">
                <h4>Location Tracking</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Enable Geo-Fencing</div>
                      <div className="setting-desc">Restrict check-in to specific locations</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={attendanceSettings.geoFencing}
                        onChange={(e) => handleAttendanceChange('geoFencing', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  {attendanceSettings.geoFencing && (
                    <div className="setting-item nested">
                      <div className="setting-info">
                        <div className="setting-name">Max Check-In Radius (meters)</div>
                      </div>
                      <input
                        type="number"
                        value={attendanceSettings.maxCheckInRadius}
                        onChange={(e) => handleAttendanceChange('maxCheckInRadius', parseInt(e.target.value))}
                        min="10"
                        className="number-input"
                      />
                    </div>
                  )}
                </div>
              </div>
              */}
            </div>
          )}

          {/* Leave Settings */}
          {activeTab === 'leave' && (
            <div className="settings-section">
              <h3>
                <i className="fas fa-plane-departure"></i>
                Leave Settings
              </h3>

              <div className="settings-group">
                <h4>Leave Policies</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Require Manager Approval</div>
                      <div className="setting-desc">All leave requests need manager approval</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={leaveSettings.requireApproval}
                        onChange={(e) => handleLeaveChange('requireApproval', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Allow Negative Balance</div>
                      <div className="setting-desc">Employees can take leave beyond balance</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={leaveSettings.allowNegativeBalance}
                        onChange={(e) => handleLeaveChange('allowNegativeBalance', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Carry Forward Leaves</div>
                      <div className="setting-desc">Unused leaves carry to next year</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={leaveSettings.carryForwardLeaves}
                        onChange={(e) => handleLeaveChange('carryForwardLeaves', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Half Day Leave</div>
                      <div className="setting-desc">Enable half-day leave requests</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={leaveSettings.halfDayLeaveEnabled}
                        onChange={(e) => handleLeaveChange('halfDayLeaveEnabled', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Emergency Leave</div>
                      <div className="setting-desc">Allow emergency leave without advance notice</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={leaveSettings.emergencyLeaveEnabled}
                        onChange={(e) => handleLeaveChange('emergencyLeaveEnabled', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Leave Limits</h4>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Auto-Approve After (days, 0 = disabled)</label>
                    <input
                      type="number"
                      value={leaveSettings.autoApproveAfterDays}
                      onChange={(e) => handleLeaveChange('autoApproveAfterDays', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Carry Forward Days</label>
                    <input
                      type="number"
                      value={leaveSettings.maxCarryForward}
                      onChange={(e) => handleLeaveChange('maxCarryForward', parseInt(e.target.value))}
                      min="0"
                      disabled={!leaveSettings.carryForwardLeaves}
                    />
                  </div>

                  <div className="form-group">
                    <label>Request Deadline (days in advance)</label>
                    <input
                      type="number"
                      value={leaveSettings.leaveRequestDeadline}
                      onChange={(e) => handleLeaveChange('leaveRequestDeadline', parseInt(e.target.value))}
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Consecutive Days</label>
                    <input
                      type="number"
                      value={leaveSettings.maxConsecutiveDays}
                      onChange={(e) => handleLeaveChange('maxConsecutiveDays', parseInt(e.target.value))}
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Salary Settings */}
          {activeTab === 'salary' && (
            <div className="settings-section">
              <h3>
                <i className="fas fa-dollar-sign"></i>
                Salary Settings
              </h3>

              <div className="settings-group">
                <h4>Payroll Configuration</h4>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Payroll Frequency</label>
                    <select
                      value={salarySettings.payrollFrequency}
                      onChange={(e) => handleSalaryChange('payrollFrequency', e.target.value)}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Day (of month)</label>
                    <input
                      type="number"
                      value={salarySettings.paymentDay}
                      onChange={(e) => handleSalaryChange('paymentDay', parseInt(e.target.value))}
                      min="1"
                      max="31"
                    />
                  </div>

                  <div className="form-group">
                    <label>Default Tax Rate (%)</label>
                    <input
                      type="number"
                      value={salarySettings.taxRate}
                      onChange={(e) => handleSalaryChange('taxRate', parseFloat(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Overtime Multiplier</label>
                    <input
                      type="number"
                      value={salarySettings.overtimeMultiplier}
                      onChange={(e) => handleSalaryChange('overtimeMultiplier', parseFloat(e.target.value))}
                      min="1"
                      max="3"
                      step="0.1"
                      disabled={!salarySettings.overtimeEnabled}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Salary Components</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Enable Overtime</div>
                      <div className="setting-desc">Include overtime pay in salary calculation</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={salarySettings.overtimeEnabled}
                        onChange={(e) => handleSalaryChange('overtimeEnabled', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Enable Bonuses</div>
                      <div className="setting-desc">Allow bonus additions to salary</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={salarySettings.bonusEnabled}
                        onChange={(e) => handleSalaryChange('bonusEnabled', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Enable Allowances</div>
                      <div className="setting-desc">Include allowances in salary</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={salarySettings.allowancesEnabled}
                        onChange={(e) => handleSalaryChange('allowancesEnabled', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Automation</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Auto-Process Salary</div>
                      <div className="setting-desc">Automatically process salary on payment day</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={salarySettings.autoProcessSalary}
                        onChange={(e) => handleSalaryChange('autoProcessSalary', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Email Salary Slips</div>
                      <div className="setting-desc">Send salary slip via email automatically</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={salarySettings.salarySlipEmail}
                        onChange={(e) => handleSalaryChange('salarySlipEmail', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h3>
                <i className="fas fa-bell"></i>
                Notification Settings
              </h3>

              <div className="settings-group">
                <h4>Notification Channels</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Email Notifications</div>
                      <div className="setting-desc">Receive notifications via email</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Push Notifications</div>
                      <div className="setting-desc">Browser push notifications</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushNotifications}
                        onChange={(e) => handleNotificationChange('pushNotifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">SMS Notifications</div>
                      <div className="setting-desc">Receive SMS alerts for important events</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.smsNotifications}
                        onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Alert Types</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Attendance Alerts</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.attendanceAlerts}
                        onChange={(e) => handleNotificationChange('attendanceAlerts', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Leave Alerts</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.leaveAlerts}
                        onChange={(e) => handleNotificationChange('leaveAlerts', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Salary Alerts</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.salaryAlerts}
                        onChange={(e) => handleNotificationChange('salaryAlerts', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">System Alerts</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.systemAlerts}
                        onChange={(e) => handleNotificationChange('systemAlerts', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Digest & Reports</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Weekly Digest</div>
                      <div className="setting-desc">Receive weekly summary email</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.weeklyDigest}
                        onChange={(e) => handleNotificationChange('weeklyDigest', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Monthly Report</div>
                      <div className="setting-desc">Receive monthly analytics report</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={notificationSettings.monthlyReport}
                        onChange={(e) => handleNotificationChange('monthlyReport', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h3>
                <i className="fas fa-shield-alt"></i>
                Security Settings
              </h3>

              <div className="settings-group">
                <h4>Authentication</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Two-Factor Authentication</div>
                      <div className="setting-desc">Require 2FA for all users</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.twoFactorAuth}
                        onChange={(e) => handleSecurityChange('twoFactorAuth', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">IP Whitelist</div>
                      <div className="setting-desc">Restrict access to whitelisted IPs</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.ipWhitelist}
                        onChange={(e) => handleSecurityChange('ipWhitelist', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Audit Log</div>
                      <div className="setting-desc">Track all system activities</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.auditLog}
                        onChange={(e) => handleSecurityChange('auditLog', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Session Management</h4>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
                      min="5"
                      max="480"
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Login Attempts</label>
                    <input
                      type="number"
                      value={securitySettings.loginAttempts}
                      onChange={(e) => handleSecurityChange('loginAttempts', parseInt(e.target.value))}
                      min="3"
                      max="10"
                    />
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Password Policy</h4>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Password Expiry (days)</label>
                    <input
                      type="number"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) => handleSecurityChange('passwordExpiry', parseInt(e.target.value))}
                      min="30"
                      max="365"
                    />
                  </div>

                  <div className="form-group">
                    <label>Minimum Password Length</label>
                    <input
                      type="number"
                      value={securitySettings.minPasswordLength}
                      onChange={(e) => handleSecurityChange('minPasswordLength', parseInt(e.target.value))}
                      min="6"
                      max="20"
                    />
                  </div>
                </div>

                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Require Special Character</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.requireSpecialChar}
                        onChange={(e) => handleSecurityChange('requireSpecialChar', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Require Number</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.requireNumber}
                        onChange={(e) => handleSecurityChange('requireNumber', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Require Uppercase</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.requireUppercase}
                        onChange={(e) => handleSecurityChange('requireUppercase', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h3>
                <i className="fas fa-palette"></i>
                Appearance Settings
              </h3>

              <div className="settings-group">
                <h4>Theme</h4>
                <div className="theme-selector">
                  <div
                    className={`theme-option ${appearanceSettings.theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleAppearanceChange('theme', 'light')}
                  >
                    <div className="theme-preview light">
                      <div className="preview-bar"></div>
                      <div className="preview-content"></div>
                    </div>
                    <div className="theme-name">Light</div>
                  </div>

                  <div
                    className={`theme-option ${appearanceSettings.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleAppearanceChange('theme', 'dark')}
                  >
                    <div className="theme-preview dark">
                      <div className="preview-bar"></div>
                      <div className="preview-content"></div>
                    </div>
                    <div className="theme-name">Dark</div>
                  </div>

                  <div
                    className={`theme-option ${appearanceSettings.theme === 'auto' ? 'active' : ''}`}
                    onClick={() => handleAppearanceChange('theme', 'auto')}
                  >
                    <div className="theme-preview auto">
                      <div className="preview-bar"></div>
                      <div className="preview-content"></div>
                    </div>
                    <div className="theme-name">Auto</div>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Customization</h4>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Primary Color</label>
                    <input
                      type="color"
                      value={appearanceSettings.primaryColor}
                      onChange={(e) => handleAppearanceChange('primaryColor', e.target.value)}
                      className="color-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Font Size</label>
                    <select
                      value={appearanceSettings.fontSize}
                      onChange={(e) => handleAppearanceChange('fontSize', e.target.value)}
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h4>Display Options</h4>
                <div className="settings-toggle-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Compact Mode</div>
                      <div className="setting-desc">Reduce spacing for denser layout</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={appearanceSettings.compactMode}
                        onChange={(e) => handleAppearanceChange('compactMode', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Collapsed Sidebar</div>
                      <div className="setting-desc">Start with sidebar collapsed</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={appearanceSettings.sidebarCollapsed}
                        onChange={(e) => handleAppearanceChange('sidebarCollapsed', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">Show Animations</div>
                      <div className="setting-desc">Enable UI animations and transitions</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={appearanceSettings.showAnimations}
                        onChange={(e) => handleAppearanceChange('showAnimations', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-name">High Contrast</div>
                      <div className="setting-desc">Increase contrast for better visibility</div>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={appearanceSettings.highContrast}
                        onChange={(e) => handleAppearanceChange('highContrast', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;