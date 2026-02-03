-- Create ramp_status table
CREATE TABLE IF NOT EXISTS ramp_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ramp_number INTEGER UNIQUE NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  red BOOLEAN DEFAULT FALSE,
  yellow BOOLEAN DEFAULT FALSE,
  input_value TEXT DEFAULT '',
  truck_value TEXT DEFAULT '',
  trailer_value TEXT DEFAULT '',
  has_truck BOOLEAN DEFAULT FALSE,
  is_exiting BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lookup_data table
CREATE TABLE IF NOT EXISTS lookup_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  truck TEXT NOT NULL,
  trailer TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ramp_status_ramp_number ON ramp_status(ramp_number);
CREATE INDEX IF NOT EXISTS idx_lookup_data_truck ON lookup_data(truck);
CREATE INDEX IF NOT EXISTS idx_lookup_data_trailer ON lookup_data(trailer);

-- Enable Row Level Security (RLS)
ALTER TABLE ramp_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_data ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on ramp_status" ON ramp_status FOR ALL USING (true);
CREATE POLICY "Allow all operations on lookup_data" ON lookup_data FOR ALL USING (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE ramp_status;
ALTER PUBLICATION supabase_realtime ADD TABLE lookup_data;
