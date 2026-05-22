import React, { useState, useEffect } from 'react';
import {
  FaCheck, FaTimes, FaArrowRight, FaInbox,
  FaChevronDown, FaChevronUp, FaRegCalendarAlt,
  FaSearch, FaSpinner, FaBriefcase, FaUndo, FaMoneyBillWave
} from 'react-icons/fa';
import { getAllSalaryRequests, approveSalary, rejectSalary, getMonthlySalaries, markAsPaid } from '../../services/salaryAPI'; // #r Updated imports

// --- Utility Functions ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (current, proposed) => {
  const percent = ((proposed - current) / current) * 100;
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
};

// --- Sub-Component: Status Badge ---
const StatusBadge = ({ status }) => {
  const styles = {
    pending: { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5', icon: null },
    processing: { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5', icon: <FaSpinner className="fa-spin" size={10} /> },
    approved: { bg: '#dcfce7', text: '#165d3c', border: '#bbf7d0', icon: <FaCheck size={10} /> },
    paid: { bg: '#dcfce7', text: '#165d3c', border: '#bbf7d0', icon: <FaCheck size={10} /> },
    rejected: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', icon: <FaTimes size={10} /> },
  };
  const config = styles[status] || styles.pending;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
      borderRadius: '99px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
      letterSpacing: '0.02em', backgroundColor: config.bg, color: config.text, border: `1px solid ${config.border}`
    }}>
      {config.icon}
      <span>{status}</span>
    </span>
  );
};

// --- Main Component ---
const SalaryApprovals = () => {
  // --- State Management ---
  const [requests, setRequests] = useState([]); // Salary Change Requests
  const [payrolls, setPayrolls] = useState([]); // Monthly Payroll Requests
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payroll'); // Default to payroll based on user query
  const [expandedId, setExpandedId] = useState(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // --- Load Real Data from Backend (with 10-second polling) ---
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // #r Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    // We don't want to set loading true effectively on every poll as it flickers
    // Only set on first load if needed, or handle gracefully
    if (requests.length === 0 && payrolls.length === 0) setLoading(true);

    try {
      // 1. Fetch Salary Change Requests
      const reqResponse = await getAllSalaryRequests();
      const mappedRequests = (reqResponse.data || []).map(req => ({
        id: req._id,
        type: 'change', // Distinguish type
        employee: req.employeeName,
        designation: req.employeeId?.position || 'Employee',
        current: req.employeeId?.monthlySalary || 0,
        proposed: req.baseSalary,
        date: new Date(req.createdAt).toLocaleDateString(),
        joiningDate: req.employeeId?.joiningDate ? new Date(req.employeeId.joiningDate).toLocaleDateString() : 'N/A',
        status: req.status,
        reason: req.reason,
        actionDate: req.paymentDate ? new Date(req.paymentDate).toLocaleDateString() : null
      }));
      setRequests(mappedRequests);

      // 2. Fetch Monthly Payrolls (Pending/Processing)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const payResponse = await getMonthlySalaries(currentMonth); // Default to current month, or fetch all pending?
      // Ideally backend endpoint for "all pending payrolls" is better, but for now filtering current month
      // NOTE: User might have processed last month. Let's fetch last month too or rely on a "pending" endpoint if it existed. 
      // For now, we rely on the monthly fetch provided.

      const mappedPayrolls = (payResponse.data || []).map(pay => ({
        id: pay._id || pay.id, // Handle potential ID differences
        type: 'payroll',
        employee: pay.employeeName,
        designation: pay.employeeId?.position || 'Employee',
        amount: pay.netSalary,
        month: pay.month,
        date: new Date(pay.createdAt || Date.now()).toLocaleDateString(),
        status: pay.status,
        details: pay // Store full object for details view
      }));
      setPayrolls(mappedPayrolls);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleAction = async (id, newStatus, e) => {
    e.stopPropagation();
    try {
      if (newStatus === 'approved') {
        await approveSalary(id);
        alert('✅ Salary change request approved!');
      } else {
        await rejectSalary(id);
        alert('✅ Salary change request rejected.');
      }
      fetchAllData();
    } catch (err) {
      console.error(`Error ${newStatus} salary:`, err);
      alert(`❌ Failed to ${newStatus} salary`);
    }
  };

  const handlePayrollAction = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Approve and mark this payroll as PAID?")) {
      try {
        await markAsPaid(id);
        alert('✅ Payroll approved and marked as Paid!');
        fetchAllData();
      } catch (err) {
        console.error('Error paying salary:', err);
        alert('❌ Failed to approve payment');
      }
    }
  }

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDesignationFilter('');
    setDateFilter('');
  };

  // --- Filter Logic ---
  const getVisibleItems = () => {
    let items = [];
    if (activeTab === 'payroll') {
      items = payrolls.filter(p => p.status === 'pending' || p.status === 'processing'); // Show pending payrolls
    } else if (activeTab === 'changes') {
      items = requests.filter(r => r.status === 'pending'); // Show pending changes
    } else {
      // History
      items = [...payrolls.filter(p => p.status === 'paid'), ...requests.filter(r => r.status !== 'pending')];
    }

    return items.filter(req => {
      const matchesName = (req.employee || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDesignation = designationFilter ? (req.designation || '').toLowerCase().includes(designationFilter.toLowerCase()) : true;
      // Date filter logic can be refined based on 'req.date' parsing
      return matchesName && matchesDesignation;
    });
  };

  const visibleItems = getVisibleItems();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', minHeight: '400px' }}>
        <FaSpinner className="fa-spin" style={{ fontSize: '40px', color: '#165d3c', marginBottom: '16px' }} />
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', fontFamily: 'Inter, sans-serif' }}>Loading Approvals...</p>
      </div>
    );
  }

  return (
    <div className="approvals-wrapper">
      {/* ... styles kept same ... */}
      <style>{`
        /* ... Reuse previous styles ... */
        .approvals-wrapper { padding: 0; width: 100%; background: var(--bg-light); min-height: 100%; font-family: 'Inter', sans-serif; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
        .page-title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
        .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
        .toolbar { background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); gap: 16px; flex-wrap: wrap; }
        .inputs-group { display: flex; gap: 10px; align-items: center; flex: 1; }
        .inline-input { height: 38px; padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; font-size: 13px; color: #1e293b; }
        .tabs-container { display: flex; gap: 8px; background: #f1f5f9; padding: 4px; border-radius: 8px; }
        .tab-btn { padding: 6px 16px; border-radius: 6px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .tab-btn.active { background: white; color: #165d3c; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .tab-btn.inactive { background: transparent; color: #64748b; }
        .data-card { background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
        .grid-header { display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 40px; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .grid-row { display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 40px; padding: 16px 24px; align-items: center; border-bottom: 1px solid #e2e8f0; cursor: pointer; }
        .grid-row:hover { background-color: #f8fafc; }
        .grid-row.expanded { background-color: #f0fdf4; }
        .details-panel { padding: 0 24px 24px 24px; background: #f0fdf4; border-bottom: 1px solid #e2e8f0; }
        .details-inner { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; fontWeight: 600; cursor: pointer; border: 1px solid transparent; display: flex; items-center; gap: 8px; }
        .btn-solid { background: #165d3c; color: white; }
        `}</style>

      {/* --- HEADER --- */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Approvals</h2>
          <p className="page-subtitle">Manage payroll disbursements and salary changes.</p>
        </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="toolbar">
        <div className="inputs-group">
          <input type="text" className="inline-input" placeholder="Search Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <input type="text" className="inline-input" placeholder="Position..." value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)} />
          {(searchTerm || designationFilter) && <button onClick={clearFilters} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><FaUndo color="#64748b" /></button>}
        </div>

        {/* Tab Switcher */}
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'payroll' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('payroll')}>
            Payroll ({payrolls.filter(p => p.status === 'pending').length})
          </button>
          <button className={`tab-btn ${activeTab === 'changes' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('changes')}>
            Changes ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('history')}>
            History
          </button>
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="data-card">
        <div className="grid-header" style={{ gridTemplateColumns: activeTab === 'payroll' ? '2fr 1.5fr 1.5fr 1fr 1fr 40px' : '2fr 1.5fr 1fr 1fr 1fr 40px' }}>
          <div>Employee</div>
          <div>Designation</div>
          {activeTab === 'payroll' ? (
            <>
              <div>Month</div>
              <div>Net Pay</div>
            </>
          ) : (
            <>
              <div>Current</div>
              <div>Proposed</div>
            </>
          )}
          <div>Status</div>
          <div></div>
        </div>

        {visibleItems.length > 0 ? (
          visibleItems.map((item) => (
            <React.Fragment key={`${item.type}-${item.id}`}>
              <div className={`grid-row ${expandedId === item.id ? 'expanded' : ''}`} onClick={() => toggleRow(item.id)}
                style={{ gridTemplateColumns: activeTab === 'payroll' ? '2fr 1.5fr 1.5fr 1fr 1fr 40px' : '2fr 1.5fr 1fr 1fr 1fr 40px' }}>
                <div>
                  <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{item.employee}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{item.date}</div>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{item.designation}</div>

                {item.type === 'payroll' ? (
                  <>
                    <div style={{ fontSize: '13px', color: '#1e293b' }}>{item.month || '-'}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#165d3c' }}>{formatCurrency(item.amount)}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '14px', color: '#1e293b' }}>{formatCurrency(item.current)}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>
                      {formatCurrency(item.proposed)}
                      <span style={{ fontSize: '11px', color: '#165d3c', marginLeft: '6px' }}>{formatPercent(item.current, item.proposed)}</span>
                    </div>
                  </>
                )}

                <div><StatusBadge status={item.status} /></div>
                <div style={{ color: '#94a3b8' }}>{expandedId === item.id ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}</div>
              </div>

              {expandedId === item.id && (
                <div className="details-panel">
                  <div className="details-inner">
                    {item.type === 'payroll' ? (
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#165d3c', marginBottom: '12px' }}>Payroll Details</h4>
                        <p style={{ fontSize: '13px' }}>Base Salary: {formatCurrency(item.details.baseSalary)}</p>
                        <p style={{ fontSize: '13px' }}>Bonus: {formatCurrency(item.details.bonus)}</p>
                        <p style={{ fontSize: '13px' }}>Deductions: {formatCurrency(item.details.deductions)}</p>
                        <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                          {item.status === 'pending' || item.status === 'processing' ? (
                            <button className="btn btn-solid" onClick={(e) => handlePayrollAction(item.id, e)}>
                              <FaCheck /> Approve Payout
                            </button>
                          ) : (
                            <span style={{ fontSize: '13px', color: '#64748b' }}>Payout Completed on {new Date(item.details.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="reason-text"><strong>Justification:</strong> {item.reason}</p>
                        <div className="action-footer">
                          {item.status === 'pending' && (
                            <>
                              <button className="btn" style={{ border: '1px solid #ef4444', color: '#ef4444', background: 'white' }} onClick={(e) => handleAction(item.id, 'rejected', e)}>Reject</button>
                              <button className="btn btn-solid" onClick={(e) => handleAction(item.id, 'approved', e)}>Approve Raise</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <FaInbox size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
            <p>No records found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryApprovals;