import { useState, useEffect } from 'react';
import axios from 'axios';
import './HelpIssues.css';

const HelpIssues = ({ selectedStore }) => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');

  const [formData, setFormData] = useState({
    employeeId: '',
    category: 'technical',
    priority: 'medium',
    subject: '',
    description: '',
    attachments: []
  });

  const API_URL = import.meta.env.VITE_API_URL;

  const categories = [
    { value: 'technical', label: 'Technical Issue', icon: 'fa-laptop-code', color: '#1976d2' },
    { value: 'attendance', label: 'Attendance Query', icon: 'fa-calendar-check', color: '#2e7d32' },
    { value: 'leave', label: 'Leave Request', icon: 'fa-plane-departure', color: '#f57c00' },
    { value: 'salary', label: 'Salary/Payment', icon: 'fa-dollar-sign', color: '#7b1fa2' },
    { value: 'hr', label: 'HR Related', icon: 'fa-users', color: '#00897b' },
    { value: 'access', label: 'Access Request', icon: 'fa-key', color: '#c62828' },
    { value: 'equipment', label: 'Equipment/Assets', icon: 'fa-box', color: '#d84315' },
    { value: 'other', label: 'Other', icon: 'fa-question-circle', color: '#5e35b1' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: '#2e7d32', icon: 'fa-arrow-down' },
    { value: 'medium', label: 'Medium', color: '#f57c00', icon: 'fa-minus' },
    { value: 'high', label: 'High', color: '#c62828', icon: 'fa-arrow-up' },
    { value: 'urgent', label: 'Urgent', color: '#d32f2f', icon: 'fa-exclamation-triangle' }
  ];

  const statuses = [
    { value: 'open', label: 'Open', color: '#1976d2', icon: 'fa-inbox' },
    { value: 'in-progress', label: 'In Progress', color: '#f57c00', icon: 'fa-spinner' },
    { value: 'resolved', label: 'Resolved', color: '#2e7d32', icon: 'fa-check-circle' },
    { value: 'closed', label: 'Closed', color: '#9e9e9e', icon: 'fa-times-circle' }
  ];

  useEffect(() => {
    fetchEmployees();
    generateMockTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, filterStatus, filterPriority, filterCategory, selectedStore]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/faces`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const generateMockTickets = () => {
    const mockTickets = [
      {
        id: 'TKT-1001',
        employeeId: 'emp1',
        employeeName: 'John Doe',
        category: 'technical',
        priority: 'high',
        status: 'open',
        subject: 'Cannot access HR portal',
        description: 'Getting error when trying to login to the HR self-service portal. Shows "Access Denied" message.',
        createdAt: new Date('2024-12-08T10:30:00'),
        updatedAt: new Date('2024-12-08T10:30:00'),
        assignedTo: 'IT Support',
        replies: []
      },
      {
        id: 'TKT-1002',
        employeeId: 'emp2',
        employeeName: 'Jane Smith',
        category: 'attendance',
        priority: 'medium',
        status: 'in-progress',
        subject: 'Attendance not marked yesterday',
        description: 'My attendance was not recorded on December 7th even though I was present the entire day.',
        createdAt: new Date('2024-12-07T14:20:00'),
        updatedAt: new Date('2024-12-08T09:15:00'),
        assignedTo: 'HR Team',
        replies: [
          {
            id: 1,
            author: 'HR Team',
            message: 'We are looking into this issue. Will update you shortly.',
            timestamp: new Date('2024-12-08T09:15:00'),
            isStaff: true
          }
        ]
      },
      {
        id: 'TKT-1003',
        employeeId: 'emp1',
        employeeName: 'John Doe',
        category: 'leave',
        priority: 'low',
        status: 'resolved',
        subject: 'Leave balance inquiry',
        description: 'Can you please confirm my remaining leave balance for this year?',
        createdAt: new Date('2024-12-05T11:00:00'),
        updatedAt: new Date('2024-12-06T16:30:00'),
        assignedTo: 'HR Team',
        replies: [
          {
            id: 1,
            author: 'HR Team',
            message: 'Your remaining leave balance is 8 days for this year.',
            timestamp: new Date('2024-12-06T16:30:00'),
            isStaff: true
          }
        ]
      },
      {
        id: 'TKT-1004',
        employeeId: 'emp3',
        employeeName: 'Mike Johnson',
        category: 'salary',
        priority: 'urgent',
        status: 'open',
        subject: 'Salary not credited',
        description: 'My salary for November has not been credited to my account yet. Please check urgently.',
        createdAt: new Date('2024-12-09T08:00:00'),
        updatedAt: new Date('2024-12-09T08:00:00'),
        assignedTo: 'Finance Team',
        replies: []
      }
    ];

    setTickets(mockTickets);
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filterStatus);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === filterPriority);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === filterCategory);
    }

    // Store Filter
    if (selectedStore && selectedStore !== 'All Stores') {
      filtered = filtered.filter(ticket => {
        const emp = employees.find(e => e._id === ticket.employeeId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredTickets(filtered);
  };

  // --- NEW: Handle clicks on stats cards ---
  const handleStatClick = (type) => {
    // Reset specific filters when clicking broad categories to avoid confusion
    if (type === 'total') {
      setFilterStatus('all');
      setFilterPriority('all');
    } else if (type === 'urgent') {
      setFilterStatus('all'); // Or keep status as is, depending on preference
      setFilterPriority('urgent');
    } else {
      // For specific statuses (open, in-progress, resolved)
      setFilterStatus(type);
      setFilterPriority('all');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      category: 'technical',
      priority: 'medium',
      subject: '',
      description: '',
      attachments: []
    });
  };

  const handleCreateTicket = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const saveTicket = (e) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.subject.trim() || !formData.description.trim()) {
      alert('⚠️ Please fill in all required fields!');
      return;
    }

    const employee = employees.find(e => e._id === formData.employeeId);
    if (!employee) {
      alert('⚠️ Employee not found!');
      return;
    }

    const newTicket = {
      id: `TKT-${1000 + tickets.length + 1}`,
      employeeId: formData.employeeId,
      employeeName: employee.name,
      category: formData.category,
      priority: formData.priority,
      status: 'open',
      subject: formData.subject,
      description: formData.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedTo: 'Support Team',
      replies: []
    };

    setTickets(prev => [newTicket, ...prev]);
    setShowCreateModal(false);
    resetForm();
    alert('✅ Support ticket created successfully!');
  };

  const viewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setShowViewModal(true);
  };

  const updateTicketStatus = (newStatus) => {
    setTickets(prev => prev.map(ticket =>
      ticket.id === selectedTicket.id
        ? { ...ticket, status: newStatus, updatedAt: new Date() }
        : ticket
    ));
    setSelectedTicket(prev => ({ ...prev, status: newStatus }));
    alert(`✅ Ticket status updated to ${newStatus}!`);
  };

  const addReply = () => {
    if (!replyText.trim()) {
      alert('⚠️ Please enter a reply message!');
      return;
    }

    const newReply = {
      id: Date.now(),
      author: 'Support Team',
      message: replyText,
      timestamp: new Date(),
      isStaff: true
    };

    setTickets(prev => prev.map(ticket =>
      ticket.id === selectedTicket.id
        ? {
          ...ticket,
          replies: [...ticket.replies, newReply],
          updatedAt: new Date(),
          status: ticket.status === 'open' ? 'in-progress' : ticket.status
        }
        : ticket
    ));

    setSelectedTicket(prev => ({
      ...prev,
      replies: [...prev.replies, newReply],
      status: prev.status === 'open' ? 'in-progress' : prev.status
    }));

    setReplyText('');
    alert('✅ Reply added successfully!');
  };

  const getCategoryInfo = (category) => {
    return categories.find(c => c.value === category) || categories[0];
  };

  const getPriorityInfo = (priority) => {
    return priorities.find(p => p.value === priority) || priorities[1];
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

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(date);
  };

  const getStats = () => {
    // #r Filter tickets by selectedStore for consistent stat card display
    let storeTickets = tickets;
    if (selectedStore && selectedStore !== 'All Stores') {
      storeTickets = tickets.filter(ticket => {
        const emp = employees.find(e => e._id === ticket.employeeId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    const totalTickets = storeTickets.length;
    const openTickets = storeTickets.filter(t => t.status === 'open').length;
    const inProgressTickets = storeTickets.filter(t => t.status === 'in-progress').length;
    const resolvedTickets = storeTickets.filter(t => t.status === 'resolved').length;
    const urgentTickets = storeTickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length;

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      urgentTickets
    };
  };

  const stats = getStats();

  return (
    <div className="help-issues">
      {/* Styles for interactive cards */}
      <style>{`
        .help-stat-card {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .help-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .help-stat-card.selected-stat {
          border: 2px solid #1976d2;
          background-color: #f0f7ff;
        }
        .help-stat-card.urgent.selected-stat {
          border-color: #d32f2f;
          background-color: #ffebee;
        }
      `}</style>

      {/* Header */}
      <div className="help-header">
        <div className="help-header-left">
          <h2>
            <i className="fas fa-headset"></i>
            Help & Support Tickets
          </h2>
          <p>Manage employee queries and support requests</p>
        </div>
      </div>

      {/* Stats Cards - Interactive */}
      <div className="help-stats-grid">
        <div
          className={`help-stat-card total ${filterStatus === 'all' && filterPriority === 'all' ? 'selected-stat' : ''}`}
          onClick={() => handleStatClick('total')}
        >
          <div className="help-stat-icon">
            <i className="fas fa-ticket-alt"></i>
          </div>
          <div className="help-stat-content">
            <div className="help-stat-value">{stats.totalTickets}</div>
            <div className="help-stat-label">Total Tickets</div>
          </div>
        </div>

        <div
          className={`help-stat-card open ${filterStatus === 'open' ? 'selected-stat' : ''}`}
          onClick={() => handleStatClick('open')}
        >
          <div className="help-stat-icon">
            <i className="fas fa-inbox"></i>
          </div>
          <div className="help-stat-content">
            <div className="help-stat-value">{stats.openTickets}</div>
            <div className="help-stat-label">Open</div>
          </div>
        </div>

        <div
          className={`help-stat-card progress ${filterStatus === 'in-progress' ? 'selected-stat' : ''}`}
          onClick={() => handleStatClick('in-progress')}
        >
          <div className="help-stat-icon">
            <i className="fas fa-spinner"></i>
          </div>
          <div className="help-stat-content">
            <div className="help-stat-value">{stats.inProgressTickets}</div>
            <div className="help-stat-label">In Progress</div>
          </div>
        </div>

        <div
          className={`help-stat-card resolved ${filterStatus === 'resolved' ? 'selected-stat' : ''}`}
          onClick={() => handleStatClick('resolved')}
        >
          <div className="help-stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="help-stat-content">
            <div className="help-stat-value">{stats.resolvedTickets}</div>
            <div className="help-stat-label">Resolved</div>
          </div>
        </div>

        <div
          className={`help-stat-card urgent ${filterPriority === 'urgent' ? 'selected-stat' : ''}`}
          onClick={() => handleStatClick('urgent')}
        >
          <div className="help-stat-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="help-stat-content">
            <div className="help-stat-value">{stats.urgentTickets}</div>
            <div className="help-stat-label">Urgent</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="help-filters">
        <div className="filter-section">
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-help"
          />
        </div>

        <div className="filter-section">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              if (e.target.value !== 'all' && filterPriority === 'urgent') setFilterPriority('all'); // reset priority if manually changing status
            }}
            className="filter-select-help"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-section">
          <select
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value);
              if (e.target.value === 'urgent' && filterStatus !== 'all') setFilterStatus('all'); // Logic choice: prioritize the urgent filter view
            }}
            className="filter-select-help"
          >
            <option value="all">All Priority</option>
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>{priority.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-section">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select-help"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="tickets-container">
        {filteredTickets.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <p>No tickets found</p>

          </div>
        ) : (
          <div className="tickets-list">
            {filteredTickets.map(ticket => {
              const categoryInfo = getCategoryInfo(ticket.category);
              const priorityInfo = getPriorityInfo(ticket.priority);
              const statusInfo = getStatusInfo(ticket.status);

              return (
                <div
                  key={ticket.id}
                  className="ticket-card"
                  onClick={() => viewTicket(ticket)}
                >
                  <div className="ticket-header">
                    <div className="ticket-id-section">
                      <span className="ticket-id">{ticket.id}</span>
                      <span
                        className="priority-badge"
                        style={{ background: `${priorityInfo.color}20`, color: priorityInfo.color }}
                      >
                        <i className={`fas ${priorityInfo.icon}`}></i>
                        {priorityInfo.label}
                      </span>
                    </div>
                    <span
                      className="status-badge-help"
                      style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
                    >
                      <i className={`fas ${statusInfo.icon}`}></i>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="ticket-body">
                    <div className="ticket-subject">{ticket.subject}</div>
                    <div className="ticket-description">{ticket.description}</div>

                    <div className="ticket-meta">
                      <div className="meta-item">
                        <div
                          className="category-badge-help"
                          style={{ background: `${categoryInfo.color}20`, color: categoryInfo.color }}
                        >
                          <i className={`fas ${categoryInfo.icon}`}></i>
                          {categoryInfo.label}
                        </div>
                      </div>
                      <div className="meta-item">
                        <i className="far fa-user"></i>
                        {ticket.employeeName}
                      </div>
                      <div className="meta-item">
                        <i className="far fa-clock"></i>
                        {getTimeAgo(ticket.createdAt)}
                      </div>
                      {ticket.replies.length > 0 && (
                        <div className="meta-item">
                          <i className="far fa-comments"></i>
                          {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ticket-footer">
                    <div className="assigned-to">
                      <i className="fas fa-user-tie"></i>
                      Assigned to: <strong>{ticket.assignedTo}</strong>
                    </div>
                    <div className="view-details">
                      View Details <i className="fas fa-chevron-right"></i>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-plus"></i>
                Create Support Ticket
              </h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={saveTicket}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>
                      Employee <span className="required">*</span>
                    </label>
                    <select
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select employee...</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Category <span className="required">*</span>
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Priority <span className="required">*</span>
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      required
                    >
                      {priorities.map(priority => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>
                      Subject <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Brief description of the issue..."
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>
                      Description <span className="required">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Detailed description of the issue..."
                      rows="6"
                      required
                    />
                  </div>
                </div>

                <div className="info-box">
                  <i className="fas fa-info-circle"></i>
                  <div>
                    Your ticket will be assigned to the appropriate team and you'll receive updates via email.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <i className="fas fa-paper-plane"></i>
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Ticket Modal */}
      {showViewModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-ticket-alt"></i>
                Ticket Details - {selectedTicket.id}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              {/* Ticket Info */}
              <div className="ticket-detail-header">
                <div className="detail-badges">
                  <span
                    className="badge-large status"
                    style={{
                      background: `${getStatusInfo(selectedTicket.status).color}20`,
                      color: getStatusInfo(selectedTicket.status).color
                    }}
                  >
                    <i className={`fas ${getStatusInfo(selectedTicket.status).icon}`}></i>
                    {getStatusInfo(selectedTicket.status).label}
                  </span>
                  <span
                    className="badge-large priority"
                    style={{
                      background: `${getPriorityInfo(selectedTicket.priority).color}20`,
                      color: getPriorityInfo(selectedTicket.priority).color
                    }}
                  >
                    <i className={`fas ${getPriorityInfo(selectedTicket.priority).icon}`}></i>
                    {getPriorityInfo(selectedTicket.priority).label}
                  </span>
                  <span
                    className="badge-large category"
                    style={{
                      background: `${getCategoryInfo(selectedTicket.category).color}20`,
                      color: getCategoryInfo(selectedTicket.category).color
                    }}
                  >
                    <i className={`fas ${getCategoryInfo(selectedTicket.category).icon}`}></i>
                    {getCategoryInfo(selectedTicket.category).label}
                  </span>
                </div>

                <div className="status-actions">
                  {selectedTicket.status !== 'in-progress' && (
                    <button
                      className="status-btn progress"
                      onClick={() => updateTicketStatus('in-progress')}
                    >
                      <i className="fas fa-spinner"></i>
                      Mark In Progress
                    </button>
                  )}
                  {selectedTicket.status !== 'resolved' && (
                    <button
                      className="status-btn resolved"
                      onClick={() => updateTicketStatus('resolved')}
                    >
                      <i className="fas fa-check-circle"></i>
                      Mark Resolved
                    </button>
                  )}
                  {selectedTicket.status !== 'closed' && (
                    <button
                      className="status-btn closed"
                      onClick={() => updateTicketStatus('closed')}
                    >
                      <i className="fas fa-times-circle"></i>
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>

              <div className="ticket-detail-content">
                <div className="detail-section">
                  <div className="section-label">Subject</div>
                  <div className="section-value subject">{selectedTicket.subject}</div>
                </div>

                <div className="detail-section">
                  <div className="section-label">Description</div>
                  <div className="section-value">{selectedTicket.description}</div>
                </div>

                <div className="detail-info-grid">
                  <div className="info-item">
                    <div className="info-label">Reported By</div>
                    <div className="info-value">
                      <i className="far fa-user"></i>
                      {selectedTicket.employeeName}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Assigned To</div>
                    <div className="info-value">
                      <i className="fas fa-user-tie"></i>
                      {selectedTicket.assignedTo}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Created</div>
                    <div className="info-value">
                      <i className="far fa-calendar"></i>
                      {formatDateTime(selectedTicket.createdAt)}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Last Updated</div>
                    <div className="info-value">
                      <i className="far fa-clock"></i>
                      {formatDateTime(selectedTicket.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversation Thread */}
              <div className="conversation-section">
                <div className="conversation-header">
                  <h4>
                    <i className="far fa-comments"></i>
                    Conversation ({selectedTicket.replies.length})
                  </h4>
                </div>

                <div className="conversation-thread">
                  {selectedTicket.replies.length === 0 ? (
                    <div className="no-replies">
                      <i className="far fa-comment-dots"></i>
                      <p>No replies yet. Be the first to respond!</p>
                    </div>
                  ) : (
                    selectedTicket.replies.map(reply => (
                      <div
                        key={reply.id}
                        className={`reply-item ${reply.isStaff ? 'staff' : 'employee'}`}
                      >
                        <div className="reply-avatar">
                          {reply.isStaff ? (
                            <i className="fas fa-user-shield"></i>
                          ) : (
                            <i className="far fa-user"></i>
                          )}
                        </div>
                        <div className="reply-content">
                          <div className="reply-header">
                            <span className="reply-author">{reply.author}</span>
                            {reply.isStaff && <span className="staff-badge">Staff</span>}
                            <span className="reply-time">{formatDateTime(reply.timestamp)}</span>
                          </div>
                          <div className="reply-message">{reply.message}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="reply-form">
                  <textarea
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows="4"
                  />
                  <button className="btn-primary" onClick={addReply}>
                    <i className="fas fa-paper-plane"></i>
                    Send Reply
                  </button>
                </div>
              </div>
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
    </div>
  );
};

export default HelpIssues;