import React, { useState, useEffect } from "react";
import {
  getAllManagers,
  createManager,
  updateManager,
  deleteManager,
} from "../../services/managerAPI";
import { getAllEmployees } from "../../services/employeeAPI";
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
  FaList,
  FaThLarge,
  FaPhone,
  FaDollarSign,
  FaTrash,
} from "react-icons/fa";
import EmployeeSelector from "../../common/EmployeeSelector";

const Managers = ({ globalSearchQuery }) => {
  // --- State ---
  const [managers, setManagers] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]); // All available employees for assignment
  const [filteredManagers, setFilteredManagers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === "list" ? 8 : 6;

  // Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedManager, setSelectedManager] = useState(null);
  const [formMode, setFormMode] = useState("add"); // 'add' or 'edit'

  // Form Data
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    branch: "",
    annualSalary: "",
    joinDate: "",
    employees: [], // Added for employee assignment
  });

  // --- Derived Data ---
  const uniqueStores = [...new Set(managers.map((m) => m?.store || m?.branch).filter(Boolean))];

  // --- Effects ---
  useEffect(() => {
    fetchManagers();
    fetchAllEmployees(); // Fetch employees for the assignment dropdown
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
  }, [managers, searchTerm, filterStore]);

  // --- Data Fetching ---
  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      const data = await getAllManagers();
      if (Array.isArray(data)) {
        // Map backend data to frontend structure if needed
        // Backend: fullName, email, phoneNumber, branch, annualSalary, joinDate
        const mappedData = data.map((m) => ({
          ...m,
          id: m._id, // Ensure ID is accessible
          name: m.fullName, // Frontend uses 'name'
          store: m.branch, // Frontend uses 'store'
          salary: m.annualSalary,
          phone: m.phoneNumber,
          // Calculate experience or mock team size if not in DB
          team: 0,
          experience: calculateExperience(m.joinDate),
          employees: m.employees || []
        }));
        setManagers(mappedData);
      } else {
        console.error("API did not return an array", data);
        setManagers([]);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const data = await getAllEmployees();
      if (Array.isArray(data)) {
        setAllEmployees(data);
      }
    } catch (error) {
      console.error("Error fetching all employees:", error);
    }
  };

  const calculateExperience = (joinDate) => {
    if (!joinDate) return "0 years";
    const start = new Date(joinDate);
    if (isNaN(start.getTime())) return "N/A";
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    return diffYears === 1 ? "1 year" : `${diffYears} years`;
  };

  // --- Logic ---
  const filterData = () => {
    let result = [...managers];

    // 1. Search Filter (Name)
    if (searchTerm) {
      result = result.filter((manager) =>
        (manager.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Store Location Filter
    if (filterStore !== "all") {
      result = result.filter((manager) => manager.store === filterStore);
    }

    setFilteredManagers(result);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentManagers = filteredManagers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredManagers.length / itemsPerPage);

  // --- Handlers ---
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const handleView = (manager) => {
    setSelectedManager(manager);
    setShowViewModal(true);
  };

  const handleEdit = (manager) => {
    setFormMode("edit");
    setSelectedManager(manager);
    setFormData({
      fullName: manager.fullName || manager.name,
      email: manager.email,
      password: "", // Don't show hashed password, only used if reset
      phoneNumber: manager.phoneNumber || manager.phone,
      branch: manager.branch || manager.store,
      annualSalary: manager.annualSalary || manager.salary,
      joinDate: manager.joinDate ? manager.joinDate.split('T')[0] : "",
      employees: manager.employees ? manager.employees.map(emp => emp._id || emp) : [],
    });
    setShowFormModal(true);
  };

  const handleAddNew = () => {
    setFormMode("add");
    setSelectedManager(null);
    setFormData({
      fullName: "",
      email: "",
      password: "",
      phoneNumber: "",
      branch: "",
      annualSalary: "",
      joinDate: new Date().toISOString().split('T')[0],
      employees: [],
    });
    setShowFormModal(true);
  };

  const handleDelete = (manager) => {
    setSelectedManager(manager);
    setShowDeleteModal(true);
  };

  const handleCloseModels = () => {
    setShowViewModal(false);
    setShowFormModal(false);
    setShowDeleteModal(false);
    setTimeout(() => setSelectedManager(null), 200);
  };

  const handleInputChange = (e) => {
    const { name, value, type, selectedOptions } = e.target;
    if (type === 'select-multiple') {
      const values = Array.from(selectedOptions, option => option.value);
      setFormData(prev => ({ ...prev, [name]: values }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (!formData.fullName || !formData.email || (formMode === "add" && !formData.password)) {
        alert("Name, Email, and Password are required");
        return;
      }

      if (formMode === "add") {
        await createManager(formData);
        alert("Manager added successfully!");
      } else {
        await updateManager(selectedManager._id, formData);
        alert("Manager updated successfully!");
      }
      fetchManagers();
      handleCloseModels();
    } catch (error) {
      console.error("Error saving manager:", error);
      alert("Failed to save manager. " + (error.response?.data?.msg || error.message));
    }
  };

  const confirmDelete = async () => {
    if (!selectedManager) return;
    try {
      await deleteManager(selectedManager._id);
      alert("Manager deleted successfully!");
      fetchManagers();
      handleCloseModels();
    } catch (error) {
      console.error("Error deleting manager:", error);
      alert("Failed to delete manager.");
    }
  };

  if (isLoading && managers.length === 0) {
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
          Loading Managers...
        </p>
      </div>
    );
  }

  return (
    <div className="managers-wrapper">
      <style>{`
        /* --- GLOBAL LAYOUT --- */
        .managers-wrapper { 
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
        .managers-layout {
            animation: fadeIn 0.4s ease-out;
        }
        
        /* Grid View Styles */
        .managers-layout.grid-view { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); 
            gap: 24px; 
        }

        /* List View Styles */
        .managers-layout.list-view {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        /* --- CARD DESIGN (SHARED) --- */
        .manager-card {
            background: white; 
            border: 1px solid #e2e8f0;
            border-radius: 12px; 
            padding: 0;
            transition: all 0.3s ease;
            display: flex; 
            flex-direction: column; /* Default for Grid */
            overflow: hidden;
        }
        .manager-card:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); 
            border-color: #bdf59a; 
        }

        /* --- GRID VIEW CARD INTERNALS --- */
        .grid-view .card-header { 
            padding: 24px; /* Optimized padding */
            display: flex; 
            align-items: center; 
            gap: 16px; 
            border-bottom: 1px solid #f8fafc;
            background: transparent; /* Explicitly removed background color */
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
        .list-view .manager-card {
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
            background: transparent; /* Explicitly removed background color */
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
        .modal-content { 
            background: white; 
            border-radius: 20px; 
            width: 600px; 
            max-width: 95%; 
            max-height: 90vh; /* Fixed height */
            display: flex;
            flex-direction: column;
            overflow: hidden; 
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); 
        }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .modal-title { font-size: 18px; font-weight: 700; color: #1a252f; display: flex; align-items: center; gap: 10px; }
        .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #94a3b8; transition: 0.2s; }
        .close-btn:hover { color: #ef4444; }
        .modal-body { padding: 24px 32px; overflow-y: auto; flex: 1; }
        .modal-footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0; }

        /* Form Layout Utilities */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; margin-bottom: 24px; }
        .form-group-full { grid-column: span 2; }
        .form-section-title { 
            font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; 
            letter-spacing: 0.1em; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;
        }

        .profile-img-lg { width: 80px; height: 80px; background: #dcfce7; color: #165d3c; border-radius: 50%; font-size: 32px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 4px solid #f0fdf4; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .detail-label { color: #64748b; display: flex; align-items: center; gap: 8px; font-weight: 500; }
        .detail-val { font-weight: 600; color: #1e293b; }
        
        /* Form Styles */
        .input-group { margin-bottom: 16px; }
        .label { display: block; margin-bottom: 8px; font-weight: 600; color: #1e293b; font-size: 14px; }
        .input { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
        .input:focus { outline: none; border-color: #1e7b4e; box-shadow: 0 0 0 2px rgba(30, 123, 78, 0.1); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Mobile Fallback for List View */
        @media (max-width: 768px) {
            .list-view .manager-card { flex-direction: column; align-items: flex-start; }
            .list-view .card-header { width: 100%; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
            .list-view .card-body { border: none; padding: 16px 0; width: 100%; }
            .list-view .card-footer { width: 100%; padding: 0; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Store Managers</h2>
          <p className="page-subtitle">Overview of store leadership and performance.</p>
        </div>
        <button className="btn-primary" onClick={handleAddNew}>
          <FaPlus /> Add Manager
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Store Location Filter */}
        <select
          className="filter-select"
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
        >
          <option value="all">All Locations</option>
          {uniqueStores.map((store) => (
            <option key={store} value={store}>
              {store}
            </option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <FaThLarge />
          </button>
          <button
            className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List View"
          >
            <FaList />
          </button>
        </div>
      </div>

      {/* Grid/List Layout */}
      <div
        className={`managers-layout ${viewMode === "grid" ? "grid-view" : "list-view"
          }`}
      >
        {currentManagers.length > 0 ? (
          currentManagers.map((manager) => (
            <div key={manager.id || manager._id} className="manager-card">
              {/* Card Header */}
              <div className="card-header">
                <div className="avatar">{manager.name?.charAt(0)}</div>
                <div className="info">
                  <h3>{manager.name}</h3>
                  <p>
                    <FaMapMarkerAlt style={{ color: "#94a3b8" }} />{" "}
                    {manager.store || "Headquarters"}
                  </p>
                </div>
              </div>

              {/* Card Body - Stats */}
              <div className="card-body">
                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-label">
                      <FaUsers style={{ color: "#165d3c" }} /> Team
                    </span>
                    <span className="stat-value">{manager.employees?.length || 0} Members</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">
                      <FaClock style={{ color: "#f59e0b" }} /> Tenure
                    </span>
                    <span className="stat-value">{manager.experience}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer - Actions */}
              <div className="card-footer">
                <button
                  className="action-btn btn-view"
                  onClick={() => handleView(manager)}
                >
                  {viewMode === "grid" ? (
                    <>
                      <FaEye /> View Profile
                    </>
                  ) : (
                    <FaEye />
                  )}
                </button>
                <button
                  className="action-btn btn-edit"
                  onClick={() => handleEdit(manager)}
                >
                  {viewMode === "grid" ? (
                    <>
                      <FaEdit /> Edit
                    </>
                  ) : (
                    <FaEdit />
                  )}
                </button>
                <button
                  className="action-btn btn-delete"
                  onClick={() => handleDelete(manager)}
                >
                  {viewMode === "grid" ? (
                    <>
                      <FaTrash /> Delete
                    </>
                  ) : (
                    <FaTrash />
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "60px",
              color: "#64748b",
            }}
          >
            <FaUserTie
              size={48}
              style={{ marginBottom: "16px", opacity: 0.2 }}
            />
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "600",
                margin: "0 0 8px 0",
                color: "#1e293b",
              }}
            >
              No Managers Found
            </h3>
            <p style={{ fontSize: "14px", margin: 0 }}>
              Try adjusting your search or filters.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            className="page-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FaChevronLeft />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`page-btn ${currentPage === i + 1 ? "active" : ""}`}
              onClick={() => handlePageChange(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="page-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <FaChevronRight />
          </button>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedManager && (
        <div className="modal-overlay" onClick={handleCloseModels}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', borderRadius: '28px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: '#f0fdf4', color: '#16a34a', borderRadius: '10px', display: 'flex' }}>
                  <FaEye size={18} />
                </div>
                <span style={{ fontSize: '18px', fontWeight: '800' }}>Manager Profile</span>
              </div>
              <button className="close-btn" onClick={handleCloseModels} style={{ background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaTimes />
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
                  {selectedManager.name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>{selectedManager.name}</h2>
                    <div style={{ padding: '4px 10px', background: 'white', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#64748b', border: '1px solid #e2e8f0' }}>
                      ID: {selectedManager._id?.slice(-6).toUpperCase() || 'N/A'}
                    </div>
                  </div>
                  <div style={{ color: '#16a34a', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaMapMarkerAlt size={14} /> {selectedManager.store || selectedManager.branch || 'Headquarters'} Manager
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: (selectedManager.overallScore || 0) >= 4 ? '#16a34a' : (selectedManager.overallScore || 0) >= 3 ? '#eab308' : '#ef4444' }}>
                    {(selectedManager.overallScore || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>Rating</div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="form-section-title">Professional Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#94a3b8' }}><FaEnvelope size={16} /></div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Email Address</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{selectedManager.email}</div>
                  </div>
                </div>
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#94a3b8' }}><FaPhone size={16} /></div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Phone Number</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{selectedManager.phone || selectedManager.phoneNumber || 'N/A'}</div>
                  </div>
                </div>
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#94a3b8' }}><FaClock size={16} /></div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Experience</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{selectedManager.experience || '< 1 Year'}</div>
                  </div>
                </div>
                <div style={{ background: 'white', padding: '14px 16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ color: '#94a3b8' }}><FaDollarSign size={16} /></div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Annual Salary</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>${(selectedManager.salary || selectedManager.annualSalary || 0).toLocaleString()}</div>
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
                            {emp.name?.charAt(0) || 'E'}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>{emp.name || emp.fullName}</span>
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

              {/* Performance Metrics Placeholder (if scores exist in admin dash) */}
              {selectedManager.scores && (
                <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ padding: '6px', background: 'white', color: '#9333ea', borderRadius: '8px', border: '1px solid #e2e8f0' }}><FaUsers size={14} /></div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Performance</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                    {Object.entries(selectedManager.scores).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                        <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>{key}</span>
                        <div style={{ 
                          width: '28px', height: '28px', 
                          background: 'white', 
                          color: val >= 4 ? '#16a34a' : val >= 3 ? '#eab308' : '#ef4444', 
                          borderRadius: '8px', border: '1px solid #e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: '800'
                        }}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1, height: '48px', borderRadius: '14px', fontWeight: '700' }} onClick={handleCloseModels}>
                Close
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, height: '48px', borderRadius: '14px', fontWeight: '700' }}
                onClick={() => {
                  handleCloseModels();
                  handleEdit(selectedManager);
                }}
              >
                <FaEdit /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={handleCloseModels}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {formMode === "add" ? (
                  <>
                    <FaPlus style={{ color: "#165d3c" }} /> Add New Manager
                  </>
                ) : (
                  <>
                    <FaEdit style={{ color: "#165d3c" }} /> Edit Manager
                  </>
                )}
              </div>
              <button className="close-btn" onClick={handleCloseModels}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="form-section-title">Personal Information</div>
                <div className="form-grid">
                  <div className="form-group-full">
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      className="input"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="input-group">
                    <label className="label">Email Address</label>
                    <input
                      type="email"
                      className="input"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="input-group">
                    <label className="label">Phone Number</label>
                    <input
                      type="text"
                      className="input"
                      name="phoneNumber"
                      required
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>

                <div className="form-section-title">Employment Details</div>
                <div className="form-grid">
                  <div className="input-group">
                    <label className="label">Branch / Store</label>
                    <select
                      className="input"
                      name="branch"
                      required
                      value={formData.branch}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Branch...</option>
                      {uniqueStores.map(store => (
                        <option key={store} value={store}>{store}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="label">Join Date</label>
                    <input
                      type="date"
                      className="input"
                      name="joinDate"
                      required
                      value={formData.joinDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="input-group">
                    <label className="label">Annual Salary ($)</label>
                    <input
                      type="number"
                      className="input"
                      name="annualSalary"
                      required
                      value={formData.annualSalary}
                      onChange={handleInputChange}
                      placeholder="e.g. 75000"
                    />
                  </div>
                  <div className="input-group">
                    <label className="label">Password {formMode === 'edit' && '(Optional)'}</label>
                    <input
                      type="password"
                      className="input"
                      name="password"
                      required={formMode === 'add'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={formMode === 'edit' ? "••••••••" : "Min 6 characters"}
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

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModels} style={{ border: 'none', background: 'transparent' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ minWidth: '140px' }} disabled={isLoading}>
                  {isLoading ? <FaSpinner className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : (formMode === 'edit' ? "Save Changes" : "Create Manager")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedManager && (
        <div className="modal-overlay" onClick={handleCloseModels}>
          <div className="modal-content" style={{ width: "400px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ width: "60px", height: "60px", background: "#fef2f2", color: "#dc2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "24px" }}>
                <FaTrash />
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>Delete Manager?</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                Are you sure you want to delete <strong>{selectedManager.name}</strong>? This action cannot be undone.
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

export default Managers;