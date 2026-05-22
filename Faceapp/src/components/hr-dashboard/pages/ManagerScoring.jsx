import { useState, useEffect } from 'react';
import './ManagerScoring.css';
import { getAllManagers, updateManagerScore } from '../../services/managerService';

const ManagerScoring = ({ selectedStore }) => {
  const [managers, setManagers] = useState([]);
  const [filteredManagers, setFilteredManagers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [activeStatFilter, setActiveStatFilter] = useState('all'); // #r Added for stat card filtering

  // Initialize with 1 (min score)
  const [scoreForm, setScoreForm] = useState({
    teamPerformance: 1,
    attendanceRate: 1,
    punctuality: 1,
    taskCompletion: 1,
    teamSatisfaction: 1,
    leadership: 1,
    communication: 1,
    problemSolving: 1,
    notes: ''
  });

  const departments = [
    'Engineering', 'Sales', 'Marketing', 'HR',
    'Finance', 'Operations', 'IT', 'Customer Support'
  ];

  const scoreCategories = [
    { key: 'teamPerformance', label: 'Team Performance', icon: 'fa-users', color: '#1976d2' },
    { key: 'attendanceRate', label: 'Attendance Rate', icon: 'fa-calendar-check', color: '#2e7d32' },
    { key: 'punctuality', label: 'Punctuality', icon: 'fa-clock', color: '#f57c00' },
    { key: 'taskCompletion', label: 'Task Completion', icon: 'fa-tasks', color: '#7b1fa2' },
    { key: 'teamSatisfaction', label: 'Team Satisfaction', icon: 'fa-smile', color: '#00897b' },
    { key: 'leadership', label: 'Leadership', icon: 'fa-award', color: '#c62828' },
    { key: 'communication', label: 'Communication', icon: 'fa-comments', color: '#1e7b4e' },
    { key: 'problemSolving', label: 'Problem Solving', icon: 'fa-lightbulb', color: '#d84315' }
  ];

  useEffect(() => {
    fetchManagers();
  }, []);

  /**
   * Fetches real manager data from the backend and maps it for internal usage
   */
  const fetchManagers = async () => {
    try {
      const response = await getAllManagers();
      // Ensure each manager has a scores object if it doesn't exist (should be handled by backend though)
      const data = response.data.map(mgr => ({
        ...mgr,
        id: mgr._id, // Map _id to id for consistency
        name: mgr.fullName,
        scores: mgr.scores || {
          teamPerformance: 1,
          attendanceRate: 1,
          punctuality: 1,
          taskCompletion: 1,
          teamSatisfaction: 1,
          leadership: 1,
          communication: 1,
          problemSolving: 1
        },
        overallScore: mgr.overallScore || 1,
        teamSize: mgr.teamSize || 0 // If teamSize is not in schema yet
      }));
      setManagers(data);
    } catch (err) {
      console.error('Error fetching managers:', err);
    }
  };

  useEffect(() => {
    filterAndSortManagers();
  }, [managers, searchQuery, filterDepartment, sortBy, activeStatFilter, selectedStore]);

  const filterAndSortManagers = () => {
    let filtered = [...managers];

    if (searchQuery) {
      filtered = filtered.filter(mgr =>
        mgr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mgr.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mgr.branch?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mgr.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterDepartment !== 'all') {
      filtered = filtered.filter(mgr => mgr.department === filterDepartment || mgr.branch === filterDepartment);
    }

    // Store Filter
    if (selectedStore && selectedStore !== 'All Stores') {
      filtered = filtered.filter(mgr =>
        (mgr.storeName === selectedStore) ||
        (mgr.branch === selectedStore) ||
        (mgr.department === selectedStore)
      );
    }

    // #r Apply stat card filtering
    if (activeStatFilter === 'top') {
      filtered = filtered.filter(mgr => mgr.overallScore >= 4.5);
    } else if (activeStatFilter === 'improvement') {
      filtered = filtered.filter(mgr => mgr.overallScore < 3.0);
    } else if (activeStatFilter === 'average') {
      const avg = managers.reduce((sum, mgr) => sum + mgr.overallScore, 0) / managers.length || 0;
      filtered = filtered.filter(mgr => mgr.overallScore >= avg);
    } else if (activeStatFilter === 'team') {
      filtered = filtered.filter(mgr => (mgr.teamSize || 0) > 0);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'score') return b.overallScore - a.overallScore;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'department') return (a.department || '').localeCompare(b.department || '');
      if (sortBy === 'teamSize') return (b.teamSize || 0) - (a.teamSize || 0);
      return 0;
    });

    setFilteredManagers(filtered);
  };

  const handleScoreChange = (category, value) => {
    // Parse as integer to enforce 1, 2, 3, 4, 5 strict steps
    const intVal = parseInt(value, 10);
    setScoreForm(prev => ({
      ...prev,
      [category]: intVal
    }));
  };

  const openScoreModal = (manager) => {
    setSelectedManager(manager);
    if (manager) {
      setScoreForm({
        teamPerformance: manager.scores.teamPerformance,
        attendanceRate: manager.scores.attendanceRate,
        punctuality: manager.scores.punctuality,
        taskCompletion: manager.scores.taskCompletion,
        teamSatisfaction: manager.scores.teamSatisfaction,
        leadership: manager.scores.leadership,
        communication: manager.scores.communication,
        problemSolving: manager.scores.problemSolving,
        notes: manager.notes || ''
      });
    }
    setShowScoreModal(true);
  };

  /**
   * Updates manager score in the database and refreshes local state
   */
  const saveScore = async (e) => {
    e.preventDefault();

    try {
      await updateManagerScore(selectedManager._id || selectedManager.id, {
        scores: { ...scoreForm },
        notes: scoreForm.notes
      });

      setShowScoreModal(false);
      alert('✅ Manager score updated successfully!');
      fetchManagers(); // Refresh data from source
    } catch (err) {
      console.error('Error saving score:', err);
      alert('❌ Failed to update manager score');
    }
  };

  const viewDetails = (manager) => {
    setSelectedManager(manager);
    setShowDetailsModal(true);
  };

  // --- SCORE COLORS (1-5 Scale) ---
  const getScoreColor = (score) => {
    if (score >= 4.5) return '#2e7d32'; // 5 (Excellent)
    if (score >= 4) return '#1e7b4e'; // 4 (Very Good)
    if (score >= 3) return '#f57c00'; // 3 (Average)
    if (score >= 2) return '#fb8c00'; // 2 (Poor)
    return '#c62828'; // 1 (Bad)
  };

  // --- SCORE LABELS (1-5 Scale) ---
  const getScoreLabel = (score) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 4) return 'Very Good';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Fair';
    return 'Poor';
  };

  const getRankBadge = (index) => {
    if (index === 0) return { icon: 'fa-crown', color: '#f59e0b', label: '1st' };
    if (index === 1) return { icon: 'fa-medal', color: '#9ca3af', label: '2nd' };
    if (index === 2) return { icon: 'fa-award', color: '#f87171', label: '3rd' };
    return null;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // --- STATS LOGIC (1-5 Scale) ---
  const getStats = () => {
    const totalManagers = managers.length;
    const avgScore = managers.reduce((sum, mgr) => sum + mgr.overallScore, 0) / totalManagers || 0;
    const topPerformers = managers.filter(mgr => mgr.overallScore >= 4.5).length;
    const needsImprovement = managers.filter(mgr => mgr.overallScore < 3.0).length;
    const totalTeamMembers = managers.reduce((sum, mgr) => sum + mgr.teamSize, 0);

    return {
      totalManagers,
      avgScore: avgScore.toFixed(1),
      topPerformers,
      needsImprovement,
      totalTeamMembers
    };
  };

  const stats = getStats();

  return (
    <div className="manager-scoring">
      {/* Header */}
      <div className="scoring-header">
        <div className="scoring-header-left">
          <h2>
            <i className="fas fa-user-tie"></i>
            Manager Performance Scoring
          </h2>
          <p>Evaluate and track manager performance metrics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="scoring-stats-grid">
        <div
          className={`scoring-stat-card total ${activeStatFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('all')}
          style={{ cursor: 'pointer' }}
        >
          <div className="scoring-stat-icon"><i className="fas fa-users"></i></div>
          <div className="scoring-stat-content">
            <div className="scoring-stat-value">{stats.totalManagers}</div>
            <div className="scoring-stat-label">Total Managers</div>
          </div>
        </div>

        <div
          className={`scoring-stat-card average ${activeStatFilter === 'average' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('average')}
          style={{ cursor: 'pointer' }}
        >
          <div className="scoring-stat-icon"><i className="fas fa-chart-line"></i></div>
          <div className="scoring-stat-content">
            <div className="scoring-stat-value">{stats.avgScore}</div>
            <div className="scoring-stat-label">Average Score (1-5)</div>
          </div>
        </div>

        <div
          className={`scoring-stat-card top ${activeStatFilter === 'top' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('top')}
          style={{ cursor: 'pointer' }}
        >
          <div className="scoring-stat-icon"><i className="fas fa-trophy"></i></div>
          <div className="scoring-stat-content">
            <div className="scoring-stat-value">{stats.topPerformers}</div>
            <div className="scoring-stat-label">Top Performers (4.5+)</div>
          </div>
        </div>

        <div
          className={`scoring-stat-card improvement ${activeStatFilter === 'improvement' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('improvement')}
          style={{ cursor: 'pointer' }}
        >
          <div className="scoring-stat-icon"><i className="fas fa-exclamation-circle"></i></div>
          <div className="scoring-stat-content">
            <div className="scoring-stat-value">{stats.needsImprovement}</div>
            <div className="scoring-stat-label">Needs Improvement</div>
          </div>
        </div>

        <div
          className={`scoring-stat-card team ${activeStatFilter === 'team' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('team')}
          style={{ cursor: 'pointer' }}
        >
          <div className="scoring-stat-icon"><i className="fas fa-user-friends"></i></div>
          <div className="scoring-stat-content">
            <div className="scoring-stat-value">{stats.totalTeamMembers}</div>
            <div className="scoring-stat-label">Total Team Members</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="scoring-filters">
        <input
          type="text"
          placeholder="Search managers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input-scoring"
        />
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="filter-select-scoring"
        >
          <option value="all">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="filter-select-scoring"
        >
          <option value="score">Sort by Score</option>
          <option value="name">Sort by Name</option>
          <option value="department">Sort by Department</option>
          <option value="teamSize">Sort by Team Size</option>
        </select>
      </div>

      {/* Managers Grid */}
      <div className="managers-grid">
        {filteredManagers.map((manager, index) => {
          const rankBadge = getRankBadge(index);
          const scoreColor = getScoreColor(manager.overallScore);

          return (
            <div
              key={manager.id}
              className="manager-card"
              style={{ borderTopColor: scoreColor }}
            >
              {rankBadge && (
                <div className="rank-badge-top" style={{ background: rankBadge.color }}>
                  <i className={`fas ${rankBadge.icon}`}></i> {rankBadge.label}
                </div>
              )}

              <div className="manager-card-header">
                <div className="manager-avatar-scoring">
                  {manager.name.split(' ').map(n => n.charAt(0)).join('')}
                </div>
                <div className="manager-info-scoring">
                  <h3>{manager.name}</h3>
                  <div className="manager-department">{manager.department}</div>
                  <div className="manager-team-size">
                    <i className="fas fa-users"></i> Team of {manager.teamSize}
                  </div>
                </div>
              </div>

              <div className="score-display">
                <div className="score-circle" style={{ borderColor: scoreColor }}>
                  <div className="score-value" style={{ color: scoreColor }}>
                    {manager.overallScore.toFixed(1)}
                  </div>
                  {/* VISUAL: Max is 5 */}
                  <div className="score-max">/5</div>
                </div>
                <div className="score-label" style={{ color: scoreColor }}>
                  {getScoreLabel(manager.overallScore)}
                </div>
              </div>

              <div className="score-breakdown">
                {scoreCategories.slice(0, 4).map(category => {
                  const score = manager.scores[category.key];
                  return (
                    <div key={category.key} className="breakdown-item">
                      <div className="breakdown-header">
                        <i className={`fas ${category.icon}`} style={{ color: category.color }}></i>
                        <span>{category.label}</span>
                      </div>
                      <div className="breakdown-bar">
                        <div
                          className="breakdown-fill"
                          style={{
                            // CALC: Width based on 5 max
                            width: `${(score / 5) * 100}%`,
                            background: getScoreColor(score)
                          }}
                        ></div>
                      </div>
                      <div className="breakdown-score">{score}</div>
                    </div>
                  );
                })}
              </div>

              <div className="manager-card-footer">
                <div className="last-evaluated">
                  <i className="far fa-clock"></i> Last evaluated: {formatDate(manager.lastEvaluated)}
                </div>
                <div className="card-actions">
                  <button className="action-btn-scoring view" onClick={() => viewDetails(manager)}>
                    <i className="fas fa-eye"></i> Details
                  </button>
                  <button className="action-btn-scoring score" onClick={() => openScoreModal(manager)}>
                    <i className="fas fa-star"></i> Score
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SCORE MODAL - COMPACT */}
      {showScoreModal && selectedManager && (
        <div className="modal-overlay" onClick={() => setShowScoreModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-sliders-h" style={{ color: '#64748b', fontSize: '14px' }}></i> Evaluate {selectedManager.name.split(' ')[0]}</h3>
              <button className="modal-close-btn" onClick={() => setShowScoreModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={saveScore}>
              <div className="modal-body">
                <div className="score-form-grid">
                  {scoreCategories.map(cat => (
                    <div key={cat.key} className="score-input-group">
                      <div className="score-label-wrapper">
                        <i className={`fas ${cat.icon}`} style={{ color: '#94a3b8', width: '16px' }}></i>
                        {cat.label}
                      </div>
                      <div className="score-slider-wrapper">
                        {/* INPUT: Strict 1-5 range */}
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={scoreForm[cat.key]}
                          onChange={(e) => handleScoreChange(cat.key, e.target.value)}
                          className="score-slider"
                          style={{
                            // VISUAL: Gradient calculated for range 1-5 (span of 4)
                            background: `linear-gradient(to right, ${getScoreColor(scoreForm[cat.key])} 0%, ${getScoreColor(scoreForm[cat.key])} ${((scoreForm[cat.key] - 1) / 4) * 100}%, #f1f5f9 ${((scoreForm[cat.key] - 1) / 4) * 100}%, #f1f5f9 100%)`,
                            color: getScoreColor(scoreForm[cat.key])
                          }}
                        />
                        <span className="score-value-badge" style={{ color: getScoreColor(scoreForm[cat.key]) }}>
                          {scoreForm[cat.key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={scoreForm.notes}
                    onChange={(e) => setScoreForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows="3"
                    className="notes-input"
                    placeholder="Optional feedback..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowScoreModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Score</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL - COMPACT */}
      {showDetailsModal && selectedManager && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Manager Profile</h3>
              <button className="modal-close-btn" onClick={() => setShowDetailsModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div className="details-header-compact">
                <div className="details-avatar-small">
                  {selectedManager.name.split(' ').map(n => n.charAt(0)).join('')}
                </div>
                <div className="details-info-compact">
                  <h2>{selectedManager.name}</h2>
                  <div className="details-role">{selectedManager.department} • Team of {selectedManager.teamSize}</div>
                </div>
              </div>

              <div className="score-summary-compact">
                <div>
                  <div className="score-big-number" style={{ color: getScoreColor(selectedManager.overallScore) }}>
                    {selectedManager.overallScore.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Overall Performance</div>
                </div>
                <div className="score-status-badge" style={{ color: getScoreColor(selectedManager.overallScore) }}>
                  {getScoreLabel(selectedManager.overallScore)}
                </div>
              </div>

              <div className="details-list-compact">
                {scoreCategories.slice(0, 5).map(cat => (
                  <div key={cat.key} className="details-list-item">
                    <div className="details-list-label">
                      <i className={`fas ${cat.icon}`} style={{ color: '#94a3b8', fontSize: '11px' }}></i> {cat.label}
                    </div>
                    <div className="details-list-value" style={{ color: getScoreColor(selectedManager.scores[cat.key]) }}>
                      {selectedManager.scores[cat.key]}/5
                    </div>
                  </div>
                ))}
              </div>

              {selectedManager.notes && (
                <div style={{ marginTop: '20px', padding: '12px', background: '#fffbeb', borderRadius: '6px', fontSize: '12px', color: '#92400e', lineHeight: '1.5' }}>
                  <strong>Note:</strong> {selectedManager.notes}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
              <button className="btn-primary" onClick={() => { setShowDetailsModal(false); openScoreModal(selectedManager); }}>Edit Score</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerScoring;