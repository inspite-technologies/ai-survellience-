import { useState, useEffect } from 'react';
import axios from 'axios';
import * as faceapi from 'face-api.js';
// Import employee API service for backend communication
import { updateEmployee as updateEmployeeAPI } from '../../services/employeeAPI';
import {
  Users,
  UserPlus,
  Search,
  LayoutGrid,
  List,
  FileDown,
  Edit,
  Eye,
  Trash2,
  Plus,
  X,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Clock,
  Building2,
  Circle,
  Upload,
  Trash,
  AlertCircle,
  MapPin,
  DollarSign,
  UserCheck,
  TrendingUp,
  MoreVertical,
  Filter,
  RefreshCw,
  Save,
  AlertTriangle
} from 'lucide-react';
import './EmployeeManagement.css';

const EmployeeManagement = ({ globalSearchQuery, selectedStore, initialTab = 'all' }) => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [activeTab, setActiveTab] = useState(initialTab); // 'all' or 'verification'
  const [unverifiedEmployees, setUnverifiedEmployees] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    shiftTime: '',
    joinDate: '',
    salary: '',
    address: '',
    password: '' // Added password
  });

  // Face Upload State
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedDescriptor, setExtractedDescriptor] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });

  const API_URL = import.meta.env.VITE_API_URL;

  const departments = ['HR', 'Engineering', 'Sales', 'Marketing', 'Finance', 'Operations', 'IT', 'Customer Support'];
  const shiftTimes = ['9:00 AM - 5:00 PM', '10:00 AM - 6:00 PM', '11:00 AM - 7:00 PM', '2:00 PM - 10:00 PM', 'Night Shift'];

  useEffect(() => {
    fetchEmployees();
    fetchUnverifiedEmployees();
    loadModels();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync global search
  useEffect(() => {
    if (typeof globalSearchQuery === 'string') {
      setSearchQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  const loadModels = async () => {
    try {
      setIsModelLoading(true);
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      console.log('✅ Face API models loaded for upload');
      setIsModelLoading(false);
    } catch (err) {
      console.error('❌ Failed to load face models:', err);
      setIsModelLoading(false);
    }
  };

  useEffect(() => {
    filterEmployees();
  }, [employees, searchQuery, selectedStore]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/faces`);
      setEmployees(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setLoading(false);
    }
  };

  const fetchUnverifiedEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/faces/unverified`);
      setUnverifiedEmployees(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching unverified employees:', err);
    }
  };

  const handleVerify = async (id) => {
    setIsVerifying(true);
    try {
      const response = await axios.patch(`${API_URL}/faces/verify/${id}`);
      if (response.data.success) {
        alert('✅ Employee verified successfully!');
        fetchEmployees();
        fetchUnverifiedEmployees();
      }
    } catch (err) {
      console.error('Error verifying employee:', err);
      alert('❌ Failed to verify employee');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this registration? This will delete the entry.')) return;
    
    setIsVerifying(true);
    try {
      const response = await axios.delete(`${API_URL}/faces/reject/${id}`);
      if (response.data.success) {
        alert('❌ Employee registration rejected.');
        fetchUnverifiedEmployees();
      }
    } catch (err) {
      console.error('Error rejecting employee:', err);
      alert('❌ Failed to reject employee');
    } finally {
      setIsVerifying(false);
    }
  };

  const filterEmployees = () => {
    let filtered = Array.isArray(employees) ? [...employees] : [];

    // Store Filter
    if (selectedStore && selectedStore !== 'All Stores') {
      filtered = filtered.filter(emp =>
        (emp.storeName === selectedStore) ||
        (emp.branchName === selectedStore) ||
        (emp.department === selectedStore)
      );
    }

    if (!searchQuery.trim()) {
      setFilteredEmployees(filtered);
      return;
    }

    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(emp =>
      emp.name.toLowerCase().includes(query) ||
      (emp.email && emp.email.toLowerCase().includes(query)) ||
      (emp.department && emp.department.toLowerCase().includes(query)) ||
      (emp.position && emp.position.toLowerCase().includes(query))
    );
    setFilteredEmployees(filtered);
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
      name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      shiftTime: '',
      joinDate: '',
      salary: '',
      address: '',
      password: ''
    });
    setImagePreview(null);
    setExtractedDescriptor(null);
    setUploadStatus({ type: '', message: '' });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadStatus({ type: 'error', message: 'Please upload an image file.' });
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setUploadStatus({ type: 'loading', message: 'Analyzing image...' });

    try {
      // Load image
      const img = await faceapi.bufferToImage(file);

      // Detect face and descriptor
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setUploadStatus({ type: 'error', message: 'No face detected in the image. Please try another photo.' });
        setExtractedDescriptor(null);
        return;
      }

      setExtractedDescriptor(Array.from(detection.descriptor));
      setUploadStatus({ type: 'success', message: 'Face detected and processed successfully!' });
    } catch (err) {
      console.error('Error processing image:', err);
      setUploadStatus({ type: 'error', message: 'Error processing image: ' + err.message });
      setExtractedDescriptor(null);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setExtractedDescriptor(null);
    setUploadStatus({ type: '', message: '' });
  };

  const handleAddEmployee = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      department: employee.department || '',
      position: employee.position || '',
      shiftTime: employee.shiftTime || '',
      joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : '',
      salary: employee.salary || employee.monthlySalary || '',
      address: employee.address || '',
      password: '' // Reset password field for security
    });
    setShowEditModal(true);
  };

  const handleDeleteEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const saveEmployee = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('⚠️ Employee name is required!');
      return;
    }

    try {
      // Send comprehensive employee data including password
      const response = await axios.post(`${API_URL}/faces/save`, {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phone,
        department: formData.department,
        position: formData.position,
        shiftTime: formData.shiftTime,
        joinDate: formData.joinDate,
        monthlySalary: formData.salary ? parseFloat(formData.salary) : 0,
        address: formData.address,
        password: formData.password || undefined,
        descriptor: extractedDescriptor || []
      });

      if (response.data.success) {
        alert(extractedDescriptor
          ? '✅ Employee and face registered successfully!'
          : '✅ Employee added successfully!');
        setShowAddModal(false);
        resetForm();
        fetchEmployees();
      }
    } catch (err) {
      console.error('Error saving employee:', err);
      alert('❌ Failed to add employee: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  /**
   * Updates employee details in the database
   * Maps form fields to backend schema and handles validation
   */
  const updateEmployee = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      alert('⚠️ Employee name is required!');
      return;
    }

    try {
      // Map form fields to backend schema
      // Note: Field names must match backend model (e.g., phone -> phoneNumber, salary -> monthlySalary)
      const updateData = {
        name: formData.name,
        email: formData.email || undefined,
        phoneNumber: formData.phone || undefined,  // Frontend: 'phone' → Backend: 'phoneNumber'
        department: formData.department || undefined,
        position: formData.position || undefined,
        shiftTime: formData.shiftTime || undefined,
        joinDate: formData.joinDate || undefined,
        monthlySalary: formData.salary ? parseFloat(formData.salary) : undefined,
        address: formData.address || undefined,
        password: formData.password || undefined // Allow password reset
      };

      // Clean up: Remove undefined values to avoid sending null fields to backend
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

      // Call backend API to update employee record
      const response = await updateEmployeeAPI(selectedEmployee._id, updateData);

      if (response.success) {
        alert('✅ Employee details updated successfully!');
        setShowEditModal(false);
        resetForm();
        fetchEmployees();
      }
    } catch (err) {
      console.error('Error updating employee:', err);

      // Handle duplicate email error (MongoDB E11000 error)
      // This occurs when trying to use an email that's already registered to another employee
      if (err.response?.data?.message?.includes('E11000') && err.response?.data?.message?.includes('email')) {
        alert('❌ This email address is already registered to another employee. Please use a different email.');
      } else {
        alert('❌ Failed to update employee: ' + (err.response?.data?.message || 'Server error'));
      }
    }
  };

  const confirmDelete = async () => {
    try {
      const response = await axios.delete(`${API_URL}/faces/${selectedEmployee._id}`);

      if (response.data.success) {
        alert(`✅ ${selectedEmployee.name} has been removed from the system.`);
        setShowDeleteModal(false);
        setSelectedEmployee(null);
        fetchEmployees();
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('❌ Failed to delete employee: ' + (err.response?.data?.message || 'Server error'));
    }
  };

  /**
   * akid changes: Make a list of employees for the computer to download
   * #r dirst: Writing down everyone's name on a piece of paper to take home
   */
  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      alert('⚠️ No employee data to export!');
      return;
    }

    // CSV Headers
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Department', 'Position', 'Shift', 'Join Date', 'Salary'];

    // CSV Rows
    const rows = filteredEmployees.map(emp => [
      `"${emp._id}"`,
      `"${emp.name}"`,
      `"${emp.email || 'N/A'}"`,
      `"${emp.phoneNumber || emp.phone || 'N/A'}"`,
      `"${emp.department || 'N/A'}"`,
      `"${emp.position || 'N/A'}"`,
      `"${emp.shiftTime || 'N/A'}"`,
      `"${emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : 'N/A'}"`,
      `"${emp.monthlySalary || emp.salary || 0}"`
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return names[0].charAt(0) + names[1].charAt(0);
    }
    return name.charAt(0);
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="employee-management">
      {/* Tabs Section */}
      <div className="emp-tabs-modern">
        <button 
          className={`emp-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Users size={18} />
          <span>All Employees ({employees.length})</span>
        </button>
        <button 
          className={`emp-tab-btn ${activeTab === 'verification' ? 'active' : ''}`}
          onClick={() => setActiveTab('verification')}
        >
          <UserCheck size={18} />
          <span>Verification ({unverifiedEmployees.length})</span>
          {unverifiedEmployees.length > 0 && <span className="tab-badge">{unverifiedEmployees.length}</span>}
        </button>
      </div>

      {activeTab === 'all' ? (
        <>
      {/* Stats Cards */}
      <div className="emp-stats-grid-modern">
        <div className="emp-stat-card-new">
          <div className="stat-icon-box total">
            <Users size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Employees</span>
            <h3 className="stat-number">{employees.length}</h3>
          </div>
          <div className="stat-trend positive">
            <TrendingUp size={12} />
            <span>+2%</span>
          </div>
        </div>

        <div className="emp-stat-card-new">
          <div className="stat-icon-box active">
            <UserCheck size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Active Now</span>
            <h3 className="stat-number">{employees.length}</h3>
          </div>
        </div>

        <div className="emp-stat-card-new">
          <div className="stat-icon-box departments">
            <Building2 size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Departments</span>
            <h3 className="stat-number">{departments.length}</h3>
          </div>
        </div>

        <div className="emp-stat-card-new">
          <div className="stat-icon-box new">
            <UserPlus size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-label">New Hires</span>
            <h3 className="stat-number">0</h3>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="emp-controls-premium">
        <div className="search-bar-modern">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="controls-right-group">
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

          <button className="btn-export-premium" onClick={handleExportCSV}>
            <FileDown size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Employee List */}
      {loading ? (
        <div className="loading-state-premium">
          <RefreshCw size={40} className="spin" />
          <p>Fetching team data...</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="empty-state-modern">
          <div className="empty-icon-circle">
            <Users size={40} />
          </div>
          <h3>No employees found</h3>
          <p>Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="employees-grid-premium">
          {filteredEmployees.map((employee) => (
            <div key={employee._id} className="employee-card-premium">
              <div className="card-header-accent">
                <div className="avatar-wrapper">
                  <div className="avatar-main">
                    {getInitials(employee.name)}
                  </div>
                </div>
                <div className="status-indicator active">
                  <Circle size={8} fill="currentColor" />
                  <span>Active</span>
                </div>
              </div>

              <div className="card-content-main">
                <h3 className="card-name">{employee.name}</h3>
                <p className="card-role">{employee.position || 'Not Assigned'}</p>

                <div className="card-meta-pills">
                  <span className="dept-pill">
                    <Building2 size={12} />
                    {employee.department || 'No Dept'}
                  </span>
                </div>

                <div className="card-contact-list">
                  {employee.email && (
                    <div className="contact-row">
                      <Mail size={14} />
                      <span>{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="contact-row">
                      <Phone size={14} />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  <div className="contact-row">
                    <Calendar size={14} />
                    <span>Joined {formatDate(employee.createdAt)}</span>
                  </div>
                  {employee.shiftTime && (
                    <div className="contact-row">
                      <Clock size={14} />
                      <span>{employee.shiftTime}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-actions-premium">
                <button
                  className="action-pill edit"
                  onClick={() => handleEditEmployee(employee)}
                  title="Edit Employee"
                >
                  <Edit size={16} />
                </button>
                <button
                  className="action-pill view"
                  onClick={() => handleViewEmployee(employee)}
                  title="View Details"
                >
                  <Eye size={16} />
                </button>
                <button
                  className="action-pill delete"
                  onClick={() => handleDeleteEmployee(employee)}
                  title="Delete Employee"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Table View
        <div className="table-container-premium">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Position</th>
                <th>Contact</th>
                <th>Shift</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee._id}>
                  <td>
                    <div className="table-user-cell">
                      <div className="user-avatar-small">
                        {getInitials(employee.name)}
                      </div>
                      <div className="user-text">
                        <div className="user-name-main">{employee.name}</div>
                        <div className="user-id-sub">{employee._id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-dept-modern">
                      <Building2 size={12} />
                      {employee.department || '—'}
                    </span>
                  </td>
                  <td className="text-medium">{employee.position || '—'}</td>
                  <td>
                    <div className="table-contact-stacked">
                      {employee.email && (
                        <div className="contact-tiny">
                          <Mail size={10} />
                          {employee.email}
                        </div>
                      )}
                      {employee.phone && (
                        <div className="contact-tiny">
                          <Phone size={10} />
                          {employee.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {employee.shiftTime ? (
                      <span className="badge-shift-modern">
                        <Clock size={12} />
                        {employee.shiftTime}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="text-muted-modern">{formatDate(employee.createdAt)}</td>
                  <td>
                    <span className="status-pill active">
                      <Circle size={6} fill="currentColor" />
                      Active
                    </span>
                  </td>
                  <td>
                    <div className="row-actions-premium">
                      <button
                        className="btn-row-action edit"
                        onClick={() => handleEditEmployee(employee)}
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn-row-action view"
                        title="View"
                        onClick={() => handleViewEmployee(employee)}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn-row-action delete"
                        onClick={() => handleDeleteEmployee(employee)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      ) : (
        // Verification Tab
        <div className="verification-tab-content">
          <div className="tab-header-modern">
            <h3>Pending Verifications</h3>
            <p>Approve or reject new employee registrations</p>
          </div>

          {unverifiedEmployees.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-icon-circle">
                <UserCheck size={40} />
              </div>
              <h3>No pending verifications</h3>
              <p>Everything is up to date!</p>
            </div>
          ) : (
            <div className="table-container-premium">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unverifiedEmployees.map((employee) => (
                    <tr key={employee._id}>
                      <td>
                        <div className="table-user-cell">
                          <div className="user-avatar-small">
                            {getInitials(employee.name)}
                          </div>
                          <div className="user-text">
                            <div className="user-name-main">{employee.name}</div>
                            <div className="user-id-sub">{employee._id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td>{employee.email || '—'}</td>
                      <td>{employee.phoneNumber || employee.phone || '—'}</td>
                      <td className="text-muted-modern">{formatDate(employee.createdAt)}</td>
                      <td>
                        <div className="row-actions-premium">
                          <button
                            className="btn-verification approve"
                            onClick={() => handleVerify(employee._id)}
                            disabled={isVerifying}
                            title="Approve"
                          >
                            <UserCheck size={16} />
                            <span>Approve</span>
                          </button>
                          <button
                            className="btn-verification reject"
                            onClick={() => handleReject(employee._id)}
                            disabled={isVerifying}
                            title="Reject"
                          >
                            <X size={16} />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay-premium" onClick={() => setShowAddModal(false)}>
          <div className="modal-container-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div className="modal-title-box">
                <UserPlus size={20} />
                <h3>Add New Employee</h3>
              </div>
              <button className="modal-close-btn-premium" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveEmployee}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Full Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="employee@company.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="form-group">
                    <label>Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      placeholder="e.g. Software Engineer"
                    />
                  </div>

                  <div className="form-group">
                    <label>Shift Time</label>
                    <select
                      name="shiftTime"
                      value={formData.shiftTime}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Shift</option>
                      {shiftTimes.map(shift => (
                        <option key={shift} value={shift}>{shift}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Join Date</label>
                    <input
                      type="date"
                      name="joinDate"
                      value={formData.joinDate}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Monthly Salary</label>
                    <input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter full address"
                      rows="3"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Assignment Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Set access password (defaults to phone if empty)"
                    />
                  </div>
                </div>

                <div className="face-upload-container-modern">
                  <div className="face-upload-header">
                    <label className="section-title-modern">Face Registration</label>
                    <span className="optional-tag">Optional</span>
                  </div>
                  <p className="section-desc-modern">Upload a clear photo for automatic facial recognition.</p>

                  <div className={`upload-zone-modern ${imagePreview ? 'has-image' : ''}`}>
                    {imagePreview ? (
                      <div className="preview-container-modern">
                        <img src={imagePreview} alt="Preview" className="preview-img-modern" />
                        <button type="button" className="remove-preview-btn" onClick={handleRemoveImage}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="upload-label-modern">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isModelLoading}
                        />
                        {isModelLoading ? (
                          <RefreshCw size={24} className="spin icon-muted" />
                        ) : (
                          <Upload size={24} className="icon-muted" />
                        )}
                        <span className="upload-text-main">{isModelLoading ? 'Initializing AI...' : 'Select Employee Photo'}</span>
                        <span className="upload-text-sub">SVG, PNG, JPG (max. 5MB)</span>
                      </label>
                    )}
                  </div>

                  {uploadStatus.message && (
                    <div className={`upload-feedback-modern ${uploadStatus.type}`}>
                      {uploadStatus.type === 'loading' ? <RefreshCw size={14} className="spin" /> :
                        uploadStatus.type === 'success' ? <UserCheck size={14} /> : <AlertCircle size={14} />
                      }
                      <span>{uploadStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer-premium">
                <button
                  type="button"
                  className="btn-cancel-premium"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save-premium">
                  <Save size={18} />
                  <span>Save Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="modal-overlay-premium" onClick={() => setShowEditModal(false)}>
          <div className="modal-container-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div className="modal-title-box">
                <Edit size={20} />
                <h3>Edit Employee Details</h3>
              </div>
              <button className="modal-close-btn-premium" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={updateEmployee}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Full Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Shift Time</label>
                    <select
                      name="shiftTime"
                      value={formData.shiftTime}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Shift</option>
                      {shiftTimes.map(shift => (
                        <option key={shift} value={shift}>{shift}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Join Date</label>
                    <input
                      type="date"
                      name="joinDate"
                      value={formData.joinDate}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Monthly Salary</label>
                    <input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Password (Leave blank to keep current)</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter new password to reset"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer-premium">
                <button
                  type="button"
                  className="btn-cancel-premium"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save-premium">
                  <Save size={18} />
                  <span>Update Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="modal-overlay-premium" onClick={() => setShowViewModal(false)}>
          <div className="modal-container-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div className="modal-title-box">
                <UserCheck size={20} />
                <h3>Employee Profile</h3>
              </div>
              <button className="modal-close-btn-premium" onClick={() => setShowViewModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="employee-info-summary">
                <div className="summary-avatar-large">
                  {getInitials(selectedEmployee.name)}
                </div>
                <div className="summary-main">
                  <h3>{selectedEmployee.name}</h3>
                  <p>{selectedEmployee.position || 'Employee'}</p>
                </div>
              </div>

              <div className="employee-details-grid-modern">
                <div className="detail-row-premium">
                  <div className="detail-label-modern"><Users size={14} /> Name</div>
                  <div className="detail-value-modern">{selectedEmployee.name}</div>
                </div>
                <div className="detail-row-premium">
                  <div className="detail-label-modern"><Mail size={14} /> Email</div>
                  <div className="detail-value-modern">{selectedEmployee.email || '—'}</div>
                </div>
                <div className="detail-row-premium">
                  <div className="detail-label-modern"><Phone size={14} /> Phone</div>
                  <div className="detail-value-modern">{selectedEmployee.phoneNumber || '—'}</div>
                </div>
                <div className="detail-row-premium">
                  <div className="detail-label-modern"><Building2 size={14} /> Department</div>
                  <div className="detail-value-modern">{selectedEmployee.department || '—'}</div>
                </div>
                <div className="detail-row-premium">
                  <div className="detail-label-modern"><UserPlus size={14} /> Position</div>
                  <div className="detail-value-modern">{selectedEmployee.position || '—'}</div>
                </div>
                <div className="detail-row-premium">
                  <div className="detail-label-modern"><Clock size={14} /> Shift Time</div>
                  <div className="detail-value-modern">{selectedEmployee.shiftTime || '—'}</div>
                </div>
                <div className="detail-row-premium">
                  <div className="detail-label-modern"><Calendar size={14} /> Join Date</div>
                  <div className="detail-value-modern">{selectedEmployee.joinDate ? new Date(selectedEmployee.joinDate).toLocaleDateString() : '—'}</div>
                </div>
                <div className="detail-row-premium">
                  <div className="detail-label-modern"><DollarSign size={14} /> Salary</div>
                  <div className="detail-value-modern">${selectedEmployee.monthlySalary?.toLocaleString() || '—'}</div>
                </div>
                {selectedEmployee.address && (
                  <div className="detail-row-premium full-width">
                    <div className="detail-label-modern"><MapPin size={14} /> Address</div>
                    <div className="detail-value-modern">{selectedEmployee.address}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer-premium">
              <button className="btn-cancel-premium" onClick={() => setShowViewModal(false)}>
                Close
              </button>
              <button
                className="btn-save-premium"
                onClick={() => {
                  setShowViewModal(false);
                  handleEditEmployee(selectedEmployee);
                }}
              >
                <Edit size={16} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEmployee && (
        <div className="modal-overlay-premium" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-container-modern modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-premium danger">
              <div className="modal-title-box">
                <AlertTriangle size={20} />
                <h3>Remove Employee</h3>
              </div>
              <button className="modal-close-btn-premium" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-delete">
              <div className="delete-alert-icon">
                <Trash2 size={32} />
              </div>
              <p>Are you sure you want to remove <strong>{selectedEmployee.name}</strong> from the system?</p>
              <p className="delete-warning-sub">This action cannot be undone and all associated records will be deleted.</p>
            </div>

            <div className="modal-footer-premium">
              <button className="btn-cancel-premium" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn-delete-confirm" onClick={confirmDelete}>
                <Trash size={16} />
                <span>Delete Employee</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;