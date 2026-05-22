import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SystemReports = () => {
  const reportData = [
    { month: 'Jan', attendance: 94, performance: 89, turnover: 2 },
    { month: 'Feb', attendance: 92, performance: 91, turnover: 3 },
    { month: 'Mar', attendance: 95, performance: 90, turnover: 1 },
    { month: 'Apr', attendance: 93, performance: 92, turnover: 2 },
    { month: 'May', attendance: 96, performance: 93, turnover: 1 },
    { month: 'Jun', attendance: 94, performance: 91, turnover: 2 }
  ];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1a252f', marginBottom: '4px' }}>System Reports</h2>
        <p style={{ fontSize: '14px', color: '#5a6c7d' }}>Comprehensive attendance and performance analytics</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Avg Attendance</div>
              <div className="stat-value">94.2%</div>
              <div className="stat-change">↑ 2.1% vs last period</div>
            </div>
            <div className="stat-icon">📊</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Performance Score</div>
              <div className="stat-value">91.0%</div>
              <div className="stat-change">↑ 1.5% improvement</div>
            </div>
            <div className="stat-icon">⭐</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Employee Turnover</div>
              <div className="stat-value">1.8%</div>
              <div className="stat-change">↓ 0.5% decrease</div>
            </div>
            <div className="stat-icon">📉</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-label">Training Hours</div>
              <div className="stat-value">124</div>
              <div className="stat-change">↑ 15 hours increase</div>
            </div>
            <div className="stat-icon">📚</div>
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: '20px' }}>
        <div className="chart-header">
          <div className="chart-title">6-Month Performance Overview</div>
          <div className="chart-subtitle">Attendance, performance, and turnover trends</div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={reportData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f0" />
            <XAxis dataKey="month" stroke="#5a6c7d" />
            <YAxis stroke="#5a6c7d" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="attendance" stroke="#165d3c" strokeWidth={3} />
            <Line type="monotone" dataKey="performance" stroke="#bdf59a" strokeWidth={3} />
            <Line type="monotone" dataKey="turnover" stroke="#5a6c7d" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="stores-grid">
        <div className="store-card">
          <div className="store-name" style={{ marginBottom: '16px' }}>📄 Attendance Report</div>
          <p style={{ fontSize: '14px', color: '#5a6c7d', marginBottom: '16px' }}>Detailed attendance records for all employees</p>
          <button className="btn-secondary" style={{ width: '100%' }}>Download Report</button>
        </div>
        <div className="store-card">
          <div className="store-name" style={{ marginBottom: '16px' }}>📊 Performance Analytics</div>
          <p style={{ fontSize: '14px', color: '#5a6c7d', marginBottom: '16px' }}>Individual and team performance metrics</p>
          <button className="btn-secondary" style={{ width: '100%' }}>Download Report</button>
        </div>
        <div className="store-card">
          <div className="store-name" style={{ marginBottom: '16px' }}>💰 Payroll Summary</div>
          <p style={{ fontSize: '14px', color: '#5a6c7d', marginBottom: '16px' }}>Complete payroll data and salary distribution</p>
          <button className="btn-secondary" style={{ width: '100%' }}>Download Report</button>
        </div>
        <div className="store-card">
          <div className="store-name" style={{ marginBottom: '16px' }}>📈 Turnover Analysis</div>
          <p style={{ fontSize: '14px', color: '#5a6c7d', marginBottom: '16px' }}>Employee retention and turnover statistics</p>
          <button className="btn-secondary" style={{ width: '100%' }}>Download Report</button>
        </div>
      </div>
    </div>
  );
};

export default SystemReports;