import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// 1. Import Icons
import { 
  FaUsers, 
  FaStore, 
  FaUserTie, 
  FaChartLine, 
  FaArrowUp, 
  FaArrowRight 
} from 'react-icons/fa';

const DashboardHome = ({ data }) => {
  const chartData = [
    { month: 'Jul', attendance: 92, performance: 88 },
    { month: 'Aug', attendance: 94, performance: 90 },
    { month: 'Sep', attendance: 91, performance: 89 },
    { month: 'Oct', attendance: 95, performance: 92 },
    { month: 'Nov', attendance: 93, performance: 91 },
    { month: 'Dec', attendance: 96, performance: 94 }
  ];

  const storePerformance = data.stores.map(store => ({
    name: store.name,
    employees: store.employees,
    managers: store.managers
  }));

  const statusData = [
    { name: 'Active', value: data.employees.filter(e => e.status === 'active').length, color: '#165d3c' },
    { name: 'On Leave', value: data.employees.filter(e => e.status === 'leave').length, color: '#bdf59a' }
  ];

  return (
    <div className="dashboard-grid">
      <style>{`
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px; }
        .stat-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 2px 8px rgba(22, 93, 60, 0.08); border: 1px solid #f0f4f0; transition: all 0.3s ease; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(22, 93, 60, 0.12); }
        .stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; background: linear-gradient(135deg, #1e7b4ef8 0%, #bdf59a 100%); color: white; box-shadow: 0 4px 12px rgba(22, 93, 60, 0.2); }
        .stat-label { font-size: 13px; color: #5a6c7d; font-weight: 500; margin-bottom: 8px; }
        .stat-value { font-size: 32px; font-weight: 700; color: #1a252f; line-height: 1; margin-bottom: 8px; }
        .stat-change { font-size: 13px; color: #165d3c; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .chart-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 2px 8px rgba(22, 93, 60, 0.08); border: 1px solid #f0f4f0; margin-bottom: 20px; }
        .chart-header { margin-bottom: 20px; }
        .chart-title { font-size: 18px; font-weight: 600; color: #1a252f; margin-bottom: 4px; }
        .chart-subtitle { font-size: 13px; color: #5a6c7d; }
        .two-col-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px; }
        @media (max-width: 1024px) { .two-col-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Card 1: Employees */}
      <div className="stat-card">
        <div className="stat-header">
          <div>
            <div className="stat-label">Total Employees</div>
            <div className="stat-value">{data.employees.length}</div>
            <div className="stat-change">
                <FaArrowUp size={10} /> 12% from last month
            </div>
          </div>
          <div className="stat-icon"><FaUsers /></div>
        </div>
      </div>

      {/* Card 2: Stores */}
      <div className="stat-card">
        <div className="stat-header">
          <div>
            <div className="stat-label">Active Stores</div>
            <div className="stat-value">{data.stores.length}</div>
            <div className="stat-change">
                <FaArrowRight size={10} /> No change
            </div>
          </div>
          <div className="stat-icon"><FaStore /></div>
        </div>
      </div>

      {/* Card 3: Managers */}
      <div className="stat-card">
        <div className="stat-header">
          <div>
            <div className="stat-label">Total Managers</div>
            <div className="stat-value">{data.managers.length}</div>
            <div className="stat-change">
                <FaArrowUp size={10} /> 1 new this month
            </div>
          </div>
          <div className="stat-icon"><FaUserTie /></div>
        </div>
      </div>

      {/* Card 4: Performance */}
      <div className="stat-card">
        <div className="stat-header">
          <div>
            <div className="stat-label">Avg Performance</div>
            <div className="stat-value">91%</div>
            <div className="stat-change">
                <FaArrowUp size={10} /> 3% improvement
            </div>
          </div>
          <div className="stat-icon"><FaChartLine /></div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <div className="two-col-grid">
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Attendance & Performance Trends</div>
              <div className="chart-subtitle">Last 6 months comparison</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f0" />
                <XAxis dataKey="month" stroke="#5a6c7d" />
                <YAxis stroke="#5a6c7d" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="attendance" stroke="#165d3c" strokeWidth={3} />
                <Line type="monotone" dataKey="performance" stroke="#bdf59a" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title">Employee Status</div>
              <div className="chart-subtitle">Current distribution</div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Store Performance Overview</div>
            <div className="chart-subtitle">Employee and manager distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={storePerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f0" />
              <XAxis dataKey="name" stroke="#5a6c7d" />
              <YAxis stroke="#5a6c7d" />
              <Tooltip />
              <Legend />
              <Bar dataKey="employees" fill="#165d3c" radius={[8, 8, 0, 0]} />
              <Bar dataKey="managers" fill="#bdf59a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;