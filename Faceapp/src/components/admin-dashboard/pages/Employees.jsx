import React, { useState, useEffect } from "react";
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../../services/employeeAPI";
import {
  FaSearch,
  FaEnvelope,
  FaMapMarkerAlt,
  FaUsers,
  FaClock,
  FaTimes,
  FaUserTie,
  FaPlus,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaEdit,
  FaTrash,
  FaList,
  FaThLarge,
  FaPhone,
  FaDollarSign,
  FaBriefcase,
} from "react-icons/fa";

const Employees = ({ globalSearchQuery }) => {
  // --- State ---
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & View State
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === "list" ? 8 : 6;

  // Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formMode, setFormMode] = useState("add"); // 'add' or 'edit'

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    shiftTime: "",
    joinDate: "",
    monthlySalary: "",
    address: "",
    password: "", // Added password field
  });

  // --- Derived Data ---
  // Extract unique departments for filter
  const uniqueDepartments = [...new Set(employees.map((e) => e?.department).filter(Boolean))];

  // --- Effects ---
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Sync global search
  useEffect(() => {
    if (typeof globalSearchQuery === 'string') {
      setSearchTerm(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  useEffect(() => {
    filterData();
    setCurrentPage(1);
  }, [employees, searchTerm, filterDepartment]);

  // --- Data Fetching ---
  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await getAllEmployees();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setEmployees(data);
      } else {
        console.error("API did not return an array", data);
        setEmployees([]);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Filtering Logic ---
  const filterData = () => {
    let result = [...employees];

    // 1. Search (Name, Email, Phone)
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter(
        (emp) =>
          (emp.name || "").toLowerCase().includes(query) ||
          (emp.email || "").toLowerCase().includes(query) ||
          String(emp.phone || "").includes(query) ||
          (emp.position || "").toLowerCase().includes(query)
      );
    }

    // 2. Department Filter
    if (filterDepartment !== "all") {
      result = result.filter((emp) => emp.department === filterDepartment);
    }

    setFilteredEmployees(result);
  };

  // --- Pagination Logic ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const handlePageChange = (page) => setCurrentPage(page);

  // --- Handlers ---
  const handleView = (emp) => {
    setSelectedEmployee(emp);
    setShowViewModal(true);
  };

  const handleEdit = (emp) => {
    setFormMode("edit");
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name || "",
      email: emp.email || "",
      phone: emp.phone || emp.phoneNumber || "", // Handle inconsistent naming
      department: emp.department || "",
      position: emp.position || "",
      shiftTime: emp.shiftTime || "",
      joinDate: emp.joinDate || "",
      monthlySalary: emp.monthlySalary || "",
      address: emp.address || "",
      password: "", // Reset password on edit
    });
    setShowFormModal(true);
  };

  const handleAddNew = () => {
    setFormMode("add");
    setSelectedEmployee(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      shiftTime: "",
      joinDate: "",
      monthlySalary: "",
      address: "",
      password: "",
    });
    setShowFormModal(true);
  };

  const handleDelete = (emp) => {
    setSelectedEmployee(emp);
    setShowDeleteModal(true);
  };

  const handleCloseModels = () => {
    setShowFormModal(false);
    setShowViewModal(false);
    setShowDeleteModal(false);
    setSelectedEmployee(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Map form data to backend schema expectations
      // Note: Validating Phone Number uniqueness is often required by backend
      if (!formData.name || !formData.phone) {
        alert("Name and Phone Number are required.");
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phone, // Backend usually expects phoneNumber
        department: formData.department,
        position: formData.position,
        shiftTime: formData.shiftTime,
        joinDate: formData.joinDate,
        monthlySalary: Number(formData.monthlySalary),
        address: formData.address,
        password: formData.password, // Pass password to API
      };

      if (formMode === "add") {
        payload.descriptor = [];
        await createEmployee(payload);
        alert("Employee created successfully!");
      } else {
        await updateEmployee(selectedEmployee._id, payload);
        alert("Employee updated successfully!");
      }
      fetchEmployees(); // Refresh list
      handleCloseModels();
    } catch (error) {
      console.error("Error saving employee:", error);
      alert("Failed to save employee. " + (error.response?.data?.msg || error.message));
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteEmployee(selectedEmployee._id);
      alert("Employee deleted successfully!");
      fetchEmployees();
      handleCloseModels();
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Failed to delete employee.");
    }
  };

  // Calculate tenure/experience helper
  const calculateTenure = (joinDate) => {
    if (!joinDate) return "N/A";
    const start = new Date(joinDate);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    if (diffMonths < 12) return `${diffMonths} Months`;
    const years = Math.floor(diffMonths / 12);
    return `${years} Years`;
  };

  if (isLoading && employees.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
          flexDirection: "column",
        }}
      >
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <FaSpinner
          style={{
            animation: "spin 1s linear infinite",
            fontSize: "40px",
            color: "#1e7b4e",
          }}
        />
        <p
          style={{
            color: "#64748b",
            fontSize: "14px",
            fontWeight: "600",
            fontFamily: "Inter, sans-serif",
            marginTop: "16px",
          }}
        >
          Loading Employees...
        </p>
      </div>
    );
  }

  return (
    <div className="employees-wrapper">
      <style>{`
          /* --- GLOBAL LAYOUT --- */
          .employees-wrapper { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              padding: 0 24px 24px 24px; 
              background: #f8fafc; 
              min-height: 100vh; 
          }
          
          .page-header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-end; 
              padding: 0 0 24px 0; 
              margin-bottom: 16px; 
          }
          .page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
          .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
  
          /* --- TOOLBAR --- */
          .toolbar { 
              background: white; 
              padding: 16px; 
              border-radius: 12px; 
              border: 1px solid #e2e8f0; 
              margin-bottom: 24px; 
              display: flex; 
              gap: 16px; 
              align-items: center; 
              flex-wrap: wrap; 
              box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          }
          .search-container { flex: 1; min-width: 250px; position: relative; }
          .search-input { width: 100%; padding: 10px 12px 10px 36px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; transition: 0.2s; box-sizing: border-box; }
          .search-input:focus { border-color: #1e7b4e; box-shadow: 0 0 0 3px rgba(30, 123, 78, 0.1); }
          .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
  
          .filter-select { 
              padding: 10px 32px 10px 12px; 
              border: 1px solid #e2e8f0; 
              border-radius: 8px; 
              font-size: 14px; 
              color: #475569; 
              background: white; 
              cursor: pointer; 
              outline: none; 
              appearance: none; 
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
              background-repeat: no-repeat; 
              background-position: right 8px center; 
              background-size: 16px; 
              min-width: 180px; 
          }
          .filter-select:focus { border-color: #1e7b4e; }
  
          /* --- VIEW TOGGLE --- */
          .view-toggle {
              display: flex;
              background: #f1f5f9;
              padding: 4px;
              border-radius: 8px;
              gap: 4px;
          }
          .toggle-btn {
              border: none;
              background: transparent;
              color: #94a3b8;
              padding: 8px;
              border-radius: 6px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
          }
          .toggle-btn.active {
              background: white;
              color: #1e7b4e;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .toggle-btn:hover:not(.active) { color: #64748b; }
  
          /* --- LAYOUTS --- */
          .employees-layout {
              animation: fadeIn 0.4s ease-out;
          }
          
          /* Grid View Styles */
          .employees-layout.grid-view { 
              display: grid; 
              grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); 
              gap: 24px; 
          }
  
          /* List View Styles */
          .employees-layout.list-view {
              display: flex;
              flex-direction: column;
              gap: 12px;
          }
  
          /* --- CARD DESIGN (SHARED) --- */
          .employee-card {
              background: white; 
              border: 1px solid #e2e8f0;
              border-radius: 12px; 
              padding: 0;
              transition: all 0.3s ease;
              display: flex; 
              flex-direction: column; /* Default for Grid */
              overflow: hidden;
          }
          .employee-card:hover { 
              transform: translateY(-2px); 
              box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); 
              border-color: #bdf59a; 
          }
  
          /* --- GRID VIEW CARD INTERNALS --- */
          .grid-view .card-header { 
              padding: 24px; 
              display: flex; 
              align-items: center; 
              gap: 16px; 
              border-bottom: 1px solid #f8fafc;
              background: transparent; 
          }
          .grid-view .card-body { padding: 20px 24px; background: #fcfcfc; flex: 1; }
          .grid-view .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .grid-view .card-footer { 
              padding: 16px 24px; 
              border-top: 1px solid #e2e8f0; 
              background: white;
              display: flex; gap: 12px;
          }
  
          /* --- LIST VIEW CARD INTERNALS (TRANSFORMATION) --- */
          .list-view .employee-card {
              flex-direction: row;
              align-items: center;
              padding: 8px 16px;
          }
          
          .list-view .card-header {
              display: flex;
              align-items: center;
              gap: 16px;
              width: 35%;
              min-width: 280px;
              padding: 8px 0;
              border: none;
              background: transparent; 
          }
  
          .list-view .card-body {
              flex: 1;
              background: transparent;
              padding: 0 24px;
              border-left: 1px solid #f1f5f9;
              border-right: 1px solid #f1f5f9;
          }
          
          .list-view .stats-row {
              display: flex;
              align-items: center;
              justify-content: space-around;
              gap: 24px;
          }
  
          .list-view .card-footer {
              padding: 0 0 0 24px;
              border: none;
              background: transparent;
              display: flex;
              gap: 8px;
              width: 160px;
          }
  
          /* Avatar & Text Styling */
          .avatar {
              width: 56px; height: 56px; border-radius: 50%;
              background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%); 
              color: #165d3c;
              display: flex; align-items: center; justify-content: center;
              font-size: 22px; font-weight: 700; border: 1px solid #bbf7d0;
              flex-shrink: 0;
          }
          .info { flex: 1; }
          .info h3 { margin: 0; font-size: 16px; color: #1e293b; font-weight: 700; }
          .info p { margin: 4px 0 0; font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 6px; }
  
          .stat-item { display: flex; flex-direction: column; gap: 4px; }
          .stat-label { 
              font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;
              display: flex; align-items: center; gap: 6px;
          }
          .stat-value { font-size: 14px; font-weight: 600; color: #334155; }
  
          /* --- BUTTONS --- */
          .btn-primary { 
              background: linear-gradient(135deg, #1e7b4ef8 0%, #bdf59a 100%);
              color: white; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; 
              cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; 
              box-shadow: 0 4px 15px rgba(30, 123, 78, 0.25); text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(30, 123, 78, 0.35); filter: brightness(1.05); }
  
          .btn-secondary { background: white; border: 1px solid #e2e8f0; color: #64748b; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
          .btn-secondary:hover { background: #f8fafc; color: #1a252f; border-color: #cbd5e1; }
  
          .action-btn { flex: 1; padding: 8px; border-radius: 6px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
          
          .btn-view { background: #dcfce7; color: #166534; } 
          .btn-view:hover { background: #bbf7d0; color: #145335; }
  
          .btn-edit { background: #f1f5f9; color: #475569; } 
          .btn-edit:hover { background: #e2e8f0; color: #1e293b; }

          .btn-delete { background: #fee2e2; color: #dc2626; border: none; } 
          .btn-delete:hover { background: #fecaca; }

          .btn-danger { 
            background: #fee2e2; color: #dc2626; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; 
            cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px; 
          }
          .btn-danger:hover { background: #fecaca; }
  
          /* --- PAGINATION --- */
          .pagination-container { 
              display: flex; justify-content: center; align-items: center; 
              gap: 8px; margin-top: 32px; padding-bottom: 24px;
          }
          .page-btn { 
              min-width: 40px; height: 40px; border-radius: 8px; border: 1px solid #e2e8f0; 
              background: white; color: #64748b; display: flex; align-items: center; justify-content: center; 
              cursor: pointer; transition: all 0.2s; 
          }
          .page-btn:hover:not(.active):not(:disabled) { background: #f0fdf4; color: #165d3c; border-color: #dcfce7; }
          .page-btn.active { 
              background: linear-gradient(135deg, #1e7b4ef8 0%, #bdf59a 100%); color: white; border: none; 
              box-shadow: 0 4px 10px rgba(30, 123, 78, 0.3); text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  
          /* --- MODALS --- */
          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; }
          .modal-content { background: white; border-radius: 16px; width: 500px; max-width: 90%; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; max-height: 90vh; }
          .modal-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
          .modal-title { font-size: 18px; font-weight: 700; color: #1a252f; display: flex; align-items: center; gap: 10px; }
          .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #94a3b8; transition: 0.2s; }
          .close-btn:hover { color: #ef4444; }
          .modal-body { padding: 32px; overflow-y: auto; }
          .modal-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
  
          .profile-img-lg { width: 80px; height: 80px; background: #dcfce7; color: #165d3c; border-radius: 50%; font-size: 32px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 4px solid #f0fdf4; }
          .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .detail-label { color: #64748b; display: flex; align-items: center; gap: 8px; font-weight: 500; }
          .detail-val { font-weight: 600; color: #1e293b; }

            /* Form Styles */
          .form-group { margin-bottom: 16px; }
          .form-label { display: block; font-size: 13px; font-weight: 600; color: #1a252f; margin-bottom: 6px; }
          .form-input { width: 100%; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: 0.2s;}
          .form-input:focus { border-color: #1e7b4e; outline: none; }
  
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          
          /* Mobile Fallback for List View */
          @media (max-width: 768px) {
              .list-view .employee-card { flex-direction: column; align-items: flex-start; }
              .list-view .card-header { width: 100%; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
              .list-view .card-body { border: none; padding: 16px 0; width: 100%; }
              .list-view .card-footer { width: 100%; padding: 0; }
          }
        `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Employees</h2>
          <p className="page-subtitle">Manage employee roster and details.</p>
        </div>
        <button className="btn-primary" onClick={handleAddNew}>
          <FaPlus /> Add Employee
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <select
          className="filter-select"
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
        >
          <option value="all">All Departments</option>
          {uniqueDepartments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <FaThLarge />
          </button>
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <FaList />
          </button>
        </div>
      </div>

      {/* Grid/List Layout */}
      <div className={`employees-layout ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
        {currentItems.length > 0 ? (
          currentItems.map((emp) => (
            <div key={emp?._id || emp?.id} className="employee-card">
              {/* Card Header */}
              <div className="card-header">
                <div className="avatar">{emp?.name?.charAt(0)}</div>
                <div className="info">
                  <h3>{emp?.name}</h3>
                  <p><FaMapMarkerAlt style={{ color: '#94a3b8' }} /> {emp?.department || 'Main Branch'}</p>
                </div>
              </div>

              {/* Card Body - Stats */}
              <div className="card-body">
                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-label"><FaBriefcase style={{ color: '#165d3c' }} /> Role</span>
                    <span className="stat-value">{emp?.position || 'Employee'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label"><FaClock style={{ color: '#f59e0b' }} /> Join Date</span>
                    <span className="stat-value">{emp?.joinDate ? new Date(emp.joinDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer - Actions */}
              <div className="card-footer">
                <button className="action-btn btn-view" onClick={() => handleView(emp)}>
                  {viewMode === 'grid' ? <><FaEye /> View</> : <FaEye />}
                </button>
                <button className="action-btn btn-edit" onClick={() => handleEdit(emp)}>
                  {viewMode === 'grid' ? <><FaEdit /> Edit</> : <FaEdit />}
                </button>
                <button className="action-btn btn-delete" onClick={() => handleDelete(emp)}>
                  {viewMode === 'grid' ? <><FaTrash /> Delete</> : <FaTrash />}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <FaUsers size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: '#1e293b' }}>No Employees Found</h3>
            <p style={{ fontSize: '14px', margin: 0 }}>Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button className="page-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><FaChevronLeft /></button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => handlePageChange(i + 1)}>{i + 1}</button>
          ))}
          <button className="page-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><FaChevronRight /></button>
        </div>
      )}

      {/* --- VIEW MODAL --- */}
      {showViewModal && selectedEmployee && (
        <div className="modal-overlay" onClick={handleCloseModels}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title"><FaUsers style={{ color: '#165d3c' }} /> Employee Details</div>
              <button className="close-btn" onClick={handleCloseModels}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <div className="profile-img-lg">{selectedEmployee.name?.charAt(0)}</div>

              <div className="detail-row">
                <span className="detail-label"><FaUsers /> Full Name</span>
                <span className="detail-val">{selectedEmployee.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label"><FaEnvelope /> Email</span>
                <span className="detail-val">{selectedEmployee.email || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label"><FaPhone /> Phone</span>
                <span className="detail-val">{selectedEmployee.phoneNumber || selectedEmployee.phone || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label"><FaMapMarkerAlt /> Department</span>
                <span className="detail-val">{selectedEmployee.department || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label"><FaBriefcase /> Position</span>
                <span className="detail-val">{selectedEmployee.position || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label"><FaDollarSign /> Monthly Salary</span>
                <span className="detail-val">${selectedEmployee.monthlySalary?.toLocaleString() || '0'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label"><FaClock /> Experience</span>
                <span className="detail-val">{calculateTenure(selectedEmployee.joinDate)}</span>
              </div>
              <div className="detail-row" style={{ borderBottom: 'none' }}>
                <span className="detail-label"><FaMapMarkerAlt /> Address</span>
                <span className="detail-val">{selectedEmployee.address || 'N/A'}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCloseModels}>Close</button>
              <button className="btn-primary" onClick={() => { handleCloseModels(); handleEdit(selectedEmployee); }}>Edit Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT FORM MODAL --- */}
      {showFormModal && (
        <div className="modal-overlay" onClick={handleCloseModels}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {formMode === "add" ? "Add New Employee" : "Edit Employee"}
              </span>
              <button className="close-btn" onClick={handleCloseModels}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-input"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <input
                      type="text"
                      className="form-input"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Monthly Salary</label>
                    <input
                      type="number"
                      className="form-input"
                      name="monthlySalary"
                      value={formData.monthlySalary}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Join Date</label>
                    <input
                      type="date"
                      className="form-input"
                      name="joinDate"
                      value={formData.joinDate ? formData.joinDate.split('T')[0] : ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="2"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password {formMode === 'edit' && '(Leave blank to keep current)'}</label>
                  <input
                    type="password"
                    className="form-input"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={formMode === 'add' ? "Enter password" : "Enter new password to reset"}
                  />
                </div>
                <div className="modal-footer" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                  <button type="button" className="btn-secondary" onClick={handleCloseModels}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {formMode === "add" ? "Create Employee" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && selectedEmployee && (
        <div className="modal-overlay" onClick={handleCloseModels}>
          <div className="modal-content" style={{ width: "400px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ width: "60px", height: "60px", background: "#fef2f2", color: "#dc2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "24px" }}>
                <FaTrash />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>Delete Employee?</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                Are you sure you want to delete <strong>{selectedEmployee.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: "center" }}>
              <button className="btn-secondary" onClick={handleCloseModels}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete}>
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
