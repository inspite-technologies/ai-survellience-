import { useState, useEffect } from 'react';
import './ScratchCards.css';
import {
  getAllScratchCards,
  createScratchCards as apiCreateScratchCards,
  updateScratchCardStatus,
  deleteScratchCard as apiDeleteScratchCard
} from '../../services/scratchCardService';
import { getAllEmployees } from '../../services/employeeAPI';
import { baseURL } from '../../services/axiosClient';
import {
  Plus, Search, Calendar, Trash2, CheckCircle, XCircle, X,
  Star, DollarSign, CalendarPlus, Gift, Percent, Ticket,
  MousePointer2, AlertCircle, Users, ArrowRight, CheckCheck, Check,
  Sparkles, Info, Edit3, Maximize2, Eye, Trash
} from 'lucide-react';
import { adminUpdateScratchCard } from '../../services/scratchCardService';


const ScratchCards = ({ selectedStore }) => {
  const [employees, setEmployees] = useState([]);
  const [scratchCards, setScratchCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter States
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [cardOptions, setCardOptions] = useState([
    { title: '', description: '', rewardType: 'bonus', rewardValue: '', code: '', image: null },
    { title: '', description: '', rewardType: 'bonus', rewardValue: '', code: '', image: null },
    { title: '', description: '', rewardType: 'bonus', rewardValue: '', code: '', image: null }
  ]);

  const [validUntil, setValidUntil] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState(1);

  const [assignForm, setAssignForm] = useState({
    employeeIds: [],
    cardId: ''
  });

  // #r New States for Update and Full View
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [fullViewCard, setFullViewCard] = useState(null);
   const [isUpdating, setIsUpdating] = useState(false);
   const [isAssigning, setIsAssigning] = useState(false);
   const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    rewardType: 'bonus',
    rewardValue: '',
    code: '',
    validUntil: '',
    image: null
  });

  const API_URL = baseURL;

  const rewardTypes = [
    { value: 'bonus', label: 'Bonus Points', icon: Star, color: '#f59e0b' },
    { value: 'cash', label: 'Cash Reward', icon: DollarSign, color: '#10b981' },
    { value: 'leave', label: 'Extra Leave Day', icon: CalendarPlus, color: '#3b82f6' },
    { value: 'gift', label: 'Gift Voucher', icon: Gift, color: '#ef4444' },
    { value: 'discount', label: 'Discount Coupon', icon: Percent, color: '#8b5cf6' },
    { value: 'experience', label: 'Experience', icon: Ticket, color: '#06b6d4' }
  ];

  const cardStatuses = [
    { value: 'Unredeemed', label: 'Active', color: '#10b981', icon: CheckCircle },
    { value: 'Scratched', label: 'Scratched', color: '#3b82f6', icon: MousePointer2 },
    { value: 'Redeemed', label: 'Redeemed', color: '#8b5cf6', icon: Gift },
    { value: 'Expired', label: 'Expired', color: '#ef4444', icon: XCircle }
  ];

  useEffect(() => {
    // #r Initialize component by fetching employees and existing scratch cards
    fetchEmployees();
    fetchScratchCards();
  }, []);

  // #r API call to retrieve all active cards from backend
  const fetchScratchCards = async () => {
    try {
      const data = await getAllScratchCards();
      // Service already returns response.data
      setScratchCards(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      console.error('Error fetching scratch cards:', err);
    }
  };


  useEffect(() => {
    filterCards();
  }, [scratchCards, searchQuery, filterStatus, filterType, selectedStore]);

  const fetchEmployees = async () => {
    try {
      const data = await getAllEmployees();
      // Face objects already have _id and name
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const generateMockScratchCards = () => {
    const mockCards = [
      {
        id: 'card-1',
        employeeId: 'emp1',
        employeeName: 'John Doe',
        title: '🎉 Performance Bonus',
        description: 'Congratulations on exceeding your quarterly targets!',
        rewardType: 'bonus',
        rewardValue: 500,
        status: 'Unredeemed',
        createdAt: new Date('2024-12-08'),
        validUntil: new Date('2024-12-31'),
        scratchedAt: null,
        redeemedAt: null,
        maxRedemptions: 1
      },
      {
        id: 'card-2',
        employeeId: 'emp2',
        employeeName: 'Sarah Williams',
        title: '💰 Cash Reward',
        description: 'Great work on the client presentation!',
        rewardType: 'cash',
        rewardValue: 100,
        status: 'Scratched',
        createdAt: new Date('2024-12-07'),
        validUntil: new Date('2024-12-20'),
        scratchedAt: new Date('2024-12-08'),
        redeemedAt: null,
        maxRedemptions: 1
      },
      {
        id: 'card-3',
        employeeId: 'emp3',
        employeeName: 'Mike Johnson',
        title: '🎁 Gift Voucher',
        description: 'Thank you for your exceptional customer service!',
        rewardType: 'gift',
        rewardValue: 50,
        status: 'Redeemed',
        createdAt: new Date('2024-12-05'),
        validUntil: new Date('2024-12-15'),
        scratchedAt: new Date('2024-12-06'),
        redeemedAt: new Date('2024-12-07'),
        maxRedemptions: 1
      },
      {
        id: 'card-4',
        employeeId: 'emp1',
        employeeName: 'John Doe',
        title: '🏖️ Extra Leave Day',
        description: 'Reward for perfect attendance this month!',
        rewardType: 'leave',
        rewardValue: 1,
        status: 'Expired',
        createdAt: new Date('2024-11-20'),
        validUntil: new Date('2024-12-05'),
        scratchedAt: null,
        redeemedAt: null,
        maxRedemptions: 1
      }
    ];

    setScratchCards(mockCards);
  };

  const filterCards = () => {
    let filtered = [...scratchCards];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card =>
        (card.title?.toLowerCase().includes(query)) ||
        (card.employeeName?.toLowerCase().includes(query)) ||
        (card.description?.toLowerCase().includes(query)) ||
        (card.code?.toLowerCase().includes(query)) ||
        (getRewardTypeInfo(card.rewardType).label.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(card => card.status === filterStatus);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(card => card.rewardType === filterType);
    }

    // Store Filter
    if (selectedStore && selectedStore !== 'All Stores') {
      filtered = filtered.filter(card => {
        const empId = card.employeeId; // String ID in mock/real
        const emp = employees.find(e => e._id === empId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredCards(filtered);
  };

  const handleOptionChange = (index, e) => {
    const { name, value, type, files } = e.target;
    const newOptions = [...cardOptions];
    if (type === 'file') {
      newOptions[index][name] = files[0];
    } else {
      newOptions[index][name] = value;
    }
    setCardOptions(newOptions);
  };

  const resetCardForm = () => {
    setCardOptions([
      { title: '', description: '', rewardType: 'bonus', rewardValue: '', code: '', image: null },
      { title: '', description: '', rewardType: 'bonus', rewardValue: '', code: '', image: null },
      { title: '', description: '', rewardType: 'bonus', rewardValue: '', code: '', image: null }
    ]);
    setValidUntil('');
    setMaxRedemptions(1);
  };

  const handleCreateCard = () => {
    resetCardForm();
    setShowCreateModal(true);
  };

  const createCard = (e) => {
    e.preventDefault();

    // Check if at least the first option is filled
    if (!cardOptions[0].title.trim() || !cardOptions[0].description.trim() || !validUntil) {
      alert('⚠️ Please fill in at least the first reward option and validity!');
      return;
    }

    setAssignForm({
      employeeIds: [],
      cardId: ''
    });

    setShowCreateModal(false);
    setShowAssignModal(true);
  };

  // #r Iterate through each reward option and create separate cards
  const assignCards = async () => {
    if (assignForm.employeeIds.length === 0) {
      alert('⚠️ Please select at least one employee!');
      return;
    }

    setIsAssigning(true);
    try {
      const validOptions = cardOptions.filter(opt => opt.title && opt.title.trim() !== '');
      if (validOptions.length === 0) {
        alert('⚠️ Please provide at least one reward option!');
        return;
      }

      // Prepare single batch FormData
      const formData = new FormData();
      formData.append('validUntil', validUntil);
      formData.append('maxRedemptions', maxRedemptions);

      // Indexed Options & Images
      validOptions.forEach((opt, index) => {
        formData.append(`options[${index}][title]`, opt.title);
        formData.append(`options[${index}][description]`, opt.description);
        formData.append(`options[${index}][rewardType]`, opt.rewardType);
        formData.append(`options[${index}][rewardValue]`, opt.rewardValue);
        formData.append(`options[${index}][code]`, opt.code);
        
        if (opt.image) {
          // Send as images_index field for reliable backend mapping
          formData.append(`images_${index}`, opt.image);
        }
      });

      // Employee IDs
      assignForm.employeeIds.forEach((id, index) => {
        const emp = employees.find(e => e._id === id);
        if (emp) {
          formData.append(`employeeIds[${index}][_id]`, emp._id);
          formData.append(`employeeIds[${index}][name]`, emp.name);
        }
      });

      await apiCreateScratchCards(formData); // Use the aligned creation API

      setShowAssignModal(false);
      resetCardForm();
      fetchScratchCards();
      alert(`✅ Batch of ${validOptions.length} rewards assigned successfully!`);
    } catch (err) {
      console.error('Error assigning batch:', err);
      alert('❌ Failed to assign batch');
    } finally {
      setIsAssigning(false);
    }
  };



  const toggleEmployeeSelection = (employeeId) => {
    setAssignForm(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(employeeId)
        ? prev.employeeIds.filter(id => id !== employeeId)
        : [...prev.employeeIds, employeeId]
    }));
  };

  const selectAllEmployees = () => {
    if (assignForm.employeeIds.length === employees.length) {
      setAssignForm(prev => ({ ...prev, employeeIds: [] }));
    } else {
      setAssignForm(prev => ({ ...prev, employeeIds: employees.map(e => e._id) }));
    }
  };

  // #r Update Functionality
  const handleEditClick = (e, card) => {
    e.stopPropagation();
    setSelectedCard(card);
    setEditForm({
      title: card.title || '',
      description: card.description || '',
      rewardType: card.rewardType || 'bonus',
      rewardValue: card.rewardValue || '',
      code: card.code || '',
      validUntil: card.validUntil ? new Date(card.validUntil).toISOString().split('T')[0] : '',
      image: null
    });
    setShowUpdateModal(true);
  };

  const handleUpdateChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setEditForm(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    if (!selectedCard) return;

    setIsUpdating(true);
    try {
      const formData = new FormData();
      Object.keys(editForm).forEach(key => {
        if (editForm[key] !== null && key !== 'images' && key !== 'image') {
          formData.append(key, editForm[key]);
        }
      });
      
      // Explicitly append images plural to match multer config
      if (editForm.images) {
        formData.append('images', editForm.images);
      } else if (editForm.image) {
         // Fallback for if handleUpdateChange still uses 'image'
        formData.append('images', editForm.image);
      }

      await adminUpdateScratchCard(selectedCard._id, formData);
      alert('✅ Card updated successfully!');
      setShowUpdateModal(false);
      fetchScratchCards();
    } catch (err) {
      console.error('Update failed:', err);
      alert('❌ Failed to update card');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCard = async (cardIds) => {
    const ids = Array.isArray(cardIds) ? cardIds : [cardIds];
    const message = ids.length > 1 
      ? `Are you sure you want to delete these ${ids.length} scratch cards?`
      : 'Are you sure you want to delete this scratch card?';

    if (window.confirm(message)) {
      try {
        await Promise.all(ids.map(id => apiDeleteScratchCard(id)));
        fetchScratchCards(); // Refresh data
        alert(`✅ ${ids.length > 1 ? 'Cards' : 'Card'} deleted successfully!`);
      } catch (err) {
        console.error('Error deleting card:', err);
        alert('❌ Failed to delete scratch card(s)');
      }
    }
  };


  const getRewardTypeInfo = (type) => {
    return rewardTypes.find(t => t.value === type) || rewardTypes[0];
  };

  const getStatusInfo = (status) => {
    return cardStatuses.find(s => s.value === status) || cardStatuses[0];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRewardDisplay = (card) => {
    // #r Robust check for reward data (root vs options array)
    const rewardType = card.rewardType || (card.options?.[0]?.rewardType);
    const rewardValue = card.rewardValue || (card.options?.[0]?.rewardValue);
    
    const typeInfo = getRewardTypeInfo(rewardType);

    if (rewardType === 'bonus') {
      return `${rewardValue || 0} Points`;
    } else if (rewardType === 'cash') {
      return `$${rewardValue || 0}`;
    } else if (rewardType === 'leave') {
      return `${rewardValue || 0} Day${rewardValue > 1 ? 's' : ''}`;
    } else if (rewardType === 'discount') {
      return `${rewardValue || 0}% Off`;
    } else {
      return `${rewardValue || 0} Value`;
    }
  };

  const getStats = () => {
    if (!scratchCards || !Array.isArray(scratchCards)) {
      return {
        totalCards: 0,
        activeCards: 0,
        scratchedCards: 0,
        redeemedCards: 0,
        totalValue: 0
      };
    }

    // #r Filter scratchCards by selectedStore for consistent stat card display
    let storeCards = scratchCards;
    if (selectedStore && selectedStore !== 'All Stores' && employees) {
      storeCards = scratchCards.filter(card => {
        const empId = card.employeeId;
        const emp = employees.find(e => e._id === empId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    const totalCards = storeCards.length;
    const activeCards = storeCards.filter(c => c.status === 'Unredeemed').length;
    const scratchedCards = storeCards.filter(c => c.status === 'Scratched').length;
    const redeemedCards = storeCards.filter(c => c.status === 'Redeemed').length;
    const totalValue = storeCards
      .filter(c => c.status === 'Redeemed' && c.rewardType === 'cash')
      .reduce((acc, current) => acc + (parseFloat(current.rewardValue) || 0), 0);

    return {
      totalCards,
      activeCards,
      scratchedCards,
      redeemedCards,
      totalValue
    };
  };

  const stats = getStats();

  return (
    <div className="scratch-cards">
      {/* Interactive Styles */}
      <style>{`
        .scratch-stat-card {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .scratch-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .scratch-stat-card.selected-stat {
          border: 2px solid #1976d2;
          background-color: #f0f7ff;
        }
        .scratch-stat-card.value.selected-stat {
          border-color: #2e7d32;
          background-color: #e8f5e9;
        }
      `}</style>

      {/* Header */}
      <div className="scratch-header">
        <div className="scratch-header-left">
          <h2>
            <Ticket className="header-icon" />
            Scratch Cards
          </h2>
          <p>Gamified rewards and employee engagement</p>
        </div>
        <div className="scratch-header-right">
          <button className="btn-primary" onClick={handleCreateCard}>
            <Plus size={20} strokeWidth={3} />
            Create Scratch Card
          </button>
        </div>
      </div>

      {/* Stats Cards - Interactive */}
      <div className="scratch-stats-grid">
        <div
          className={`scratch-stat-card total ${filterStatus === 'all' && filterType === 'all' ? 'selected-stat' : ''}`}
          onClick={() => { setFilterStatus('all'); setFilterType('all'); }}
        >
          <div className="scratch-stat-icon">
            <Ticket size={18} />
          </div>
          <div className="scratch-stat-content">
            <div className="scratch-stat-value">{stats.totalCards}</div>
            <div className="scratch-stat-label">Total Cards</div>
          </div>
        </div>

        <div
          className={`scratch-stat-card active ${filterStatus === 'Unredeemed' ? 'selected-stat' : ''}`}
          onClick={() => setFilterStatus('Unredeemed')}
        >
          <div className="scratch-stat-icon">
            <Star size={18} />
          </div>
          <div className="scratch-stat-content">
            <div className="scratch-stat-value">{stats.activeCards}</div>
            <div className="scratch-stat-label">Active</div>
          </div>
        </div>

        <div
          className={`scratch-stat-card scratched ${filterStatus === 'Scratched' ? 'selected-stat' : ''}`}
          onClick={() => setFilterStatus('Scratched')}
        >
          <div className="scratch-stat-icon">
            <MousePointer2 size={18} />
          </div>
          <div className="scratch-stat-content">
            <div className="scratch-stat-value">{stats.scratchedCards}</div>
            <div className="scratch-stat-label">Scratched</div>
          </div>
        </div>

        <div
          className={`scratch-stat-card redeemed ${filterStatus === 'Redeemed' && filterType === 'all' ? 'selected-stat' : ''}`}
          onClick={() => { setFilterStatus('Redeemed'); setFilterType('all'); }}
        >
          <div className="scratch-stat-icon">
            <Gift size={18} />
          </div>
          <div className="scratch-stat-content">
            <div className="scratch-stat-value">{stats.redeemedCards}</div>
            <div className="scratch-stat-label">Redeemed</div>
          </div>
        </div>

        <div
          className={`scratch-stat-card value ${filterStatus === 'Redeemed' && filterType === 'cash' ? 'selected-stat' : ''}`}
          onClick={() => { setFilterStatus('Redeemed'); setFilterType('cash'); }}
          title="Click to view redeemed Cash rewards"
        >
          <div className="scratch-stat-icon">
            <DollarSign size={18} />
          </div>
          <div className="scratch-stat-content">
            <div className="scratch-stat-value">${stats.totalValue}</div>
            <div className="scratch-stat-label">Total Value Redeemed</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="scratch-filters">
        <input
          type="text"
          placeholder="Search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input-scratch"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select-scratch"
        >
          <option value="all">All Status</option>
          {cardStatuses.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select-scratch"
        >
          <option value="all">All Types</option>
          {rewardTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      <div className="scratch-cards-grid">
        {filteredCards.length === 0 ? (
          <div className="empty-state-scratch">
            <Ticket size={48} />
            <p>No scratch cards found</p>
            <button className="btn-primary" onClick={handleCreateCard}>
              <Plus size={18} />
              Create First Card
            </button>
          </div>
        ) : (() => {
          // #r Group cards by employee and approximate creation time
          const groups = [];
          const sortedCards = [...filteredCards].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          sortedCards.forEach(card => {
            const timeDiff = 2000; // 2 seconds leeway for grouped cards
            const existingGroup = groups.find(g => {
              // Group by batchId if available (Most reliable)
              if (card.batchId && g.batchId === card.batchId) return true;
              
              // Fallback to time-based matching for older records or if batchId missing
              return !card.batchId && !g.batchId && 
                g.employeeId === card.employeeId && 
                Math.abs(new Date(g.createdAt).getTime() - new Date(card.createdAt).getTime()) < timeDiff;
            });
            
            if (existingGroup) {
              existingGroup.cards.push(card);
            } else {
              groups.push({
                ...card,
                cards: [card]
              });
            }
          });

          return groups.map(group => {
            const isGroup = group.cards.length > 1;
            const card = group.cards[0];
            const typeInfo = getRewardTypeInfo(card.rewardType || card.options?.[0]?.rewardType);
            const statusInfo = getStatusInfo(card.status);

            return (
              <div
                key={group._id || group.id}
                className={`scratch-card-item ${card.status} ${isGroup ? 'grouped-assignment' : ''}`}
                onClick={() => setFullViewCard(group)}
              >
                <div className="scratch-card-header">
                  <div className="header-badges">
                    <span
                      className="reward-type-badge"
                      style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}
                    >
                      <typeInfo.icon size={12} />
                      {isGroup ? `${group.cards.length} Rewards` : typeInfo.label}
                    </span>
                    <span
                      className="status-badge-scratch"
                      style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
                    >
                      <statusInfo.icon size={12} />
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="card-quick-actions">
                    <button 
                      className="icon-action-btn" 
                      onClick={(e) => handleEditClick(e, card)}
                      title="Edit Card"
                    >
                      <Edit3 size={14} />
                    </button>
                    <Maximize2 size={14} className="maximize-icon" />
                  </div>
                </div>

                <div className="scratch-card-visual">
                  <div className="reward-content-scratch">
                    <div className="reward-revealed">
                      {isGroup ? (
                        <div className="grouped-images-row">
                          {group.cards.slice(0, 3).map((c, i) => {
                            const imgPath = c.images?.[0]; // Schema uses 'images' array
                            const isFullUrl = imgPath?.startsWith('http');
                            const imgSrc = isFullUrl ? imgPath : (imgPath ? `${API_URL}/${imgPath.replace(/\\/g, '/')}` : null);
                            
                            return imgPath ? (
                              <div key={c._id || c.id} className="mini-photo-wrapper">
                                <img
                                  src={imgSrc}
                                  alt={`Reward ${i + 1}`}
                                  className="mini-reward-photo"
                                />
                                <div className="mini-reward-tag">{getRewardDisplay(c)}</div>
                              </div>
                            ) : (
                              <div key={c._id || c.id} className="mini-photo-placeholder">
                                <Gift size={16} />
                                <span>{getRewardDisplay(c)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const imgPath = card.images?.[0];
                            if (!imgPath) return <typeInfo.icon size={32} style={{ color: typeInfo.color }} />;
                            
                            const isFullUrl = imgPath.startsWith('http');
                            const imgSrc = isFullUrl ? imgPath : `${API_URL}/${imgPath.replace(/\\/g, '/')}`;
                            
                            return (
                              <img
                                src={imgSrc}
                                alt="Reward"
                                className="reward-image-display"
                              />
                            );
                          })()}
                          <div className="reward-value" style={{ color: typeInfo.color }}>
                            {getRewardDisplay(card)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="scratch-card-content">
                  <h3 className="card-title">
                    {isGroup ? 'Multi-Reward Assignment' : card.title}
                  </h3>
                  <p className="card-description">
                    {isGroup 
                      ? `Batch assignment containing ${group.cards.length} distinct scratch cards.`
                      : card.description}
                  </p>

                  <div className="card-meta">
                    <div className="meta-item-scratch">
                      <Users size={12} />
                      {card.employeeName}
                    </div>
                    <div className="meta-item-scratch">
                      <Calendar size={12} />
                      Expires {formatDate(card.validUntil)}
                    </div>
                  </div>
                </div>

                <div className="scratch-card-footer">
                   <button
                    className="card-action-btn edit"
                    onClick={(e) => handleEditClick(e, card)}
                  >
                    <Edit3 size={16} />
                    Update
                  </button>
                  <button
                    className="card-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCard(isGroup ? group.cards.map(c => c._id || c.id) : (card._id || card.id));
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={20} className="header-icon" />
                Create Scratch Card
              </h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createCard}>
              <div className="modal-body modal-scrollable">
                <div className="batch-options-container">
                  {cardOptions.map((opt, index) => (
                    <div key={index} className="reward-option-card">
                      <div className="option-header">
                        <span className="option-number">Option {index + 1} {index === 0 && <span className="required-tag">(Required)</span>}</span>
                      </div>
                      <div className="form-grid">
                        <div className="form-group full-width">
                          <label>
                            <Ticket size={14} />
                            Reward Title
                          </label>
                          <input
                            type="text"
                            name="title"
                            value={opt.title}
                            onChange={(e) => handleOptionChange(index, e)}
                            placeholder="e.g., Performance Bonus, Shoe Voucher"
                            required={index === 0}
                          />
                        </div>

                        <div className="form-group full-width">
                          <label>
                            <AlertCircle size={14} />
                            Description
                          </label>
                          <textarea
                            name="description"
                            value={opt.description}
                            onChange={(e) => handleOptionChange(index, e)}
                            placeholder="Motivational message..."
                            rows="2"
                            required={index === 0}
                          />
                        </div>

                        <div className="form-grid-three">
                          <div className="form-group">
                            <label><Sparkles size={14} /> Type</label>
                            <select
                              name="rewardType"
                              value={opt.rewardType}
                              onChange={(e) => handleOptionChange(index, e)}
                            >
                              {rewardTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label><DollarSign size={14} /> Value</label>
                            <input
                              type="text"
                              name="rewardValue"
                              value={opt.rewardValue}
                              onChange={(e) => handleOptionChange(index, e)}
                              placeholder="500, Gold, etc."
                            />
                          </div>

                          <div className="form-group">
                            <label><Ticket size={14} /> Code</label>
                            <input
                              type="text"
                              name="code"
                              value={opt.code}
                              onChange={(e) => handleOptionChange(index, e)}
                              placeholder="CODE123"
                            />
                          </div>
                        </div>

                        <div className="form-group full-width">
                          <label><Plus size={14} /> Reward Image</label>
                          <input
                            type="file"
                            name="image"
                            onChange={(e) => handleOptionChange(index, e)}
                            accept="image/*"
                            className="file-input-scratch"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="batch-settings-divider">
                  <span>Batch Assignment Settings</span>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      <Calendar size={14} />
                      Valid Until <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <Plus size={14} strokeWidth={3} />
                      Max Redemptions
                    </label>
                    <input
                      type="number"
                      value={maxRedemptions}
                      onChange={(e) => setMaxRedemptions(e.target.value)}
                      min="1"
                    />
                  </div>
                </div>

                  <div className="info-box">
                    <Info size={18} />
                    <div>
                      Each reward option filled above will create a <strong>SEPARATE</strong> scratch card for the assigned employees.
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
                  <ArrowRight size={16} />
                  Next: Assign Employees
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Users size={20} className="header-icon" />
                Assign to Employees
              </h3>
              <button className="modal-close-btn" onClick={() => setShowAssignModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="card-preview-box batch-preview">
                <h4>Batch Summary:</h4>
                <div className="batch-preview-list">
                  {cardOptions.map((opt, i) => opt.title && (
                    <div key={i} className="batch-preview-item">
                      <span className="bullet">{i + 1}</span>
                      <span className="title">{opt.title}</span>
                      <span className="badge">{getRewardTypeInfo(opt.rewardType).label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="assign-controls">
                <button className="btn-select-all" onClick={selectAllEmployees}>
                  {assignForm.employeeIds.length === employees.length ? (
                    <>
                      <X size={16} />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <CheckCheck size={16} />
                      Select All
                    </>
                  )}
                </button>
                <span className="selection-count">
                  {assignForm.employeeIds.length} employee(s) selected
                </span>
              </div>

              <div className="employees-grid-assign">
                {employees.map(employee => (
                  <div
                    key={employee._id}
                    className={`employee-card-assign ${assignForm.employeeIds.includes(employee._id) ? 'selected' : ''
                      }`}
                    onClick={() => toggleEmployeeSelection(employee._id)}
                  >
                    <div className="employee-avatar-assign">
                      {employee.name.charAt(0)}
                    </div>
                    <div className="employee-name-assign">{employee.name}</div>
                    {assignForm.employeeIds.includes(employee._id) && (
                      <div className="selected-check">
                        <CheckCircle size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={assignCards}
                disabled={isAssigning}
              >
                {isAssigning ? (
                  <>
                    <div className="spinner-mini"></div>
                    Uploading to Cloudinary...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Assign Cards ({assignForm.employeeIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Card Modal */}
      {showUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Edit3 size={20} className="header-icon" />
                Update Scratch Card
              </h3>
              <button className="modal-close-btn" onClick={() => setShowUpdateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitUpdate}>
              <div className="modal-body modal-scrollable">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>
                      <Ticket size={14} />
                      Reward Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleUpdateChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>
                      <AlertCircle size={14} />
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleUpdateChange}
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-grid-three">
                    <div className="form-group">
                      <label><Sparkles size={14} /> Type</label>
                      <select
                        name="rewardType"
                        value={editForm.rewardType}
                        onChange={handleUpdateChange}
                      >
                        {rewardTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label><DollarSign size={14} /> Value</label>
                      <input
                        type="text"
                        name="rewardValue"
                        value={editForm.rewardValue}
                        onChange={handleUpdateChange}
                      />
                    </div>

                    <div className="form-group">
                      <label><Ticket size={14} /> Code</label>
                      <input
                        type="text"
                        name="code"
                        value={editForm.code}
                        onChange={handleUpdateChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label><Calendar size={14} /> Valid Until</label>
                    <input
                      type="date"
                      name="validUntil"
                      value={editForm.validUntil}
                      onChange={handleUpdateChange}
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label><Plus size={14} /> Change Image (Optional)</label>
                    <input
                      type="file"
                      name="images"
                      onChange={handleUpdateChange}
                      accept="image/*"
                      className="file-input-scratch"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <div className="spinner-mini"></div>
                      Updating Card...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full View Overlay */}
      {fullViewCard && (
        <div className="full-view-overlay" onClick={() => setFullViewCard(null)}>
          <div className="full-view-container" onClick={(e) => e.stopPropagation()}>
            <button className="full-view-close" onClick={() => setFullViewCard(null)}>
              <X size={24} />
            </button>
            
            <div className="full-view-content">
              <div className="full-view-left">
                {fullViewCard.cards.length > 1 ? (
                   <div className="full-view-images-vertical">
                     {fullViewCard.cards.map((c, i) => {
                       const imgPath = c.images?.[0];
                       const isFullUrl = imgPath?.startsWith('http');
                       const imgSrc = isFullUrl ? imgPath : (imgPath ? `${API_URL}/${imgPath.replace(/\\/g, '/')}` : null);

                       return (
                         <div key={i} className="full-view-image-card-vertical">
                           <div className="fv-image-side">
                             {imgPath ? (
                               <img src={imgSrc} alt="Reward" />
                             ) : (
                               <Gift size={32} color="#cbd5e0" />
                             )}
                           </div>
                           <div className="full-view-image-info">
                             <span className="fv-reward-title">{c.title}</span>
                             <span className="fv-reward-value">{getRewardDisplay(c)}</span>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                ) : (
                  <div className="full-view-main-image">
                    {(() => {
                      const card0 = fullViewCard.cards[0];
                      const imgPath = card0.images?.[0];
                      const isFullUrl = imgPath?.startsWith('http');
                      const imgSrc = isFullUrl ? imgPath : (imgPath ? `${API_URL}/${imgPath.replace(/\\/g, '/')}` : null);
                      
                      return imgPath ? (
                        <img src={imgSrc} alt="Reward" />
                      ) : (
                        <div className="img-placeholder-full"><Gift size={80} /></div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="full-view-right">
                <div className="full-view-header">
                  <span className="status-badge-full">{fullViewCard.status}</span>
                  <h2>{fullViewCard.cards.length > 1 ? 'Reward Batch' : fullViewCard.title}</h2>
                  <p className="employee-name-full">Assigned to: {fullViewCard.employeeName}</p>
                </div>

                <div className="full-view-details">
                  <div className="detail-section">
                    <h4>Description</h4>
                    <p>{fullViewCard.description}</p>
                  </div>

                  <div className="detail-grid-full">
                    <div className="detail-item-full">
                      <span className="label">Reward Type</span>
                      <span className="value">{getRewardTypeInfo(fullViewCard.rewardType).label}</span>
                    </div>
                    <div className="detail-item-full">
                      <span className="label">Value</span>
                      <span className="value">{getRewardDisplay(fullViewCard.cards[0])}</span>
                    </div>
                    <div className="detail-item-full">
                      <span className="label">Created On</span>
                      <span className="value">{formatDate(fullViewCard.createdAt)}</span>
                    </div>
                    <div className="detail-item-full">
                      <span className="label">Expires On</span>
                      <span className="value">{formatDate(fullViewCard.validUntil)}</span>
                    </div>
                  </div>

                  {fullViewCard.cards.length > 1 && (
                    <div className="batch-rewards-list-full">
                      <h4>All Rewards in Batch</h4>
                      <div className="mini-cards-list">
                        {fullViewCard.cards.map((c, i) => (
                          <div key={i} className="mini-card-detail">
                            <span className="mini-title">{c.title}</span>
                            <span className="mini-value">{getRewardDisplay(c)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="full-view-footer">
                  <button className="btn-edit-full" onClick={(e) => handleEditClick(e, fullViewCard.cards[0])}>
                    <Edit3 size={18} />
                    Edit Details
                  </button>
                  <button 
                    className="btn-delete-full" 
                    onClick={() => {
                       deleteCard(fullViewCard.cards.map(c => c._id || c.id));
                       setFullViewCard(null);
                    }}
                  >
                    <Trash size={18} />
                    Delete Card
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScratchCards;