/**
 * Mock data for the application when Supabase connection is not available
 * This provides a fallback for development and demonstration purposes
 */

export const mockUsers = [
  {
    id: '1',
    username: 'admin',
    name: 'Admin User',
    email: 'admin@airport.com',
    role: 'admin',
    shift: 'Regular',
    avatar: 'https://i.pravatar.cc/150?img=1',
    permissions: ['all']
  },
  {
    id: '2',
    username: 'engineer',
    name: 'Engineering Lead',
    email: 'engineer@airport.com',
    role: 'engineer',
    shift: 'A',
    avatar: 'https://i.pravatar.cc/150?img=2',
    permissions: ['view_tasks', 'create_tasks', 'edit_tasks', 'view_maps', 'generate_reports']
  },
  {
    id: '3',
    username: 'shift_leader',
    name: 'Shift Manager',
    email: 'shift_leader@airport.com',
    role: 'shift_leader',
    shift: 'B',
    avatar: 'https://i.pravatar.cc/150?img=3',
    permissions: ['view_tasks', 'create_tasks', 'assign_tasks', 'generate_reports', 'view_maps']
  },
  {
    id: '4',
    username: 'tech1',
    name: 'Tech Support',
    email: 'tech@airport.com',
    role: 'technician',
    shift: 'C',
    avatar: 'https://i.pravatar.cc/150?img=4',
    permissions: ['view_tasks', 'update_task_status', 'view_maps']
  }
];

export const mockShifts = [
  { id: '1', name: 'Shift A', start_time: '06:00', end_time: '14:00' },
  { id: '2', name: 'Shift B', start_time: '14:00', end_time: '22:00' },
  { id: '3', name: 'Shift C', start_time: '22:00', end_time: '06:00' },
  { id: '4', name: 'Regular', start_time: '09:00', end_time: '17:00' }
];

export const mockMaintenanceTasks = [
  {
    id: '1',
    title: 'Runway Inspection',
    description: 'Perform routine inspection of runway surfaces',
    status: 'completed',
    assigned_to: '2',
    created_by: '1',
    created_at: '2023-07-15T08:30:00Z',
    updated_at: '2023-07-15T10:45:00Z',
    priority: 'high'
  },
  {
    id: '2',
    title: 'Lighting System Maintenance',
    description: 'Replace damaged lights on taxiway B',
    status: 'in_progress',
    assigned_to: '3',
    created_by: '1',
    created_at: '2023-07-16T14:20:00Z',
    updated_at: '2023-07-16T16:10:00Z',
    priority: 'medium'
  },
  {
    id: '3',
    title: 'Drainage System Cleaning',
    description: 'Clear blockages in drainage system near hangar 3',
    status: 'pending',
    assigned_to: '4',
    created_by: '2',
    created_at: '2023-07-17T09:45:00Z',
    updated_at: '2023-07-17T09:45:00Z',
    priority: 'low'
  }
];

// Chart data exports for components
export const areaChartData = [
  {
    name: 'Jan',
    Total: 1200,
    Completed: 900,
    InProgress: 300,
  },
  {
    name: 'Feb',
    Total: 1500,
    Completed: 1200,
    InProgress: 300,
  },
  {
    name: 'Mar',
    Total: 1300,
    Completed: 1000,
    InProgress: 300,
  },
  {
    name: 'Apr',
    Total: 1700,
    Completed: 1300,
    InProgress: 400,
  },
  {
    name: 'May',
    Total: 1600,
    Completed: 1200,
    InProgress: 400,
  },
  {
    name: 'Jun',
    Total: 1800,
    Completed: 1400,
    InProgress: 400,
  },
  {
    name: 'Jul',
    Total: 2000,
    Completed: 1600,
    InProgress: 400,
  },
];

export const barChartData = [
  {
    name: 'Runway A',
    Inspections: 20,
    Repairs: 8,
  },
  {
    name: 'Runway B',
    Inspections: 15,
    Repairs: 5,
  },
  {
    name: 'Taxiway C',
    Inspections: 12,
    Repairs: 3,
  },
  {
    name: 'Taxiway D',
    Inspections: 10,
    Repairs: 4,
  },
  {
    name: 'Hangar 1',
    Inspections: 8,
    Repairs: 2,
  },
  {
    name: 'Hangar 2',
    Inspections: 9,
    Repairs: 1,
  },
];

export const pieChartData = [
  { name: 'Runway', value: 35 },
  { name: 'Taxiway', value: 25 },
  { name: 'Lighting', value: 15 },
  { name: 'Drainage', value: 10 },
  { name: 'Buildings', value: 15 },
];

export const lineChartData = [
  {
    name: 'Week 1',
    Incidents: 10,
    Resolutions: 8,
  },
  {
    name: 'Week 2',
    Incidents: 15,
    Resolutions: 12,
  },
  {
    name: 'Week 3',
    Incidents: 12,
    Resolutions: 10,
  },
  {
    name: 'Week 4',
    Incidents: 8,
    Resolutions: 8,
  },
];

export const radarChartData = [
  {
    subject: 'Runway',
    A: 120,
    B: 110,
    fullMark: 150,
  },
  {
    subject: 'Taxiway',
    A: 98,
    B: 130,
    fullMark: 150,
  },
  {
    subject: 'Lighting',
    A: 86,
    B: 130,
    fullMark: 150,
  },
  {
    subject: 'Drainage',
    A: 99,
    B: 100,
    fullMark: 150,
  },
  {
    subject: 'Buildings',
    A: 85,
    B: 90,
    fullMark: 150,
  },
  {
    subject: 'Safety',
    A: 65,
    B: 85,
    fullMark: 150,
  },
];

export const gaugeChartData = [
  {
    name: 'Score',
    value: 75,
  },
];

export const treeMapData = [
  {
    name: 'Runway A',
    size: 800,
    color: '#8884d8',
  },
  {
    name: 'Runway B',
    size: 600,
    color: '#83a6ed',
  },
  {
    name: 'Taxiway C',
    size: 400,
    color: '#8dd1e1',
  },
  {
    name: 'Taxiway D',
    size: 300,
    color: '#82ca9d',
  },
  {
    name: 'Hangar 1',
    size: 200,
    color: '#a4de6c',
  },
  {
    name: 'Hangar 2',
    size: 250,
    color: '#d0ed57',
  },
  {
    name: 'Terminal',
    size: 500,
    color: '#ffc658',
  },
];