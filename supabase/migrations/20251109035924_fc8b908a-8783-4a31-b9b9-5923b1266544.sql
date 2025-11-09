-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'linkedin', 'github', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create skills table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_category TEXT NOT NULL CHECK (skill_category IN ('technical', 'soft_skill', 'domain', 'tool', 'language')),
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  proficiency_level TEXT NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  is_explicit BOOLEAN NOT NULL DEFAULT false,
  source_documents JSONB DEFAULT '[]'::jsonb,
  evidence_trail JSONB DEFAULT '[]'::jsonb,
  last_used_date DATE,
  years_experience INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on skills
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Drop and recreate skill_evidence with new structure
DROP TABLE IF EXISTS public.skill_evidence CASCADE;

CREATE TABLE public.skill_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('explicit_mention', 'project_context', 'code_analysis', 'endorsement')),
  evidence_text TEXT NOT NULL,
  context TEXT,
  reliability_score FLOAT NOT NULL CHECK (reliability_score >= 0 AND reliability_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on skill_evidence
ALTER TABLE public.skill_evidence ENABLE ROW LEVEL SECURITY;

-- Create analysis_sessions table
CREATE TABLE IF NOT EXISTS public.analysis_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (session_status IN ('in_progress', 'completed')),
  total_skills_found INTEGER DEFAULT 0,
  hidden_skills_count INTEGER DEFAULT 0,
  documents_analyzed INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on analysis_sessions
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for skills
CREATE POLICY "Users can view their own skills"
  ON public.skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skills"
  ON public.skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills"
  ON public.skills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skills"
  ON public.skills FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for skill_evidence
CREATE POLICY "Users can view evidence for their skills"
  ON public.skill_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_evidence.skill_id
      AND skills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert evidence for their skills"
  ON public.skill_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_evidence.skill_id
      AND skills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update evidence for their skills"
  ON public.skill_evidence FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_evidence.skill_id
      AND skills.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete evidence for their skills"
  ON public.skill_evidence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.skills
      WHERE skills.id = skill_evidence.skill_id
      AND skills.user_id = auth.uid()
    )
  );

-- RLS Policies for analysis_sessions
CREATE POLICY "Users can view their own analysis sessions"
  ON public.analysis_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis sessions"
  ON public.analysis_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis sessions"
  ON public.analysis_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis sessions"
  ON public.analysis_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for skills updated_at
CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate data from old tables to new tables
-- Migrate data_sources to documents
INSERT INTO public.documents (user_id, document_type, file_name, file_url, upload_date, processing_status, created_at)
SELECT 
  user_id,
  CASE 
    WHEN source_type = 'cv' THEN 'resume'
    ELSE 'other'
  END as document_type,
  COALESCE(source_name, 'Untitled Document') as file_name,
  COALESCE(file_path, '') as file_url,
  uploaded_at as upload_date,
  CASE 
    WHEN processed = true THEN 'completed'
    ELSE 'pending'
  END as processing_status,
  uploaded_at as created_at
FROM public.data_sources
ON CONFLICT DO NOTHING;

-- Migrate extracted_skills to skills
INSERT INTO public.skills (user_id, skill_name, skill_category, confidence_score, proficiency_level, is_explicit, last_used_date, years_experience, created_at, updated_at)
SELECT 
  sp.user_id,
  es.skill_name,
  'technical' as skill_category,
  es.confidence_score,
  COALESCE(es.proficiency_level::text, 'intermediate'),
  true as is_explicit,
  es.last_used,
  es.years_experience,
  es.created_at,
  es.updated_at
FROM public.extracted_skills es
JOIN public.skill_profiles sp ON es.skill_profile_id = sp.id
ON CONFLICT DO NOTHING;