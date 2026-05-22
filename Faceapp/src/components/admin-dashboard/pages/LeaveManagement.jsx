import React, { useState, useEffect } from "react";
import { getAllLeaves, approveLeave, rejectLeave } from '../../services/leaveAPI';
import "./LeaveManagement.css";

const AdminLeaveApproval = () => {
    const [allLeaveRequests, setAllLeaveRequests] = useState([]);
    const [filterStatus, setFilterStatus] = useState("pending");
    const [activeTab, setActiveTab] = useState("hr");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchLeaveRequests();
    }, []);

    const fetchLeaveRequests = async () => {
        try {
            setIsLoading(true);
            const data = await getAllLeaves();
            console.log('📋 Admin fetched all leaves:', data);

            const transformedData = data.map(leave => {
                let applicantName = 'Unknown';
                let applicantRole = 'Employee';

                if (leave.applicantType === 'hr' && leave.hrId) {
                    applicantName = leave.hrId.name || leave.applicantName || 'HR User';
                    applicantRole = 'HR Staff';
                } else if (leave.employeeId) {
                    applicantName = leave.employeeId.name || leave.applicantName || 'Employee';
                    applicantRole = 'Employee';
                }

                return {
                    id: leave._id,
                    employeeName: applicantName,
                    role: applicantRole,
                    leaveType: leave.leaveType,
                    startDate: new Date(leave.startDate).toISOString().split('T')[0],
                    endDate: new Date(leave.endDate).toISOString().split('T')[0],
                    days: calculateDays(leave.startDate, leave.endDate, leave.isHalfDay),
                    reason: leave.reason || 'No reason provided',
                    status: leave.status,
                    appliedOn: new Date(leave.createdAt || leave.updatedAt),
                    applicantType: leave.applicantType || 'employee',
                    halfDay: leave.isHalfDay || false
                };
            });

            setAllLeaveRequests(transformedData);
        } catch (err) {
            console.error('❌ Error fetching leaves:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateDays = (start, end, halfDay) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return halfDay ? 0.5 : diffDays;
    };

    const handleProcessRequest = async (request, status) => {
        try {
            if (status === 'approved') {
                await approveLeave(request.id);
            } else {
                await rejectLeave(request.id);
            }
            await fetchLeaveRequests();
        } catch (err) {
            console.error('❌ Error processing leave:', err);
            alert('Failed to process leave request. Please try again.');
        }
    };

    const hrLeaveRequests = allLeaveRequests.filter(r => r.applicantType === 'hr');
    const employeeLeaveRequests = allLeaveRequests.filter(r => r.applicantType === 'employee');
    const currentRequests = activeTab === "hr" ? hrLeaveRequests : employeeLeaveRequests;
    const pendingCount = currentRequests.filter((r) => r.status === "pending").length;

    const getLeaveTypeLabel = (type) => {
        const mapping = {
            'Sick Leave (12 days/year)': 'Sick Leave',
            'Casual Leave (10 days/year)': 'Casual Leave',
            'Annual Leave (20 days/year)': 'Annual Leave',
            'Maternity Leave (90 days/year)': 'Maternity Leave',
            'Paternity Leave (7 days/year)': 'Paternity Leave',
            'Unpaid Leave': 'Unpaid Leave',
            'Compensatory Off': 'Compensatory Off',
            'Emergency Leave (3 days/year)': 'Emergency Leave'
        };
        return mapping[type] || type;
    };

    return (
        <div className="leave-management admin-view">
            {/* Admin Header */}
            <div className="leave-header">
                <div className="leave-header-left">
                    <h2>
                        <i className="fas fa-user-shield"></i> Leave Approvals Dashboard
                    </h2>
                    <p>Review and process leave applications from HR and Manager staff</p>
                </div>
                <div className="leave-header-right">
                    <span className="status-badge-leave pending">
                        {pendingCount} Pending Review
                    </span>
                </div>
            </div>

            {/* Department Tabs */}
            <div className="department-tabs">
                <button
                    className={`dept-tab ${activeTab === "hr" ? "active" : ""}`}
                    onClick={() => setActiveTab("hr")}
                >
                    <i className="fas fa-users"></i> HR Department
                    <span className="tab-count">
                        {hrLeaveRequests.filter((r) => r.status === "pending").length}
                    </span>
                </button>
                <button
                    className={`dept-tab ${activeTab === "employee" ? "active" : ""}`}
                    onClick={() => setActiveTab("employee")}
                >
                    <i className="fas fa-user-tie"></i> Employees
                    <span className="tab-count">
                        {employeeLeaveRequests.filter((r) => r.status === "pending").length}
                    </span>
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="leave-controls">
                <div className="view-toggle-leave">
                    {["pending", "approved", "rejected", "all"].map((status) => (
                        <button
                            key={status}
                            className={`view-btn-leave ${filterStatus === status ? "active" : ""
                                }`}
                            onClick={() => setFilterStatus(status)}
                        >
                            {status.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Request List */}
            <div className="leave-requests-container">
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
                        <p>Loading leave requests...</p>
                    </div>
                ) : (
                    <div className="leave-requests-list">
                        {currentRequests
                            .filter((r) => filterStatus === "all" || r.status === filterStatus)
                            .map((request) => (
                                <div
                                    key={request.id}
                                    className={`leave-request-card ${request.status}`}
                                >
                                    <div className="request-header">
                                        <div className="request-id-section">
                                            <span className="request-id">{request.id}</span>
                                            <span className="role-badge">{request.role}</span>
                                        </div>
                                        <div className={`status-badge-leave ${request.status}`}>
                                            {request.status}
                                        </div>
                                    </div>

                                    <div className="employee-info-leave">
                                        <div className="employee-avatar-leave">
                                            {request.employeeName.charAt(0)}
                                        </div>
                                        <div className="employee-details-leave">
                                            <div className="employee-name-leave">
                                                {request.employeeName}
                                            </div>
                                            <div className="applied-date">
                                                Applied {new Date(request.appliedOn).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="days-count">
                                            <strong>{request.days} Days</strong>
                                        </div>
                                    </div>

                                    <div className="leave-dates">
                                        <div className="date-value">{request.startDate}</div>
                                        <div className="date-arrow">→</div>
                                        <div className="date-value">{request.endDate}</div>
                                    </div>

                                    <div className="leave-reason">
                                        <p>
                                            <strong>Type:</strong> {getLeaveTypeLabel(request.leaveType)}
                                        </p>
                                        <p>
                                            <strong>Reason:</strong> {request.reason}
                                        </p>
                                    </div>

                                    {request.status === "pending" && (
                                        <div className="request-footer">
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn approve"
                                                    onClick={() =>
                                                        handleProcessRequest(request, "approved")
                                                    }
                                                >
                                                    <i className="fas fa-check"></i> Approve
                                                </button>
                                                <button
                                                    className="action-btn reject"
                                                    onClick={() =>
                                                        handleProcessRequest(request, "rejected")
                                                    }
                                                >
                                                    <i className="fas fa-times"></i> Reject
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {request.status !== "pending" && (
                                        <div className="approval-info">
                                            <small>
                                                <i className={`fas ${request.status === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                                                {request.status === 'approved' ? 'Approved' : 'Rejected'} by Admin
                                            </small>
                                        </div>
                                    )}
                                </div>
                            ))}

                        {currentRequests.filter((r) => filterStatus === "all" || r.status === filterStatus).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
                                <p>No {filterStatus !== 'all' ? filterStatus : ''} leave requests found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLeaveApproval;