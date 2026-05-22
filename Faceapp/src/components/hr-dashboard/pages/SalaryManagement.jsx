import { useState, useEffect } from 'react';
import axios from 'axios';
import './SalaryManagement.css';
import { getMonthlySalaries, processSalary as apiProcessSalary, markAsPaid as apiMarkAsPaid, requestSalaryChange } from '../../services/salaryAPI';
import { getAllEmployees } from '../../services/employeeAPI';
import { baseURL } from '../../services/axiosClient';
import { useSettings } from '../../../context/SettingsContext';

const SalaryManagement = ({ selectedStore }) => {
  // Use global settings context for currency formatting
  const { formatCurrency: globalFormatCurrency, formatDate: globalFormatDate, settings } = useSettings();

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  // 1. New State for Payment Date Filter
  const [filterPaymentDate, setFilterPaymentDate] = useState('');
  const [activeStatFilter, setActiveStatFilter] = useState('all'); // #r Added for stat card filtering

  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditSalaryModal, setShowEditSalaryModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const [salaryForm, setSalaryForm] = useState({
    baseSalary: 0,
    allowances: 0,
    bonus: 0,
    deductions: 0,
    overtimeHours: 0,
    overtimeRate: 0,
    reason: ''
  });

  const departments = [
    'Engineering',
    'Sales',
    'Marketing',
    'HR',
    'Finance',
    'Operations',
    'IT',
    'Customer Support'
  ];

  const paymentStatuses = [
    { value: 'pending', label: 'Pending', color: '#f57c00', icon: 'fa-clock' },
    { value: 'approved', label: 'Approved', color: '#1976d2', icon: 'fa-check-double' }, // #r Added approved status
    { value: 'processing', label: 'Processing', color: '#1976d2', icon: 'fa-spinner' },
    { value: 'paid', label: 'Paid', color: '#2e7d32', icon: 'fa-check-circle' },
    { value: 'failed', label: 'Failed', color: '#c62828', icon: 'fa-times-circle' }
  ];

  useEffect(() => {
    // #r Initialize by fetching employees and salary records for selected month
    fetchEmployees();
    fetchSalaryRecords();

    // #r Real-time polling for salary management
    const interval = setInterval(() => {
      fetchEmployees();
      fetchSalaryRecords();
    }, 10000); // 10s poll

    return () => clearInterval(interval);
  }, [filterMonth]);

  // 2. Add filterPaymentDate to dependency array
  useEffect(() => {
    filterEmployees();
  }, [employees, salaryRecords, searchQuery, filterDepartment, filterMonth, filterPaymentDate, activeStatFilter, selectedStore]);

  const fetchSalaryRecords = async () => {
    try {
      const response = await getMonthlySalaries(filterMonth);
      setSalaryRecords(response.data);
    } catch (err) {
      console.error('Error fetching salary records:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await getAllEmployees();
      // #r Map backend monthlySalary to frontend baseSalary field
      const mappedEmployees = data.map(emp => ({
        ...emp,
        baseSalary: emp.monthlySalary || 0
      }));
      setEmployees(mappedEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  // #r Mock data generator removed to favor real API data

  // 3. Updated Filter Logic
  const filterEmployees = () => {
    let filtered = [...employees];

    // Filter by Search Query
    if (searchQuery) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by Department
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(emp => emp.department === filterDepartment);
    }

    // Store Filter
    if (selectedStore && selectedStore !== 'All Stores') {
      filtered = filtered.filter(emp =>
        (emp.storeName === selectedStore) ||
        (emp.branchName === selectedStore) ||
        (emp.department === selectedStore)
      );
    }

    // #r Apply stat card filtering
    if (activeStatFilter === 'paid') {
      filtered = filtered.filter(emp => {
        const record = salaryRecords.find(r => r.employeeId === emp._id && r.month === filterMonth);
        return record && record.status === 'paid';
      });
    } else if (activeStatFilter === 'pending') {
      filtered = filtered.filter(emp => {
        const record = salaryRecords.find(r => r.employeeId === emp._id && r.month === filterMonth);
        // #r Include 'approved' in pending (to be paid) list
        return !record || record.status === 'pending' || record.status === 'processing' || record.status === 'approved';
      });
    }

    // #r Attach Salary Records (Map)
    filtered = filtered.map(emp => {
      const record = salaryRecords.find(r =>
        r.employeeId === emp._id && r.month === filterMonth
      );
      return {
        ...emp,
        salaryRecord: record
      };
    });

    // Filter by Payment Date (Must be done AFTER mapping so we have the record)
    if (filterPaymentDate) {
      filtered = filtered.filter(emp => {
        // If no record or no payment date, exclude them
        if (!emp.salaryRecord || !emp.salaryRecord.paymentDate) {
          return false;
        }

        // Convert record date to YYYY-MM-DD string for comparison
        const recordDate = new Date(emp.salaryRecord.paymentDate).toISOString().split('T')[0];
        return recordDate === filterPaymentDate;
      });
    }

    setFilteredEmployees(filtered);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSalaryForm(prev => ({
      ...prev,
      [name]: name === 'reason' ? value : (parseFloat(value) || 0)
    }));
  };

  const calculateSalary = () => {
    const overtimePay = salaryForm.overtimeHours * salaryForm.overtimeRate;
    const grossSalary = salaryForm.baseSalary + salaryForm.allowances + salaryForm.bonus + overtimePay;
    const taxAmount = grossSalary * 0.15;
    const netSalary = grossSalary - salaryForm.deductions - taxAmount;

    return {
      overtimePay,
      grossSalary,
      taxAmount,
      netSalary
    };
  };

  const openProcessModal = (employee) => {
    setSelectedEmployee(employee);
    setSalaryForm({
      baseSalary: employee.baseSalary || 0,
      allowances: 0,
      bonus: 0,
      deductions: 0,
      overtimeHours: 0,
      overtimeRate: 0,
      reason: ''
    });
    setSelectedMonth(filterMonth);
    setShowProcessModal(true);
  };

  // #r Submit processed salary to backend
  const processSalary = async (e) => {
    e.preventDefault();
    const calculated = calculateSalary();

    try {
      await apiProcessSalary({
        employeeId: selectedEmployee._id,
        employeeName: selectedEmployee.name,
        month: selectedMonth,
        baseSalary: parseFloat(salaryForm.baseSalary),
        allowances: parseFloat(salaryForm.allowances),
        bonus: parseFloat(salaryForm.bonus),
        deductions: parseFloat(salaryForm.deductions),
        overtimeHours: parseFloat(salaryForm.overtimeHours),
        overtimeRate: parseFloat(salaryForm.overtimeRate),
        grossSalary: calculated.grossSalary,
        taxAmount: calculated.taxAmount,
        netSalary: calculated.netSalary,
        processedBy: 'HR Manager' // #r Should ideally come from auth context
      });

      setShowProcessModal(false);
      fetchSalaryRecords(); // #r Refresh list
      alert('✅ Salary processed successfully!');
    } catch (err) {
      console.error('Error processing salary:', err);
      alert('❌ Failed to process salary: ' + (err.response?.data?.msg || err.message));
    }
  };

  // #r Update status to "paid" in backend
  const markAsPaid = async (recordId) => {
    if (window.confirm('Are you sure you want to mark this salary as paid?')) {
      try {
        await apiMarkAsPaid(recordId);
        fetchSalaryRecords(); // #r Refresh list
        alert('✅ Salary marked as paid!');
      } catch (err) {
        console.error('Error marking as paid:', err);
        alert('❌ Failed to update payment status');
      }
    }
  };

  // ... (viewDetails, openEditSalary, updateBaseSalary, getStatusInfo, formatCurrency functions remain unchanged)
  const viewDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const openEditSalary = (employee) => {
    setSelectedEmployee(employee);
    setSalaryForm({
      baseSalary: employee.baseSalary || 0,
      allowances: 0,
      bonus: 0,
      deductions: 0,
      overtimeHours: 0,
      overtimeRate: 0,
      reason: ''
    });
    setShowEditSalaryModal(true);
  };

  // #r Submit salary change request to backend
  const updateBaseSalary = async (e) => {
    e.preventDefault();
    if (!salaryForm.reason.trim()) {
      alert('⚠️ Please provide a reason for salary change!');
      return;
    }

    try {
      await requestSalaryChange({
        employeeId: selectedEmployee._id,
        newSalary: salaryForm.baseSalary,
        reason: salaryForm.reason
      });

      setShowEditSalaryModal(false);
      alert('✅ Salary change request submitted successfully! (Awaiting approval)');
      fetchSalaryRecords(); // #r Refresh to show pending status if applicable
    } catch (err) {
      console.error('Error updating salary:', err);
      alert('❌ Failed to submit salary change request');
    }
  };

  const getStatusInfo = (status) => {
    return paymentStatuses.find(s => s.value === status) || paymentStatuses[0];
  };

  // Use global currency formatting from SettingsContext
  const formatCurrency = (amount) => {
    return globalFormatCurrency(amount);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatMonth = (month) => {
    return new Date(month + '-01').toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getStats = () => {
    let monthRecords = salaryRecords.filter(r => r.month === filterMonth);

    // #r Filter by selectedStore for consistent stat card display
    if (selectedStore && selectedStore !== 'All Stores') {
      monthRecords = monthRecords.filter(r => {
        const emp = employees.find(e => e._id === r.employeeId);
        return emp && (emp.storeName === selectedStore || emp.branchName === selectedStore || emp.department === selectedStore);
      });
    }

    const totalProcessed = monthRecords.length;
    const totalPaid = monthRecords.filter(r => r.status === 'paid').length;
    const totalPending = monthRecords.filter(r => r.status === 'pending').length;
    const totalAmount = monthRecords.reduce((sum, r) => sum + r.netSalary, 0);
    const paidAmount = monthRecords
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + r.netSalary, 0);

    return {
      totalProcessed,
      totalPaid,
      totalPending,
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount
    };
  };

  const stats = getStats();

  return (
    <div className="salary-management">
      {/* Header */}
      <div className="salary-header">
        <div className="salary-header-left">
          <h2>
            <i className="fas fa-dollar-sign"></i>
            Salary Management
          </h2>
          <p>Manage employee payroll and salary processing</p>
        </div>
        <div className="salary-header-right">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="month-selector"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const monthStr = date.toISOString().slice(0, 7);
              return (
                <option key={monthStr} value={monthStr}>
                  {formatMonth(monthStr)}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Stats Cards (unchanged) */}
      <div className="salary-stats-grid">
        <div
          className={`salary-stat-card total ${activeStatFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('all')}
          style={{ cursor: 'pointer' }}
        >
          <div className="salary-stat-icon">
            <i className="fas fa-users"></i>
          </div>
          <div className="salary-stat-content">
            <div className="salary-stat-value">{stats.totalProcessed}</div>
            <div className="salary-stat-label">Processed</div>
          </div>
        </div>
        <div
          className={`salary-stat-card paid ${activeStatFilter === 'paid' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('paid')}
          style={{ cursor: 'pointer' }}
        >
          <div className="salary-stat-icon">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="salary-stat-content">
            <div className="salary-stat-value">{stats.totalPaid}</div>
            <div className="salary-stat-label">Paid</div>
          </div>
        </div>
        <div
          className={`salary-stat-card pending ${activeStatFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveStatFilter('pending')}
          style={{ cursor: 'pointer' }}
        >
          <div className="salary-stat-icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="salary-stat-content">
            <div className="salary-stat-value">{stats.totalPending}</div>
            <div className="salary-stat-label">Pending</div>
          </div>
        </div>
        <div className="salary-stat-card amount">
          <div className="salary-stat-icon">
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="salary-stat-content">
            <div className="salary-stat-value">{formatCurrency(stats.totalAmount)}</div>
            <div className="salary-stat-label">Total Amount</div>
          </div>
        </div>
        <div className="salary-stat-card paid-amount">
          <div className="salary-stat-icon">
            <i className="fas fa-hand-holding-usd"></i>
          </div>
          <div className="salary-stat-content">
            <div className="salary-stat-value">{formatCurrency(stats.paidAmount)}</div>
            <div className="salary-stat-label">Paid Amount</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="salary-filters">
        <input
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input-salary"
        />

        {/* 4. New Payment Date Input */}
        <input
          type="date"
          value={filterPaymentDate}
          onChange={(e) => setFilterPaymentDate(e.target.value)}
          className="search-input-salary" // Reusing class for consistency, or add new class
          style={{ width: 'auto' }} // Inline style override if needed
          title="Filter by Payment Date"
        />

        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="filter-select-salary"
        >
          <option value="all">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Employees Table (unchanged) */}
      <div className="salary-table-container">
        <table className="salary-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Base Salary</th>
              <th>Net Salary</th>
              <th>Status</th>
              <th>Payment Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map(employee => {
                const record = employee.salaryRecord;
                const statusInfo = record ? getStatusInfo(record.status) : null;

                return (
                  <tr key={employee._id}>
                    {/* ... table row content same as before ... */}
                    <td>
                      <div className="employee-cell-salary">
                        <div className="employee-avatar-salary">
                          {employee.name.charAt(0)}
                        </div>
                        <div>
                          <div className="employee-name-salary">{employee.name}</div>
                          <div className="employee-id-salary">{employee._id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td>{employee.department}</td>
                    <td>
                      <span className="salary-amount">
                        {formatCurrency(employee.baseSalary)}
                      </span>
                    </td>
                    <td>
                      {record ? (
                        <span className="salary-amount highlight">
                          {formatCurrency(record.netSalary)}
                        </span>
                      ) : (
                        <span className="not-processed">Not Processed</span>
                      )}
                    </td>
                    <td>
                      {statusInfo ? (
                        <span
                          className="status-badge-salary"
                          style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
                        >
                          <i className={`fas ${statusInfo.icon}`}></i>
                          {statusInfo.label}
                        </span>
                      ) : (
                        <span className="status-badge-salary" style={{ background: '#f5f5f5', color: '#757575' }}>
                          <i className="fas fa-minus"></i>
                          Not Processed
                        </span>
                      )}
                    </td>
                    <td>
                      {record && record.paymentDate ? (
                        <span className="payment-date">{formatDate(record.paymentDate)}</span>
                      ) : (
                        <span className="not-processed">-</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        {!record ? (
                          <button
                            className="action-btn-salary process"
                            onClick={() => openProcessModal(employee)}
                          >
                            <i className="fas fa-calculator"></i>
                            Process
                          </button>
                        ) : record.status === 'pending' || record.status === 'processing' || record.status === 'approved' ? (
                          <>
                            <button
                              className="action-btn-salary paid"
                              onClick={() => markAsPaid(record.id || record._id)} // #r Handle both id formats
                            >
                              <i className="fas fa-check"></i>
                              Pay
                            </button>
                            <button
                              className="action-btn-salary view"
                              onClick={() => viewDetails(employee)}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          </>
                        ) : (
                          <button
                            className="action-btn-salary view"
                            onClick={() => viewDetails(employee)}
                          >
                            <i className="fas fa-eye"></i>
                            View
                          </button>
                        )}
                        <button
                          className="action-btn-salary edit"
                          onClick={() => openEditSalary(employee)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                  No employees found matching the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Process Salary Modal (unchanged) */}
      {showProcessModal && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setShowProcessModal(false)}>
          {/* ... modal content unchanged ... */}
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-calculator"></i>
                Process Salary - {selectedEmployee.name}
              </h3>
              <button className="modal-close-btn" onClick={() => setShowProcessModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            {/* ... rest of process modal form ... */}
            <form onSubmit={processSalary}>
              <div className="modal-body">
                {/* Form fields same as original */}
                <div className="salary-form-grid">
                  {/* ... fields ... */}
                  <div className="form-group">
                    <label>Base Salary</label>
                    <input type="number" name="baseSalary" value={salaryForm.baseSalary} onChange={handleInputChange} step="0.01" required />
                  </div>
                  <div className="form-group">
                    <label>Allowances</label>
                    <input type="number" name="allowances" value={salaryForm.allowances} onChange={handleInputChange} step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Bonus</label>
                    <input type="number" name="bonus" value={salaryForm.bonus} onChange={handleInputChange} step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Deductions</label>
                    <input type="number" name="deductions" value={salaryForm.deductions} onChange={handleInputChange} step="0.01" />
                  </div>
                  <div className="form-group">
                    <label>Overtime Hours</label>
                    <input type="number" name="overtimeHours" value={salaryForm.overtimeHours} onChange={handleInputChange} step="0.5" />
                  </div>
                  <div className="form-group">
                    <label>Overtime Rate (per hour)</label>
                    <input type="number" name="overtimeRate" value={salaryForm.overtimeRate} onChange={handleInputChange} step="0.01" />
                  </div>
                </div>
                {/* Calculation display */}
                <div className="salary-calculation">
                  {/* ... breakdown ... */}
                  <h4>Salary Breakdown</h4>
                  <div className="calculation-grid">
                    <div className="calc-item"><span className="calc-label">Base Salary:</span><span className="calc-value">{formatCurrency(salaryForm.baseSalary)}</span></div>
                    <div className="calc-item"><span className="calc-label">Allowances:</span><span className="calc-value">{formatCurrency(salaryForm.allowances)}</span></div>
                    <div className="calc-item"><span className="calc-label">Bonus:</span><span className="calc-value">{formatCurrency(salaryForm.bonus)}</span></div>
                    <div className="calc-item"><span className="calc-label">Overtime Pay:</span><span className="calc-value">{formatCurrency(calculateSalary().overtimePay)}</span></div>
                    <div className="calc-item total"><span className="calc-label">Gross Salary:</span><span className="calc-value">{formatCurrency(calculateSalary().grossSalary)}</span></div>
                    <div className="calc-item deduction"><span className="calc-label">Deductions:</span><span className="calc-value">-{formatCurrency(salaryForm.deductions)}</span></div>
                    <div className="calc-item deduction"><span className="calc-label">Tax (15%):</span><span className="calc-value">-{formatCurrency(calculateSalary().taxAmount)}</span></div>
                    <div className="calc-item final"><span className="calc-label">Net Salary:</span><span className="calc-value">{formatCurrency(calculateSalary().netSalary)}</span></div>
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Payment Month</label>
                  <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} max={new Date().toISOString().slice(0, 7)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowProcessModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary"><i className="fas fa-check"></i> Process Salary</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal (unchanged) */}
      {showDetailsModal && selectedEmployee && selectedEmployee.salaryRecord && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          {/* ... details modal content ... */}
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            {/* Header, Body (Earnings, Deductions), Footer */}
            <div className="modal-header">
              <h3><i className="fas fa-file-invoice-dollar"></i> Salary Details - {selectedEmployee.name}</h3>
              <button className="modal-close-btn" onClick={() => setShowDetailsModal(false)}><i className="fas fa-times"></i></button>
            </div>
            {/* ... body content same as original ... */}
            <div className="modal-body">
              {/* Reusing existing logic for body content */}
              <div className="details-header-salary">
                <div className="employee-info-details">
                  <div className="employee-avatar-details">{selectedEmployee.name.charAt(0)}</div>
                  <div>
                    <h3>{selectedEmployee.name}</h3>
                    <p>{selectedEmployee.department}</p>
                    <p className="account-info">{selectedEmployee.accountNumber} - {selectedEmployee.bankName}</p>
                  </div>
                </div>
                {/* Status Badge */}
                <div className="status-info-details">
                  <span className="status-badge-large" style={{ background: `${getStatusInfo(selectedEmployee.salaryRecord.status).color}20`, color: getStatusInfo(selectedEmployee.salaryRecord.status).color }}>
                    <i className={`fas ${getStatusInfo(selectedEmployee.salaryRecord.status).icon}`}></i> {getStatusInfo(selectedEmployee.salaryRecord.status).label}
                  </span>
                </div>
              </div>
              {/* Grids for earnings/deductions */}
              <div className="salary-details-grid">
                <div className="detail-section">
                  <h4>Earnings</h4>
                  <div className="detail-items">
                    <div className="detail-row"><span>Base Salary</span><span className="amount">{formatCurrency(selectedEmployee.salaryRecord.baseSalary)}</span></div>
                    <div className="detail-row"><span>Allowances</span><span className="amount">{formatCurrency(selectedEmployee.salaryRecord.allowances)}</span></div>
                    <div className="detail-row"><span>Bonus</span><span className="amount">{formatCurrency(selectedEmployee.salaryRecord.bonus)}</span></div>
                    <div className="detail-row">
                      <span>
                        Overtime ({selectedEmployee.salaryRecord.overtimeHours}h @ {formatCurrency(selectedEmployee.salaryRecord.overtimeRate)}/h)
                      </span>
                      <span className="amount">
                        {formatCurrency(selectedEmployee.salaryRecord.overtimePay || (selectedEmployee.salaryRecord.overtimeHours * selectedEmployee.salaryRecord.overtimeRate))}
                      </span>
                    </div>
                    <div className="detail-row total"><span>Gross Salary</span><span className="amount">{formatCurrency(selectedEmployee.salaryRecord.grossSalary)}</span></div>
                  </div>
                </div>
                <div className="detail-section">
                  <h4>Deductions</h4>
                  <div className="detail-items">
                    <div className="detail-row"><span>Deductions</span><span className="amount deduction">-{formatCurrency(selectedEmployee.salaryRecord.deductions)}</span></div>
                    <div className="detail-row"><span>Tax (15%)</span><span className="amount deduction">-{formatCurrency(selectedEmployee.salaryRecord.taxAmount)}</span></div>
                    <div className="detail-row total"><span>Total Deductions</span><span className="amount deduction">-{formatCurrency(selectedEmployee.salaryRecord.deductions + selectedEmployee.salaryRecord.taxAmount)}</span></div>
                  </div>
                </div>
              </div>
              <div className="net-salary-display">
                <span className="net-label">Net Salary</span>
                <span className="net-amount">{formatCurrency(selectedEmployee.salaryRecord.netSalary)}</span>
              </div>
              <div className="payment-info-grid">
                <div className="info-item-salary"><i className="far fa-calendar"></i><div><div className="info-label">Payment Month</div><div className="info-value">{formatMonth(selectedEmployee.salaryRecord.month)}</div></div></div>
                {selectedEmployee.salaryRecord.paymentDate && (<div className="info-item-salary"><i className="far fa-calendar-check"></i><div><div className="info-label">Payment Date</div><div className="info-value">{formatDate(selectedEmployee.salaryRecord.paymentDate)}</div></div></div>)}
                {selectedEmployee.salaryRecord.processedBy && (<div className="info-item-salary"><i className="fas fa-user-tie"></i><div><div className="info-label">Processed By</div><div className="info-value">{selectedEmployee.salaryRecord.processedBy}</div></div></div>)}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
              <button className="btn-primary" onClick={() => window.print()}><i className="fas fa-print"></i> Print Slip</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Modal (unchanged) */}
      {showEditSalaryModal && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setShowEditSalaryModal(false)}>
          {/* ... edit modal content ... */}
          <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-edit"></i> Edit Base Salary - {selectedEmployee.name}</h3>
              <button className="modal-close-btn" onClick={() => setShowEditSalaryModal(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={updateBaseSalary}>
              <div className="modal-body">
                {/* ... input fields ... */}
                <div className="form-group">
                  <label>Current Base Salary</label>
                  <input type="text" value={formatCurrency(selectedEmployee.baseSalary)} disabled style={{ background: '#f5f5f5', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>New Base Salary <span className="required">*</span></label>
                  <input type="number" name="baseSalary" value={salaryForm.baseSalary} onChange={handleInputChange} step="0.01" min="0" required />
                </div>
                <div className="form-group">
                  <label>Reason for Change <span className="required">*</span></label>
                  <textarea name="reason" value={salaryForm.reason} onChange={handleInputChange} placeholder="e.g., Annual increment..." rows="4" required style={{ width: '100%', padding: '8px 10px', border: '2px solid var(--border-light)', borderRadius: 'var(--radius-md)' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditSalaryModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary"><i className="fas fa-save"></i> Update Salary</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;