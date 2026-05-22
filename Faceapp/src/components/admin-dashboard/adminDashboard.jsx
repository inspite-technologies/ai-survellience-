import React, { useState, useEffect } from "react";
// import { generateMockData } from "./utils/MockData.js"; // Mock data removed
import { getAllSalaryRequests } from "../services/salaryAPI";
import { getAllLeaves } from "../services/leaveAPI";
import { getAllEmployees } from "../services/employeeAPI"; // #r Added
import { getAllStores } from "../services/storeAPI";       // #r Added
import { getAllManagers } from "../services/managerService"; // #r Added
import "./adminDashboard.css";

// 1. Import FontAwesome Icons from react-icons/fa
import {
  FaTachometerAlt,
  FaStore,
  FaVideo,
  FaUsers,
  FaUserTie,
  FaMoneyCheckAlt,
  FaFileAlt,
  FaCog,
  FaShoppingCart,
  FaBars,
  FaSearch,
  FaQuestionCircle,
  FaBell,
  FaCalendarAlt,
  FaSignOutAlt,
  FaUserPlus,  
} from "react-icons/fa";

// Import Components
import DashboardHome from "./pages/DashboardHome.jsx";
import StoreManagement from "./pages/StoreManagement";
import CameraManagement from "./pages/CameraManagement";
import AllEmployees from "./pages/Employees";
import AllManagers from "./pages/Managers";
import SalaryApprovals from "./pages/SalaryApprovals";
import LeaveManagement from "./pages/LeaveManagement.jsx";
import Settings from "./pages/Settings";
import SignUp from "../signup"; // Import your existing SignUp component

const AdminDashboard = ({ onLogout }) => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // #r Real Data State
  const [data, setData] = useState({
    employees: [],
    stores: [],
    managers: []
  }); // Initialize with empty structure compatible with DashboardHome
  const [pendingSalaryCount, setPendingSalaryCount] = useState(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0); // #r Added state for leaves badge
  const [notificationCount, setNotificationCount] = useState(0); // #r Added state for top bar notifications
  const [currentUser, setCurrentUser] = useState({ name: 'Admin User', role: 'Administrator' }); // #r Added user state

  // #r Manual JWT Decode (Safe fallback)
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

  // #r Real-time polling for salary requests
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [salaryReqs, leaveReqs, empList, storeList, mgrList] = await Promise.all([
          getAllSalaryRequests(),
          getAllLeaves(),
          getAllEmployees(),
          getAllStores(),
          getAllManagers()
        ]);

        const pSalary = Array.isArray(salaryReqs.data) ? salaryReqs.data.filter(r => r.status === 'pending').length : 0;
        const pLeaves = Array.isArray(leaveReqs) ? leaveReqs.filter(l => l.status === 'Pending' || l.status === 'pending').length : 0;

        setPendingSalaryCount(pSalary);
        setPendingLeavesCount(pLeaves);
        setNotificationCount(pSalary + pLeaves);

        // #r Process Dashboard Data
        const realEmployees = Array.isArray(empList) ? empList : [];
        const realManagers = mgrList.data ? mgrList.data : (Array.isArray(mgrList) ? mgrList : []); // Manager API might return { data: [] }
        const realStores = Array.isArray(storeList) ? storeList : [];

        // Map stores to include counts for the chart
        const processedStores = realStores.map(store => {
          const storeName = store.storeName || store.branchName || 'Unknown';
          const storeEmps = realEmployees.filter(e =>
            (e.storeName === storeName) || (e.branchName === storeName) || (e.department === storeName)
          ).length;
          // Managers might be linked by branch or just general count if not linked (assuming specific linking logic isn't strictly defined yet, using direct matching if possible)
          const storeMgrs = realManagers.filter(m => m.assignedBranch === storeName).length;

          return {
            name: storeName,
            employees: storeEmps,
            managers: storeMgrs
          };
        });

        setData({
          employees: realEmployees,
          stores: processedStores,
          managers: realManagers
        });

      } catch (err) {
        console.error("Error fetching admin dashboard counts:", err);
      }
    };

    // User Profile Logic
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      if (decoded) {
        // Assuming decoded token has 'name' and 'role', or default to 'Admin'
        setCurrentUser({
          name: decoded.name || 'Admin',
          role: decoded.role || 'Administrator',
          avatar: decoded.name ? decoded.name.charAt(0).toUpperCase() : 'A'
        });
      }
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  // Main Content Renderer
  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardHome data={data} />;
      case "stores":
        return <StoreManagement data={data} />;
      case "cameras":
        return <CameraManagement data={data} />;
      case "employees":
        return <AllEmployees data={data} />;
      case "managers":
        return <AllManagers data={data} />;
      case "approvals":
        return <SalaryApprovals data={data} />;
      case "Leaves":
        return <LeaveManagement data={data} />;
      case "Hr Register":
        return <SignUp setView={setCurrentPage} />; // Show your existing SignUp component
      case "settings":
        return <Settings data={data} />;
      default:
        return <DashboardHome data={data} />;
    }
  };

  // 2. Updated navItems with Icon Components
  const navItems = [
    { id: "dashboard", icon: <FaTachometerAlt />, label: "Dashboard" },
    { id: "stores", icon: <FaStore />, label: "Store Management" },
    { id: "cameras", icon: <FaVideo />, label: "Camera Feeds" },
    { id: "employees", icon: <FaUsers />, label: "All Employees" },
    { id: "managers", icon: <FaUserTie />, label: "Managers" },
    { id: "Leaves", icon: <FaCalendarAlt />, label: "Leaves", badge: pendingLeavesCount }, // #r Added badge
    { id: "Hr Register", icon: <FaUserPlus />, label: "Hr Register" },
    {
      id: "approvals",
      icon: <FaMoneyCheckAlt />,
      label: "Salary Approvals",
      badge: pendingSalaryCount, // #r Using real-time count
    },
    // { id: 'reports', icon: <FaFileAlt />, label: 'System Reports' },
    { id: "settings", icon: <FaCog />, label: "Settings" },
  ];

  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      const matches = navItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (pageId) => {
    setCurrentPage(pageId);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSuggestionClick(suggestions[0].id);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div
        className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${window.innerWidth <= 1024 && !sidebarCollapsed ? "visible" : ""
          }`}
      >
        <div className="sidebar-header">
          {/* Logo Icon Replaced */}
          <div className="logo-icon">
            <FaShoppingCart />
          </div>
          <div className="app-title">Admin Portal</div>
        </div>

        <div className="nav-section">
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${currentPage === item.id ? "active" : ""}`}
              onClick={() => {
                setCurrentPage(item.id);
                if (window.innerWidth <= 1024) setSidebarCollapsed(true);
              }}
            >
              {/* Icon Rendered Here */}
              <span className="icon-wrapper">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </div>
          ))}
        </div>

        <div className="user-profile">
          <div className="user-avatar">{currentUser.avatar || 'A'}</div>
          <div className="user-info">
            <span className="user-name">{currentUser.name}</span>
            <span className="user-role">{currentUser.role}</span>
          </div>
          <button
            onClick={onLogout}
            className="sidebar-logout-btn"
            title="Logout"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e74c3c',
              cursor: 'pointer',
              marginLeft: 'auto',
              padding: '8px'
            }}
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? "expanded" : ""}`}>
        <div className="top-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Menu Toggle Replaced */}
            <button
              className="menu-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <FaBars />
            </button>

            {/* Welcome Message */}
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#1a252f",
                  margin: 0,
                }}
              >
                Welcome to Admin Dashboard
              </h1>
              <p style={{ fontSize: "13px", color: "#5a6c7d", margin: 0 }}>
                Overview of store performance
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="search-bar" style={{ position: 'relative' }}>
              {/* Search Icon Replaced */}
              <span>
                <FaSearch />
              </span>
              <input
                type="text"
                className="search-input"
                placeholder="Type to find page..."
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleSearch}
              />
              {suggestions.length > 0 && (
                <div className="search-dropdown">
                  {suggestions.map(item => (
                    <div
                      key={item.id}
                      className="search-dropdown-item"
                      onClick={() => handleSuggestionClick(item.id)}
                    >
                      <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                        {item.icon}
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="top-actions">

              <button className="action-icon-btn">
                {/* Notification Icon Replaced */}
                <FaBell />
                {notificationCount > 0 && <div className="notification-dot"></div>}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Content Render */}
        <div className="content-wrapper">{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminDashboard;