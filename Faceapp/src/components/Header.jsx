import { useState } from 'react';
import './Header.css';

const Header = ({ toggleSidebar, sidebarCollapsed }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="app-header">
      <div className="header-left">
        <button 
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Open Sidebar" : "Close Sidebar"}
        >
          <i className={`fas ${sidebarCollapsed ? 'fa-bars' : 'fa-times'}`}></i>
        </button>
        
        <div className="header-breadcrumb">
          <i className="fas fa-home"></i>
          <span>HR Dashboard</span>
        </div>
      </div>

      <div className="header-center">
        <div className={`header-search ${showSearch ? 'active' : ''}`}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          />
        </div>
      </div>

      <div className="header-right">
        <button className="header-icon-btn" title="Notifications">
          <i className="far fa-bell"></i>
          <span className="notification-badge">3</span>
        </button>

        <button className="header-icon-btn" title="Settings">
          <i className="fas fa-cog"></i>
        </button>

        <div className="header-user">
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="user-info">
            <div className="user-name">HR Admin</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;