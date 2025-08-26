-- Enable Row Level Security on user-owned tables
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE opal_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Only allow access to rows owned by the authenticated user
CREATE POLICY trips_owner ON trips
    USING (user_id = auth.uid());
CREATE POLICY opal_uploads_owner ON opal_uploads
    USING (user_id = auth.uid());
CREATE POLICY settings_owner ON settings
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
