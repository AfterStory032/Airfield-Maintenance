-- Setup database schema for Airfield Management application

-- Start with a clean state
BEGIN;

-- Create tables for user management
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for user permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, permission)
);

-- Create table for shifts
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);

-- Create table for areas
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Create table for locations
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES areas(id),
  name TEXT NOT NULL
);

-- Create table for fittings
CREATE TABLE IF NOT EXISTS fittings (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES areas(id),
  name TEXT NOT NULL
);

-- Create table for maintenance tasks
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  area TEXT NOT NULL,
  location TEXT NOT NULL,
  fitting TEXT,
  fitting_number TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  date_reported DATE NOT NULL,
  completed_date DATE,
  reported_by TEXT NOT NULL,
  assigned_to TEXT NOT NULL
);

-- Create table for handover notes
CREATE TABLE IF NOT EXISTS handover_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift TEXT NOT NULL REFERENCES shifts(id),
  date DATE NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for tasks related to handover notes
CREATE TABLE IF NOT EXISTS handover_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES handover_notes(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NOT NULL
);

-- Add stored procedure for creating handover with tasks
CREATE OR REPLACE FUNCTION create_handover_with_tasks(
  note_data JSON,
  tasks_data JSON[]
) RETURNS SETOF handover_notes AS $$
DECLARE
  handover_id UUID;
  task JSON;
  handover_result handover_notes;
BEGIN
  -- Insert the handover note
  INSERT INTO handover_notes (id, shift, date, author, content)
  VALUES (
    (note_data->>'id')::UUID, 
    note_data->>'shift', 
    (note_data->>'date')::DATE, 
    note_data->>'author', 
    note_data->>'content'
  )
  RETURNING * INTO handover_result;
  
  handover_id := handover_result.id;
  
  -- Insert related tasks
  IF jsonb_array_length(tasks_data::jsonb) > 0 THEN
    FOR task IN SELECT * FROM jsonb_array_elements(tasks_data::jsonb)
    LOOP
      INSERT INTO handover_tasks (handover_id, task_id, status, description)
      VALUES (
        handover_id, 
        task->>'task_id', 
        task->>'status', 
        task->>'description'
      );
    END LOOP;
  END IF;
  
  RETURN NEXT handover_result;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Insert initial data: Shifts
INSERT INTO shifts (id, name, start_time, end_time) VALUES 
('morning', 'Morning Shift', '06:00', '18:00'),
('night', 'Night Shift', '18:00', '06:00')
ON CONFLICT (id) DO NOTHING;

-- Insert initial data: Areas
INSERT INTO areas (id, name) VALUES 
('Taxiway', 'Taxiway'),
('Runway', 'Runway')
ON CONFLICT (id) DO NOTHING;

-- Insert initial data: Locations for Taxiway
INSERT INTO locations (id, area_id, name) VALUES 
('Taxiway A', 'Taxiway', 'Taxiway A'),
('Taxiway B', 'Taxiway', 'Taxiway B'),
('Taxiway C', 'Taxiway', 'Taxiway C'),
('Holding Point A1', 'Taxiway', 'Holding Point A1'),
('Holding Point B1', 'Taxiway', 'Holding Point B1')
ON CONFLICT (id) DO NOTHING;

-- Insert initial data: Locations for Runway
INSERT INTO locations (id, area_id, name) VALUES 
('Runway 09L/27R', 'Runway', 'Runway 09L/27R'),
('Runway 09R/27L', 'Runway', 'Runway 09R/27L'),
('Touchdown Zone 09L', 'Runway', 'Touchdown Zone 09L'),
('Touchdown Zone 27R', 'Runway', 'Touchdown Zone 27R')
ON CONFLICT (id) DO NOTHING;

-- Insert initial data: Fittings for Taxiway
INSERT INTO fittings (id, area_id, name) VALUES 
('Centerline Light', 'Taxiway', 'Centerline Light'),
('Edge Light', 'Taxiway', 'Edge Light'),
('Stop Bar Light', 'Taxiway', 'Stop Bar Light'),
('Guidance Sign', 'Taxiway', 'Guidance Sign'),
('Surface Marking', 'Taxiway', 'Surface Marking')
ON CONFLICT (id) DO NOTHING;

-- Insert initial data: Fittings for Runway
INSERT INTO fittings (id, area_id, name) VALUES 
('Threshold Light', 'Runway', 'Threshold Light'),
('Centerline Light', 'Runway', 'Centerline Light'),
('Edge Light', 'Runway', 'Edge Light'),
('Touchdown Zone Light', 'Runway', 'Touchdown Zone Light'),
('PAPI', 'Runway', 'PAPI'),
('Surface Marking', 'Runway', 'Surface Marking')
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to select any user
CREATE POLICY "Users can view all users" 
  ON users FOR SELECT 
  USING (true);

-- Create policy for users to update their own user record
CREATE POLICY "Users can update their own record" 
  ON users FOR UPDATE 
  USING (auth.uid()::text = id::text);

-- Create policy for permissions (anyone can view)
CREATE POLICY "Anyone can view permissions" 
  ON permissions FOR SELECT 
  USING (true);

-- Create policy for permissions (only admins can insert/update)
CREATE POLICY "Only admins can manage permissions" 
  ON permissions FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policy for maintenance tasks (anyone can view all tasks)
CREATE POLICY "Anyone can view all tasks" 
  ON maintenance_tasks FOR SELECT 
  USING (true);

-- Create policy for maintenance tasks (authenticated users can insert)
CREATE POLICY "Authenticated users can insert tasks" 
  ON maintenance_tasks FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy for maintenance tasks (task creator or assigned can update)
CREATE POLICY "Task creator or assignee can update" 
  ON maintenance_tasks FOR UPDATE 
  USING (auth.email() = reported_by OR auth.email() = assigned_to);

-- Create policy for handover notes (anyone can view)
CREATE POLICY "Anyone can view handover notes" 
  ON handover_notes FOR SELECT 
  USING (true);

-- Create policy for handover notes (authenticated users can insert)
CREATE POLICY "Authenticated users can insert handover notes" 
  ON handover_notes FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy for handover tasks (anyone can view)
CREATE POLICY "Anyone can view handover tasks" 
  ON handover_tasks FOR SELECT 
  USING (true);

-- Create policy for handover tasks (authenticated users can insert)
CREATE POLICY "Authenticated users can insert handover tasks" 
  ON handover_tasks FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

COMMIT;