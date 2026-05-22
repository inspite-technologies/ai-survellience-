import { useState, useEffect } from 'react';
import './BonusPoints.css';
import * as bonusAPI from '../../services/bonusAPI';
import { getAllEmployees } from '../../services/employeeAPI';
import {
  Star, Award, Trophy, Users, List, Medal,
  History, Plus, Search, Calendar, Trash2,
  Save, X, Clock, Lightbulb, TrendingUp,
  Smile, Gift, Info, Crown, ChevronRight,
  Filter, CheckCircle, AlertCircle
} from 'lucide-react';

const BonusPoints = ({ selectedStore }) => {
  const [employees, setEmployees] = useState([]);
  const [bonusRecords, setBonusRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    employeeId: '',
    points: '',
    type: 'reward',
    category: 'performance',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  const bonusCategories = [
    { value: 'performance', label: 'Performance Excellence', icon: Star, color: '#10b981' },
    { value: 'attendance', label: 'Perfect Attendance', icon: Calendar, color: '#059669' },
    { value: 'punctuality', label: 'Punctuality', icon: Clock, color: '#3b82f6' },
    { value: 'teamwork', label: 'Team Collaboration', icon: Users, color: '#8b5cf6' },
    { value: 'innovation', label: 'Innovation & Ideas', icon: Lightbulb, color: '#f59e0b' },
    { value: 'sales', label: 'Sales Achievement', icon: TrendingUp, color: '#ef4444' },
    { value: 'customer', label: 'Customer Service', icon: Smile, color: '#06b6d4' },
    { value: 'other', label: 'Other', icon: Gift, color: '#6366f1' }
  ];

  // --- CHANGED: Updated Presets for 1-5 range ---
  const pointsPresets = [
    { value: 1, label: '+1 Point', color: '#e8f5e9' },
    { value: 2, label: '+2 Points', color: '#c8e6c9' },
    { value: 3, label: '+3 Points', color: '#a5d6a7' },
    { value: 4, label: '+4 Points', color: '#81c784' },
    { value: 5, label: '+5 Points', color: '#66bb6a' }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchBonusRecords(),
        fetchLeaderboard()
      ]);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getAllEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchBonusRecords = async () => {
    try {
      const response = await bonusAPI.getAllBonusPoints();
      const records = response.data.map(record => ({
        ...record,
        id: record._id,
        employeeName: record.employeeId?.name || 'Unknown',
        timestamp: new Date(record.createdAt)
      }));
      setBonusRecords(records);
    } catch (err) {
      console.error('Error fetching bonus records:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await bonusAPI.getLeaderboard();
      const leaderboard = response.data.map(emp => ({
        employeeId: emp._id,
        employeeName: emp.name,
        totalPoints: emp.bonusPoints,
        position: emp.position
      }));
      // We don't need a separate state for rankings if we use the records to compute or fetch separately
      // But for the sake of the existing UI logic, let's just make sure bonusRecords is updated
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  useEffect(() => {
    filterRecords();
  }, [bonusRecords, searchQuery, filterType, filterDate, employees, selectedStore]);

  const filterRecords = () => {
    let filtered = [...bonusRecords];

    // 1. Date Filter
    if (filterDate) {
      filtered = filtered.filter(record => record.date === filterDate);
    }

    // 2. Type/Category Filter
    if (filterType !== 'all') {
      filtered = filtered.filter(record => {
        const cat = bonusCategories.find(c => c.value === filterType);
        return record.category === cat?.label;
      });
    }

    // Store Filter
    if (selectedStore && selectedStore !== 'All Stores') {
      filtered = filtered.filter(record => {
        const empId = record.employeeId?._id || record.employeeId;
        const emp = employees.find(e => e._id === empId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    // 3. Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();

      filtered = filtered.filter(record => {
        const employee = employees.find(e => e._id === (record.employeeId?._id || record.employeeId)) || {};
        const position = employee.position ? employee.position.toLowerCase() : '';
        const name = record.employeeName.toLowerCase();
        const reason = record.reason.toLowerCase();

        return (
          name.includes(query) ||
          reason.includes(query) ||
          position.includes(query)
        );
      });
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);
    setFilteredRecords(filtered);
  };

  const calculateEmployeePoints = (employeeId) => {
    const eid = employeeId?._id || employeeId;
    const employee = employees.find(e => e._id === eid);
    return employee ? employee.bonusPoints || 0 : 0;
  };

  const getEmployeeRanking = () => {
    // #r Filter employees by selectedStore for store-specific leaderboard
    let storeEmployees = employees;
    if (selectedStore && selectedStore !== 'All Stores') {
      storeEmployees = employees.filter(emp =>
        emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore
      );
    }

    return storeEmployees
      .filter(emp => emp.bonusPoints > 0)
      .map(emp => ({
        employeeId: emp._id,
        employeeName: emp.name,
        totalPoints: emp.bonusPoints
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // --- CHANGED: Input restriction logic ---
    if (name === 'points') {
      const numValue = parseInt(value);
      // Allow empty string or numbers between 1 and 5
      if (value !== '' && (numValue < 1 || numValue > 5)) {
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      points: '',
      type: 'reward',
      category: 'performance',
      reason: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleAddBonus = () => {
    resetForm();
    setShowAddModal(true);
  };

  const saveBonus = async (e) => {
    e.preventDefault();

    const pointsValue = parseInt(formData.points);

    if (!formData.employeeId || !formData.points || !formData.reason.trim()) {
      alert('⚠️ Please fill in all required fields!');
      return;
    }

    if (pointsValue < 1 || pointsValue > 5) {
      alert('⚠️ Points must be between 1 and 5!');
      return;
    }

    try {
      setLoading(true);
      const categoryLabel = bonusCategories.find(c => c.value === formData.category)?.label;

      console.log('📡 Sending Bonus Data:', {
        employeeId: formData.employeeId,
        transactionType: formData.type,
        category: categoryLabel,
        points: pointsValue,
        reason: formData.reason,
        date: formData.date
      });

      await bonusAPI.createBonusPoints({
        employeeId: formData.employeeId,
        transactionType: formData.type,
        category: categoryLabel, // Send the label as expected by backend enum
        points: pointsValue,
        reason: formData.reason,
        date: formData.date
      });

      // Refresh data
      await fetchInitialData();

      setShowAddModal(false);
      resetForm();

      const employee = employees.find(e => e._id === formData.employeeId);
      const action = formData.type === 'reward' ? 'awarded' : 'deducted';
      alert(`✅ ${pointsValue} points ${action} successfully to ${employee?.name}!`);
    } catch (err) {
      console.error('❌ Error saving bonus:', err);
      if (err.response) {
        console.error('❌ Server Error Details:', err.response.data);
        alert(`❌ Failed to save bonus points: ${err.response.data.msg || 'Server error'}`);
      } else {
        alert('❌ Failed to save bonus points. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bonus record? The employee\'s points will be automatically adjusted.')) {
      return;
    }

    try {
      setLoading(true);
      await bonusAPI.deleteBonusPoints(id);

      // Refresh all data to reflect point reversal
      await fetchInitialData();

      alert('✅ Bonus record deleted and points reverted successfully.');
    } catch (err) {
      console.error('Error deleting record:', err);
      alert('❌ Failed to delete record. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const [employeeHistory, setEmployeeHistory] = useState([]);

  const viewEmployeeHistory = async (employeeId, employeeName) => {
    setSelectedEmployee({ id: employeeId, name: employeeName });
    setShowHistoryModal(true);
    setLoading(true);
    try {
      const response = await bonusAPI.getEmployeeBonusHistory(employeeId);
      const history = response.data.history.map(record => ({
        ...record,
        id: record._id,
        timestamp: new Date(record.createdAt)
      }));
      setEmployeeHistory(history);
    } catch (err) {
      console.error('Error fetching employee history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeHistory = () => {
    return employeeHistory;
  };

  const getCategoryInfo = (category) => {
    return bonusCategories.find(c => c.label === category || c.value === category) || bonusCategories[0];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStats = () => {
    // #r Filter bonusRecords by selectedStore for accurate stats
    let storeRecords = bonusRecords;
    if (selectedStore && selectedStore !== 'All Stores') {
      storeRecords = bonusRecords.filter(record => {
        const empId = record.employeeId?._id || record.employeeId;
        const emp = employees.find(e => e._id === empId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    const totalAwarded = storeRecords
      .filter(r => r.type === 'reward')
      .reduce((sum, r) => sum + r.points, 0);

    const totalDeducted = storeRecords
      .filter(r => r.type === 'deduction')
      .reduce((sum, r) => sum + r.points, 0);

    const uniqueEmployees = new Set(storeRecords.map(r => r.employeeId)).size;

    return {
      totalAwarded,
      totalDeducted,
      netPoints: totalAwarded - totalDeducted,
      totalTransactions: storeRecords.length,
      uniqueEmployees
    };
  };

  const stats = getStats();
  const rankings = getEmployeeRanking();

  return (
    <div className="bonus-points">
      {/* Header */}
      <div className="bonus-header">
        <div className="bonus-header-left">
          <h2>
            <Star className="header-icon" />
            Bonus Points Management
          </h2>
          <p>Reward and incentivize your team members</p>
        </div>
        <div className="bonus-header-right">
          <button className="btn-primary" onClick={handleAddBonus}>
            <Plus size={20} strokeWidth={3} />
            Award Points
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bonus-stats-grid">
        <div className="bonus-stat-card primary">
          <div className="bonus-stat-icon">
            <Award size={20} />
          </div>
          <div className="bonus-stat-content">
            <div className="bonus-stat-value">{stats.totalAwarded.toLocaleString()}</div>
            <div className="bonus-stat-label">Total Awarded</div>
          </div>
        </div>

        <div className="bonus-stat-card success">
          <div className="bonus-stat-icon">
            <Trophy size={20} />
          </div>
          <div className="bonus-stat-content">
            <div className="bonus-stat-value">{stats.netPoints.toLocaleString()}</div>
            <div className="bonus-stat-label">Net Points</div>
          </div>
        </div>

        <div className="bonus-stat-card info">
          <div className="bonus-stat-icon">
            <Users size={20} />
          </div>
          <div className="bonus-stat-content">
            <div className="bonus-stat-value">{stats.uniqueEmployees}</div>
            <div className="bonus-stat-label">Employees Rewarded</div>
          </div>
        </div>

        <div className="bonus-stat-card warning">
          <div className="bonus-stat-icon">
            <List size={20} />
          </div>
          <div className="bonus-stat-content">
            <div className="bonus-stat-value">{stats.totalTransactions}</div>
            <div className="bonus-stat-label">Total Transactions</div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="bonus-content-grid">
        {/* Leaderboard */}
        <div className="leaderboard-card">
          <div className="card-header">
            <h3>
              <Medal size={18} className="header-icon" />
              Top Performers
            </h3>
          </div>
          <div className="card-body">
            {rankings.length === 0 ? (
              <div className="empty-state-small">
                <Trophy size={32} />
                <p>No bonus records yet</p>
              </div>
            ) : (
              <div className="leaderboard-list">
                {rankings.slice(0, 10).map((emp, index) => (
                  <div
                    key={emp.employeeId}
                    className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}
                    onClick={() => viewEmployeeHistory(emp.employeeId, emp.employeeName)}
                  >
                    <div className="rank-badge">
                      {index === 0 && <Crown size={16} />}
                      {index === 1 && <Medal size={16} />}
                      {index === 2 && <Award size={16} />}
                      {index > 2 && <span>#{index + 1}</span>}
                    </div>
                    <div className="employee-info-leader">
                      <div className="employee-avatar-leader">
                        {emp.employeeName.charAt(0)}
                      </div>
                      <div className="employee-details">
                        <div className="employee-name-leader">{emp.employeeName}</div>
                        <div className="employee-points-label">Total Points</div>
                      </div>
                    </div>
                    <div className="points-badge-leader">
                      <Star size={12} fill="currentColor" />
                      {emp.totalPoints}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="transactions-card">
          <div className="card-header">
            <h3>
              <History size={18} className="header-icon" />
              Recent Transactions
            </h3>
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Search name, position, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-bonus"
              />

              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="date-input-bonus"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  outline: 'none',
                  fontSize: '0.9rem',
                  color: '#475569'
                }}
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                {bonusCategories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="loading-state-small">
                <div className="spinner"></div>
                <p>Loading transactions...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="empty-state-small">
                <List size={32} />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="transactions-list">
                {filteredRecords.map(record => {
                  const categoryInfo = getCategoryInfo(record.category);
                  return (
                    <div key={record.id} className="transaction-item">
                      <div
                        className="category-icon"
                        style={{ background: `${categoryInfo.color}20`, color: categoryInfo.color }}
                      >
                        <categoryInfo.icon size={18} />
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-header">
                          <span className="employee-name-trans">{record.employeeName}</span>
                          <span
                            className={`points-change ${record.type}`}
                            style={{ color: record.type === 'reward' ? '#2e7d32' : '#c62828' }}
                          >
                            {record.type === 'reward' ? '+' : '-'}{record.points}
                            <Star size={12} fill="currentColor" />
                          </span>
                        </div>
                        <div className="transaction-reason">{record.reason}</div>
                        <div className="transaction-meta">
                          <span className="category-tag" style={{ borderColor: categoryInfo.color, color: categoryInfo.color }}>
                            {categoryInfo.label}
                          </span>
                          <span className="transaction-date">
                            <Calendar size={12} />
                            {formatDate(record.date)}
                          </span>
                          <button
                            className="btn-delete-trans"
                            onClick={() => handleDeleteRecord(record.id)}
                            title="Delete Transaction"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Bonus Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Star size={20} className="header-icon" />
                Award Bonus Points
              </h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveBonus}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>
                      <Users size={14} />
                      Select Employee <span className="required">*</span>
                    </label>
                    <select
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Choose an employee...</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      <TrendingUp size={14} />
                      Transaction Type <span className="required">*</span>
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="reward">✅ Award Points (Add)</option>
                      <option value="deduction">❌ Deduct Points (Remove)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      <List size={14} />
                      Category <span className="required">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                    >
                      {bonusCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>
                      <Star size={14} />
                      Points <span className="required">*</span>
                    </label>
                    <div className="points-input-group">
                      <input
                        type="number"
                        name="points"
                        value={formData.points}
                        onChange={handleInputChange}
                        placeholder="1 - 5"
                        min="1"
                        max="5"
                        required
                      />
                      <div className="points-presets">
                        {pointsPresets.map(preset => (
                          <button
                            key={preset.value}
                            type="button"
                            className="preset-btn"
                            style={{ background: preset.color }}
                            onClick={() => setFormData(prev => ({ ...prev, points: preset.value }))}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>
                      <AlertCircle size={14} />
                      Reason <span className="required">*</span>
                    </label>
                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      placeholder="Enter reason for awarding/deducting points..."
                      rows="4"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <Calendar size={14} />
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {formData.employeeId && (
                  <div className="info-box">
                    <Info size={18} />
                    <div>
                      <strong>Current Points:</strong>{' '}
                      {calculateEmployeePoints(formData.employeeId)} points
                    </div>
                  </div>
                )}
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
                  <Save size={18} />
                  {formData.type === 'reward' ? 'Award Points' : 'Deduct Points'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee History Modal */}
      {showHistoryModal && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <History size={20} className="header-icon" />
                Points History - {selectedEmployee.name}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="history-summary">
                <div className="summary-item">
                  <div className="summary-label">Total Points</div>
                  <div className="summary-value primary">
                    {calculateEmployeePoints(selectedEmployee.id)}
                    <Star size={18} fill="currentColor" />
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Transactions</div>
                  <div className="summary-value">
                    {getEmployeeHistory().length}
                  </div>
                </div>
              </div>

              <div className="history-list">
                {getEmployeeHistory().map(record => {
                  const categoryInfo = getCategoryInfo(record.category);
                  return (
                    <div key={record.id} className="history-item">
                      <div
                        className="history-icon"
                        style={{ background: `${categoryInfo.color}20`, color: categoryInfo.color }}
                      >
                        <categoryInfo.icon size={16} />
                      </div>
                      <div className="history-details">
                        <div className="history-header">
                          <span className="history-category">{categoryInfo.label}</span>
                          <span
                            className={`history-points ${record.type}`}
                          >
                            {record.type === 'reward' ? '+' : '-'}{record.points}
                          </span>
                        </div>
                        <div className="history-reason">{record.reason}</div>
                        <div className="history-date">
                          <Calendar size={10} />
                          {formatDate(record.date)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BonusPoints;