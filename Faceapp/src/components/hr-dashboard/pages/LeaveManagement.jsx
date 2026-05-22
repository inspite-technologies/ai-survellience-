import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  getAllLeaves,
  applyLeave,
  approveLeave,
  rejectLeave
} from '../../services/leaveAPI';
import {
  Plane,
  Plus,
  User,
  Briefcase,
  UserCheck,
  List,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Calendar,
  Search,
  Filter,
  MessageSquare,
  ArrowRight,
  Hourglass,
  ChevronRight,
  Info,
  Check,
  X,
  FileText,
  Send,
  UserRound
} from 'lucide-react';
import './LeaveManagement.css';

const LeaveManagement = ({ selectedStore }) => {
  // akid changes: Manual JWT decode function
  // #r dirst: This bypasses resolution issues with vite/jwt-decode
  const jwtDecode = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("JWT Decode error:", e);
      return null;
    }
  };

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [activeStatFilter, setActiveStatFilter] = useState('all'); // #r Added for stat card filtering
  const [activeTab, setActiveTab] = useState('employee'); // 'employee' or 'manager'
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
    halfDay: false,
    halfDayPeriod: 'morning'
  });

  const API_URL = import.meta.env.VITE_API_URL; // Keep as fallback/ref if needed, but primary is API_INSTANCE

  const leaveTypes = [
    { value: 'sick', label: 'Sick Leave', color: '#c62828', allowance: 12 },
    { value: 'casual', label: 'Casual Leave', color: '#1976d2', allowance: 10 },
    { value: 'annual', label: 'Annual Leave', color: '#2e7d32', allowance: 20 },
    { value: 'maternity', label: 'Maternity Leave', color: '#f57c00', allowance: 90 },
    { value: 'paternity', label: 'Paternity Leave', color: '#7b1fa2', allowance: 7 },
    { value: 'unpaid', label: 'Unpaid Leave', color: '#9e9e9e', allowance: 0 },
    { value: 'compensatory', label: 'Compensatory Off', color: '#00897b', allowance: 0 },
    { value: 'emergency', label: 'Emergency Leave', color: '#d32f2f', allowance: 3 }
  ];

  const statuses = [
    { value: 'pending', label: 'Pending', color: '#f59e0b' },
    { value: 'approved', label: 'Approved', color: '#10b981' },
    { value: 'rejected', label: 'Rejected', color: '#ef4444' },
    { value: 'cancelled', label: 'Cancelled', color: '#64748b' }
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUser(decoded);

        // akid changes: Fetch full HR profile to get the name
        // #r dirst: Ensure the HR user's name is available for the UI
        const role = localStorage.getItem("role");
        if (role === 'hr' && decoded.id) {
          axios.get(`${API_URL}/hr/${decoded.id}`)
            .then(res => {
              setCurrentUser(prev => ({ ...prev, name: res.data.name }));
            })
            .catch(err => console.error("Error fetching HR profile:", err));
        }
      } catch (error) {
        console.error("Invalid token", error);
      }
    }
    fetchEmployees();
    fetchLeaveRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [leaveRequests, searchQuery, filterStatus, filterType, activeStatFilter, activeTab, selectedStore]);

  const fetchEmployees = async () => {
    try {
      // Need to use the configured axios instance ideally, but keeping existing pattern for now if it works
      // Or better, use a service if available. Using raw axios here as per original file
      // NOTE: Original used localhost:5000, but axiosClient uses 5001. Check port.
      // Assuming localhost:5001 is correct based on axiosClient.
      // But let's check if there is an employeeAPI.
      const response = await axios.get(`${API_URL}/faces`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const data = await getAllLeaves();
      // Map backend data to frontend format if necessary
      // Backend returns: _id, applicantName, leaveType, startDate, endDate, status, etc.
      const mappedData = data.map(leave => {
        // Robust ID extraction (handles both populated objects and plain strings)
        const applicantIdVal = 
          (leave.hrId?._id || leave.hrId) || 
          (leave.managerId?._id || leave.managerId) || 
          (leave.employeeId?._id || leave.employeeId);
        
        return {
          id: leave._id,
          employeeId: applicantIdVal ? applicantIdVal.toString() : null,
          employeeName: leave.applicantName || leave.employeeId?.name || leave.hrId?.name || leave.managerId?.name || 'Unknown',
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: calculateDays(leave.startDate, leave.endDate, leave.isHalfDay),
        reason: leave.reason,
        status: leave.status,
        appliedOn: leave.createdAt,
        approvedBy: null, // Backend might not send this yet
        approvedOn: null,
        rejectionReason: null,
        halfDay: leave.isHalfDay,
        halfDayPeriod: leave.halfDayPeriod,
          applicantType: leave.applicantType
        };
      });
      // Filter out HR's own leaves (Legacy - removing to allow HR self-view)
      // #r dirst: Now keeping all leaves to support the "My Leaves" tab
      setLeaveRequests(mappedData);
    } catch (error) {
      console.error("Failed to fetch leaves", error);
    }
  };

  const filterRequests = () => {
    let filtered = [...leaveRequests];

    // Tab filter - Filter by applicant type
    if (activeTab === 'employee') {
      filtered = filtered.filter(req => req.applicantType === 'employee');
    } else if (activeTab === 'manager') {
      filtered = filtered.filter(req => req.applicantType === 'manager');
    } else if (activeTab === 'my-leaves') {
      // #r dirst: Use string comparison and check all relevant applicant paths
      filtered = filtered.filter(req => 
        (req.applicantType === 'hr' || req.applicantType === 'manager') && 
        req.employeeId === currentUser?.id?.toString()
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(req =>
        req.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(req => req.leaveType === filterType);
    }

    // Store Filter
    if (selectedStore && selectedStore !== 'All Stores') {
      filtered = filtered.filter(req => {
        const empId = typeof req.employeeId === 'object' ? req.employeeId._id : req.employeeId;
        const emp = employees.find(e => e._id === empId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    // #r Apply stat card filtering
    if (activeStatFilter === 'days') {
      filtered = filtered.filter(req => req.status === 'approved');
    } else if (activeStatFilter !== 'all') {
      filtered = filtered.filter(req => req.status === activeStatFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

    setFilteredRequests(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculateDays = (start, end, halfDay) => {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return halfDay ? 0.5 : diffDays;
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      leaveType: 'sick',
      startDate: '',
      endDate: '',
      reason: '',
      halfDay: false,
      halfDayPeriod: 'morning'
    });
  };

  const handleApplyLeave = () => {
    // #r Ensure we have a valid user before opening the modal
    if (!currentUser || !currentUser.id) {
      alert('⚠️ No active session found. Please log in again.');
      return;
    }
    resetForm();
    // akid changes: Default to HR if logged in
    // #r dirst: Streamline self-application process
    setFormData(prev => ({
      ...prev,
      employeeId: currentUser.id
    }));
    setShowApplyModal(true);
  };

  const saveLeaveRequest = async (e) => {
    e.preventDefault();

    // akid changes: Validation update
    // #r dirst: employeeId is now internal for HR self-application
    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      alert('⚠️ Please fill in all required fields!');
      return;
    }

    // akid changes: Fixed payload for HR self-application
    // #r dirst: Simplified submission structure
    let payload = {
      applicantType: 'hr',
      hrId: currentUser.id,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isHalfDay: formData.halfDay,
      halfDayPeriod: formData.halfDay ? formData.halfDayPeriod : undefined,
      reason: formData.reason
    };

    console.log("📤 Sending HR self-leave request payload:", payload);

    try {
      await applyLeave(payload);
      alert('✅ Leave request submitted successfully!');
      setShowApplyModal(false);
      resetForm();
      fetchLeaveRequests(); // Refresh list
    } catch (error) {
      if (error.response?.status === 404) {
        alert('❌ Session error: HR user not found in database. Please log out and log back in to refresh your session.');
      } else if (error.response?.status === 409) {
        alert('⚠️ Leave Conflict: You have already applied for leave on these dates.');
      } else {
        alert(`❌ Failed to apply leave: ${error.response?.data?.msg || error.message}`);
      }
    }
  };

  const viewRequest = (request) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    try {
      await approveLeave(selectedRequest.id);
      alert('✅ Leave request approved successfully!');
      setShowApproveModal(false);
      setShowViewModal(false);
      fetchLeaveRequests();
    } catch (error) {
      alert(`❌ Failed to approve leave: ${error.response?.data?.msg || error.message}`);
    }
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('⚠️ Please provide a reason for rejection!');
      return;
    }

    try {
      await rejectLeave(selectedRequest.id, rejectionReason);
      alert('✅ Leave request rejected!');
      setShowRejectModal(false);
      setShowViewModal(false);
      setRejectionReason('');
      fetchLeaveRequests();
    } catch (error) {
      alert(`❌ Failed to reject leave: ${error.response?.data?.msg || error.message}`);
    }
  };

  const getLeaveTypeInfo = (type) => {
    return leaveTypes.find(t => t.value === type) || leaveTypes[0];
  };

  const getStatusInfo = (status) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStats = () => {
    // #r Apply Store Filter and Tab Filter to Stats Source (ignoring other filters like search/status)
    let statsSource = leaveRequests;

    // Apply tab filter
    if (activeTab === 'employee') {
      statsSource = statsSource.filter(req => req.applicantType === 'employee');
    } else if (activeTab === 'manager') {
      statsSource = statsSource.filter(req => req.applicantType === 'manager');
    } else if (activeTab === 'my-leaves') {
      statsSource = statsSource.filter(req => req.applicantType === 'hr' && req.employeeId === currentUser?.id);
    }

    if (selectedStore && selectedStore !== 'All Stores') {
      statsSource = statsSource.filter(req => {
        const empId = typeof req.employeeId === 'object' ? req.employeeId._id : req.employeeId;
        const emp = employees.find(e => e._id === empId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    const totalRequests = statsSource.length;
    const pending = statsSource.filter(r => r.status === 'pending').length;
    const approved = statsSource.filter(r => r.status === 'approved').length;
    const rejected = statsSource.filter(r => r.status === 'rejected').length;
    const totalDays = statsSource
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + r.days, 0);

    return {
      totalRequests,
      pending,
      approved,
      rejected,
      totalDays
    };
  };

  const getEmployeeLeaveBalance = (employeeId) => {
    // Mock leave balance calculation
    return {
      sick: 8,
      casual: 7,
      annual: 15,
      total: 30
    };
  };

  const stats = getStats();

  return (
    <div className="leave-management">
      {/* Header */}
      <div className="leave-header">
        <div className="leave-header-left">
          <h2>
            <Plane size={28} />
            Leave Management
          </h2>
          <p>Manage employee and manager leave requests and approvals</p>
        </div>
        <div className="leave-header-right">
          <button className="btn-primary" onClick={handleApplyLeave}>
            <Plus size={18} />
            Apply Leave
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="leave-tabs">
        <button
          className={`leave-tab ${activeTab === 'employee' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('employee');
            setActiveStatFilter('all');
          }}
        >
          <User size={16} />
          Employee Leaves
        </button>
        <button
          className={`leave-tab ${activeTab === 'manager' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('manager');
            setActiveStatFilter('all');
          }}
        >
          <Briefcase size={16} />
          Manager Leaves
        </button>
        <button
          className={`leave-tab ${activeTab === 'my-leaves' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('my-leaves');
            setActiveStatFilter('all');
          }}
        >
          <UserRound size={16} />
          My Leaves
        </button>
      </div>

      {/* Stats Cards */}
      <div className="leave-stats-grid">
        <div
          className={`leave-stat-card total ${activeStatFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('all')}
        >
          <div className="leave-stat-icon">
            <List size={20} />
          </div>
          <div className="leave-stat-content">
            <div className="leave-stat-value">{stats.totalRequests}</div>
            <div className="leave-stat-label">Total Requests</div>
          </div>
        </div>

        <div
          className={`leave-stat-card pending ${activeStatFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('pending')}
        >
          <div className="leave-stat-icon">
            <Clock size={20} />
          </div>
          <div className="leave-stat-content">
            <div className="leave-stat-value">{stats.pending}</div>
            <div className="leave-stat-label">Pending</div>
            {stats.pending > 0 && <div className="stat-badge">Action Required</div>}
          </div>
        </div>

        <div
          className={`leave-stat-card approved ${activeStatFilter === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('approved')}
        >
          <div className="leave-stat-icon">
            <CheckCircle size={20} />
          </div>
          <div className="leave-stat-content">
            <div className="leave-stat-value">{stats.approved}</div>
            <div className="leave-stat-label">Approved</div>
          </div>
        </div>

        <div
          className={`leave-stat-card rejected ${activeStatFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('rejected')}
        >
          <div className="leave-stat-icon">
            <XCircle size={20} />
          </div>
          <div className="leave-stat-content">
            <div className="leave-stat-value">{stats.rejected}</div>
            <div className="leave-stat-label">Rejected</div>
          </div>
        </div>

        <div
          className={`leave-stat-card days ${activeStatFilter === 'days' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('days')}
        >
          <div className="leave-stat-icon">
            <Calendar size={20} />
          </div>
          <div className="leave-stat-content">
            <div className="leave-stat-value">{stats.totalDays}</div>
            <div className="leave-stat-label">Days Approved</div>
          </div>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="leave-controls">


        <div className="leave-filters">
          <input
            type="text"
            placeholder="Search leaves..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-leave"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select-leave"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select-leave"
          >
            <option value="all">All Types</option>
            {leaveTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List View */}
      <div className="leave-requests-container">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <Plane size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>
              {activeTab === 'my-leaves' 
                ? "You haven't submitted any leave requests yet" 
                : `No ${activeTab} leave requests found`}
            </p>
          </div>
        ) : (
          <div className="leave-requests-list">
            {filteredRequests.map(request => {
              const typeInfo = getLeaveTypeInfo(request.leaveType);
              const statusInfo = getStatusInfo(request.status);

              return (
                <div
                  key={request.id}
                  className={`leave-request-card ${request.status}`}
                  onClick={() => viewRequest(request)}
                >
                  <div className="request-header">
                    <div className="request-id-section">
                      <span className="request-id">#{request.id.slice(-6)}</span>
                      <div
                        className="leave-type-badge"
                        style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}
                      >
                        {typeInfo.label}
                      </div>
                    </div>
                    <span
                      className="status-badge-leave"
                      style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="request-body">
                    <div className="employee-info-leave">
                      <div className="employee-avatar-leave">
                        {(request.employeeName || 'U').charAt(0)}
                      </div>
                      <div className="employee-details-leave">
                        <div className="employee-name-leave">
                          {request.employeeName || 'Unknown'}
                          {request.applicantType === 'manager' && (
                            <span className="role-badge manager">Manager</span>
                          )}
                        </div>
                        <div className="applied-date">
                          Applied on {formatDate(request.appliedOn)}
                        </div>
                      </div>
                    </div>

                    <div className="leave-dates">
                      <div className="date-item">
                        <span className="date-label">From</span>
                        <div className="date-value">{formatDate(request.startDate)}</div>
                      </div>
                      <ArrowRight size={16} className="date-arrow" />
                      <div className="date-item">
                        <span className="date-label">To</span>
                        <div className="date-value">{formatDate(request.endDate)}</div>
                      </div>
                      <div className="days-count">
                        <Hourglass size={14} />
                        <span>{request.days} {request.days === 1 ? 'day' : 'days'}</span>
                        {request.halfDay && <span className="half-day-badge">Half ({request.halfDayPeriod})</span>}
                      </div>
                    </div>

                    <div className="leave-reason">
                      <MessageSquare size={14} style={{ marginTop: '3px' }} />
                      <span>{request.reason}</span>
                    </div>
                  </div>

                  <div className="request-footer">
                    {request.status === 'pending' && activeTab !== 'my-leaves' && (
                      <div className="action-buttons">
                        <button
                          className="action-btn approve"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(request);
                          }}
                        >
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(request);
                          }}
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </div>
                    )}
                    {request.status === 'approved' && request.approvedBy && (
                      <div className="approval-info">
                        <UserCheck size={14} />
                        Approved by <strong>{request.approvedBy}</strong>
                      </div>
                    )}
                    <div className="view-details-leave">
                      View Details <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Calendar View */}


      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plane size={20} />
                Apply for Leave
              </h3>
              <button className="modal-close-btn" onClick={() => setShowApplyModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveLeaveRequest}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    {/* akid changes: HR specific label and fallback */}
                    {/* #r dirst: Ensure "Myself (HR)" is visible */}
                    <label>HR Applicant</label>
                    <input
                      type="text"
                      value={currentUser?.name || 'Myself (HR)'}
                      readOnly
                      className="readonly-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>
                      Leave Type <span className="required">*</span>
                    </label>
                    <select
                      name="leaveType"
                      value={formData.leaveType}
                      onChange={handleInputChange}
                      required
                    >
                      {leaveTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label} {type.allowance > 0 ? `(${type.allowance} days/year)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Start Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      End Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        name="halfDay"
                        checked={formData.halfDay}
                        onChange={handleInputChange}
                      />
                      <span>Half Day Leave</span>
                    </label>
                  </div>

                  {formData.halfDay && (
                    <div className="form-group">
                      <label>Half Day Period</label>
                      <select
                        name="halfDayPeriod"
                        value={formData.halfDayPeriod}
                        onChange={handleInputChange}
                      >
                        <option value="morning">Morning (First Half)</option>
                        <option value="afternoon">Afternoon (Second Half)</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group full-width">
                    <label>
                      Reason <span className="required">*</span>
                    </label>
                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      placeholder="Please provide a reason for your leave..."
                      rows="4"
                      required
                    />
                  </div>
                </div>

                {formData.startDate && formData.endDate && (
                  <div className="info-box" style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '12px', marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
                    <Info size={16} color="#10b981" />
                    <div>
                      <strong>Duration:</strong>{' '}
                      {calculateDays(formData.startDate, formData.endDate, formData.halfDay)}{' '}
                      {calculateDays(formData.startDate, formData.endDate, formData.halfDay) === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                )}

                {formData.employeeId && (
                  <div className="leave-balance-info">
                    <h4>Available Leave Balance</h4>
                    <div className="balance-grid">
                      <div className="balance-item">
                        <span className="balance-label">Sick Leave</span>
                        <span className="balance-value">8 days</span>
                      </div>
                      <div className="balance-item">
                        <span className="balance-label">Casual Leave</span>
                        <span className="balance-value">7 days</span>
                      </div>
                      <div className="balance-item">
                        <span className="balance-label">Annual Leave</span>
                        <span className="balance-value">15 days</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowApplyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Send size={18} />
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Request Modal */}
      {showViewModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileText size={20} />
                Leave Request Details - {selectedRequest.id.slice(-6)}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="view-badges">
                <span
                  className="badge-large"
                  style={{
                    background: `${getStatusInfo(selectedRequest.status).color}20`,
                    color: getStatusInfo(selectedRequest.status).color
                  }}
                >
                  <Clock size={14} />
                  {getStatusInfo(selectedRequest.status).label}
                </span>
                <span
                  className="badge-large"
                  style={{
                    background: `${getLeaveTypeInfo(selectedRequest.leaveType).color}20`,
                    color: getLeaveTypeInfo(selectedRequest.leaveType).color
                  }}
                >
                  <List size={14} />
                  {getLeaveTypeInfo(selectedRequest.leaveType).label}
                </span>
              </div>

              <div className="view-details-grid">
                <div className="detail-group">
                  <label>{selectedRequest.applicantType === 'manager' ? 'Manager' : 'Employee'}</label>
                  <div className="detail-value">
                    <User size={16} />
                    {selectedRequest.employeeName}
                    {selectedRequest.applicantType === 'manager' && (
                      <span className="role-badge manager" style={{ marginLeft: '8px' }}>Manager</span>
                    )}
                  </div>
                </div>

                <div className="detail-group">
                  <label>Duration</label>
                  <div className="detail-value">
                    <Hourglass size={16} />
                    {selectedRequest.days} {selectedRequest.days === 1 ? 'day' : 'days'}
                    {selectedRequest.halfDay && ` (${selectedRequest.halfDayPeriod})`}
                  </div>
                </div>

                <div className="detail-group">
                  <label>Start Date</label>
                  <div className="detail-value">
                    <Calendar size={16} />
                    {formatDate(selectedRequest.startDate)}
                  </div>
                </div>

                <div className="detail-group">
                  <label>End Date</label>
                  <div className="detail-value">
                    <Calendar size={16} />
                    {formatDate(selectedRequest.endDate)}
                  </div>
                </div>

                <div className="detail-group">
                  <label>Applied On</label>
                  <div className="detail-value">
                    <Clock size={16} />
                    {formatDateTime(selectedRequest.appliedOn)}
                  </div>
                </div>

                {selectedRequest.approvedBy && (
                  <div className="detail-group">
                    <label>{selectedRequest.status === 'approved' ? 'Approved By' : 'Rejected By'}</label>
                    <div className="detail-value">
                      <UserCheck size={16} />
                      {selectedRequest.approvedBy}
                    </div>
                  </div>
                )}
              </div>

              <div className="reason-section">
                <label>Reason for Leave</label>
                <div className="reason-text">{selectedRequest.reason}</div>
              </div>

              {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                <div className="rejection-section">
                  <label>Rejection Reason</label>
                  <div className="rejection-text" style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#fef2f2', padding: '12px', borderRadius: '12px', fontSize: '13px', color: '#ef4444' }}>
                    <Info size={16} />
                    {selectedRequest.rejectionReason}
                  </div>
                </div>
              )}

              {selectedRequest.status === 'pending' && activeTab !== 'my-leaves' && (
                <div className="action-section">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(selectedRequest)}
                  >
                    <CheckCircle size={16} />
                    Approve Request
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(selectedRequest)}
                  >
                    <XCircle size={16} />
                    Reject Request
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
          <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header approve">
              <h3>
                <CheckCircle size={20} />
                Approve Leave Request
              </h3>
              <button className="modal-close-btn" onClick={() => setShowApproveModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="confirm-content">
                <div className="confirm-icon approve" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <CheckCircle size={60} color="#10b981" />
                </div>
                <p>
                  Are you sure you want to approve this leave request for{' '}
                  <strong>{selectedRequest.employeeName}</strong>?
                </p>
                <div className="confirm-details">
                  <div className="confirm-item">
                    <strong>Duration:</strong> {selectedRequest.days} {selectedRequest.days === 1 ? 'day' : 'days'}
                  </div>
                  <div className="confirm-item">
                    <strong>Dates:</strong> {formatDate(selectedRequest.startDate)} to {formatDate(selectedRequest.endDate)}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-approve"
                onClick={confirmApprove}
              >
                <Check size={16} />
                Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header reject">
              <h3>
                <XCircle size={20} />
                Reject Leave Request
              </h3>
              <button className="modal-close-btn" onClick={() => setShowRejectModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="confirm-content">
                <div className="confirm-icon reject" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <XCircle size={60} color="#ef4444" />
                </div>
                <p style={{ textAlign: 'center' }}>
                  Please provide a reason for rejecting leave request for{' '}
                  <strong>{selectedRequest.employeeName}</strong>:
                </p>

                <textarea
                  className="rejection-input"
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="4"
                  autoFocus
                  style={{ width: '100%', marginTop: '16px', borderRadius: '12px', padding: '12px' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={confirmReject}
                style={{ background: '#ef4444', color: 'white', borderRadius: '12px', border: 'none', padding: '10px 20px', fontWeight: '700', cursor: 'pointer' }}
              >
                <X size={16} />
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;