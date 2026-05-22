import React, { useState, useEffect } from "react";
// Import store API service for backend communication
import { getAllStores, createStore, updateStore, deleteStore } from "../../services/storeAPI";
import {
    FaPlus,
    FaMapMarkerAlt,
    FaUsers,
    FaUserTie,
    FaEdit,
    FaEye,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaStore,
    FaSpinner,
    FaList,
    FaThLarge,
    FaSearch,
    FaTrash,
} from "react-icons/fa";

const StoreManagement = () => {
    // --- State ---
    const [stores, setStores] = useState([]);
    const [filteredStores, setFilteredStores] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // View & Filter State
    const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
    const [searchTerm, setSearchTerm] = useState("");

    // Filters
    const [filterLocation, setFilterLocation] = useState("all");
    const [filterName, setFilterName] = useState("all");

    // Modal State
    const [showForm, setShowForm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);
    const [formMode, setFormMode] = useState("add"); // 'add' or 'edit'

    const itemsPerPage = 6;

    // --- Effects ---
    useEffect(() => {
        fetchStores();
    }, []);

    useEffect(() => {
        filterData();
        setCurrentPage(1);
    }, [stores, searchTerm, filterLocation, filterName]);

    /**
     * Fetches stores from backend and maps to frontend structure
     */
    const fetchStores = async () => {
        setIsLoading(true);
        try {
            const data = await getAllStores();

            // Map backend fields to frontend structure
            const mappedStores = data.map(store => ({
                id: store._id,
                name: store.storeName,  // Backend: 'storeName' → Frontend: 'name'
                location: store.location,
                employees: store.employeesCount,  // Backend: 'employeesCount' → Frontend: 'employees'
                managers: store.managerCount,  // Backend: 'managerCount' → Frontend: 'managers'
                status: store.status?.toLowerCase() || 'active'  // Normalize to lowercase
            }));

            setStores(mappedStores);
        } catch (error) {
            console.error("Error fetching stores:", error);
            alert("❌ Failed to load stores. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Filtering Logic ---
    const filterData = () => {
        let result = [...stores];

        // Global Search (Text)
        if (searchTerm) {
            result = result.filter(
                (store) =>
                    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    store.location.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by Store Name
        if (filterName !== "all") {
            result = result.filter((store) => store.name === filterName);
        }

        // Filter by Location
        if (filterLocation !== "all") {
            result = result.filter((store) => store.location === filterLocation);
        }

        setFilteredStores(result);
    };

    // Derived Data for Dropdowns
    const uniqueLocations = [...new Set(stores.map((s) => s.location))];
    const uniqueNames = [...new Set(stores.map((s) => s.name))];

    // --- Pagination Logic ---
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredStores.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredStores.length / itemsPerPage);

    const handlePageChange = (page) => setCurrentPage(page);

    // --- Handlers ---
    const handleView = (store) => {
        setSelectedStore(store);
        setShowViewModal(true);
    };

    const handleEdit = (store) => {
        setFormMode("edit");
        setSelectedStore(store);
        setShowForm(true);
    };

    const handleAddNew = () => {
        setFormMode("add");
        setSelectedStore({
            name: "",
            location: "",
            employees: 0,
            managers: 0,
            status: "active"
        });
        setShowForm(true);
    };

    const handleDelete = (store) => {
        setSelectedStore(store);
        setShowDeleteModal(true);
    };

    const handleClose = () => {
        setShowForm(false);
        setShowViewModal(false);
        setShowDeleteModal(false);
        setSelectedStore(null);
    };

    /**
     * Handles save operation for both creating and updating stores
     */
    const handleSave = async () => {
        if (!selectedStore?.name || !selectedStore?.location) {
            alert("⚠️ Store name and location are required!");
            return;
        }

        setIsLoading(true);
        try {
            // Map frontend fields to backend schema
            const apiData = {
                storeName: selectedStore.name,
                location: selectedStore.location,
                employeesCount: Number(selectedStore.employees) || 0,
                managerCount: Number(selectedStore.managers) || 0,
                status: selectedStore.status.charAt(0).toUpperCase() + selectedStore.status.slice(1) // Capitalize first letter
            };

            if (formMode === "add") {
                const response = await createStore(apiData);
                if (response.msg || response.createStore) {
                    alert("✅ Store added successfully!");
                    fetchStores();
                }
            } else {
                const response = await updateStore(selectedStore.id, apiData);
                if (response.msg || response.updatedStore) {
                    alert("✅ Store updated successfully!");
                    fetchStores();
                }
            }

            handleClose();
        } catch (err) {
            console.error("Error saving store:", err);
            if (err.response?.data?.msg?.includes("already registered")) {
                alert("❌ A store with this name already exists.");
            } else {
                alert("❌ Failed to save store: " + (err.response?.data?.msg || err.message || "Server error"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Confirms and executes store deletion
     */
    const confirmDelete = async () => {
        try {
            const response = await deleteStore(selectedStore.id);
            if (response.msg) {
                alert(`✅ ${selectedStore.name} has been deleted successfully.`);
                fetchStores();
                handleClose();
            }
        } catch (err) {
            console.error("Error deleting store:", err);
            alert("❌ Failed to delete store: " + (err.response?.data?.msg || "Server error"));
        }
    };

    if (isLoading && stores.length === 0) {
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
                        color: "#165d3c",
                        marginBottom: "16px",
                    }}
                />
                <p
                    style={{
                        color: "#64748b",
                        fontSize: "14px",
                        fontWeight: "600",
                        fontFamily: "Inter, sans-serif",
                    }}
                >
                    Loading Stores...
                </p>
            </div>
        );
    }

    return (
        <div className="store-management-wrapper">
            <style>{`
        /* --- GLOBAL LAYOUT --- */
        .store-management-wrapper { font-family: 'Inter', sans-serif; padding: 24px; background: #f8fafc; min-height: 100vh; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
        .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
        
        /* --- TOOLBAR & FILTERS --- */
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
        }
        .search-container { flex: 1; min-width: 200px; position: relative; }
        .search-input { width: 100%; padding: 10px 12px 10px 36px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; }
        .search-input:focus { border-color: #165d3c; box-shadow: 0 0 0 2px rgba(22, 93, 60, 0.1); }
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
            min-width: 140px;
        }
        .filter-select:focus { border-color: #165d3c; }

        /* --- VIEW TOGGLE --- */
        .view-toggle { 
            display: flex; 
            background: #f1f5f9; 
            padding: 4px; 
            border-radius: 8px; 
            margin-left: auto;
        }
        .view-btn { 
            width: 36px;
            height: 36px;
            padding: 0;
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            color: #64748b; 
            transition: all 0.2s; 
            font-size: 16px;
        }
        .view-btn:hover { color: #1e293b; }
        .view-btn.active { background: white; color: #165d3c; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

        /* --- GRID VIEW --- */
        .stores-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; animation: fadeIn 0.4s ease-out; }

        /* --- LIST VIEW (TABLE) --- */
        .table-container { background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; animation: fadeIn 0.4s ease-out; }
        .store-table { width: 100%; border-collapse: collapse; }
        .store-table th { background: #f8fafc; padding: 16px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        .store-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 14px; vertical-align: middle; }
        .store-table tr:last-child td { border-bottom: none; }
        .store-table tr:hover { background: #f8fafc; }
        .table-actions { display: flex; gap: 8px; }

        /* --- BUTTONS & BADGES --- */
        .btn-primary { 
          background: linear-gradient(135deg, #1e7b4ef8 0%, #bdf59a 100%);
          color: white; padding: 12px 24px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(30, 123, 78, 0.3); text-shadow: 0 1px 2px rgba(0,0,0,0.1); 
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(30, 123, 78, 0.4); filter: brightness(1.05); }
        
        .btn-secondary { background: white; border: 1px solid #e2e8f0; color: #64748b; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn-secondary:hover { background: #f8fafc; color: #1a252f; border-color: #cbd5e1; }

        .btn-danger { background: #dc2626; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; }
        .btn-danger:hover { background: #b91c1c; }

        .btn-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; transition: 0.2s; }
        .btn-view { background: #dcfce7; color: #166534; } .btn-view:hover { background: #bbf7d0; }
        .btn-edit { background: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; } .btn-edit:hover { border-color: #166534; }
        .btn-delete { background: #fee2e2; color: #dc2626; } .btn-delete:hover { background: #fecaca; }

        .status-badge { padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; display: inline-block; }
        .status-badge.active { background: #dcfce7; color: #165d3c; border: 1px solid #bbf7d0; }
        .status-badge.closed { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
        .status-badge.maintenance { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }

        /* --- CARDS --- */
        .store-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); border: 1px solid #e2e8f0; transition: all 0.3s ease; }
        .store-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1); border-color: #bdf59a; }
        .store-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; }
        .store-name { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .store-location { font-size: 14px; color: #64748b; display: flex; align-items: center; gap: 6px; }
        .store-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; padding-top: 20px; border-top: 1px solid #f0f4f0; }
        .stat-item { display: flex; flex-direction: column; gap: 4px; }
        .stat-val { font-size: 18px; font-weight: 700; color: #1e293b; }
        .stat-lbl { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px; font-weight: 500; }
        .card-actions { display: flex; gap: 10px; margin-top: 20px; }
        .action-btn { flex: 1; padding: 10px; border-radius: 8px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }

        /* --- PAGINATION --- */
        .pagination-container { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px; padding-bottom: 20px;}
        .page-btn { min-width: 40px; height: 40px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .page-btn:hover:not(.active):not(:disabled) { background: #f0fdf4; color: #165d3c; border-color: #dcfce7; }
        .page-btn.active { background: linear-gradient(135deg, #1e7b4ef8 0%, #bdf59a 100%); color: white; border: none; box-shadow: 0 4px 10px rgba(30, 123, 78, 0.3); text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; }
        .modal-content { background: white; border-radius: 20px; width: 550px; max-width: 90%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        .modal-header { padding: 24px; border-bottom: 1px solid #f0f4f0; display: flex; justify-content: space-between; align-items: center; }
        .modal-title { font-size: 20px; font-weight: 700; color: #1a252f; }
        .close-btn { background: none; border: none; cursor: pointer; font-size: 18px; color: #94a3b8; }
        .modal-body { padding: 32px; overflow-y: auto; }
        .modal-footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 20px 20px; display: flex; justify-content: flex-end; gap: 12px; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
        .form-input { width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; box-sizing: border-box; }
        .form-input:focus { border-color: #165d3c; outline: none; box-shadow: 0 0 0 2px rgba(22, 93, 60, 0.1); }
      `}</style>

            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">Store Management</h2>
                    <p className="page-subtitle">
                        Manage store locations, details, and status
                    </p>
                </div>
                <button className="btn-primary" onClick={handleAddNew}>
                    <FaPlus /> Add New Store
                </button>
            </div>

            {/* Toolbar: Search, Filters, View Toggle */}
            <div className="toolbar">
                <div className="search-container">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Store Name Filter */}
                <select
                    className="filter-select"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                >
                    <option value="all">All Stores</option>
                    {uniqueNames.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>

                {/* Location Filter */}
                <select
                    className="filter-select"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                >
                    <option value="all">All Locations</option>
                    {uniqueLocations.map((loc) => (
                        <option key={loc} value={loc}>
                            {loc}
                        </option>
                    ))}
                </select>

                {/* View Toggle */}
                <div className="view-toggle">
                    <button
                        className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                        onClick={() => setViewMode("grid")}
                        title="Grid View"
                    >
                        <FaThLarge />
                    </button>
                    <button
                        className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                        onClick={() => setViewMode("list")}
                        title="List View"
                    >
                        <FaList />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {currentItems.length > 0 ? (
                <>
                    {viewMode === "grid" ? (
                        <div className="stores-grid">
                            {currentItems.map((store) => (
                                <div key={store.id} className="store-card">
                                    <div className="store-header">
                                        <div>
                                            <div className="store-name">{store.name}</div>
                                            <div className="store-location">
                                                <FaMapMarkerAlt style={{ color: "#64748b" }} />{" "}
                                                {store.location}
                                            </div>
                                        </div>
                                        <span className={`status-badge ${store.status}`}>
                                            {store.status}
                                        </span>
                                    </div>
                                    <div className="store-stats">
                                        <div className="stat-item">
                                            <span className="stat-lbl">
                                                <FaUsers style={{ color: "#64748b" }} /> Employees
                                            </span>
                                            <span className="stat-val">{store.employees}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-lbl">
                                                <FaUserTie style={{ color: "#64748b" }} /> Managers
                                            </span>
                                            <span className="stat-val">{store.managers}</span>
                                        </div>
                                    </div>
                                    <div className="card-actions">
                                        <button
                                            className="action-btn btn-view"
                                            onClick={() => handleView(store)}
                                        >
                                            <FaEye /> View
                                        </button>
                                        <button
                                            className="action-btn btn-edit"
                                            onClick={() => handleEdit(store)}
                                        >
                                            <FaEdit /> Edit
                                        </button>
                                        <button
                                            className="action-btn btn-delete"
                                            onClick={() => handleDelete(store)}
                                        >
                                            <FaTrash /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="store-table">
                                <thead>
                                    <tr>
                                        <th>Store Name</th>
                                        <th>Location</th>
                                        <th>Status</th>
                                        <th>Employees</th>
                                        <th>Managers</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((store) => (
                                        <tr key={store.id}>
                                            <td style={{ fontWeight: "600" }}>{store.name}</td>
                                            <td>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                    }}
                                                >
                                                    <FaMapMarkerAlt style={{ color: "#94a3b8" }} />{" "}
                                                    {store.location}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${store.status}`}>
                                                    {store.status}
                                                </span>
                                            </td>
                                            <td>{store.employees}</td>
                                            <td>{store.managers}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button
                                                        className="btn-icon btn-view"
                                                        onClick={() => handleView(store)}
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-edit"
                                                        onClick={() => handleEdit(store)}
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => handleDelete(store)}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

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
                </>
            ) : (
                <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
                    <p>No stores found matching your filters.</p>
                </div>
            )}

            {/* --- VIEW MODAL --- */}
            {showViewModal && selectedStore && (
                <div className="modal-overlay" onClick={handleClose}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <FaStore style={{ color: "#165d3c", marginRight: "10px" }} />
                                Store Details
                            </div>
                            <button className="close-btn" onClick={handleClose}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <span className="form-label" style={{ color: "#64748b" }}>
                                    Store Name
                                </span>
                                <div
                                    style={{
                                        fontSize: "16px",
                                        fontWeight: "600",
                                        color: "#1e293b",
                                    }}
                                >
                                    {selectedStore.name}
                                </div>
                            </div>

                            <div className="form-group">
                                <span className="form-label" style={{ color: "#64748b" }}>
                                    Location
                                </span>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        fontSize: "16px",
                                        color: "#1e293b",
                                    }}
                                >
                                    <FaMapMarkerAlt style={{ color: "#165d3c" }} />
                                    {selectedStore.location}
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "20px",
                                    marginTop: "20px",
                                    paddingTop: "20px",
                                    borderTop: "1px solid #f1f5f9",
                                }}
                            >
                                <div>
                                    <span className="form-label" style={{ color: "#64748b" }}>
                                        Employees
                                    </span>
                                    <div style={{ fontSize: "18px", fontWeight: "700" }}>
                                        {selectedStore.employees}
                                    </div>
                                </div>
                                <div>
                                    <span className="form-label" style={{ color: "#64748b" }}>
                                        Managers
                                    </span>
                                    <div style={{ fontSize: "18px", fontWeight: "700" }}>
                                        {selectedStore.managers}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: "24px" }}>
                                <span className="form-label" style={{ color: "#64748b" }}>
                                    Current Status
                                </span>
                                <div style={{ marginTop: "8px" }}>
                                    <span className={`status-badge ${selectedStore.status}`}>
                                        {selectedStore.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={handleClose}>
                                Close
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    handleClose();
                                    handleEdit(selectedStore);
                                }}
                            >
                                Edit This Store
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ADD / EDIT FORM MODAL --- */}
            {showForm && (
                <div className="modal-overlay" onClick={handleClose}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">
                                {formMode === "add" ? "Add New Store" : "Edit Store"}
                            </span>
                            <button className="close-btn" onClick={handleClose}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Store Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Downtown Branch"
                                    value={selectedStore?.name || ""}
                                    onChange={(e) =>
                                        setSelectedStore((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <div style={{ position: "relative" }}>
                                    <FaMapMarkerAlt
                                        style={{
                                            position: "absolute",
                                            top: "14px",
                                            left: "12px",
                                            color: "#94a3b8",
                                            zIndex: 1,
                                        }}
                                    />
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ paddingLeft: "36px" }}
                                        placeholder="e.g. New York, NY"
                                        value={selectedStore?.location || ""}
                                        onChange={(e) =>
                                            setSelectedStore((prev) => ({
                                                ...prev,
                                                location: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="form-group">
                                    <label className="form-label">Total Employees</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={selectedStore?.employees || ""}
                                        onChange={(e) =>
                                            setSelectedStore((prev) => ({
                                                ...prev,
                                                employees: Number(e.target.value),
                                            }))
                                        }
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Total Managers</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={selectedStore?.managers || ""}
                                        onChange={(e) =>
                                            setSelectedStore((prev) => ({
                                                ...prev,
                                                managers: Number(e.target.value),
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    className="form-input"
                                    value={selectedStore?.status || "active"}
                                    onChange={(e) =>
                                        setSelectedStore((prev) => ({
                                            ...prev,
                                            status: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="active">Active</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={handleClose}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSave}
                            >
                                {formMode === "add" ? "Create Store" : "Update Store"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DELETE CONFIRMATION MODAL --- */}
            {showDeleteModal && selectedStore && (
                <div className="modal-overlay" onClick={handleClose}>
                    <div className="modal-content" style={{ width: "400px" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-body" style={{ textAlign: "center", padding: "40px 24px" }}>
                            <div style={{ width: "60px", height: "60px", background: "#fef2f2", color: "#dc2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "24px" }}>
                                <FaTrash />
                            </div>
                            <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>Delete Store?</h3>
                            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                                Are you sure you want to delete <strong>{selectedStore.name}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer" style={{ justifyContent: "center" }}>
                            <button className="btn-secondary" onClick={handleClose}>Cancel</button>
                            <button className="btn-danger" onClick={confirmDelete}>
                                <FaTrash /> Delete Store
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoreManagement;