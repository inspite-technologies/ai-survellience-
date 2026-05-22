import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Clock,
  UserCheck,
  UserX,
  Coffee,
  Search,
  RefreshCw,
  RefreshCcw,
  FileDown,
  UserSearch,
  AlertTriangle,
  Activity,
  Info,
  X,
  Plus,
  Phone
} from 'lucide-react';
import './LiveAttendance.css';

const LiveAttendance = ({ globalSearchQuery, selectedStore }) => {
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [fraudSuspects, setFraudSuspects] = useState([]);
  const [suspectIds, setSuspectIds] = useState(new Set());
  const [presenceStatus, setPresenceStatus] = useState(null);
  const [breakSchedules, setBreakSchedules] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchLiveAttendance();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Auto-refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      if (autoRefresh) {
        fetchLiveAttendance();
      }
    }, 10000);

    // Listen for real-time attendance events
    const handleAttendanceChange = () => {
      console.log('🔄 Live attendance update triggered by event');
      fetchLiveAttendance();
    };

    window.addEventListener('attendance:changed', handleAttendanceChange);

    return () => {
      clearInterval(timeInterval);
      clearInterval(refreshInterval);
      window.removeEventListener('attendance:changed', handleAttendanceChange);
    };
  }, [autoRefresh]);

  // Sync global search
  useEffect(() => {
    if (typeof globalSearchQuery === 'string') {
      setSearchQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  useEffect(() => {
    filterData();
  }, [attendanceData, searchQuery, statusFilter, selectedStore]);

  const fetchLiveAttendance = async () => {
    setRefreshing(true);
    // Force a room count update across all cameras
    window.dispatchEvent(new CustomEvent('room:trigger-manual'));
    try {
      const [facesRes, todayRes, fraudRes, statusRes, breaksRes] = await Promise.all([
        axios.get(`${API_URL}/faces`),
        axios.get(`${API_URL}/attendance/today`),
        axios.get(`${API_URL}/presence/fraud-suspects`).catch(() => ({ data: { suspects: [] } })),
        axios.get(`${API_URL}/presence/status`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/break`).catch(() => ({ data: [] }))
      ]);

      // Set presence status for headcount discrepancy alert
      setPresenceStatus(statusRes?.data || null);
      setBreakSchedules(Array.isArray(breaksRes?.data?.data) ? breaksRes.data.data : (Array.isArray(breaksRes?.data) ? breaksRes.data : []));

      // Fraud suspects — build a Set of suspect employee IDs
      const suspectData = fraudRes?.data?.suspects || [];
      setFraudSuspects(suspectData);
      const suspectIdSet = new Set(suspectData.map(s => s.employee_id?.toString()));
      setSuspectIds(suspectIdSet);

      const allEmployees = Array.isArray(facesRes.data) ? facesRes.data : [];
      const liveAttendance = todayRes.data.summaries || [];

      // Create live attendance array
      const liveData = allEmployees.map(employee => {
        const record = liveAttendance.find(r =>
          (r.userId?._id || r.userId)?.toString() === employee._id.toString()
        );

        let status = 'ABSENT';
        let timeIn = null;
        let timeOut = null;
        let duration = '0h 0m';
        let currentSession = null;
        let breakType = 'none';

        if (record) {
          // Robust status derivation with fallback for legacy data
          status = record.currentStatus ? (record.currentStatus === 'in' ? 'IN' : 'OUT') : (record.firstIn && !record.lastOut ? 'IN' : 'OUT');

          timeIn = record.firstIn ? new Date(record.firstIn) : null;
          timeOut = record.lastOut ? new Date(record.lastOut) : null;
          breakType = record.breakType || 'none';

          let totalMins = record.totalMinutes || 0;

          if (status === 'IN') {
            // Use lastInTime if available, else fallback to firstIn
            const startTime = record.lastInTime ? new Date(record.lastInTime) : (record.firstIn ? new Date(record.firstIn) : null);
            if (startTime) {
              const currentSessionMinutes = Math.floor((new Date() - startTime) / 60000);
              totalMins += currentSessionMinutes;

              currentSession = {
                startTime: startTime,
                duration: calculateDuration(startTime, new Date())
              };
            }
          }

          // Format dynamic total hours
          const h = Math.floor(totalMins / 60);
          const m = totalMins % 60;
          duration = `${h}h ${m}m`;
        }

        const detectedEmployeeIds = new Set(
          statusRes?.data?.detected_inside?.employees?.map(e => (e.employee_id?._id || e.employee_id)?.toString()) || []
        );

        const employeeData = {
          id: employee._id,
          name: employee.name,
          phone: employee.phone,
          storeName: employee.storeName,
          branchName: employee.branchName,
          department: employee.department,
          status,
          timeIn,
          timeOut,
          duration,
          currentSession,
          breakType,
          totalMinutes: 0,
          sessions: [],
          isSuspect: suspectIdSet.has(employee._id?.toString()),
          suspectInfo: suspectData.find(s => s.employee_id?.toString() === employee._id?.toString()) || null,
          isLate: record?.isLate || false,
          lateByMinutes: record?.lateByMinutes || 0,
          isDetected: detectedEmployeeIds.has(employee._id?.toString())
        };

        // 🕒 Check if it's currently a scheduled break time
        const now = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = days[now.getDay()];
        const currentTimeStr = now.toTimeString().slice(0, 5); // "HH:mm"

        const isCurrentlyBreak = statusRes?.data?.active_break?.isBreak || (Array.isArray(breakSchedules) && breakSchedules.some(b =>
          b.isActive &&
          b.allowedDays.includes(currentDay) &&
          b.startTime <= currentTimeStr &&
          b.endTime >= currentTimeStr
        ));

        // Logic for status override (Switch IN -> BREAK/OUT if evidence suggests they are gone)
        // 1. GLOBAL: Room is officially empty (failsafe for all staff)
        const isRoomEmpty = statusRes?.data?.camera_count === 0 && statusRes?.data?.expected_inside?.count > 0;

        // 2. INDIVIDUAL: Employee is specifically flagged as a suspect (missing for >5 mins)
        const isLongMissing = employeeData.isSuspect && !employeeData.isDetected;

        if (employeeData.status === 'IN' && (isRoomEmpty || isLongMissing)) {
          if (isCurrentlyBreak) {
            employeeData.status = 'BREAK';
          } else {
            employeeData.status = 'OUT';
          }
        } else if (employeeData.status === 'OUT' && isCurrentlyBreak) {
          // If they are checked out and it's break time, label it as BREAK
          employeeData.status = 'BREAK';
        }

        // Minutes out calculation for warnings
        if (employeeData.status === 'OUT' || employeeData.status === 'BREAK') {
          // If they were just manually moved or camera missed them, use a default fallback
          // if timeOut (from backend) is missing or very old
          const effectiveTimeOut = employeeData.timeOut || new Date();
          const minutesOut = Math.floor((new Date() - effectiveTimeOut) / 60000);
          employeeData.minutesOut = minutesOut;

          if (employeeData.status === 'OUT' && minutesOut > 15) {
            employeeData.isLongAbsence = true;
          }
        }

        return employeeData;
      });

      setEmployees(allEmployees);
      setAttendanceData(liveData);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      console.error('Error fetching live attendance:', err);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const filterData = () => {
    let filtered = [...attendanceData];

    // Store Filter
    if (selectedStore && selectedStore !== 'All Stores') {
      filtered = filtered.filter(emp =>
        (emp.storeName === selectedStore) ||
        (emp.branchName === selectedStore) ||
        (emp.department === selectedStore)
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'SUSPECT') {
      filtered = filtered.filter(emp => emp.isSuspect);
    } else if (statusFilter === 'LATE') {
      filtered = filtered.filter(emp => emp.isLate);
    } else if (statusFilter === 'BREAK') {
      filtered = filtered.filter(emp => emp.status === 'BREAK');
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }

    setFilteredData(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'IN': return '#165d3c';
      case 'OUT': return '#f59e0b';
      case 'BREAK': return '#3b82f6';
      case 'ABSENT': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status, isSuspect) => {
    if (isSuspect) return UserSearch;
    switch (status) {
      case 'IN': return UserCheck;
      case 'OUT': return Coffee;
      case 'BREAK': return Coffee;
      case 'ABSENT': return UserX;
      default: return Users;
    }
  };

  const getBreakIcon = (breakType) => {
    switch (breakType) {
      case 'tea': return '☕';
      case 'lunch': return '🍽️';
      case 'snacks': return '🍪';
      case 'other': return '⏸️';
      default: return '';
    }
  };

  const getBreakLabel = (breakType) => {
    switch (breakType) {
      case 'tea': return 'Tea Break';
      case 'lunch': return 'Lunch Break';
      case 'snacks': return 'Snacks Break';
      case 'other': return 'Break';
      default: return '';
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleManualCheckIn = async (employeeId, employeeName) => {
    if (!window.confirm(`Manually check in ${employeeName}?`)) return;

    try {
      const response = await axios.post(`${API_URL}/attendance/in`, {
        userId: employeeId,
        employeeName
      });

      if (response.data.success) {
        alert(`✅ ${employeeName} checked in successfully!`);
        // ✅ Signal Dashboard and other components to refresh
        window.dispatchEvent(new CustomEvent('attendance:changed', {
          detail: { employeeId, employeeName, event: 'in' }
        }));
        fetchLiveAttendance();
      }
    } catch (err) {
      console.error('Manual check-in error:', err);
      alert('❌ Failed to check in. ' + (err.response?.data?.message || 'Server error'));
    }
  };

  const handleManualCheckOut = async (employeeId, employeeName) => {
    if (!window.confirm(`Manually check out ${employeeName}?`)) return;

    try {
      const response = await axios.post(`${API_URL}/attendance/out`, {
        userId: employeeId,
        employeeName
      });

      if (response.data.success) {
        const { sessionDuration, breakLabel, todayTotal } = response.data.data;
        alert(`✅ ${employeeName} checked out!\nSession: ${sessionDuration}\nBreak: ${breakLabel}\nToday Total: ${todayTotal}`);
        // ✅ Signal Dashboard and other components to refresh
        window.dispatchEvent(new CustomEvent('attendance:changed', {
          detail: { employeeId, employeeName, event: 'out' }
        }));
        fetchLiveAttendance();
      }
    } catch (err) {
      console.error('Manual check-out error:', err);
      alert('❌ Failed to check out. ' + (err.response?.data?.message || 'Server error'));
    }
  };

  // #r Stats should filter by STORE but not by SEARCH/STATUS
  const statsData = (selectedStore && selectedStore !== 'All Stores')
    ? attendanceData.filter(emp =>
      (emp.storeName === selectedStore) ||
      (emp.branchName === selectedStore) ||
      (emp.department === selectedStore)
    )
    : attendanceData;

  const stats = {
    total: statsData.length,
    present: statsData.filter(e => e.status === 'IN').length,
    absent: statsData.filter(e => e.status === 'ABSENT').length,
    onBreak: statsData.filter(e => e.status === 'OUT' || e.status === 'BREAK').length,
    late: statsData.filter(e => e.isLate).length,
    suspects: statsData.filter(e => e.isSuspect).length,
    totalPresent: statsData.filter(e => e.status === 'IN' || e.status === 'OUT').length
  };

  // ✅ Export to Excel (CSV format)
  const exportToExcel = () => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');

    // CSV Header
    const headers = ['#', 'Employee Name', 'Status', 'First In', 'Last Out', 'Current Session', 'Total Hours'];

    // CSV Rows
    const rows = filteredData.map((emp, index) => [
      index + 1,
      emp.name,
      emp.status,
      emp.timeIn ? formatTime(emp.timeIn) : '-',
      emp.timeOut ? formatTime(emp.timeOut) : '-',
      emp.currentSession ? emp.currentSession.duration : '-',
      emp.duration
    ]);

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Live_Attendance_${today}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    alert(`✅ Exported ${filteredData.length} records to Excel!`);
  };

  const format24to12 = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className="live-attendance">
      <div className="live-top-section">
        <div className="live-header-compact">
          <div className="live-title-area">
            <div className="live-title-main">
              <h2>
                <Activity size={20} className="title-icon" /> Live Attendance
                <div className="live-indicator-pill">
                  <div className="live-dot"></div>
                  LIVE
                </div>
              </h2>
              <div className="live-time-compact">
                <Clock size={14} />
                <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="date-separator">•</span>
                <span>{currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            <div className="header-stats-grid">
              <div className="compact-stat">
                <span className="c-stat-value">{stats.total}</span>
                <span className="c-stat-label">Total</span>
              </div>
              <div className="compact-stat total-present">
                <span className="c-stat-value">{stats.totalPresent}</span>
                <span className="c-stat-label">T. Present</span>
              </div>
              <div className="compact-stat present">
                <span className="c-stat-value">{stats.present}</span>
                <span className="c-stat-label">Present</span>
              </div>
              <div className="compact-stat gone-out">
                <span className="c-stat-value">{stats.onBreak}</span>
                <span className="c-stat-label">Gone Out</span>
              </div>
              <div className="compact-stat absent">
                <span className="c-stat-value">{stats.absent}</span>
                <span className="c-stat-label">Absent</span>
              </div>
              {stats.suspects > 0 && (
                <div className="compact-stat suspect">
                  <span className="c-stat-value">{stats.suspects}</span>
                  <span className="c-stat-label">Suspects</span>
                </div>
              )}
              <div className="compact-stat detected">
                <span className="c-stat-value">{presenceStatus?.camera_count || 0}</span>
                <span className="c-stat-label">Detected</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button
              className={`refresh-toggle ${autoRefresh ? 'active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Disable Auto-Refresh' : 'Enable Auto-Refresh'}
            >
              <RefreshCw size={16} className={autoRefresh ? 'spin' : ''} />
              <span>{autoRefresh ? 'Live' : 'Paused'}</span>
            </button>
            <button className="export-minimal" onClick={exportToExcel} title="Export CSV">
              <FileDown size={16} />
              <span>Export</span>
            </button>
            <button className="refresh-btn-main" onClick={fetchLiveAttendance} disabled={refreshing}>
              <RefreshCcw size={16} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* 🚨 Alerts - Now more compact */}
        {presenceStatus && (
          <div className="compact-alerts">
            {presenceStatus.camera_count < presenceStatus.expected_inside?.count &&
              presenceStatus.checkout_count === 0 &&
              !presenceStatus.active_break?.isBreak && (
                <div className="alert-pill danger">
                  <AlertTriangle size={14} />
                  <span>Missing Person (Detected {presenceStatus.camera_count}/{presenceStatus.expected_inside.count})</span>
                </div>
              )}

            {presenceStatus.camera_count > presenceStatus.expected_inside?.count && (
              <div className="alert-pill warning unauthorized-alert">
                <UserSearch size={14} />
                <span>
                  <strong>Unauthorized Presence:</strong> {presenceStatus.camera_count} persons detected, {presenceStatus.expected_inside?.count} checked-in, {presenceStatus.camera_count - presenceStatus.expected_inside?.count} unauthorized/unknown
                </span>
              </div>
            )}

            {presenceStatus.active_break?.isBreak && (
              <div className="alert-pill info">
                <Coffee size={14} />
                <span>Scheduled {presenceStatus.active_break.name}</span>
              </div>
            )}

            {/* Empty Room Alerts */}
            {presenceStatus.camera_count === 0 && presenceStatus.expected_inside?.count > 0 && (
              <div className={`alert-pill ${presenceStatus.active_break?.isBreak ? 'info' : 'warning'} empty-room-alert`}>
                <Clock size={14} />
                <span>
                  {presenceStatus.active_break?.isBreak
                    ? `Break Time - All Staff Out (${presenceStatus.active_break.name})`
                    : 'Office Empty - All Staff Gone Out'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="controls-bar-compact">
        <div className="search-box-compact">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pills-compact">
          <button
            className={`pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <span className="pill-count">{stats.total}</span>
          </button>
          <button
            className={`pill-btn ${statusFilter === 'IN' ? 'active' : ''}`}
            onClick={() => setStatusFilter('IN')}
          >
            Present <span className="pill-count">{stats.present}</span>
          </button>
          <button
            className={`pill-btn ${statusFilter === 'OUT' ? 'active' : ''}`}
            onClick={() => setStatusFilter('OUT')}
          >
            Break <span className="pill-count">{stats.onBreak}</span>
          </button>
          <button
            className={`pill-btn ${statusFilter === 'ABSENT' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ABSENT')}
          >
            Absent <span className="pill-count">{stats.absent}</span>
          </button>
          <button
            className={`pill-btn ${statusFilter === 'LATE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('LATE')}
          >
            Late <span className="pill-count">{stats.late}</span>
          </button>
          {stats.suspects > 0 && (
            <button
              className={`pill-btn suspect ${statusFilter === 'SUSPECT' ? 'active' : ''}`}
              onClick={() => setStatusFilter('SUSPECT')}
            >
              Suspects <span className="pill-count">{stats.suspects}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Attendance Table */}
      <div className="live-table-container">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={40} className="spin" />
            <p>Loading live attendance...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Info size={40} />
            </div>
            <p>No employees found</p>
            {searchQuery && (
              <button className="clear-filters-btn" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="live-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>First In</th>
                  <th>Last Out</th>
                  <th>Current Session</th>
                  <th>Total Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((employee, index) => {
                  const StatusIcon = getStatusIcon(employee.status, employee.isSuspect);
                  return (
                    <tr key={employee.id} className={`status-${employee.status.toLowerCase()}`}>
                      <td>{index + 1}</td>

                      <td>
                        <div className="employee-cell">
                          <div
                            className="employee-avatar"
                            style={{ background: getStatusColor(employee.status) }}
                          >
                            {employee.name.charAt(0)}
                          </div>
                          <div className="employee-info">
                            <div className="employee-name">{employee.name}</div>
                            <div className="employee-id">{employee.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="status-cell">
                          <span
                            className="status-badge"
                            style={{
                              background: `${getStatusColor(employee.status)}15`,
                              color: getStatusColor(employee.status)
                            }}
                          >
                            <StatusIcon size={14} className="status-icon-inline" />
                            {employee.isSuspect ? 'SUSPECT' : (employee.status === 'BREAK' ? 'Out for break' : employee.status)}
                          </span>
                          {employee.isLate && (
                            <span className="late-indicator" title={`Late by ${employee.lateByMinutes}m`}>
                              <Clock size={10} /> LATE
                            </span>
                          )}
                          {employee.isSuspect && employee.suspectInfo && (
                            <div className="suspect-detail">
                              Missing {employee.suspectInfo.missing_minutes} min
                            </div>
                          )}
                          {employee.isLongAbsence && !employee.isSuspect && (
                            <div className="long-absence-card">
                              <span className="warning-text">
                                Gone out for {employee.minutesOut} mins
                              </span>
                              <button
                                className="call-btn"
                                onClick={() => window.open(`tel:${employee.phone || ''}`)}
                                title={`Call ${employee.name}`}
                              >
                                <Phone size={10} /> Call Employee
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="time-badge time-in">
                          {employee.timeIn ? formatTime(employee.timeIn) : '-'}
                        </span>
                      </td>

                      <td>
                        <span className="time-badge time-out">
                          {employee.timeOut ? formatTime(employee.timeOut) : '-'}
                        </span>
                      </td>

                      <td>
                        {employee.currentSession ? (
                          <div className="session-info">
                            <div className="session-duration">
                              {employee.currentSession.duration}
                            </div>
                            <div className="session-start">
                              Since {formatTime(employee.currentSession.startTime)}
                            </div>
                          </div>
                        ) : (
                          <span className="no-session">-</span>
                        )}
                      </td>

                      <td>
                        <span className="duration-badge">
                          <Clock size={12} />
                          {employee.duration}
                        </span>
                      </td>

                      <td>
                        <div className="row-actions">
                          {employee.status === 'ABSENT' && (
                            <button
                              className="action-btn check-in"
                              onClick={() => handleManualCheckIn(employee.id, employee.name)}
                            >
                              <Plus size={14} /> In
                            </button>
                          )}
                          {(employee.status === 'IN' || employee.status === 'OUT' || employee.status === 'BREAK') && (
                            <button
                              className={`action-btn ${employee.status === 'IN' ? 'check-out' : 'check-in'}`}
                              onClick={() => employee.status === 'IN' ? handleManualCheckOut(employee.id, employee.name) : handleManualCheckIn(employee.id, employee.name)}
                            >
                              {employee.status === 'IN' ? <X size={14} /> : <Plus size={14} />}
                              {employee.status === 'IN' ? 'Out' : 'In'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="live-footer">
        <div className="footer-left">
          <div className="footer-info">
            <Info size={14} />
            Showing {filteredData.length} of {attendanceData.length} staff members
          </div>

          {/* 🍵 Active Break Schedules */}
          {breakSchedules.length > 0 && (
            <div className="footer-breaks">
              <span className="breaks-label">Daily Breaks:</span>
              <div className="breaks-list">
                {breakSchedules.filter(b => b.isActive).map((breakItem, idx) => {
                  const now = new Date();
                  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  const currentDay = days[now.getDay()];
                  const currentTimeStr = now.toTimeString().slice(0, 5);

                  const isCurrentlyActive = breakItem.allowedDays.includes(currentDay) &&
                    currentTimeStr >= breakItem.startTime &&
                    currentTimeStr <= breakItem.endTime;

                  return (
                    <div key={idx} className={`break-pill ${isCurrentlyActive ? 'active' : ''}`}>
                      <Coffee size={12} />
                      <span className="break-name">{breakItem.name}</span>
                      <span className="break-range">{format24to12(breakItem.startTime)} - {format24to12(breakItem.endTime)}</span>
                      {isCurrentlyActive && <span className="active-dot"></span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="footer-actions">
          <span className="refresh-indicator">
            {autoRefresh ? (
              <>
                <RefreshCw size={12} className="spin" />
                Live update active
              </>
            ) : (
              <>
                <Clock size={12} />
                Refresh paused
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LiveAttendance;
