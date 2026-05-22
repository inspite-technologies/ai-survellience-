import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../../../context/SettingsContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Printer,
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  RefreshCw,
  TrendingUp,
  RotateCcw,
  Table,
  PieChart,
  CalendarDays,
  CalendarRange,
  Search,
  Filter
} from 'lucide-react';
import './AttendanceReports.css';

const AttendanceReports = ({ selectedStore }) => {
  const { settings } = useSettings();
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    totalHours: 0,
    averageHours: 0,
    lateCount: 0,
    onTimeCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [employees, setEmployees] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const init = async () => {
      await fetchEmployees();
    };
    init();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      generateReport();
    }
  }, [reportType, selectedDate, selectedMonth, startDate, endDate, selectedEmployee, selectedStore, employees]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/faces`);
      setEmployees(response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching employees:', err);
      return [];
    }
  };

  const generateReport = async (allEmployees = null) => {
    const currentEmployees = allEmployees || employees;
    setLoading(true);
    try {
      let data = [];

      if (reportType === 'daily') {
        data = await fetchDailyReport(selectedDate);
      } else if (reportType === 'weekly') {
        data = await fetchWeeklyReport();
      } else if (reportType === 'monthly') {
        data = await fetchMonthlyReport(selectedMonth);
      }

      // Enrich missing employee names from the employees list
      data = data.map(item => {
        if (!item.employeeName || item.employeeName === 'Unknown') {
          const emp = employees.find(e => e._id === item.userId);
          if (emp) return { ...item, employeeName: emp.name };
        }
        return item;
      });

      if (selectedEmployee !== 'all') {
        data = data.filter(item => item.userId === selectedEmployee);
      }

      // Enrich missing employee names and INCLUDE ABSENTEES for daily report
      if (reportType === 'daily') {
        const presentUserIds = new Set(data.map(item => String(item.userId)));
        const absenteeData = currentEmployees
          .filter(emp => !presentUserIds.has(String(emp._id)))
          .map(emp => ({
            userId: emp._id,
            employeeName: emp.name,
            date: selectedDate,
            firstIn: null,
            lastOut: null,
            totalHours: '0h 0m',
            totalMinutes: 0,
            sessions: 0,
            breaks: { tea: 0, lunch: 0, snacks: 0 },
            status: 'ABSENT',
            isLate: false,
            lateByMinutes: 0,
            shiftName: emp.shiftName || 'Day Shift'
          }));
        data = [...data, ...absenteeData];
      }

      data = data.map(item => {
        if (!item.employeeName || item.employeeName === 'Unknown') {
          const emp = currentEmployees.find(e =>
            String(e._id) === String(item.userId) ||
            (e.employeeId && String(e.employeeId) === String(item.userId))
          );
          if (emp) {
            return { ...item, employeeName: emp.name };
          }
        }
        return item;
      });

      // Store Filter
      if (selectedStore && selectedStore !== 'All Stores') {
        data = data.filter(item => {
          const emp = currentEmployees.find(e => e._id === item.userId);
          return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
        });
      }

      setReportData(data);
      // Stats calculation moved to useEffect
      setLoading(false);
    } catch (err) {
      console.error('Error generating report:', err);
      setLoading(false);
    }
  };

  // Recalculate stats whenever report data or employees list changes
  useEffect(() => {
    if (employees.length > 0 || reportData.length > 0) {
      calculateSummaryStats(reportData);
    }
  }, [reportData, employees]);

  // --- Mock/Fetch Functions ---
  const fetchDailyReport = async (date) => {
    try {
      const response = await axios.get(`${API_URL}/attendance/today?date=${date}`);
      // API returns 'summaries' array
      const attendance = response.data.summaries || [];
      return attendance.map(item => {
        let totalMins = item.totalMinutes || 0;
        const isCurrentlyIn = item.currentStatus === 'in';

        if (isCurrentlyIn) {
          const startTime = item.lastInTime ? new Date(item.lastInTime) : (item.firstIn ? new Date(item.firstIn) : null);
          if (startTime) {
            const currentSessionMinutes = Math.floor((new Date() - startTime) / 60000);
            totalMins += currentSessionMinutes;
          }
        }

        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        const dynamicTotalHours = `${h}h ${m}m`;

        return {
          userId: item.userId?._id || item.userId,
          employeeName: item.employeeName || item.userId?.name || 'Unknown',
          date: date,
          firstIn: item.firstIn ? new Date(item.firstIn) : (item.lastInTime ? new Date(item.lastInTime) : null),
          lastOut: item.lastOut ? new Date(item.lastOut) : (item.lastOutTime ? new Date(item.lastOutTime) : null),
          totalHours: dynamicTotalHours,
          totalMinutes: totalMins,
          sessions: (item.sessions?.length || 0) + (isCurrentlyIn ? 1 : 0),
          breaks: { tea: 0, lunch: 0, snacks: 0 },
          status: isCurrentlyIn ? 'In Progress' : 'Completed',
          isLate: item.isLate,
          lateByMinutes: item.lateByMinutes,
          shiftName: item.shiftName
        };
      });
    } catch (err) {
      console.error('Error fetching daily report:', err);
      return [];
    }
  };

  // Helper to parse "Xh Ym" to minutes
  const parseHoursToMinutes = (hoursStr) => {
    if (!hoursStr) return 0;
    const match = hoursStr.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
  };

  const fetchWeeklyReport = async () => {
    try {
      // Use last 7 days from today
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const response = await axios.get(`${API_URL}/attendance/logs`, {
        params: { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString(), 
          limit: 1000 
        }
      });

      const logs = response.data.logs || [];
      const grouped = {};

      logs.forEach(log => {
        const uid = log.userId?._id || log.userId;
        if (!uid) return;

        // Ensure we only include logs within the last 7 days (secondary check)
        const logDate = new Date(log.timeIn || log.timeOut);
        if (logDate < startDate || logDate > endDate) return;

        if (!grouped[uid]) {
          grouped[uid] = {
            userId: uid,
            employeeName: log.employeeName || log.userId?.name || 'Unknown',
            totalMinutes: 0,
            days: 0,
            presentDays: new Set()
          };
        }
        if (log.duration) {
          grouped[uid].totalMinutes += log.duration;
          const dateKey = logDate.toISOString().split('T')[0];
          grouped[uid].presentDays.add(dateKey);
        }
      });

      return Object.values(grouped).map(item => {
        const hours = Math.floor(item.totalMinutes / 60);
        const mins = item.totalMinutes % 60;
        const daysPresent = item.presentDays.size;
        return {
          ...item,
          totalHours: `${hours}h ${mins}m`,
          days: daysPresent,
          averageHours: daysPresent > 0 ? `${Math.floor(item.totalMinutes / daysPresent / 60)}h ${Math.floor((item.totalMinutes / daysPresent) % 60)}m` : '0h 0m',
          status: 'Completed'
        };
      });
    } catch (err) {
      console.error('Error fetching weekly report:', err);
      return [];
    }
  };

  const fetchMonthlyReport = async (month) => {
    try {
      // month is in "YYYY-MM" format
      const [year, monthIdx] = month.split('-').map(Number);
      const startDate = new Date(year, monthIdx - 1, 1);
      const endDate = new Date(year, monthIdx, 0, 23, 59, 59);

      const response = await axios.get(`${API_URL}/attendance/logs`, { 
        params: { 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 1000 
        } 
      });
      
      const logs = response.data.logs || [];
      const grouped = {};
      
      logs.forEach(log => {
        const uid = log.userId?._id || log.userId;
        if (!uid) return;

        const logDate = new Date(log.timeIn || log.timeOut);
        // Filter by selected month/year
        if (logDate.getMonth() + 1 !== monthIdx || logDate.getFullYear() !== year) return;

        if (!grouped[uid]) {
          grouped[uid] = {
            userId: uid,
            employeeName: log.employeeName || log.userId?.name || 'Unknown',
            totalMinutes: 0,
            days: 0,
            presentDays: new Set()
          };
        }
        if (log.duration) {
          grouped[uid].totalMinutes += log.duration;
          const dateKey = logDate.toISOString().split('T')[0];
          grouped[uid].presentDays.add(dateKey);
        }
      });
      
      return Object.values(grouped).map(item => {
        const hours = Math.floor(item.totalMinutes / 60);
        const mins = item.totalMinutes % 60;
        const daysPresent = item.presentDays.size;
        return {
          ...item,
          totalHours: `${hours}h ${mins}m`,
          daysPresent,
          averageHours: daysPresent > 0 ? `${Math.floor(item.totalMinutes / daysPresent / 60)}h ${Math.floor((item.totalMinutes / daysPresent) % 60)}m` : '0h 0m',
          status: 'Completed'
        };
      });
    } catch (err) {
      console.error('Error fetching monthly report:', err);
      return [];
    }
  };

  const calculateSummaryStats = (data) => {
    // #r Filter Total Employees by Store for accurate stats
    let validEmployees = employees;
    if (selectedStore && selectedStore !== 'All Stores') {
      validEmployees = employees.filter(e =>
        e.storeName === selectedStore ||
        e.branchName === selectedStore ||
        e.department === selectedStore
      );
    }

    const totalEmployees = validEmployees.length;
    const presentCount = data.length;
    // Absent count shouldn't be negative if data has anomalies, but conceptually it's total - present
    const absentCount = Math.max(0, totalEmployees - presentCount);

    let totalMinutes = 0;
    let lateCount = 0;

    data.forEach(item => {
      totalMinutes += item.totalMinutes || 0;

      // Use backend provided isLate flag or calculate it if missing (for resilience)
      if (item.isLate) {
        lateCount++;
      } else if (item.firstIn) {
        const checkInTime = new Date(item.firstIn);
        const threshold = new Date(checkInTime);
        threshold.setHours(9, 0, 0, 0);
        if (checkInTime > threshold) {
          lateCount++;
        }
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const avgMinutes = presentCount > 0 ? totalMinutes / presentCount : 0;
    const averageHours = Math.floor(avgMinutes / 60);
    const averageMins = Math.floor(avgMinutes % 60);

    setSummaryStats({
      totalEmployees, presentCount, absentCount,
      totalHours: `${totalHours}h ${totalMinutes % 60}m`,
      averageHours: `${averageHours}h ${averageMins}m`,
      lateCount,
      onTimeCount: Math.max(0, presentCount - lateCount)
    });
  };

  const formatTime = (date) => !date ? '-' : new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (date) => !date ? '-' : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    if (reportData.length === 0) {
      alert('❌ No data to export!');
      return;
    }

    let csvContent = '';
    const reportTitle = `Attendance Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;

    // Header based on report type
    if (reportType === 'daily') {
      csvContent = 'No,Employee Name,First In,Last Out,Sessions,Total Hours,Status\n';
      reportData.forEach((record, index) => {
        csvContent += `${index + 1},"${record.employeeName}",${formatTime(record.firstIn)},${formatTime(record.lastOut)},${record.sessions},"${record.totalHours}",${record.status}\n`;
      });
    } else if (reportType === 'weekly') {
      csvContent = 'No,Employee Name,Days Present,Average Hours,Total Hours,Status\n';
      reportData.forEach((record, index) => {
        csvContent += `${index + 1},"${record.employeeName}",${record.days},"${record.averageHours}","${record.totalHours}",${record.status}\n`;
      });
    } else {
      csvContent = 'No,Employee Name,Days Present,Average Hours/Day,Total Hours,Status\n';
      reportData.forEach((record, index) => {
        csvContent += `${index + 1},"${record.employeeName}",${record.daysPresent},"${record.averageHours}","${record.totalHours}",${record.status}\n`;
      });
    }

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('✅ Report exported to Excel (CSV) successfully!');
  };

  // Export to PDF
  const exportToPDF = () => {
    if (reportData.length === 0) {
      alert('❌ No data to export!');
      return;
    }

    const reportTitle = `Attendance Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;
    const dateStr = reportType === 'daily' ? formatDate(selectedDate) :
      reportType === 'monthly' ? new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) :
        'Last 7 Days';

    // Create printable HTML
    let tableHeaders = '';
    let tableRows = '';

    if (reportType === 'daily') {
      tableHeaders = '<th>#</th><th>Employee Name</th><th>First In</th><th>Last Out</th><th>Sessions</th><th>Total Hours</th><th>Status</th>';
      reportData.forEach((record, index) => {
        tableRows += `<tr><td>${index + 1}</td><td>${record.employeeName}</td><td>${formatTime(record.firstIn)}</td><td>${formatTime(record.lastOut)}</td><td>${record.sessions}</td><td>${record.totalHours}</td><td>${record.status}</td></tr>`;
      });
    } else if (reportType === 'weekly') {
      tableHeaders = '<th>#</th><th>Employee Name</th><th>Days Present</th><th>Avg Hours</th><th>Total Hours</th><th>Status</th>';
      reportData.forEach((record, index) => {
        tableRows += `<tr><td>${index + 1}</td><td>${record.employeeName}</td><td>${record.days}</td><td>${record.averageHours}</td><td>${record.totalHours}</td><td>${record.status}</td></tr>`;
      });
    } else {
      tableHeaders = '<th>#</th><th>Employee Name</th><th>Days Present</th><th>Avg Hours/Day</th><th>Total Hours</th><th>Status</th>';
      reportData.forEach((record, index) => {
        tableRows += `<tr><td>${index + 1}</td><td>${record.employeeName}</td><td>${record.daysPresent}</td><td>${record.averageHours}</td><td>${record.totalHours}</td><td>${record.status}</td></tr>`;
      });
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e7b4e; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
          .summary-item { background: #f5f5f5; padding: 15px 20px; border-radius: 8px; }
          .summary-item .value { font-size: 24px; font-weight: bold; color: #1e7b4e; }
          .summary-item .label { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #1e7b4e; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <p class="subtitle">Date: ${dateStr} | Generated: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="value">${summaryStats.totalEmployees}</div>
            <div class="label">Total Employees</div>
          </div>
          <div class="summary-item">
            <div class="value">${summaryStats.presentCount}</div>
            <div class="label">Present</div>
          </div>
          <div class="summary-item">
            <div class="value">${summaryStats.absentCount}</div>
            <div class="label">Absent</div>
          </div>
          <div class="summary-item">
            <div class="value">${summaryStats.totalHours}</div>
            <div class="label">Total Hours</div>
          </div>
        </div>

        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>

        <div class="footer">HR Portal - Attendance Management System</div>
      </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for content to load then print/save as PDF
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Print Report
  const printReport = () => {
    if (reportData.length === 0) {
      alert('❌ No data to print!');
      return;
    }
    exportToPDF(); // Reuse PDF export for printing
  };

  // ----------------------------------------
  // 📈 PROFESSIONAL GRADIENT AREA CHART
  // ----------------------------------------


  return (
    <div className="attendance-reports">
      {/* Header */}
      <div className="reports-header">
        <div className="reports-header-left">
          <h2><BarChart3 size={24} /> Attendance Reports</h2>
          <p>Generate and analyze attendance reports</p>
        </div>
        <div className="reports-header-right">
          <button className="export-btn" onClick={exportToExcel}><FileSpreadsheet size={18} /> Export Excel</button>
          <button className="export-btn" onClick={exportToPDF}><FileText size={18} /> Export PDF</button>
          <button className="export-btn" onClick={printReport}><Printer size={18} /> Print</button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats-grid">
        <div className="summary-stat-card primary">
          <div className="summary-stat-icon"><Users size={20} /></div>
          <div className="summary-stat-content">
            <div className="summary-stat-value">{summaryStats.totalEmployees}</div>
            <div className="summary-stat-label">Total Employees</div>
          </div>
        </div>
        <div className="summary-stat-card success">
          <div className="summary-stat-icon"><UserCheck size={20} /></div>
          <div className="summary-stat-content">
            <div className="summary-stat-value">{summaryStats.presentCount}</div>
            <div className="summary-stat-label">Present</div>
            <div className="summary-stat-footer">{summaryStats.totalEmployees > 0 ? `${((summaryStats.presentCount / summaryStats.totalEmployees) * 100).toFixed(1)}%` : '0%'}</div>
          </div>
        </div>
        <div className="summary-stat-card danger">
          <div className="summary-stat-icon"><UserX size={20} /></div>
          <div className="summary-stat-content">
            <div className="summary-stat-value">{summaryStats.absentCount}</div>
            <div className="summary-stat-label">Absent</div>
            <div className="summary-stat-footer">{summaryStats.totalEmployees > 0 ? `${((summaryStats.absentCount / summaryStats.totalEmployees) * 100).toFixed(1)}%` : '0%'}</div>
          </div>
        </div>
        <div className="summary-stat-card info">
          <div className="summary-stat-icon"><Clock size={20} /></div>
          <div className="summary-stat-content">
            <div className="summary-stat-value">{summaryStats.totalHours}</div>
            <div className="summary-stat-label">Total Hours</div>
            <div className="summary-stat-footer">Avg: {summaryStats.averageHours}</div>
          </div>
        </div>
        <div className="summary-stat-card warning">
          <div className="summary-stat-icon"><Clock size={20} /></div>
          <div className="summary-stat-content">
            <div className="summary-stat-value">{summaryStats.lateCount}</div>
            <div className="summary-stat-label">Late Arrivals</div>
          </div>
        </div>
        <div className="summary-stat-card purple">
          <div className="summary-stat-icon"><Clock size={20} /></div>
          <div className="summary-stat-content">
            <div className="summary-stat-value">{summaryStats.onTimeCount}</div>
            <div className="summary-stat-label">On Time</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="reports-filters">
        <div className="filter-section">
          <label>Report Type</label>
          <div className="report-type-tabs">
            <button className={`tab-btn ${reportType === 'daily' ? 'active' : ''}`} onClick={() => setReportType('daily')}>
              <CalendarDays size={14} /> Daily
            </button>
            <button className={`tab-btn ${reportType === 'weekly' ? 'active' : ''}`} onClick={() => setReportType('weekly')}>
              <CalendarRange size={14} /> Weekly
            </button>
            <button className={`tab-btn ${reportType === 'monthly' ? 'active' : ''}`} onClick={() => setReportType('monthly')}>
              <Calendar size={14} /> Monthly
            </button>
          </div>
        </div>
        <div className="filter-section">
          {reportType === 'daily' && (
            <>
              <label>Select Date</label>
              <input type="date" className="filter-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </>
          )}
          {reportType === 'monthly' && (
            <>
              <label>Select Month</label>
              <input type="month" className="filter-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} max={new Date().toISOString().slice(0, 7)} />
            </>
          )}
          {reportType === 'weekly' && (
            <div className="status-info-badge">
              <CalendarRange size={14} /> Showing last 7 days
            </div>
          )}
        </div>
        <div className="filter-section">
          <label>Employee</label>
          <div style={{ position: 'relative' }}>
            <select className="filter-input" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={{ paddingLeft: '36px' }}>
              <option value="all">All Employees</option>
              {employees.map(emp => (<option key={emp._id} value={emp._id}>{emp.name}</option>))}
            </select>
            <Users size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
        </div>
        <div className="filter-section">
          <button className="generate-btn" onClick={generateReport}>
            <RefreshCw size={16} /> Generate Report
          </button>
        </div>
      </div>



      {/* Report Table */}
      <div className="report-table-container">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={40} className="spin" />
            <p>Generating report...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="empty-state">
            <TrendingUp size={40} />
            <p>No attendance data found for the selected period</p>
            <button className="generate-btn" onClick={generateReport} style={{ width: 'auto' }}>
              <RotateCcw size={16} /> Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="report-info-bar">
              <div className="report-title">
                <Table size={20} />
                {reportType === 'daily' && `Daily Report - ${formatDate(selectedDate)}`}
                {reportType === 'weekly' && `Weekly Report - Last 7 Days`}
                {reportType === 'monthly' && `Monthly Report - ${new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
              </div>
              <div className="report-count">
                Showing {reportData.length} record{reportData.length !== 1 ? 's' : ''}
              </div>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee Name</th>
                  {reportType === 'daily' && (<><th>First In</th><th>Last Out</th><th>Sessions</th><th>Breaks</th></>)}
                  {reportType === 'weekly' && (<><th>Days Present</th><th>Average Hours</th></>)}
                  {reportType === 'monthly' && (<><th>Days Present</th><th>Average Hours/Day</th></>)}
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((record, index) => (
                  <tr key={index}>
                    <td><span style={{ color: '#94a3b8', fontWeight: '600', fontSize: '12px' }}>{index + 1}</span></td>
                    <td>
                      <div className="employee-cell-report">
                        <div className="employee-avatar-report">{(record.employeeName || '?').charAt(0)}</div>
                        <span style={{ fontWeight: '700' }}>{record.employeeName || 'Unknown'}</span>
                      </div>
                    </td>
                    {reportType === 'daily' && (
                      <>
                        <td>
                          <span className="time-badge-report in">{formatTime(record.firstIn)}</span>
                          {record.isLate && (
                            <div style={{ fontSize: '10px', color: '#e11d48', fontWeight: '800', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#e11d48' }}></div>
                                LATE
                              </div>
                              {record.lateByMinutes > 0 && <span style={{ opacity: 0.8 }}>({record.lateByMinutes}m)</span>}
                            </div>
                          )}
                        </td>
                        <td><span className="time-badge-report out">{formatTime(record.lastOut)}</span></td>
                        <td><span className="sessions-badge">{record.sessions} session{record.sessions !== 1 ? 's' : ''}</span></td>
                        <td>
                          <div className="breaks-cell">
                            {record.breaks?.tea > 0 && <span className="break-item">☕ {Math.floor(record.breaks.tea)}m</span>}
                            {record.breaks?.lunch > 0 && <span className="break-item">🍽️ {Math.floor(record.breaks.lunch)}m</span>}
                            {record.breaks?.snacks > 0 && <span className="break-item">🍪 {Math.floor(record.breaks.snacks)}m</span>}
                            {!record.breaks || (record.breaks.tea === 0 && record.breaks.lunch === 0 && record.breaks.snacks === 0) && <span style={{ color: '#94a3b8', fontSize: '12px' }}>No breaks</span>}
                          </div>
                        </td>
                      </>
                    )}
                    {reportType === 'weekly' && (<><td><span className="days-badge">{record.days} day{record.days !== 1 ? 's' : ''}</span></td><td><span className="hours-badge">{record.averageHours}</span></td></>)}
                    {reportType === 'monthly' && (<><td><span className="days-badge">{record.daysPresent} day{record.daysPresent !== 1 ? 's' : ''}</span></td><td><span className="hours-badge">{record.averageHours}</span></td></>)}
                    <td>
                      <span className="total-hours-badge"><Clock size={14} /> {record.totalHours}</span>
                    </td>
                    <td>
                      <span className={`status-badge-report ${record.status.toLowerCase().replace(' ', '-')}`}>{record.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Pie & Bar Charts Section */}
      {
        reportData.length > 0 && (
          <div className="charts-section">
            <div className="chart-card">
              <div className="chart-header"><h3><PieChart size={20} /> Attendance Distribution</h3></div>
              <div className="chart-body">
                <div className="pie-chart-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div className="pie-chart-visual" style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: `conic-gradient(#16a34a 0% ${summaryStats.totalEmployees > 0 ? (summaryStats.presentCount / summaryStats.totalEmployees) * 100 : 0}%, #f1f5f9 0% 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <div style={{ width: '110px', height: '110px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{summaryStats.totalEmployees > 0 ? ((summaryStats.presentCount / summaryStats.totalEmployees) * 100).toFixed(0) : 0}%</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>PRESENT</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#16a34a' }}></div>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Present ({summaryStats.presentCount})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f1f5f9' }}></div>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Absent ({summaryStats.absentCount})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header"><h3><BarChart3 size={20} /> Hours Worked Distribution</h3></div>
              <div className="chart-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {reportData.slice(0, 5).map((record, index) => {
                    const maxMinutes = Math.max(...reportData.map(r => r.totalMinutes || 0));
                    const percentage = maxMinutes > 0 ? ((record.totalMinutes || 0) / maxMinutes) * 100 : 0;
                    return (
                      <div key={index}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{record.employeeName}</span>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>{record.totalHours}</span>
                        </div>
                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${percentage}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default AttendanceReports;