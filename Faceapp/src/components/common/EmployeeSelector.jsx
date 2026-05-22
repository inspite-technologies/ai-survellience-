import React, { useState, useMemo } from 'react';
import { Search, Check, Users, X } from 'lucide-react';

/**
 * EmployeeSelector Component
 * 
 * A premium multi-select component for assigning employees.
 * Features: Searchable list, checkbox-based selection, and a summary count.
 * 
 * @param {Array} allEmployees - List of all available employees
 * @param {Array} selectedIds - List of currently selected employee IDs
 * @param {Function} onChange - Callback function when selection changes
 */
const EmployeeSelector = ({ allEmployees = [], selectedIds: rawSelectedIds = [], onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize selectedIds to always be an array of string IDs
  // (handles both raw IDs and populated objects from backend)
  const selectedIds = useMemo(() => {
    return (rawSelectedIds || []).map(item => 
      typeof item === 'string' ? item : (item._id || item.id)
    ).filter(Boolean);
  }, [rawSelectedIds]);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => 
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allEmployees, searchQuery]);

  // Handle toggling an employee selection
  const handleToggle = (id) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter(item => item !== id)
      : [...selectedIds, id];
    onChange(newSelectedIds);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleSelectAll = () => {
    const allIds = filteredEmployees.map(emp => emp._id || emp.id);
    const uniqueIds = Array.from(new Set([...selectedIds, ...allIds]));
    onChange(uniqueIds);
  };

  return (
    <div className="employee-selector-container">
      <style>{`
        .employee-selector-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .selected-badge {
          background: #f0fdf4;
          color: #16a34a;
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #dcfce7;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon-selector {
          position: absolute;
          left: 12px;
          color: #94a3b8;
          pointer-events: none;
        }

        .selector-search-input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
          outline: none;
        }

        .selector-search-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.05);
          background: white;
        }

        .employee-list-scroll {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
        }

        /* Custom Scrollbar */
        .employee-list-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .employee-list-scroll::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .employee-list-scroll::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .employee-list-scroll::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }

        .employee-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 1px solid #f1f5f9;
        }

        .employee-item:last-child {
          border-bottom: none;
        }

        .employee-item:hover {
          background: #f8fafc;
        }

        .employee-item.is-selected {
          background: #f0fdf4;
        }

        .custom-checkbox {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
          background: white;
        }

        .is-selected .custom-checkbox {
          border-color: #16a34a;
          background: #16a34a;
          color: white;
        }

        .employee-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .emp-name {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .emp-dept {
          font-size: 12px;
          color: #64748b;
        }

        .selector-actions {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }

        .action-link {
          font-size: 12px;
          font-weight: 600;
          color: #2563eb;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          text-decoration: none;
        }

        .action-link:hover {
          text-decoration: underline;
        }

        .no-results {
          padding: 32px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }
      `}</style>

      <div className="selector-header">
        <div className="selected-badge">
          <Users size={14} />
          <span>{selectedIds.length} Selected</span>
        </div>
        <div className="selector-actions">
          <button type="button" className="action-link" onClick={handleSelectAll}>
            Select All
          </button>
          <span style={{ color: '#e2e8f0' }}>|</span>
          <button type="button" className="action-link" style={{ color: '#ef4444' }} onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      </div>

      <div className="search-wrapper">
        <Search size={16} className="search-icon-selector" />
        <input
          type="text"
          className="selector-search-input"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            type="button" 
            onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="employee-list-scroll">
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map((emp) => {
            const id = emp._id || emp.id;
            const isSelected = selectedIds.includes(id);
            return (
              <div 
                key={id} 
                className={`employee-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleToggle(id)}
              >
                <div className="custom-checkbox">
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
                <div className="employee-info">
                  <span className="emp-name">{emp.name}</span>
                  <span className="emp-dept">{emp.department || 'General'}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-results">
            No employees found
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeSelector;
