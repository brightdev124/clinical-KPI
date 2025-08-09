-- Create table for storing AI analysis results
CREATE TABLE IF NOT EXISTS ai_analyses (
    id SERIAL PRIMARY KEY,
    analysis_id TEXT UNIQUE NOT NULL,
    clinician_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_analyses_clinician_id ON ai_analyses(clinician_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_analysis_id ON ai_analyses(analysis_id);

-- Add RLS (Row Level Security) policy if needed
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view their own analyses or analyses they have access to
CREATE POLICY "Users can view relevant AI analyses" ON ai_analyses
    FOR SELECT USING (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE accept = true AND (
                id = clinician_id OR
                position_info->>'role' IN ('director', 'super-admin') OR
                id IN (
                    SELECT DISTINCT director_id 
                    FROM clinician_assignments 
                    WHERE clinician_id = ai_analyses.clinician_id
                )
            )
        )
    );

-- Policy for directors and super-admins to create analyses
CREATE POLICY "Directors and super-admins can create AI analyses" ON ai_analyses
    FOR INSERT WITH CHECK (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE accept = true AND 
            position_info->>'role' IN ('director', 'super-admin')
        )
    );

-- Add comment
COMMENT ON TABLE ai_analyses IS 'Stores AI analysis results for clinician performance evaluations';
COMMENT ON COLUMN ai_analyses.analysis_id IS 'Unique identifier for each analysis session';
COMMENT ON COLUMN ai_analyses.clinician_id IS 'Reference to the clinician being analyzed';
COMMENT ON COLUMN ai_analyses.analysis_data IS 'Complete AI analysis result in JSON format';
COMMENT ON COLUMN ai_analyses.created_at IS 'Timestamp when the analysis was created';
COMMENT ON COLUMN ai_analyses.updated_at IS 'Timestamp when the analysis was last updated';