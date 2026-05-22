export const generateMockData = () => {
  const stores = [
    { id: 1, name: 'Downtown Store', location: 'New York, NY', employees: 45, managers: 3, status: 'active' },
    { id: 2, name: 'Westside Branch', location: 'Los Angeles, CA', employees: 38, managers: 2, status: 'active' },
    { id: 3, name: 'Central Plaza', location: 'Chicago, IL', employees: 52, managers: 4, status: 'active' },
    { id: 4, name: 'Harbor Point', location: 'Seattle, WA', employees: 31, managers: 2, status: 'active' }
  ];

  const employees = [
    { id: 1, name: 'John Smith', role: 'Sales Associate', store: 'Downtown Store', salary: 45000, status: 'active', performance: 92 },
    { id: 2, name: 'Sarah Johnson', role: 'Cashier', store: 'Westside Branch', salary: 38000, status: 'active', performance: 88 },
    { id: 3, name: 'Michael Chen', role: 'Stock Manager', store: 'Central Plaza', salary: 52000, status: 'active', performance: 95 },
    { id: 4, name: 'Emily Davis', role: 'Sales Associate', store: 'Harbor Point', salary: 43000, status: 'active', performance: 90 },
    { id: 5, name: 'David Wilson', role: 'Floor Supervisor', store: 'Downtown Store', salary: 55000, status: 'active', performance: 87 },
    { id: 6, name: 'Lisa Anderson', role: 'Cashier', store: 'Westside Branch', salary: 39000, status: 'leave', performance: 85 },
    { id: 7, name: 'Robert Martinez', role: 'Sales Associate', store: 'Central Plaza', salary: 46000, status: 'active', performance: 91 },
    { id: 8, name: 'Jennifer Taylor', role: 'Customer Service', store: 'Harbor Point', salary: 42000, status: 'active', performance: 89 }
  ];

  const managers = [
    { id: 1, name: 'Amanda Roberts', store: 'Downtown Store', team: 15, experience: '8 years', performance: 94 },
    { id: 2, name: 'James Cooper', store: 'Westside Branch', team: 12, experience: '6 years', performance: 91 },
    { id: 3, name: 'Patricia Lee', store: 'Central Plaza', team: 18, experience: '10 years', performance: 96 },
    { id: 4, name: 'Thomas Garcia', store: 'Harbor Point', team: 10, experience: '5 years', performance: 88 }
  ];

  const salaryRequests = [
    { id: 1, employee: 'John Smith', current: 45000, proposed: 48000, reason: 'Performance Review', date: '2024-12-10', status: 'pending' },
    { id: 2, employee: 'Michael Chen', current: 52000, proposed: 56000, reason: 'Promotion', date: '2024-12-12', status: 'pending' },
    { id: 3, employee: 'Emily Davis', current: 43000, proposed: 45000, reason: 'Market Adjustment', date: '2024-12-08', status: 'pending' }
  ];

  const cameras = [
    { id: 1, store: 'Downtown Store', location: 'Entrance', status: 'online', lastCheck: '2 min ago' },
    { id: 2, store: 'Downtown Store', location: 'Sales Floor', status: 'online', lastCheck: '1 min ago' },
    { id: 3, store: 'Westside Branch', location: 'Entrance', status: 'online', lastCheck: '3 min ago' },
    { id: 4, store: 'Westside Branch', location: 'Checkout', status: 'offline', lastCheck: '15 min ago' },
    { id: 5, store: 'Central Plaza', location: 'Main Hall', status: 'online', lastCheck: '1 min ago' },
    { id: 6, store: 'Harbor Point', location: 'Entrance', status: 'online', lastCheck: '2 min ago' }
  ];

  return { stores, employees, managers, salaryRequests, cameras };
};