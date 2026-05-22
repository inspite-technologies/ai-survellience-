import React, { useState, useEffect } from 'react';
import { getAllManagers, createManager, updateManager, deleteManager } from '../../services/managerAPI';
import { getAllEmployees } from '../../services/employeeAPI';
import { getAllStores } from '../../services/storeAPI';
import {
  Users,
  UserPlus,
  Search,
  LayoutGrid,
  List,
  Edit,
  Eye,
  Trash2,
  Plus,
  X,
  MapPin,
  Phone,
  Calendar,
  Clock,
  Building2,
  TrendingUp,
  RefreshCw,
  Star,
  Settings,
  Mail,
  DollarSign,
  Briefcase,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import EmployeeSelector from "../../common/EmployeeSelector";
import './Manager.css';

const ManagerManagement = ({ selectedStore }) => {
  // #r Use Global Settings
  const { formatCurrency } = useSettings();

  // --- STATE ---
  const [managers, setManagers] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]); // All employees for assignment
  const [branches, setBranches] = useState([]); // Dynamic branches from Store API
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterJoinDate, setFilterJoinDate] = useState('');
  const [selectedManager, setSelectedManager] = useState(null);
  const [modalType, setModalType] = useState(null); // 'view', 'form', 'delete', 'score'
  const [formMode, setFormMode] = useState('add');

  const initialForm = {
    fullName: '',
    branch: '',
    email: '',
    phoneNumber: '',
    annualSalary: '',
    joinDate: '',
    password: '',
    employees: []
  };

  const [formData, setFormData] = useState(initialForm);

  // ✅ FIXED: Match Backend Schema
  const defaultScores = {
    teamPerformance: 3,
    attendanceRate: 3,
    punctuality: 3,
    taskCompletion: 3,
    teamSatisfaction: 3,
    leadership: 3,
    communication: 3,
    problemSolving: 3
  };

  const scoreCategories = [
    { key: 'teamPerformance', label: 'Team Performance', icon: 'fa-users' },
    { key: 'attendanceRate', label: 'Attendance Rate', icon: 'fa-clock' },
    { key: 'punctuality', label: 'Punctuality', icon: 'fa-hourglass-start' },
    { key: 'taskCompletion', label: 'Task Completion', icon: 'fa-check-circle' },
    { key: 'teamSatisfaction', label: 'Team Satisfaction', icon: 'fa-smile' },
    { key: 'leadership', label: 'Leadership', icon: 'fa-crown' },
    { key: 'communication', label: 'Communication', icon: 'fa-comments' },
    { key: 'problemSolving', label: 'Problem Solving', icon: 'fa-brain' }
  ];

  const [scoreForm, setScoreForm] = useState({ ...defaultScores, notes: '' });

  useEffect(() => {
    fetchStores();
    fetchManagers();
    fetchAllEmployees();
  }, []);

  const fetchStores = async () => {
    try {
      const result = await getAllStores();
      const storeList = Array.isArray(result) ? result : (result.data || []);
      if (storeList.length > 0) {
        const storeNames = storeList.map(s => s.storeName).filter(Boolean);
        setBranches([...new Set(storeNames)]);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const result = await getAllManagers();
      const data = Array.isArray(result) ? result : (result.data || []);

      const mappedManagers = data.map(m => ({
        _id: m._id,
        name: m.fullName,
        email: m.email,
        phone: m.phoneNumber,
        branch: m.branch,
        joinDate: m.joinDate ? m.joinDate.split('T')[0] : '', // Format date
        salary: m.annualSalary,
        experience: calculateExperience(m.joinDate),
        scores: m.scores || defaultScores,
        overallScore: m.overallScore || 0,
        notes: m.notes,
        employees: m.employees || []
      }));

      setManagers(mappedManagers);
    } catch (err) {
      console.error('Error fetching managers:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateExperience = (joinDate) => {
    if (!joinDate) return '0 Years';
    const start = new Date(joinDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    if (diffYears < 1) return '< 1 Year';
    return `${diffYears} Years`;
  };
  
  const fetchAllEmployees = async () => {
    try {
      const data = await getAllEmployees();
      if (Array.isArray(data)) {
        setAllEmployees(data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 4.5) return '#165d3c';
    if (score >= 4.0) return '#2e7d32';
    if (score >= 3.0) return '#f59e0b';
    if (score >= 2.0) return '#d97706';
    return '#dc2626';
  };

  const filteredManagers = managers.filter(mgr => {
    if (selectedStore && selectedStore !== 'All Stores') {
      if (!mgr.branch || mgr.branch !== selectedStore) return false;
    }

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      mgr.name.toLowerCase().includes(query) ||
      mgr.branch.toLowerCase().includes(query) ||
      mgr.email.toLowerCase().includes(query);
    const matchesBranch = filterBranch ? mgr.branch === filterBranch : true;
    const matchesDate = filterJoinDate ? mgr.joinDate === filterJoinDate : true;
    return matchesSearch && matchesBranch && matchesDate;
  });

  const statsManagers = selectedStore && selectedStore !== 'All Stores'
    ? managers.filter(m => m.branch === selectedStore)
    : managers;

  const stats = {
    total: statsManagers.length,
    totalSalary: statsManagers.reduce((acc, curr) => acc + Number(curr.salary), 0),
    avgSalary: statsManagers.length > 0 ? Math.round(statsManagers.reduce((acc, curr) => acc + Number(curr.salary), 0) / statsManagers.length) : 0,
    branches: new Set(statsManagers.map(m => m.branch)).size
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterBranch('');
    setFilterJoinDate('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, selectedOptions } = e.target;
    if (type === 'select-multiple') {
      const values = Array.from(selectedOptions, option => option.value);
      setFormData(prev => ({ ...prev, [name]: values }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openAddModal = () => {
    setFormMode('add');
    setFormData(initialForm);
    setModalType('form');
  };

  const openEditModal = (mgr) => {
    setFormMode('edit');
    setSelectedManager(mgr);
    setFormData({
      fullName: mgr.name,
      branch: mgr.branch,
      email: mgr.email,
      phoneNumber: mgr.phone,
      annualSalary: mgr.salary,
      joinDate: mgr.joinDate,
      password: '',
      employees: mgr.employees ? mgr.employees.map(emp => emp._id || emp) : []
    });
    setModalType('form');
  };

  const openViewModal = (mgr) => {
    setSelectedManager(mgr);
    setModalType('view');
  };

  const openDeleteModal = (mgr) => {
    setSelectedManager(mgr);
    setModalType('delete');
  };

  const openScoreModal = (mgr) => {
    setSelectedManager(mgr);
    setScoreForm({ ...(mgr.scores || defaultScores), notes: mgr.notes || '' });
    setModalType('score');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedManager(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiData = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        branch: formData.branch,
        joinDate: formData.joinDate,
        annualSalary: formData.annualSalary,
        password: formData.password,
        employees: formData.employees
      };

      if (formMode === 'add') {
        const response = await createManager({ ...apiData, scores: defaultScores, overallScore: 3.0 });
        if (response.msg || response.data) fetchManagers();
      } else {
        const response = await updateManager(selectedManager._id, apiData);
        if (response.msg || response.data) fetchManagers();
      }
      closeModal();
    } catch (err) {
      console.error('Error saving manager:', err);
      const errMsg = err.response?.data?.msg || err.response?.data?.message || err.message || 'Server error';
      alert('❌ Error: ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await deleteManager(selectedManager._id);
      if (response.msg) {
        fetchManagers();
        closeModal();
      }
    } catch (err) {
      console.error('Error deleting manager:', err);
      alert('❌ Error: ' + (err.response?.data?.msg || 'Server error'));
    }
  };

  const handleScoreChange = (key, value) => {
    let val = parseInt(value);
    if (val > 5) val = 5;
    if (val < 1) val = 1;
    setScoreForm(prev => ({ ...prev, [key]: val }));
  };

  const saveScore = async (e) => {
    e.preventDefault();
    const { notes, ...scoresOnly } = scoreForm;
    const values = Object.values(scoresOnly).filter(v => typeof v === 'number');
    const newOverall = values.reduce((a, b) => a + b, 0) / values.length;

    try {
      const response = await updateManager(selectedManager._id, {
        scores: scoresOnly,
        overallScore: newOverall,
        notes: notes
      });
      if (response.msg || response.data) {
        fetchManagers();
        closeModal();
      }
    } catch (err) {
      console.error('Error updating scores:', err);
      alert('❌ Error: ' + (err.response?.data?.msg || 'Server error'));
    }
  };

  return (
    <div className="manager-management">
      {/* HEADER */}
      <div className="mgr-header-premium">
        <div className="mgr-header-info">
          <div className="mgr-header-title-row">
            <div className="mgr-icon-wrapper">
              <Users size={24} />
            </div>
            <div>
              <h2>Manager Management</h2>
              <p>Performance tracking and administration for team leads</p>
            </div>
          </div>
        </div>
        <div className="mgr-header-actions">
          <button className="btn-add-premium" onClick={openAddModal}>
            <UserPlus size={18} />
            <span>Add New Manager</span>
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="mgr-stats-grid-modern">
        <div className="mgr-stat-card-new">
          <div className="stat-icon-box total">
            <Users size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Managers</span>
            <h3 className="stat-number">{stats.total}</h3>
          </div>
        </div>

        <div className="mgr-stat-card-new">
          <div className="stat-icon-box payroll">
            <DollarSign size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Payroll</span>
            <h3 className="stat-number">{formatCurrency(stats.totalSalary)}</h3>
          </div>
        </div>

        <div className="mgr-stat-card-new">
          <div className="stat-icon-box average">
            <TrendingUp size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Avg Salary</span>
            <h3 className="stat-number">{formatCurrency(stats.avgSalary)}</h3>
          </div>
        </div>

        <div className="mgr-stat-card-new">
          <div className="stat-icon-box branches">
            <Building2 size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Unique Branches</span>
            <h3 className="stat-number">{stats.branches}</h3>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="mgr-controls-premium">
        <div className="search-bar-modern">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search managers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={clearFilters}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="controls-right-group">
          <div className="filter-group">
            <select
              className="filter-select-premium"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <input
              type="date"
              className="filter-date-premium"
              value={filterJoinDate}
              onChange={(e) => setFilterJoinDate(e.target.value)}
            />
          </div>

          <div className="view-selector-pill">
            <button
              className={`view-option ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-option ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <RefreshCw size={40} className="spin" />
          <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: '500' }}>Fetching managers...</p>
        </div>
      ) : filteredManagers.length === 0 ? (
        <div className="empty-state-modern" style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
          <Users size={40} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>No managers found</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="managers-grid-premium">
              {filteredManagers.map(mgr => (
                <div key={mgr._id} className="manager-card-premium">
                  <div className="card-header-accent">
                    <div className="avatar-main">
                      {mgr.name.charAt(0)}
                    </div>
                    {mgr.overallScore > 0 && (
                      <div
                        className="score-badge"
                        style={{
                          background: `${getScoreColor(mgr.overallScore)}15`,
                          color: getScoreColor(mgr.overallScore)
                        }}
                      >
                        {mgr.overallScore.toFixed(1)} / 5.0
                      </div>
                    )}
                  </div>

                  <div className="card-content-main">
                    <h3>{mgr.name}</h3>
                    <p className="card-experience">
                      <Briefcase size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {mgr.experience} Experience
                    </p>

                    <div className="card-info-list" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                      <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                        <MapPin size={14} style={{ color: '#2563eb' }} />
                        <span>{mgr.branch}</span>
                      </div>
                      <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                        <Phone size={14} style={{ color: '#16a34a' }} />
                        <span>{mgr.phone}</span>
                      </div>
                      <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569' }}>
                        <Mail size={14} style={{ color: '#64748b' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mgr.email}</span>
                      </div>
                    </div>

                    <div className="salary-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0fdf4', color: '#16a34a', borderRadius: '8px', fontSize: '12px', fontWeight: '700', marginTop: '16px' }}>
                      <DollarSign size={12} />
                      {formatCurrency(mgr.salary)} Annual
                    </div>
                  </div>

                  <div className="card-actions-premium" style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                    <button className="action-pill view" onClick={() => openViewModal(mgr)} title="View Profile" style={{ flex: 1, height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justify: 'center', border: 'none', cursor: 'pointer', background: '#f1f5f9', color: '#475569' }}>
                      <Eye size={16} />
                    </button>
                    <button className="action-pill score" onClick={() => openScoreModal(mgr)} title="Performance" style={{ flex: 1, height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justify: 'center', border: 'none', cursor: 'pointer', background: '#faf5ff', color: '#9333ea' }}>
                      <Star size={16} />
                    </button>
                    <button className="action-pill edit" onClick={() => openEditModal(mgr)} title="Edit Manager" style={{ flex: 1, height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justify: 'center', border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#2563eb' }}>
                      <Edit size={16} />
                    </button>
                    <button className="action-pill delete" onClick={() => openDeleteModal(mgr)} title="Delete Manager" style={{ flex: 1, height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justify: 'center', border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="table-container-premium">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Manager</th>
                    <th>Branch</th>
                    <th>Experience</th>
                    <th>Score</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredManagers.map(mgr => (
                    <tr key={mgr._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px', color: '#475569' }}>
                            {mgr.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{mgr.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                              <Mail size={10} /> {mgr.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                          <MapPin size={12} /> {mgr.branch}
                        </span>
                      </td>
                      <td style={{ fontSize: '14px', fontWeight: '500', color: '#475569' }}>{mgr.experience}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: getScoreColor(mgr.overallScore) }}>
                          <Star size={12} fill="currentColor" />
                          {mgr.overallScore ? mgr.overallScore.toFixed(1) : '-'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button className="btn-row-action" onClick={() => openViewModal(mgr)} title="View"><Eye size={14} /></button>
                          <button className="btn-row-action score" onClick={() => openScoreModal(mgr)} title="Score"><Star size={14} /></button>
                          <button className="btn-row-action edit" onClick={() => openEditModal(mgr)} title="Edit"><Edit size={14} /></button>
                          <button className="btn-row-action delete" onClick={() => openDeleteModal(mgr)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* --- MODALS --- */}

      {modalType === 'form' && (
        <div className="modal-overlay-premium" onClick={closeModal}>
          <div className="modal-container-modern" onClick={e => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div className="modal-title-box">
                {formMode === 'add' ? <UserPlus size={20} /> : <Edit size={20} />}
                <h3>{formMode === 'add' ? 'Add Manager' : 'Edit Manager'}</h3>
              </div>
              <button className="modal-close-btn-premium" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="form-section-title">Personal Information</div>
                <div className="form-grid-2">
                  <div className="form-group-full">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                    <input
                      required style={{ width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }}
                      name="fullName" value={formData.fullName} onChange={handleInputChange}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                    <input required type="email" style={{ width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} name="email" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
                    <input required style={{ width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} placeholder="+1 234 567 890" />
                  </div>
                </div>

                <div className="form-section-title">Employment Details</div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch / Store</label>
                    <select required style={{ width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} name="branch" value={formData.branch} onChange={handleInputChange}>
                      <option value="">Select Branch...</option>
                      {branches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Join Date</label>
                    <input required type="date" style={{ width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} name="joinDate" value={formData.joinDate} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Salary ($)</label>
                    <input required type="number" style={{ width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} name="annualSalary" value={formData.annualSalary} onChange={handleInputChange} placeholder="e.g. 85000" />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password {formMode === 'edit' && '(Optional)'}</label>
                    <input 
                      type="password" 
                      style={{ width: '100%', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px' }} 
                      name="password" 
                      value={formData.password} 
                      onChange={handleInputChange} 
                      placeholder={formMode === 'add' ? "Min 6 characters" : "••••••••"}
                      required={formMode === 'add'}
                    />
                  </div>
                </div>

                <div className="form-section-title">Team Assignment</div>
                <div className="form-group-full">
                  <EmployeeSelector 
                    allEmployees={allEmployees}
                    selectedIds={formData.employees}
                    onChange={(ids) => setFormData(prev => ({ ...prev, employees: ids }))}
                  />
                </div>
              </div>

              <div className="modal-footer-premium">
                <button type="button" className="action-pill view" style={{ flex: 'none', padding: '0 24px', background: '#f1f5f9', border: 'none', color: '#64748b' }} onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-add-premium" style={{ minWidth: '160px' }}>
                  {formMode === 'add' ? 'Create Manager' : 'Save Changes'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {modalType === 'score' && selectedManager && (
        <div className="modal-overlay-premium" onClick={closeModal}>
          <div className="modal-container-modern" onClick={e => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div className="modal-title-box">
                <Settings size={20} style={{ color: '#9333ea' }} />
                <h3>Performance Assessment</h3>
              </div>
              <button className="modal-close-btn-premium" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveScore}>
              <div className="modal-body">
                <div style={{ padding: '16px', background: '#faf5ff', borderRadius: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: '800', color: '#111827' }}>{selectedManager.name}</div>
                  <div style={{ fontSize: '12px', color: '#9333ea', fontWeight: '700' }}>Scale: 1-5</div>
                </div>
                {scoreCategories.map(cat => (
                  <div key={cat.key} className="score-slider-row">
                    <div className="score-name">{cat.label}</div>
                    <input
                      type="range" min="1" max="5" step="1"
                      className="premium-slider"
                      value={scoreForm[cat.key]}
                      onChange={(e) => handleScoreChange(cat.key, e.target.value)}
                      style={{ color: getScoreColor(scoreForm[cat.key]) }}
                    />
                    <div className="score-value-box" style={{ background: `${getScoreColor(scoreForm[cat.key])}15`, color: getScoreColor(scoreForm[cat.key]) }}>
                      {scoreForm[cat.key]}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                <button type="button" className="action-pill view" style={{ flex: 'none', padding: '0 24px' }} onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-add-premium" style={{ background: '#9333ea' }}>Update Scores</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalType === 'view' && selectedManager && (
        <div className="modal-overlay-premium" onClick={closeModal}>
          <div className="modal-container-modern" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div className="modal-title-box">
                <div style={{ padding: '8px', background: '#f0fdf4', color: '#16a34a', borderRadius: '10px' }}>
                  <Eye size={18} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Manager Profile</h3>
              </div>
              <button className="modal-close-btn-premium" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px 32px' }}>
              {/* Header Info Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '24px', marginBottom: '28px', border: '1px solid #e2e8f0' }}>
                <div style={{ 
                  width: '80px', height: '80px', 
                  background: 'linear-gradient(135deg, #1e7b4e 0%, #4ade80 100%)', 
                  borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '32px', fontWeight: '800', color: 'white',
                  boxShadow: '0 8px 16px rgba(30, 123, 78, 0.2)',
                  border: '4px solid white'
                }}>
                  {selectedManager.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>{selectedManager.name}</h2>
                    <div style={{ padding: '4px 10px', background: 'white', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#64748b', border: '1px solid #e2e8f0' }}>
                      ID: {selectedManager._id?.slice(-6).toUpperCase()}
                    </div>
                  </div>
                  <div style={{ color: '#16a34a', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} /> {selectedManager.branch} Store Manager
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: getScoreColor(selectedManager.overallScore) }}>
                    {(selectedManager.overallScore || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>Rating</div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="form-section-title">Professional Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#94a3b8' }}><Mail size={16} /></div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Email Address</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{selectedManager.email}</div>
                  </div>
                </div>
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#94a3b8' }}><Phone size={16} /></div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Phone Number</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{selectedManager.phone}</div>
                  </div>
                </div>
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#94a3b8' }}><Clock size={16} /></div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Experience</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{selectedManager.experience}</div>
                  </div>
                </div>
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#94a3b8' }}><DollarSign size={16} /></div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Annual Salary</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(selectedManager.salary)}</div>
                  </div>
                </div>
              </div>

              {/* Team Members Section */}
              <div className="form-section-title">Managed Team</div>
              <div style={{ marginBottom: '32px' }}>
                {(() => {
                  const assignedIds = (selectedManager.employees || []).map(item => 
                    typeof item === 'string' ? item : (item._id || item.id)
                  );
                  const teamMembers = allEmployees.filter(emp => assignedIds.includes(emp._id || emp.id));
                  return teamMembers.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {teamMembers.map(emp => (
                        <div key={emp._id || emp.id} style={{ 
                          display: 'flex', alignItems: 'center', gap: '8px', 
                          padding: '8px 12px', background: '#f0fdf4', border: '1px solid #dcfce7',
                          borderRadius: '12px', transition: 'all 0.2s'
                        }}>
                          <div style={{ width: '20px', height: '20px', background: '#16a34a', color: 'white', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>
                            {emp.name.charAt(0)}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>{emp.name}</span>
                          <span style={{ fontSize: '11px', color: '#16a34a', opacity: 0.8 }}>• {emp.department || 'General'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '1px dashed #e2e8f0' }}>
                      No employees assigned to this manager yet.
                    </div>
                  );
                })()}
              </div>

              {/* Performance Metrics */}
              {selectedManager.scores && (
                <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ padding: '6px', background: 'white', color: '#9333ea', borderRadius: '8px', border: '1px solid #e2e8f0' }}><Star size={14} fill="currentColor" /></div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Metrics</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                    {scoreCategories.map(cat => (
                      <div key={cat.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                        <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>{cat.label}</span>
                        <div style={{ 
                          width: '28px', height: '28px', 
                          background: 'white', 
                          color: getScoreColor(selectedManager.scores[cat.key]), 
                          borderRadius: '8px', border: '1px solid #e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: '800'
                        }}>
                          {selectedManager.scores[cat.key]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer-premium">
              <button className="btn-add-premium" style={{ width: '100%', borderRadius: '16px' }} onClick={closeModal}>Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'delete' && selectedManager && (
        <div className="modal-overlay-premium" onClick={closeModal}>
          <div className="modal-container-modern" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ width: '64px', height: '64px', background: '#fef2f2', color: '#dc2626', borderRadius: '20px', display: 'flex', alignItems: 'center', justify: 'center', margin: '0 auto 20px' }}>
                <Trash2 size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0' }}>Delete Manager?</h3>
              <p style={{ fontSize: '14px', color: '#64748b' }}>Confirm deletion of <strong>{selectedManager.name}</strong>. This cannot be undone.</p>
            </div>
            <div style={{ padding: '0 32px 32px', display: 'flex', gap: '12px' }}>
              <button className="action-pill view" style={{ background: '#f1f5f9' }} onClick={closeModal}>Cancel</button>
              <button className="action-pill delete" style={{ background: '#dc2626', color: 'white' }} onClick={handleDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerManagement;