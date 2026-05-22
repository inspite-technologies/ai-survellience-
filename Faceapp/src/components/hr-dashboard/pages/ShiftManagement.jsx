import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  LayoutGrid,
  CalendarRange,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  Clock3,
  Timer,
  CheckCircle2,
  X,
  Search,
  Sunrise,
  Sunset,
  Moon,
  Info,
  CalendarDays,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import './ShiftManagement.css';

const ShiftManagement = ({ selectedStore }) => {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignedEmployees, setAssignedEmployees] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'schedule'
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [selectedShiftForAssignment, setSelectedShiftForAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [shiftForm, setShiftForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    type: 'Green',
    breakDuration: 30,
    description: ''
  });

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/shifts`);
      console.log('DEBUG: fetchShifts response:', response);

      // Adaptation logic
      let rawData = [];
      if (Array.isArray(response.data)) {
        rawData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        rawData = response.data.data;
      } else {
        console.warn('DEBUG: Unrecognized response structure:', response.data);
      }

      const shiftsData = rawData.map(s => ({
        ...s,
        _id: s._id,
        name: s.shiftName || s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        type: s.shiftColor || s.type || 'Green', // Color/Type used interchangeably in some parts of the app
        description: s.description || ''
      }));
      setShifts(shiftsData);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/faces`);
      const employeesData = response.data;
      setEmployees(employeesData);

      // Create a map of assigned employees per shift
      const assignments = {};
      employeesData.forEach(emp => {
        if (emp.shiftId) {
          if (!assignments[emp.shiftId]) assignments[emp.shiftId] = [];
          assignments[emp.shiftId].push(emp);
        }
      });
      setAssignedEmployees(assignments);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, []);

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        shiftName: shiftForm.name,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        shiftColor: shiftForm.type,
        breakDuration: parseInt(shiftForm.breakDuration),
        description: shiftForm.description,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] // Defaulting for now
      };

      if (editingShift) {
        await axios.put(`${API_URL}/shifts/${editingShift._id}`, payload);
      } else {
        await axios.post(`${API_URL}/shifts`, payload);
      }
      fetchShifts();
      closeShiftModal();
    } catch (err) {
      console.error('Error saving shift:', err);
      alert('Failed to save shift');
    }
  };

  const handleDeleteShift = async (id) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await axios.delete(`${API_URL}/shifts/${id}`);
        fetchShifts();
      } catch (err) {
        console.error('Error deleting shift:', err);
        alert('Failed to delete shift');
      }
    }
  };

  const handleAssignSubmit = async (employeeIds) => {
    try {
      await axios.put(`${API_URL}/shifts/${selectedShiftForAssignment._id}/assign`, { employeeIds });
      fetchEmployees();
      closeAssignModal();
    } catch (err) {
      console.error('Error assigning employees:', err);
      alert('Failed to assign employees');
    }
  };

  const openShiftModal = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setShiftForm({
        name: shift.name || shift.shiftName,
        startTime: shift.startTime,
        endTime: shift.endTime,
        type: shift.shiftColor || shift.type || 'Green',
        breakDuration: shift.breakDuration || 30,
        description: shift.description || ''
      });
    } else {
      setEditingShift(null);
      setShiftForm({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        type: 'Green',
        breakDuration: 30,
        description: ''
      });
    }
    setIsShiftModalOpen(true);
  };

  const closeShiftModal = () => {
    setIsShiftModalOpen(false);
    setEditingShift(null);
  };

  const openAssignModal = (shift) => {
    setSelectedShiftForAssignment(shift);
    setIsAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedShiftForAssignment(null);
  };

  const getShiftIcon = (type) => {
    if (!type) return <Clock size={18} />;
    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('morning') || normalizedType.includes('green')) return <Sunrise size={18} />;
    if (normalizedType.includes('evening') || normalizedType.includes('orange')) return <Sunset size={18} />;
    if (normalizedType.includes('night') || normalizedType.includes('red')) return <Moon size={18} />;
    return <Clock size={18} />;
  };

  // Filter shifts and employees by store if applicable
  const filteredShifts = selectedStore && selectedStore !== 'All Stores'
    ? shifts.filter(s => {
      const assigned = assignedEmployees[s._id] || [];
      if (assigned.length === 0) return true; // Keep empty shifts
      return assigned.some(e => e.storeName === selectedStore || e.branchName === selectedStore || e.department === selectedStore);
    })
    : shifts;

  const filteredEmployees = selectedStore && selectedStore !== 'All Stores'
    ? employees.filter(e => e.storeName === selectedStore || e.branchName === selectedStore || e.department === selectedStore)
    : employees;

  return (
    <div className="shift-management-container">
      {/* Header */}
      <div className="shift-header">
        <div className="shift-header-left">
          <h2><CalendarRange size={24} /> Shift Management</h2>
          <p>Organize and schedule employee working hours</p>
        </div>
        <div className="shift-header-actions">
          <button className="add-shift-btn" onClick={() => openShiftModal()}>
            <Plus size={18} /> Create New Shift
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="shift-stats-grid">
        <div className="shift-stat-card primary">
          <div className="stat-icon-wrapper"><Clock size={24} /></div>
          <div className="stat-info">
            <h3>{filteredShifts.length}</h3>
            <p>Total Shifts</p>
          </div>
        </div>
        <div className="shift-stat-card info">
          <div className="stat-icon-wrapper"><Users size={24} /></div>
          <div className="stat-info">
            <h3>{filteredEmployees.length}</h3>
            <p>Employees</p>
          </div>
        </div>
        <div className="shift-stat-card warning">
          <div className="stat-icon-wrapper"><UserCheck size={24} /></div>
          <div className="stat-info">
            <h3>{filteredEmployees.filter(e => e.shiftId).length}</h3>
            <p>Assigned</p>
          </div>
        </div>
        <div className="shift-stat-card purple">
          <div className="stat-icon-wrapper"><Timer size={24} /></div>
          <div className="stat-info">
            <h3>{filteredEmployees.filter(e => !e.shiftId).length}</h3>
            <p>Unassigned</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="shift-controls">
        <div className="view-toggles">
          <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
            <LayoutGrid size={18} /> Grid View
          </button>
          <button className={`view-btn ${viewMode === 'schedule' ? 'active' : ''}`} onClick={() => setViewMode('schedule')}>
            <Calendar size={18} /> Schedule View
          </button>
        </div>
        <div className="shift-search-dummy" style={{ opacity: 0.5, fontSize: '13px', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} /> Search shifts...
        </div>
      </div>

      {/* Main Content */}
      <div className="shift-content">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', gap: '16px', color: '#64748b' }}>
            <RefreshCw size={40} className="spin" />
            <p style={{ fontWeight: 500 }}>Loading shifts...</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="shifts-grid">
            {filteredShifts.map(shift => (
              <div key={shift._id} className="shift-card">
                <div className="shift-card-header">
                  <div className="shift-info-top">
                    <h4>{shift.name}</h4>
                    <span className="shift-type-tag">{shift.type || 'Regular'}</span>
                  </div>
                  <div className="shift-header-icon" style={{ color: '#94a3b8' }}>
                    {getShiftIcon(shift.type)}
                  </div>
                </div>

                <div className="shift-time-block">
                  <div className="time-icon"><Clock size={16} /></div>
                  <div className="time-details">
                    <p>Schedule</p>
                    <span>{shift.startTime} - {shift.endTime}</span>
                  </div>
                </div>

                <div className="shift-card-body">
                  <div className="stat-row">
                    <span className="label"><Users size={14} /> Assigned</span>
                    <span className="value">{assignedEmployees[shift._id]?.length || 0} Employees</span>
                  </div>

                  {assignedEmployees[shift._id]?.length > 0 && (
                    <div className="assigned-employees">
                      <div className="avatar-group">
                        {assignedEmployees[shift._id].slice(0, 5).map(emp => (
                          <div key={emp._id} className="emp-avatar-small" title={emp.name}>
                            {emp.name.charAt(0)}
                          </div>
                        ))}
                        {assignedEmployees[shift._id].length > 5 && (
                          <div className="emp-avatar-small">+{assignedEmployees[shift._id].length - 5}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="shift-card-footer">
                  <button className="action-btn assign" onClick={() => openAssignModal(shift)}>
                    <UserPlus size={14} /> Assign
                  </button>
                  <button className="action-btn edit" onClick={() => openShiftModal(shift)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="action-btn delete" onClick={() => handleDeleteShift(shift._id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filteredShifts.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#64748b', background: 'white', borderRadius: '24px' }}>
                <CalendarDays size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>No shifts found. Create one to get started!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="schedule-container">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Current Shift</th>
                  <th>Time Slot</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp._id}>
                    <td>
                      <div className="employee-info-cell">
                        <div className="employee-avatar">{emp.name.charAt(0)}</div>
                        <div style={{ fontWeight: '700' }}>{emp.name}</div>
                      </div>
                    </td>
                    <td style={{ color: '#64748b' }}>{emp.department || emp.branchName || 'General'}</td>
                    <td>
                      {emp.shiftId ? (
                        <span className="shift-tag">
                          {shifts.find(s => s._id === emp.shiftId)?.name || 'Unknown'}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ fontWeight: '600', color: '#334155' }}>
                      {emp.shiftId ? (
                        `${shifts.find(s => s._id === emp.shiftId)?.startTime} - ${shifts.find(s => s._id === emp.shiftId)?.endTime}`
                      ) : '-'}
                    </td>
                    <td>
                      <button className="action-btn edit" style={{ width: 'auto', padding: '6px 16px' }}>
                        Change <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      No employees found for scheduling.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shift Modal */}
      {isShiftModalOpen && (
        <div className="modal-overlay-premium">
          <div className="modal-container-modern">
            <div className="modal-header-modern">
              <h3>{editingShift ? 'Edit Shift' : 'Create New Shift'}</h3>
              <button className="close-btn-modern" onClick={closeShiftModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleShiftSubmit}>
              <div className="modal-body-modern">
                <div className="form-group-modern">
                  <label>Shift Name</label>
                  <input
                    type="text"
                    className="form-input-modern"
                    value={shiftForm.name}
                    onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
                    placeholder="e.g. Morning Shift"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group-modern">
                    <label>Start Time</label>
                    <input
                      type="time"
                      className="form-input-modern"
                      value={shiftForm.startTime}
                      onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-modern">
                    <label>End Time</label>
                    <input
                      type="time"
                      className="form-input-modern"
                      value={shiftForm.endTime}
                      onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group-modern">
                  <label>Break Duration (Minutes)</label>
                  <input
                    type="number"
                    className="form-input-modern"
                    value={shiftForm.breakDuration}
                    onChange={e => setShiftForm({ ...shiftForm, breakDuration: e.target.value })}
                    placeholder="e.g. 30"
                    required
                  />
                </div>
                <div className="form-group-modern">
                  <label>Shift Category / Color</label>
                  <select
                    className="form-input-modern"
                    value={shiftForm.type}
                    onChange={e => setShiftForm({ ...shiftForm, type: e.target.value })}
                  >
                    <option value="Green">Success (Green)</option>
                    <option value="Dark Green">Service (Dark Green)</option>
                    <option value="Blue">Morning (Blue)</option>
                    <option value="Orange">Evening (Orange)</option>
                    <option value="Purple">Special (Purple)</option>
                    <option value="Teal">Manager (Teal)</option>
                    <option value="Red">Night (Red)</option>
                  </select>
                </div>
                <div className="form-group-modern">
                  <label>Description (Optional)</label>
                  <textarea
                    className="form-input-modern"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={shiftForm.description}
                    onChange={e => setShiftForm({ ...shiftForm, description: e.target.value })}
                    placeholder="Describe this shift..."
                  />
                </div>
              </div>
              <div className="modal-footer-modern">
                <button type="button" className="cancel-btn-modern" onClick={closeShiftModal}>Cancel</button>
                <button type="submit" className="save-btn-modern">
                  {editingShift ? 'Save Changes' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <AssignModal
          shift={selectedShiftForAssignment}
          employees={filteredEmployees}
          onClose={closeAssignModal}
          onSubmit={handleAssignSubmit}
          currentAssignedIds={assignedEmployees[selectedShiftForAssignment._id]?.map(e => e._id) || []}
        />
      )}
    </div>
  );
};

const AssignModal = ({ shift, employees, onClose, onSubmit, currentAssignedIds }) => {
  const [selectedIds, setSelectedIds] = useState(currentAssignedIds);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleEmployee = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.department && e.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="modal-overlay-premium">
      <div className="modal-container-modern" style={{ maxWidth: '600px' }}>
        <div className="modal-header-modern">
          <div>
            <h3>Assign Employees</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Shift: {shift.name}</p>
          </div>
          <button className="close-btn-modern" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body-modern" style={{ padding: '20px' }}>
          <div className="form-group-modern">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input-modern"
                placeholder="Search employees or department..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '4px' }}>
            {filtered.map(emp => (
              <div
                key={emp._id}
                onClick={() => toggleEmployee(emp._id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: selectedIds.includes(emp._id) ? '#f0fdf4' : 'transparent',
                  border: `1px solid ${selectedIds.includes(emp._id) ? '#dcfce7' : 'transparent'}`,
                  marginBottom: '8px'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: `2px solid ${selectedIds.includes(emp._id) ? '#16a34a' : '#cbd5e1'}`,
                  background: selectedIds.includes(emp._id) ? '#16a34a' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {selectedIds.includes(emp._id) && <CheckCircle2 size={12} />}
                </div>
                <div className="employee-avatar" style={{ width: '36px', height: '36px' }}>{emp.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{emp.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.department || emp.branchName || 'General'}</div>
                </div>
                {emp.shiftId && emp.shiftId !== shift._id && (
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#d97706', background: '#fffbeb', padding: '4px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={10} /> REASSIGN
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer-modern">
          <div style={{ flex: 1, fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
            {selectedIds.length} Selected
          </div>
          <button className="cancel-btn-modern" onClick={onClose}>Cancel</button>
          <button className="save-btn-modern" onClick={() => onSubmit(selectedIds)}>Save Assignments</button>
        </div>
      </div>
    </div>
  );
};

const RefreshCw = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

export default ShiftManagement;