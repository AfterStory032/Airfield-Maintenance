-- Set up Supabase database schema for Airfield Maintenance app

BEGIN;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'technician', 'inspector', 'viewer')),
  avatar TEXT,
  password TEXT -- For direct login during development
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  permission TEXT NOT NULL
);

-- Create indexes for permissions table
CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions(user_id);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- Areas table
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Maintenance tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('corrective', 'preventive', 'predictive', 'safety', 'regulatory')),
  area TEXT NOT NULL,
  location TEXT NOT NULL,
  fitting TEXT,
  fitting_number TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Scheduled')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  date_reported TEXT NOT NULL,
  completed_date TEXT,
  scheduled_date TEXT,
  reported_by TEXT NOT NULL,
  assigned_to TEXT NOT NULL
);

-- Handover notes table
CREATE TABLE IF NOT EXISTS handover_notes (
  id UUID PRIMARY KEY,
  shift TEXT NOT NULL,
  date TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL
);

-- Handover tasks table (junction table)
CREATE TABLE IF NOT EXISTS handover_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handover_id UUID REFERENCES handover_notes(id) NOT NULL,
  task_id TEXT REFERENCES maintenance_tasks(id) NOT NULL,
  status TEXT NOT NULL,
  description TEXT NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_area ON maintenance_tasks(area);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_handover_notes_date ON handover_notes(date);
CREATE INDEX IF NOT EXISTS idx_handover_notes_shift ON handover_notes(shift);
CREATE INDEX IF NOT EXISTS idx_handover_tasks_handover_id ON handover_tasks(handover_id);
CREATE INDEX IF NOT EXISTS idx_handover_tasks_task_id ON handover_tasks(task_id);

COMMIT;