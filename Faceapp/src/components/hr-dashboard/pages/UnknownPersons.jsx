import { useState, useEffect } from 'react';
import axios from 'axios';
import './UnknownPersons.css';

const UnknownPersons = ({ selectedStore }) => {
  const [unknownDetections, setUnknownDetections] = useState([]);
  const [filteredDetections, setFilteredDetections] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filterDate, setFilterDate] = useState(''); // Empty string = All dates
  const [filterStatus, setFilterStatus] = useState('all');

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showIdentifyModal, setShowIdentifyModal] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [identifyForm, setIdentifyForm] = useState({
    employeeId: '',
    notes: ''
  });

  const API_URL = import.meta.env.VITE_API_URL;

  const statusTypes = [
    { value: 'pending', label: 'Pending Review', color: '#f57c00', icon: 'fa-clock' },
    { value: 'identified', label: 'Identified', color: '#2e7d32', icon: 'fa-check-circle' },
    { value: 'ignored', label: 'Ignored', color: '#9e9e9e', icon: 'fa-ban' },
    { value: 'flagged', label: 'Security Alert', color: '#c62828', icon: 'fa-exclamation-triangle' }
  ];

  useEffect(() => {
    fetchEmployees();
    fetchUnknownPersons();

    // ✅ Auto-refresh every 5 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchUnknownPersons();
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    filterDetections();
  }, [unknownDetections, searchQuery, filterDate, filterStatus, selectedStore]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/faces`);
      setEmployees(response.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  // ✅ Fetch real unknown persons from API
  const fetchUnknownPersons = async () => {
    try {
      // Use 'all' to ensure we see everything regardless of backend defaults
      const response = await axios.get(`${API_URL}/unknown/list?status=all`);

      if (response.data.success && Array.isArray(response.data.unknownPersons)) {
        const baseUrl = API_URL.split('/api')[0];
        console.log(`📊 Received ${response.data.unknownPersons.length} unknowns from server`);

        const persons = response.data.unknownPersons.map(person => {
          let imageUrl = 'https://via.placeholder.com/300x400?text=No+Image';
          const path = person.faceImageUrl || person.faceImagePath;
          if (path) {
            imageUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
          }

          // Defensive date parsing
          const firstSeen = person.firstSeen || person.createdAt || new Date();
          const lastSeen = person.lastSeen || person.updatedAt || firstSeen;

          return {
            id: person.unknownId || person._id,
            imageUrl,
            detectedAt: new Date(firstSeen),
            lastSeen: new Date(lastSeen),
            location: 'Camera Detection',
            confidence: person.detections?.[0]?.confidence || 0,
            status: person.status === 'active' ? 'pending' : (person.status || 'pending'),
            identifiedAs: null,
            identifiedBy: null,
            identifiedAt: null,
            notes: null,
            attempts: person.totalDetections || 1,
            displayName: person.displayName || `Unknown ${person.unknownId || ''}`
          };
        });
        setUnknownDetections(persons);
      } else {
        console.warn('⚠️ API success but no unknownPersons array found:', response.data);
      }
    } catch (err) {
      console.error('❌ Error fetching unknown persons:', err);
    }
  };

  const filterDetections = () => {
    let filtered = [...unknownDetections];

    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(det =>
        det.location.toLowerCase().includes(lowerQuery) ||
        (det.identifiedAs && det.identifiedAs.toLowerCase().includes(lowerQuery)) ||
        (det.notes && det.notes.toLowerCase().includes(lowerQuery))
      );
    }

    // Date Filter
    if (filterDate) {
      filtered = filtered.filter(det => {
        // Convert detection date to YYYY-MM-DD format for comparison
        const detDate = new Date(det.detectedAt).toISOString().split('T')[0];
        return detDate === filterDate;
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(det => det.status === filterStatus);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));

    setFilteredDetections(filtered);
  };

  // Interactive Stats Handlers
  const handleStatClick = (type) => {
    if (type === 'total') {
      setFilterStatus('all');
      setFilterDate(''); // Clear date
    } else if (type === 'today') {
      // Set date to today in YYYY-MM-DD format
      setFilterDate(new Date().toISOString().split('T')[0]);
      setFilterStatus('all');
    } else {
      setFilterStatus(type);
      setFilterDate(''); // Clear date when clicking status types
    }
  };

  const viewDetails = (detection) => { setSelectedDetection(detection); setShowDetailsModal(true); };
  const openIdentifyModal = (detection) => { setSelectedDetection(detection); setIdentifyForm({ employeeId: '', notes: '' }); setShowIdentifyModal(true); };
  const identifyPerson = async (e) => {
    e.preventDefault();
    if (!selectedDetection || !identifyForm.employeeId) {
      alert('❌ Please select an employee');
      return;
    }
    try {
      const selectedEmployee = employees.find(emp => emp._id === identifyForm.employeeId);
      await axios.put(`${API_URL}/unknown/${selectedDetection.id}/status`, {
        status: 'identified',
        identifiedAs: selectedEmployee?.name || 'Unknown Employee',
        notes: identifyForm.notes
      });
      setUnknownDetections(prev => prev.map(d =>
        d.id === selectedDetection.id ? { ...d, status: 'identified', identifiedAs: selectedEmployee?.name } : d
      ));
      setShowIdentifyModal(false);
      setShowDetailsModal(false);
      alert('✅ Person identified successfully!');
    } catch (err) {
      console.error('Error identifying person:', err);
      alert('❌ Failed to identify person');
    }
  };
  const markAsIgnored = async (detectionId) => {
    try {
      await axios.put(`${API_URL}/unknown/${detectionId}/status`, { status: 'ignored' });
      setUnknownDetections(prev => prev.map(d => d.id === detectionId ? { ...d, status: 'ignored' } : d));
      alert('✅ Detection marked as ignored!');
    } catch (err) {
      console.error('Error marking as ignored:', err);
      alert('❌ Failed to update status');
    }
  };
  const flagAsSecurity = async (detectionId) => {
    try {
      await axios.put(`${API_URL}/unknown/${detectionId}/status`, { status: 'flagged' });
      setUnknownDetections(prev => prev.map(d => d.id === detectionId ? { ...d, status: 'flagged' } : d));
      alert('⚠️ Detection flagged as security alert!');
    } catch (err) {
      console.error('Error flagging as security:', err);
      alert('❌ Failed to update status');
    }
  };
  const deleteDetection = async (detectionId) => {
    if (!window.confirm('Are you sure you want to delete this detection?')) return;
    try {
      await axios.delete(`${API_URL}/unknown/${detectionId}`);
      setUnknownDetections(prev => prev.filter(d => d.id !== detectionId));
      alert('✅ Detection deleted successfully!');
    } catch (err) {
      console.error('Error deleting detection:', err);
      alert('❌ Failed to delete detection');
    }
  };
  const clearAllResolved = () => {
    setUnknownDetections(prev => prev.filter(d => d.status === 'pending' || d.status === 'flagged'));
    alert('✅ Resolved detections cleared!');
  };

  const getStatusInfo = (status) => statusTypes.find(s => s.value === status) || statusTypes[0];
  const formatDateTime = (date) => new Date(date).toLocaleString();
  const getTimeAgo = (date) => new Date(date).toLocaleDateString();

  // Stats reflect global data or filtered data depending on preference. 
  // Here we use total data for the top cards so they act as a dashboard.
  const getStats = () => {
    const totalDetections = unknownDetections.length;
    const pendingReview = unknownDetections.filter(d => d.status === 'pending').length;
    const identified = unknownDetections.filter(d => d.status === 'identified').length;
    const flagged = unknownDetections.filter(d => d.status === 'flagged').length;
    const todayDetections = unknownDetections.filter(d => {
      const today = new Date().setHours(0, 0, 0, 0);
      const detDate = new Date(d.detectedAt).setHours(0, 0, 0, 0);
      return detDate === today;
    }).length;

    return { totalDetections, pendingReview, identified, flagged, todayDetections };
  };

  const stats = getStats();

  return (
    <div className="unknown-persons">
      <style>{`
        .unknown-stat-card { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
        .unknown-stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .unknown-stat-card.selected-stat { border: 2px solid #1976d2; background-color: #f0f7ff; }
        .unknown-stat-card.flagged.selected-stat { border-color: #c62828; background-color: #ffebee; }
        
        /* New Styles for Date Section Header */
        .results-header {
            margin: 0 20px 15px 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .results-title {
            font-size: 1.1rem;
            color: #333;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .results-count-badge {
            background: #e3f2fd;
            color: #1976d2;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 700;
        }
        .results-date-highlight {
            color: #1976d2;
        }
      `}</style>

      {/* Header */}
      <div className="unknown-header">
        <div className="unknown-header-left">
          <h2><i className="fas fa-user-secret"></i> Unknown Persons</h2>
          <p>Manage unrecognized face detections and security alerts</p>
        </div>
        <div className="unknown-header-right">
          <button className="btn-secondary" onClick={clearAllResolved}><i className="fas fa-broom"></i> Clear Resolved</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="unknown-stats-grid">
        <div className={`unknown-stat-card total ${filterStatus === 'all' && !filterDate ? 'selected-stat' : ''}`} onClick={() => handleStatClick('total')}>
          <div className="unknown-stat-icon"><i className="fas fa-user-secret"></i></div>
          <div className="unknown-stat-content"><div className="unknown-stat-value">{stats.totalDetections}</div><div className="unknown-stat-label">Total Detections</div></div>
        </div>
        <div className={`unknown-stat-card pending ${filterStatus === 'pending' ? 'selected-stat' : ''}`} onClick={() => handleStatClick('pending')}>
          <div className="unknown-stat-icon"><i className="fas fa-clock"></i></div>
          <div className="unknown-stat-content"><div className="unknown-stat-value">{stats.pendingReview}</div><div className="unknown-stat-label">Pending Review</div></div>
        </div>
        <div className={`unknown-stat-card identified ${filterStatus === 'identified' ? 'selected-stat' : ''}`} onClick={() => handleStatClick('identified')}>
          <div className="unknown-stat-icon"><i className="fas fa-check-circle"></i></div>
          <div className="unknown-stat-content"><div className="unknown-stat-value">{stats.identified}</div><div className="unknown-stat-label">Identified</div></div>
        </div>
        <div className={`unknown-stat-card flagged ${filterStatus === 'flagged' ? 'selected-stat' : ''}`} onClick={() => handleStatClick('flagged')}>
          <div className="unknown-stat-icon"><i className="fas fa-exclamation-triangle"></i></div>
          <div className="unknown-stat-content"><div className="unknown-stat-value">{stats.flagged}</div><div className="unknown-stat-label">Security Alerts</div></div>
        </div>
        <div className={`unknown-stat-card today ${filterDate === new Date().toISOString().split('T')[0] ? 'selected-stat' : ''}`} onClick={() => handleStatClick('today')}>
          <div className="unknown-stat-icon"><i className="far fa-calendar-day"></i></div>
          <div className="unknown-stat-content"><div className="unknown-stat-value">{stats.todayDetections}</div><div className="unknown-stat-label">Today</div></div>
        </div>
      </div>

      {/* Filters Section - Date Filter Beside Other Filters */}
      <div className="unknown-filters">
        <input
          type="text"
          placeholder="Search location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input-unknown"
        />

        {/* Date Filter Placed Beside Search */}
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="search-input-unknown"
          style={{ width: 'auto', minWidth: '160px' }}
          title="Filter by specific date"
        />

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select-unknown">
          <option value="all">All Status</option>
          {statusTypes.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </div>

      {/* NEW: Result Data Section under the filters */}
      <div className="results-header">
        <div className="results-title">
          <i className="far fa-list-alt"></i>
          {filterDate ? (
            <>Detections for <span className="results-date-highlight">{new Date(filterDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></>
          ) : (
            "All Unknown Detections"
          )}
        </div>
        <div className="results-count-badge">
          {filteredDetections.length} Persons Found
        </div>
      </div>

      {/* Detections Grid */}
      <div className="detections-grid">
        {filteredDetections.length === 0 ? (
          <div className="empty-state-unknown">
            <i className="fas fa-user-check"></i>
            <p>No unknown detections found {filterDate && `for this date`}</p>
            <span className="empty-subtitle">All faces are recognized!</span>
          </div>
        ) : (
          filteredDetections.map(detection => {
            const statusInfo = getStatusInfo(detection.status);
            return (
              <div key={detection.id} className={`detection-card ${detection.status}`} onClick={() => viewDetails(detection)}>
                <div className="detection-image-container">
                  <img
                    src={detection.imageUrl}
                    alt={detection.displayName || "Unknown"}
                    className="detection-image"
                    onError={(e) => {
                      console.error('Image load error:', detection.imageUrl);
                      e.target.src = 'https://via.placeholder.com/300x400?text=Image+Error';
                    }}
                  />
                  <div className="image-overlay"><button className="overlay-btn"><i className="fas fa-search-plus"></i> View Details</button></div>
                  {detection.attempts > 1 && <div className="attempts-badge"><i className="fas fa-redo"></i> {detection.attempts} attempts</div>}
                </div>
                <div className="detection-info">
                  <div className="detection-header">
                    <span className="status-badge-unknown" style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}>
                      <i className={`fas ${statusInfo.icon}`}></i> {statusInfo.label}
                    </span>
                  </div>
                  <div className="detection-details">
                    <div className="detail-row"><i className="fas fa-map-marker-alt"></i> <span>{detection.location}</span></div>
                    <div className="detail-row"><i className="far fa-clock"></i> <span>{formatDateTime(detection.detectedAt)}</span></div>
                    {detection.identifiedAs && <div className="detail-row identified"><i className="fas fa-user-check"></i> <span>{detection.identifiedAs}</span></div>}
                  </div>
                  {detection.status === 'pending' && (
                    <div className="detection-actions">
                      <button className="action-btn-unknown identify" onClick={(e) => { e.stopPropagation(); openIdentifyModal(detection); }}><i className="fas fa-user-check"></i> Identify</button>
                      <button className="action-btn-unknown ignore" onClick={(e) => { e.stopPropagation(); markAsIgnored(detection.id); }}><i className="fas fa-ban"></i></button>
                      <button className="action-btn-unknown flag" onClick={(e) => { e.stopPropagation(); flagAsSecurity(detection.id); }}><i className="fas fa-flag"></i></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals remain the same... */}
      {showDetailsModal && selectedDetection && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Detection Details</h3><button className="modal-close-btn" onClick={() => setShowDetailsModal(false)}><i className="fas fa-times"></i></button></div>
            <div className="modal-body">
              <p><strong>Location:</strong> {selectedDetection.location}</p>
              <p><strong>Time:</strong> {formatDateTime(selectedDetection.detectedAt)}</p>
              <p><strong>Status:</strong> {selectedDetection.status}</p>
              {selectedDetection.status === 'pending' && (
                <div style={{ marginTop: '20px' }}>
                  <button className="btn-primary" onClick={() => { setShowDetailsModal(false); openIdentifyModal(selectedDetection); }}>Identify</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showIdentifyModal && selectedDetection && (
        <div className="modal-overlay" onClick={() => setShowIdentifyModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Identify Person</h3><button className="modal-close-btn" onClick={() => setShowIdentifyModal(false)}><i className="fas fa-times"></i></button></div>
            <form onSubmit={identifyPerson}>
              <div className="modal-body">
                <select value={identifyForm.employeeId} onChange={(e) => setIdentifyForm({ ...identifyForm, employeeId: e.target.value })} required>
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </div>
              <div className="modal-footer"><button type="submit" className="btn-primary">Confirm</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnknownPersons;