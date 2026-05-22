import { useState, useEffect } from 'react';
import './HRDashboard.css';
import { SettingsProvider } from '../../context/SettingsContext';

// Import pages
import DashboardHome from './pages/DashboardHome';
import LiveAttendance from './pages/LiveAttendance';
import EmployeeManagement from './pages/EmployeeManagement';
import AttendanceReports from './pages/AttendanceReports';
import ShiftManagement from './pages/ShiftManagement';
import LeaveManagement from './pages/LeaveManagement';
import BonusPoints from './pages/BonusPoints';
import ScratchCards from './pages/ScratchCards';
import ManagerScoring from './pages/ManagerScoring';
import SalaryManagement from './pages/SalaryManagement';
import BreakSettings from './pages/BreakSettings';
import HelpIssues from './pages/HelpIssues';
import UnknownPersons from './pages/UnknownPersons';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Manager from './pages/Manager'
import {
  LayoutDashboard,
  Users,
  IdCard,
  UserRoundCheck,
  ChartLine,
  Clock,
  CalendarDays,
  Star,
  Gift,
  Trophy,
  Banknote,
  Coffee,
  CircleHelp,
  UserSearch,
  Bell,
  Settings as SettingsIcon,
  Building2,
  LogOut,
  Search,
  Calendar,
  Store,
  UserRound
} from 'lucide-react';
import { getAllLeaves } from '../services/leaveAPI';
import { getAllSalaryRequests } from '../services/salaryAPI';
import { getAllStores } from '../services/storeAPI';
import { getRedeemedCards } from '../services/scratchCardService';
import { getTodayAttendance } from '../services/attendanceAPI';
import { getUnverifiedEmployees } from '../services/employeeAPI';


const HRDashboardContent = ({ activePage, setActivePage, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('All Stores');
  const [liveEvents, setLiveEvents] = useState([]);
  const [badgeCounts, setBadgeCounts] = useState({
    'live-attendance': 0,
    'unknown': 0,
    'help': 0,
    'verification': 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leaves, salaryReqs, storeList, scratchCards, attendance, unverified] = await Promise.all([
          getAllLeaves(),
          getAllSalaryRequests(),
          getAllStores(),
          getRedeemedCards(),
          getTodayAttendance(),
          getUnverifiedEmployees()
        ]);

        let pLeaves = 0;
        if (Array.isArray(leaves)) pLeaves = leaves.filter(l => l.status === 'Pending').length;

        let pSalary = 0;
        if (Array.isArray(salaryReqs)) pSalary = salaryReqs.filter(s => s.status === 'Pending').length;

        setNotificationCount(pLeaves + pSalary);

        let pScratch = 0;
        if (scratchCards && Array.isArray(scratchCards.data)) {
          pScratch = scratchCards.data.length;
        }

        let liveCount = 0;
        if (attendance && attendance.success && Array.isArray(attendance.summaries)) {
          // Count all employees who have an attendance record today (Total Present)
          // This matches the "T. Present" stat in the LiveAttendance page
          liveCount = attendance.summaries.length;
        }

        setBadgeCounts(prev => ({
          ...prev,
          'leaves': pLeaves,
          'salary': pSalary,
          'scratch': pScratch,
          'live-attendance': liveCount,
          'verification': Array.isArray(unverified) ? unverified.length : 0,
          'unknown': 0,
          'help': 0,
          'notifications': 0
        }));


        if (Array.isArray(storeList)) {
          setStores(storeList);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    fetchData();
  }, []);

  // ✅ GLOBAL EVENT LISTENERS
  useEffect(() => {
    const handleAttendanceChange = (e) => {
      const { employeeName, event } = e.detail;
      setLiveEvents(prev => [{
        type: 'success',
        msg: `${employeeName} ${event.toUpperCase()}`,
        time: new Date()
      }, ...prev].slice(0, 10));

      if (event === 'in') {
        setBadgeCounts(prev => ({ ...prev, 'live-attendance': prev['live-attendance'] + 1 }));
      } else if (event === 'out') {
        setBadgeCounts(prev => ({ ...prev, 'live-attendance': Math.max(0, prev['live-attendance'] - 1) }));
      }
    };

    const handleAttendanceStatus = (e) => {
      const { employeeName, message } = e.detail;
      setLiveEvents(prev => [{
        type: 'info',
        msg: `${employeeName}: ${message}`,
        time: new Date()
      }, ...prev].slice(0, 10));
    };

    const handleAttendanceError = (e) => {
      const { employeeName, message } = e.detail;
      setLiveEvents(prev => [{
        type: 'error',
        msg: `${employeeName}: ${message}`,
        time: new Date()
      }, ...prev].slice(0, 10));
    };

    window.addEventListener('attendance:changed', handleAttendanceChange);
    window.addEventListener('attendance:status', handleAttendanceStatus);
    window.addEventListener('attendance:error', handleAttendanceError);

    return () => {
      window.removeEventListener('attendance:changed', handleAttendanceChange);
      window.removeEventListener('attendance:status', handleAttendanceStatus);
      window.removeEventListener('attendance:error', handleAttendanceError);
    };
  }, []);
  const menuItems = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      section: 'main'
    },
    {
      id: 'live-attendance',
      icon: Users,
      label: 'Live Attendance',
      section: 'main'
    },
    {
      id: 'employees',
      icon: IdCard,
      label: 'Employees',
      section: 'main'
    },
    {
      id: 'manager',
      icon: UserRoundCheck,
      label: 'Manager',
      section: 'main'
    },
    {
      id: 'reports',
      icon: ChartLine,
      label: 'Reports',
      section: 'main'
    },
    {
      id: 'shifts',
      icon: Clock,
      label: 'Shifts',
      section: 'main'
    },
    {
      id: 'leaves',
      icon: CalendarDays,
      label: 'Leaves',
      badge: 2,
      section: 'main'
    },
    {
      id: 'bonus',
      icon: Star,
      label: 'Bonus Points',
      section: 'rewards'
    },
    {
      id: 'scratch',
      icon: Gift,
      label: 'Scratch Cards',
      badge: 0,
      section: 'rewards'
    },

    {
      id: 'manager-scoring',
      icon: Trophy,
      label: 'Manager Scoring',
      section: 'management'
    },
    {
      id: 'salary',
      icon: Banknote,
      label: 'Salary',
      section: 'management'
    },
    {
      id: 'breaks',
      icon: Coffee,
      label: 'Break Schedule',
      section: 'settings'
    },
    {
      id: 'help',
      icon: CircleHelp,
      label: 'Help & Issues',
      badge: 4,
      section: 'settings'
    },
    {
      id: 'unknown',
      icon: UserSearch,
      label: 'Unknown Persons',
      badge: 7,
      section: 'security'
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      badge: 5,
      section: 'settings'
    },
    {
      id: 'settings',
      icon: SettingsIcon,
      label: 'Settings',
      section: 'settings'
    }
  ].map(item => ({
    ...item,
    badge: badgeCounts[item.id] !== undefined ? badgeCounts[item.id] : item.badge
  }));



  const handleInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      const matches = menuItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (pageId) => {
    setActivePage(pageId);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSuggestionClick(suggestions[0].id);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardHome setActivePage={setActivePage} selectedStore={selectedStore} />;
      case 'live-attendance': return <LiveAttendance selectedStore={selectedStore} />;
      case 'employees': return <EmployeeManagement selectedStore={selectedStore} />;
      case 'manager': return <Manager selectedStore={selectedStore} />;
      case 'reports': return <AttendanceReports selectedStore={selectedStore} />;
      case 'shifts': return <ShiftManagement selectedStore={selectedStore} />;
      case 'leaves': return <LeaveManagement selectedStore={selectedStore} />;
      case 'bonus': return <BonusPoints selectedStore={selectedStore} />;
      case 'scratch': return <ScratchCards selectedStore={selectedStore} />;
      case 'manager-scoring': return <ManagerScoring selectedStore={selectedStore} />;
      case 'salary': return <SalaryManagement selectedStore={selectedStore} />;
      case 'breaks': return <BreakSettings selectedStore={selectedStore} />;
      case 'help': return <HelpIssues selectedStore={selectedStore} />;
      case 'unknown': return <UnknownPersons selectedStore={selectedStore} />;
      case 'notifications': return <Notifications selectedStore={selectedStore} />;
      case 'settings': return <Settings selectedStore={selectedStore} />;
      default: return <DashboardHome />;
    }
  };

  const mainMenuItems = menuItems.filter(item =>
    item.section === 'main' || item.section === 'rewards'
  );

  const settingsMenuItems = menuItems.filter(item =>
    item.section === 'management' || item.section === 'settings' || item.section === 'security'
  );

  return (
    <div className="hr-dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <Building2 size={24} />
            </div>
            <span className="logo-text">HR Portal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Main Menu */}
          <div className="nav-section">
            <div className="nav-section-title">MENU</div>
            {mainMenuItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
                title={item.label}
              >
                <item.icon size={20} className="nav-icon" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="badge">
                    {item.badge}{item.id === 'live-attendance' ? ' IN' : ''}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Settings Menu */}
          <div className="nav-section">
            <div className="nav-section-title">SETTINGS</div>
            {settingsMenuItems.map(item => (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
                title={item.label}
              >
                <item.icon size={20} className="nav-icon" />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="badge">
                    {item.badge}{item.id === 'live-attendance' ? ' IN' : ''}
                  </span>
                )}

              </button>
            ))}
          </div>

          {/* Live Feed Section */}
          <div className="nav-section live-feed-section">
            <div className="nav-section-title">
              LIVE ACTIVITY
              {liveEvents.length > 0 && <span className="live-dot-pulse"></span>}
            </div>
            <div className="sidebar-live-feed">
              {liveEvents.length === 0 ? (
                <div className="empty-feed">No recent activity</div>
              ) : (
                liveEvents.map((event, idx) => (
                  <div key={idx} className={`feed-item ${event.type}`}>
                    <div className="feed-indicator"></div>
                    <div className="feed-content">
                      <p>{event.msg}</p>
                      <span>{event.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              <UserRound size={20} />
            </div>
            <div className="user-info">
              <div className="user-name">HR Admin</div>
              <div className="user-role">Human Resources</div>
            </div>
          </div>
          <button className="logout-btn" title="Logout" onClick={onLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1>{menuItems.find(item => item.id === activePage)?.label || 'Dashboard'}</h1>
            <div className="breadcrumb">
              <LayoutDashboard size={14} className="breadcrumb-icon" />
              <span>HR Dashboard</span>
              <span className="breadcrumb-separator">/</span>
              <span>{menuItems.find(item => item.id === activePage)?.label}</span>
            </div>
          </div>

          <div className="header-right">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
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
                      <item.icon size={16} className="dropdown-icon" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="header-btn" title="Calendar" onClick={() => setActivePage('leaves')}>
              <Calendar size={20} />
            </button>

            <button className="header-btn" title="Notifications" onClick={() => setActivePage('notifications')}>
              <Bell size={20} />
              {notificationCount > 0 && <span className="notification-dot">{notificationCount}</span>}
            </button>

            <div className="store-selector">
              <Store size={18} className="store-icon" />
              <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
                <option value="All Stores">All Stores</option>
                {stores.map(store => (
                  <option key={store._id} value={store.storeName || store.branchName}>
                    {store.storeName || store.branchName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

// Main HRDashboard component wrapped with SettingsProvider
const HRDashboard = ({ onLogout }) => {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <SettingsProvider>
      <HRDashboardContent
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={onLogout}
      />
    </SettingsProvider>
  );
};

export default HRDashboard;