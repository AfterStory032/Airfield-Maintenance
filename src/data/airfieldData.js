// Mock data for the airfield maintenance application

// Dashboard stats
export const airfieldStats = [
  {
    title: 'Active Runways',
    value: '3/4',
    change: '+0',
    trend: 'neutral',
    icon: {
      path: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      bgColor: 'bg-green-500'
    }
  },
  {
    title: 'Pending Tasks',
    value: '24',
    change: '+3',
    trend: 'down',
    icon: {
      path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      bgColor: 'bg-yellow-500'
    }
  },
  {
    title: 'Critical Issues',
    value: '2',
    change: '-1',
    trend: 'up',
    icon: {
      path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      bgColor: 'bg-red-500'
    }
  },
  {
    title: 'Safety Score',
    value: '96%',
    change: '+2%',
    trend: 'up',
    icon: {
      path: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      bgColor: 'bg-blue-500'
    }
  }
];

// Task completion data for area chart
export const taskCompletionStats = [
  { month: 'Jan', completed: 45, pending: 12 },
  { month: 'Feb', completed: 52, pending: 15 },
  { month: 'Mar', completed: 48, pending: 10 },
  { month: 'Apr', completed: 61, pending: 8 },
  { month: 'May', completed: 55, pending: 14 },
  { month: 'Jun', completed: 67, pending: 9 },
  { month: 'Jul', completed: 42, pending: 24 }
];

// Priority distribution for pie chart
export const priorityDistributionData = [
  { name: 'Critical', value: 2 },
  { name: 'High', value: 8 },
  { name: 'Medium', value: 24 },
  { name: 'Low', value: 10 }
];

// Maintenance type data for bar chart
export const maintenanceTypeData = [
  { name: 'Preventive', value: 35 },
  { name: 'Corrective', value: 24 },
  { name: 'Predictive', value: 18 },
  { name: 'Safety', value: 12 },
  { name: 'Regulatory', value: 8 }
];

// User roles
export const userRoles = [
  { id: 'admin', name: 'Administrator' },
  { id: 'shift_leader', name: 'Shift Leader' },
  { id: 'engineer', name: 'Engineer' },
  { id: 'technician', name: 'Technician' },
  { id: 'viewer', name: 'Viewer' }
];

// Mock users
export const users = [
  {
    id: 1,
    username: 'admin',
    name: 'Administrator',
    email: 'admin@airport.com',
    role: 'admin',
    avatar: 'https://i.pravatar.cc/150?img=1',
    password: 'Mo3ed032',
    permissions: ['all']
  },
  {
    id: 2,
    username: 'jsmith',
    name: 'John Smith',
    email: 'john.smith@airport.com',
    role: 'admin',
    avatar: 'https://i.pravatar.cc/150?img=2',
    permissions: ['all']
  },
  {
    id: 2,
    username: 'mjohnson',
    name: 'Maria Johnson',
    email: 'maria.johnson@airport.com',
    role: 'supervisor',
    avatar: 'https://i.pravatar.cc/150?img=5',
    permissions: ['view_tasks', 'generate_reports', 'view_maps']
  },
  {
    id: 3,
    username: 'tpatel',
    name: 'Tej Patel',
    email: 'tej.patel@airport.com',
    role: 'technician',
    avatar: 'https://i.pravatar.cc/150?img=8',
    permissions: ['view_tasks', 'view_maps']
  },
  {
    id: 4,
    username: 'rgarcia',
    name: 'Rosa Garcia',
    email: 'rosa.garcia@airport.com',
    role: 'inspector',
    avatar: 'https://i.pravatar.cc/150?img=9',
    permissions: ['view_tasks', 'view_maps', 'generate_reports']
  },
  {
    id: 5,
    username: 'keshtkar.m',
    name: 'Mohamed Mahdi Mustafa Mohamed Taqi Keshtkar',
    email: 'mohamed.keshtkar@bac.bh',
    role: 'technician',
    avatar: 'https://i.pravatar.cc/150?img=10',
    password: 'Mo3ed032',
    permissions: ['view_tasks', 'view_maps']
  }
];

// Mock shifts - Updated to only include Morning and Night shifts
export const shifts = [
  { id: 'morning', name: 'Morning' },
  { id: 'night', name: 'Night' }
];

// Mock areas
export const areas = [
  { id: 'runways', name: 'Runways' },
  { id: 'taxiways', name: 'Taxiways' },
  { id: 'aprons', name: 'Aprons' },
  { id: 'approach', name: 'Approach Areas' }
];

// Location arrays for MaintenanceLogger component
export const taxiwayLocations = [
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'A7',
  'A8',
  'A9',
  'K',
  'L',
  'M',
  'N',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  '30L', // Emergency runway located in taxiway
  '12R'  // Emergency runway located in taxiway
];

export const runwayLocations = [
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'A7',
  'A8',
  'A9',
  '30R',
  '12L'
];

// Fitting arrays for MaintenanceLogger component
export const taxiwayFittings = [
  'Taxiway Centerline Light',
  'Taxiway Edge Light',
  'Mandatory Sign Illumination',
  'Direction Sign Illumination',
  'Location Sign Illumination',
  'Stop Bar Light'
];

export const runwayFittings = [
  'Runway Centerline Light',
  'Runway Edge Light',
  'Runway Threshold Light',
  'Touchdown Zone Light',
  'Runway End Light',
  'Runway Lead in / off'
];

// Mock locations
export const locations = [
  { id: 'rw-30l', name: 'Runway 30L', area: 'runways' },
  { id: 'rw-30r', name: 'Runway 30R', area: 'runways' },
  { id: 'rw-12l', name: 'Runway 12L', area: 'runways' },
  { id: 'rw-12r', name: 'Runway 12R', area: 'runways' },
  { id: 'tw-a', name: 'Taxiway A', area: 'taxiways' },
  { id: 'tw-b', name: 'Taxiway B', area: 'taxiways' },
  { id: 'tw-c', name: 'Taxiway C', area: 'taxiways' },
  { id: 'tw-d', name: 'Taxiway D', area: 'taxiways' },
  { id: 'ap-1', name: 'Apron 1', area: 'aprons' },
  { id: 'ap-2', name: 'Apron 2', area: 'aprons' },
  { id: 'ap-3', name: 'Apron 3', area: 'aprons' }
];

// Mock fittings
export const fittings = [
  { id: 'runway-cl', name: 'Runway Centerline Light', area: 'runways' },
  { id: 'runway-el', name: 'Runway Edge Light', area: 'runways' },
  { id: 'runway-thr', name: 'Runway Threshold Light', area: 'runways' },
  { id: 'runway-td', name: 'Touchdown Zone Light', area: 'runways' },
  { id: 'runway-end', name: 'Runway End Light', area: 'runways' },
  { id: 'taxiway-cl', name: 'Taxiway Centerline Light', area: 'taxiways' },
  { id: 'taxiway-el', name: 'Taxiway Edge Light', area: 'taxiways' },
  { id: 'taxiway-sb', name: 'Stop Bar Light', area: 'taxiways' },
  { id: 'taxiway-exit', name: 'Runway Lead in / off', area: 'taxiways' },
  { id: 'apron-fl', name: 'Apron Floodlight', area: 'aprons' },
  { id: 'sign-man', name: 'Mandatory Sign Illumination', area: 'taxiways' },
  { id: 'sign-dir', name: 'Direction Sign Illumination', area: 'taxiways' },
  { id: 'sign-loc', name: 'Location Sign Illumination', area: 'taxiways' }
];

// Mock maintenance tasks
export const maintenanceTasks = [
  {
    id: 'MT001',
    type: 'corrective',
    area: 'runways',
    location: 'Runway 30L',
    fitting: 'Runway Centerline Light',
    fittingNumber: 'RCL-30L-42',
    description: 'Centerline light not working at 1200ft from threshold',
    status: 'Pending',
    priority: 'high',
    dateReported: '2025-07-05',
    reportedBy: 'Tej Patel',
    assignedTo: 'Rosa Garcia'
  },
  {
    id: 'MT002',
    type: 'preventive',
    area: 'taxiways',
    location: 'Taxiway A',
    fitting: 'Taxiway Edge Light',
    fittingNumber: 'TEL-A-15',
    description: 'Monthly inspection of taxiway edge lights',
    status: 'Completed',
    priority: 'medium',
    dateReported: '2025-07-02',
    completedDate: '2025-07-03',
    reportedBy: 'Maria Johnson',
    assignedTo: 'Tej Patel'
  },
  {
    id: 'MT003',
    type: 'corrective',
    area: 'runways',
    location: 'Runway 12R',
    fitting: 'Runway Threshold Light',
    fittingNumber: 'RTL-12R-03',
    description: 'Threshold light damaged by aircraft',
    status: 'In Progress',
    priority: 'critical',
    dateReported: '2025-07-07',
    reportedBy: 'John Smith',
    assignedTo: 'Rosa Garcia'
  },
  {
    id: 'MT004',
    type: 'preventive',
    area: 'aprons',
    location: 'Apron 2',
    fitting: 'Apron Floodlight',
    fittingNumber: 'AFL-A2-08',
    description: 'Quarterly inspection of floodlight towers',
    status: 'Scheduled',
    priority: 'medium',
    scheduledDate: '2025-07-10',
    reportedBy: 'Maria Johnson',
    assignedTo: 'Tej Patel'
  },
  {
    id: 'MT005',
    type: 'corrective',
    area: 'taxiways',
    location: 'Taxiway C',
    fitting: 'Mandatory Sign',
    fittingNumber: 'MS-C-04',
    description: 'Sign illumination intermittent',
    status: 'Pending',
    priority: 'high',
    dateReported: '2025-07-06',
    reportedBy: 'Rosa Garcia',
    assignedTo: 'Tej Patel'
  },
  {
    id: 'MT006',
    type: 'preventive',
    area: 'runways',
    location: 'Runway 30R',
    fitting: 'Runway Edge Light',
    fittingNumber: 'REL-30R-22',
    description: 'Periodic inspection of runway edge lighting circuits',
    status: 'Scheduled',
    priority: 'medium',
    scheduledDate: '2025-07-15',
    reportedBy: 'John Smith',
    assignedTo: 'Maria Johnson'
  },
  {
    id: 'MT007',
    type: 'corrective',
    area: 'approach',
    location: 'Runway 30L Approach',
    fitting: 'Approach Light',
    fittingNumber: 'AL-30L-12',
    description: 'Three sequential flashing lights not working',
    status: 'Completed',
    priority: 'critical',
    dateReported: '2025-07-01',
    completedDate: '2025-07-01',
    reportedBy: 'Tej Patel',
    assignedTo: 'Rosa Garcia'
  },
  {
    id: 'MT008',
    type: 'preventive',
    area: 'taxiways',
    location: 'All Taxiways',
    description: 'Check for FOD on all taxiways',
    status: 'Scheduled',
    priority: 'medium',
    scheduledDate: '2025-07-09',
    reportedBy: 'Maria Johnson',
    assignedTo: 'Tej Patel'
  }
];

// Mock handover notes - Updated to match Morning and Night shifts
export const handoverNotes = [
  {
    id: 1,
    shift: 'Night',
    date: '2025-07-07',
    author: 'Rosa Garcia',
    content: 'Completed inspection of Runway 30L centerline lights. Found three inoperative lights at positions 1200ft, 3400ft, and 5100ft from threshold. Created maintenance tasks for all three. Taxiway A edge lights all functioning properly after yesterday\'s replacements.',
    tasks: [
      { id: 'MT001', status: 'Pending', description: 'Centerline light not working at 1200ft from threshold' },
      { id: 'MT009', status: 'Pending', description: 'Centerline light not working at 3400ft from threshold' },
      { id: 'MT010', status: 'Pending', description: 'Centerline light not working at 5100ft from threshold' }
    ]
  },
  {
    id: 2,
    shift: 'Morning',
    date: '2025-07-07',
    author: 'Tej Patel',
    content: 'Replaced two taxiway edge lights on Taxiway A. Started inspection of Runway 12R threshold lights but had to stop due to increasing traffic. Will need to continue tomorrow. FOD check completed on all operational runways, no issues found.',
    tasks: [
      { id: 'MT002', status: 'Completed', description: 'Monthly inspection of taxiway edge lights' }
    ]
  },
  {
    id: 3,
    shift: 'Night',
    date: '2025-07-06',
    author: 'Maria Johnson',
    content: 'Conducted full inspection of Taxiway C signs. Found one mandatory sign with intermittent lighting (MS-C-04). Created maintenance task for repair. Apron 2 floodlight inspection scheduled for July 10th.',
    tasks: [
      { id: 'MT005', status: 'Pending', description: 'Sign illumination intermittent' },
      { id: 'MT004', status: 'Scheduled', description: 'Quarterly inspection of floodlight towers' }
    ]
  }
];

// Default exported user for AuthContext initial state
export const defaultUser = {
  id: 1,
  username: 'jsmith',
  name: 'John Smith',
  email: 'john.smith@airport.com',
  role: 'admin',
  avatar: 'https://i.pravatar.cc/150?img=1',
  permissions: ['all']
};