import { useState, useEffect } from 'react';
import axios from 'axios';
import './DashboardHome.css';
import { useSettings } from '../../../context/SettingsContext';

const DashboardHome = ({ setActivePage, selectedStore }) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const {
    formatCurrency,
    formatDate,
    formatTime,
    getTimezoneDisplayName,
    getCurrentTimeInTimezone
  } = useSettings();

  // --- STATE ---
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onBreak: 0,
    lateToday: 0,
    onLeave: 0,
    unknownDetections: 0,
    pendingLeaves: 0,
    avgManagerPerformance: 0,
    fraudSuspects: 0
  });
  const [fraudSuspectList, setFraudSuspectList] = useState([]);

  const [todaySummaries, setTodaySummaries] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Periodic Fetch Every 30s
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedStore]); // Re-fetch/re-calculate when store changes

  // ✅ LISTEN FOR LIVE RECOGNITION EVENTS
  useEffect(() => {
    const handleAttendanceChange = () => {
      console.log('🔄 Attendance changed event detected! Refreshing dashboard...');
      fetchDashboardData();
    };

    const handleAttendanceStatus = (e) => {
      const { employeeName, message, time } = e.detail;
      console.log('ℹ️ Attendance status event detected!', message);

      const statusActivity = {
        employeeName,
        event: 'status',
        message: message.toLowerCase().includes('already checked in') ? 'Already In' : (message.toLowerCase().includes('no entry') ? 'Already Out' : message),
        timeIn: time,
        timeOut: time,
        isStatus: true
      };

      setRecentActivity(prev => [statusActivity, ...prev].slice(0, 20));
    };

    const handleAttendanceError = (e) => {
      const { employeeName, message, time } = e.detail;
      console.log('❌ Attendance error event detected!', message);

      const errorActivity = {
        employeeName,
        event: 'error',
        message: message.includes('already checked in') ? 'Already in' : message,
        timeIn: time,
        timeOut: time,
        isError: true
      };

      setRecentActivity(prev => [errorActivity, ...prev].slice(0, 20));
    };

    window.addEventListener('attendance:changed', handleAttendanceChange);
    window.addEventListener('attendance:status', handleAttendanceStatus);
    window.addEventListener('attendance:error', handleAttendanceError);

    return () => {
      window.removeEventListener('attendance:changed', handleAttendanceChange);
      window.removeEventListener('attendance:status', handleAttendanceStatus);
      window.removeEventListener('attendance:error', handleAttendanceError);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all required data
      const [facesRes, attendanceRes, unknownRes, logsRes, managersRes, fraudRes, leavesRes, salaryRes] = await Promise.all([
        axios.get(`${API_URL}/faces`),
        axios.get(`${API_URL}/attendance/today`),
        axios.get(`${API_URL}/unknown/list?limit=100`),
        axios.get(`${API_URL}/attendance/logs?limit=20`),
        axios.get(`${API_URL}/manager`),
        axios.get(`${API_URL}/presence/fraud-suspects`).catch(() => ({ data: { suspects: [], suspect_count: 0 } })),
        axios.get(`${API_URL}/leave`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/salary`).catch(() => ({ data: [] }))
      ]);

      let faces = (facesRes?.data && Array.isArray(facesRes.data)) ? facesRes.data : (facesRes?.data?.faces || []);

      let rawAttendance = attendanceRes?.data?.summaries || [];
      const unknownData = unknownRes?.data || {};
      let logsData = logsRes?.data?.logs || [];

      // Handle varied manager API response structure ({ data: [...] } or just [...])
      let managersRaw = managersRes?.data;
      let managersData = (managersRaw?.data) || managersRaw || [];
      if (!Array.isArray(managersData)) managersData = [];

      // #r Apply Global Store Filter
      if (selectedStore && selectedStore !== 'All Stores') {
        faces = faces.filter(f => f.storeName === selectedStore || f.branchName === selectedStore);

        // Filter attendance by matching employee IDs who belong to the store
        // We rely on matching IDs with the filtered 'faces' list.
        const validIds = new Set(faces.map(f => f._id.toString()));
        rawAttendance = rawAttendance.filter(a => {
          const empId = (a.userId?._id || a.userId)?.toString();
          return validIds.has(empId);
        });

        // Filter logs
        logsData = logsData.filter(l => {
          const empId = (l.userId?._id || l.userId)?.toString();
          return validIds.has(empId);
        });

        // Filter managers
        managersData = managersData.filter(m => m.branch === selectedStore);
      }

      // Calculate average manager performance
      const avgPerformance = managersData.length > 0
        ? managersData.reduce((sum, m) => sum + (m.overallScore || 0), 0) / managersData.length
        : 0;

      // Calculate stats
      const totalEmployees = faces.length;

      // Fix: Intersect attendance with CURRENT active employees to avoid >100% rates
      const validEmployeeIds = new Set(faces.map(f => f._id.toString()));
      const uniquePresentIds = new Set(
        rawAttendance
          .map(a => (a.userId?._id || a.userId)?.toString())
          .filter(id => validEmployeeIds.has(id))
      );

      const presentToday = uniquePresentIds.size;

      // Pending Leaves & Salary Requests
      const allLeaves = Array.isArray(leavesRes?.data) ? leavesRes.data : (leavesRes?.data?.leaves || []);
      const pendingLeavesCount = allLeaves.filter(l => l.status === 'Pending').length;

      const todayStr = new Date().toISOString().split('T')[0];
      const onLeaveToday = allLeaves.filter(l => {
        if (l.status !== 'Approved') return false;
        const start = new Date(l.startDate).toISOString().split('T')[0];
        const end = new Date(l.endDate).toISOString().split('T')[0];
        return todayStr >= start && todayStr <= end;
      }).length;

      // Correct Absent Calculation: Total - Present - On Leave
      const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveToday);

      // Unknown detections are global usually, but if we want to hide them when filtered:
      const unknownDetections = (selectedStore && selectedStore !== 'All Stores') ? 0 : (unknownData.total || 0);

      // On break: status is 'out' but they have checked in today
      const onBreak = rawAttendance.filter(a => a.currentStatus === 'out').length;
      const lateToday = rawAttendance.filter(a => a.isLate).length;

      // Fraud suspects
      const fraudData = fraudRes?.data || {};
      const fraudSuspectsCount = fraudData.suspect_count || 0;
      setFraudSuspectList(fraudData.suspects || []);

      setStats({
        totalEmployees,
        presentToday,
        absentToday,
        onBreak,
        lateToday,
        onLeave: onLeaveToday,
        unknownDetections,
        pendingLeaves: pendingLeavesCount,
        avgManagerPerformance: avgPerformance.toFixed(1),
        fraudSuspects: fraudSuspectsCount
      });


      // Map raw API data to component state structure
      setTodaySummaries(rawAttendance.map(a => ({
        employeeName: a.employeeName || a.userId?.name || 'Unknown',
        firstIn: a.firstIn, // backend DailySummary uses firstIn
        lastOut: a.lastOut,
        totalHours: a.totalHours,
        sessions: { length: a.sessions?.length || 0 },
        currentStatus: a.currentStatus,
        isLate: a.isLate,
        lateByMinutes: a.lateByMinutes
      })));

      setRecentActivity(prev => {
        // Preserve local status/error events that aren't in the newly fetched database logs
        const localEvents = prev.filter(a => a.event === 'status' || a.event === 'error' || a.isError || a.isStatus);

        // Merge local events with server logs, ensuring we don't duplicate (though local-only events won't be on server)
        // Keep most recent 20
        const merged = [...localEvents, ...logsData]
          .sort((a, b) => new Date(b.timeIn || b.timeOut || b.createdAt) - new Date(a.timeIn || a.timeOut || a.createdAt))
          .slice(0, 20);

        return merged;
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 17) return '☀️ Good Afternoon';
    return '🌙 Good Evening';
  };

  // Use global formatting from SettingsContext
  // formatDate() and formatTime() are now provided by context

  const getEventIcon = (event) => {
    if (event === 'error') return '⚠️';
    if (event === 'status') return 'ℹ️';
    return event === 'in' ? '🚪' : '👋';
  };

  const getEventColor = (event) => {
    if (event === 'error') return '#dc2626';
    if (event === 'status') return '#0c79a1';
    return event === 'in' ? '#1e7b4e' : '#ff9900';
  };

  // Direct Export Function
  const handleDirectExport = () => {
    if (todaySummaries.length === 0) {
      alert('❌ No attendance data to export for today!');
      return;
    }

    let csvContent = 'No,Employee Name,First In,Last Out,Sessions,Total Hours,Status\n';
    todaySummaries.forEach((record, index) => {
      const status = record.currentStatus === 'in' ? 'Present (In)' : 'Present (Out)';
      const sessions = record.sessions?.length || 1;
      csvContent += `${index + 1},"${record.employeeName}",${record.firstIn ? formatTime(record.firstIn) : '-'},${record.lastOut ? formatTime(record.lastOut) : '-'},${sessions},"${record.totalHours}",${status}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-home">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-content">
          <h2>{getGreeting()}, HR Admin!</h2>
          <p>Here's what's happening with your team today</p>
        </div>
        <div className="current-datetime">
          <div className="current-time">
            {getCurrentTimeInTimezone()}
          </div>
          <div className="current-date">
            {formatDate(currentTime)} • {getTimezoneDisplayName()}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Total Employees */}
        <div className="stat-card primary">
          <div className="stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{stats.totalEmployees}</div>
            <div className="stat-footer">
              <span className="stat-change positive">
                <i className="fas fa-arrow-up"></i> Active
              </span>
            </div>
          </div>
        </div>

        {/* Present Today */}
        <div className="stat-card success">
          <div className="stat-icon">
            <i className="fas fa-user-check"></i>
          </div>
          <div className="stat-content">
            <div className="stat-label">Present Today</div>
            <div className="stat-value">{stats.presentToday}</div>
            <div className="stat-footer">
              <span className="stat-change">
                {stats.totalEmployees > 0 ? ((stats.presentToday / stats.totalEmployees) * 100).toFixed(0) : 0}% Attendance
              </span>
            </div>
          </div>
        </div>

        {/* Absent Today */}
        <div className="stat-card danger">
          <div className="stat-icon">
            <i className="fas fa-user-times"></i>
          </div>
          <div className="stat-content">
            <div className="stat-label">Absent Today</div>
            <div className="stat-value">{stats.absentToday}</div>
            <div className="stat-footer">
              <span className="stat-change">
                {stats.absentToday > 0 ? 'Needs attention' : 'Perfect!'}
              </span>
            </div>
          </div>
        </div>

        {/* On Break */}
        <div className="stat-card warning">
          <div className="stat-icon">
            <i className="fas fa-coffee"></i>
          </div>
          <div className="stat-content">
            <div className="stat-label">On Break</div>
            <div className="stat-value">{stats.onBreak}</div>
            <div className="stat-footer">
              <span className="stat-change">
                Currently away
              </span>
            </div>
          </div>
        </div>

        {/* Late Today */}
        <div className="stat-card info">
          <div className="stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-content">
            <div className="stat-label">Late Today</div>
            <div className="stat-value">{stats.lateToday}</div>
            <div className="stat-footer">
              <span className="stat-change">
                On-time arrivals
              </span>
            </div>
          </div>
        </div>

        {/* On Leave */}
        <div className="stat-card purple">
          <div className="stat-icon">
            <i className="fas fa-calendar-day"></i>
          </div>
          <div className="stat-content">
            <div className="stat-label">On Leave</div>
            <div className="stat-value">{stats.onLeave}</div>
            <div className="stat-footer">
              <span className="stat-change">
                {stats.pendingLeaves} pending approval
              </span>
            </div>
          </div>
        </div>

        {/* Manager Performance Stats Card - Displays overall team leadership average */}
        <div className="stat-card manager-performance">
          <div className="stat-icon">
            <i className="fas fa-trophy"></i>
          </div>
          <div className="stat-content">
            <div className="stat-label">Manager Performance</div>
            <div className="stat-value">{stats.avgManagerPerformance}/5</div>
            <div className="stat-footer">
              <span className="stat-change positive">
                Team average
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="stat-card actions">
          <div className="stat-content">
            <div className="stat-label">Quick Actions</div>
            <div className="action-buttons">
              <button className="action-btn" onClick={() => setActivePage('employees')}>
                <i className="fas fa-user-plus"></i>
                Add Employee
              </button>
              <button className="action-btn" onClick={handleDirectExport}>
                <i className="fas fa-file-export"></i>
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Today's Attendance Summary */}
        <div className="content-card">
          <div className="card-header">
            <h3>
              <i className="fas fa-users"></i>
              Today's Attendance Summary
            </h3>
            <button className="refresh-btn" onClick={fetchDashboardData}>
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading data...</p>
              </div>
            ) : todaySummaries.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-inbox"></i>
                <p>No attendance records for today</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>First In</th>
                      <th>Last Out</th>
                      <th>Total Hours</th>
                      <th>Sessions</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaySummaries.slice(0, 5).map((summary, index) => (
                      <tr key={index}>
                        <td>
                          <div className="employee-cell">
                            <div className="employee-avatar">
                              {summary.employeeName.charAt(0)}
                            </div>
                            <span>{summary.employeeName}</span>
                          </div>
                        </td>
                        <td>{summary.firstIn ? formatTime(summary.firstIn) : '-'}</td>
                        <td>{summary.lastOut ? formatTime(summary.lastOut) : '-'}</td>
                        <td>
                          <span className="badge badge-time">
                            {summary.totalHours || '0h 0m'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-count">
                            {summary.sessions?.length || 1}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${summary.currentStatus === 'out' ? 'status-out' : 'status-in'}`}>
                            {summary.currentStatus === 'out' ? 'OUT' : 'IN'}
                          </span>
                          {summary.isLate && (
                            <span className="status-badge status-late" title={`Late by ${summary.lateByMinutes}m`}>
                              LATE
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {todaySummaries.length > 5 && (
              <div className="card-footer">
                <button className="view-all-btn" onClick={() => setActivePage('live-attendance')}>
                  View All ({todaySummaries.length}) <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="content-card">
          <div className="card-header">
            <h3>
              <i className="fas fa-history"></i>
              Recent Activity
            </h3>
            <span className="live-badge">
              <span className="live-dot"></span>
              LIVE
            </span>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading activity...</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-inbox"></i>
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="activity-list">
                {recentActivity.slice(0, 8).map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon" style={{ background: getEventColor(activity.event) }}>
                      {getEventIcon(activity.event)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">
                        <strong>{activity.employeeName}</strong>
                        <span className={`activity-event ${activity.event}`}>
                          {activity.event === 'error' ? (activity.message || 'Error') :
                            activity.event === 'status' ? (activity.message || 'Status') :
                              (activity.event === 'in' ? 'checked in' : 'checked out')}
                        </span>
                      </div>
                      <div className="activity-time">
                        {formatTime(activity.event === 'in' ? activity.timeIn : activity.timeOut)}
                      </div>
                    </div>
                    {activity.duration && (
                      <div className="activity-duration">
                        {Math.floor(activity.duration / 60)}h {activity.duration % 60}m
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="bottom-grid">
        {/* Quick Stats */}
        <div className="quick-stats-card">
          <h4>
            <i className="fas fa-chart-pie"></i>
            Attendance Overview
          </h4>
          <div className="quick-stats-grid">
            <div className="quick-stat">
              <div className="quick-stat-label">Present Rate</div>
              <div className="quick-stat-value success">
                {stats.totalEmployees > 0
                  ? ((stats.presentToday / stats.totalEmployees) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">Absent Rate</div>
              <div className="quick-stat-value danger">
                {stats.totalEmployees > 0
                  ? ((stats.absentToday / stats.totalEmployees) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">On Break</div>
              <div className="quick-stat-value warning">
                {stats.onBreak}
              </div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-label">Unknown</div>
              <div className="quick-stat-value alert">
                {stats.unknownDetections}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="alerts-card">
          <h4>
            <i className="fas fa-bell"></i>
            Alerts & Notifications
          </h4>
          <div className="alerts-list">
            {/* 🚨 FRAUD SUSPECT ALERT — Highest Priority */}
            {stats.fraudSuspects > 0 && (
              <div className="alert-item fraud">
                <i className="fas fa-user-secret"></i>
                <div className="alert-content">
                  <div className="alert-title">🚨 {stats.fraudSuspects} Suspect(s) — Left Without Checkout</div>
                  <div className="alert-suspects">
                    {fraudSuspectList.slice(0, 3).map((s, i) => (
                      <div key={i} className="suspect-name">
                        <span>{s.name}</span>
                        <span className="suspect-time">Missing {s.missing_minutes} min</span>
                      </div>
                    ))}
                    {fraudSuspectList.length > 3 && (
                      <div className="suspect-more">+{fraudSuspectList.length - 3} more</div>
                    )}
                  </div>
                  <div className="alert-time">Checked in but not detected by cameras for 5+ minutes</div>
                </div>
              </div>
            )}
            {stats.unknownDetections > 0 && (
              <div className="alert-item alert">
                <i className="fas fa-exclamation-triangle"></i>
                <div className="alert-content">
                  <div className="alert-title">{stats.unknownDetections} Unknown Person(s) Detected</div>
                  <div className="alert-time">Security check required</div>
                </div>
              </div>
            )}
            {stats.pendingLeaves > 0 && (
              <div className="alert-item info">
                <i className="fas fa-calendar-check"></i>
                <div className="alert-content">
                  <div className="alert-title">{stats.pendingLeaves} Leave Request(s) Pending</div>
                  <div className="alert-time">Approval needed</div>
                </div>
              </div>
            )}
            {stats.absentToday > 3 && (
              <div className="alert-item warning">
                <i className="fas fa-user-times"></i>
                <div className="alert-content">
                  <div className="alert-title">High Absence Rate Today</div>
                  <div className="alert-time">{stats.absentToday} employees absent</div>
                </div>
              </div>
            )}
            {stats.unknownDetections === 0 && stats.pendingLeaves === 0 && stats.absentToday <= 3 && stats.fraudSuspects === 0 && (
              <div className="no-alerts">
                <i className="fas fa-check-circle"></i>
                <p>All clear! No alerts at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;