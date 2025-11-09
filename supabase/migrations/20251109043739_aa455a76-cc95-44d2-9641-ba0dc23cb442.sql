-- Create job_matches table
CREATE TABLE public.job_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_title TEXT NOT NULL,
  job_description TEXT NOT NULL,
  job_company TEXT,
  file_url TEXT,
  match_score INTEGER NOT NULL DEFAULT 0,
  matched_skills_count INTEGER NOT NULL DEFAULT 0,
  missing_skills_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_match_skills table
CREATE TABLE public.job_match_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_match_id UUID NOT NULL REFERENCES public.job_matches(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  required_level TEXT NOT NULL DEFAULT 'intermediate',
  is_matched BOOLEAN NOT NULL DEFAULT false,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  user_confidence NUMERIC,
  user_proficiency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_match_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_matches
CREATE POLICY "Users can view their own job matches"
  ON public.job_matches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job matches"
  ON public.job_matches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job matches"
  ON public.job_matches
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job matches"
  ON public.job_matches
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for job_match_skills
CREATE POLICY "Users can view skills for their job matches"
  ON public.job_match_skills
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.job_matches
    WHERE job_matches.id = job_match_skills.job_match_id
    AND job_matches.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert skills for their job matches"
  ON public.job_match_skills
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.job_matches
    WHERE job_matches.id = job_match_skills.job_match_id
    AND job_matches.user_id = auth.uid()
  ));

CREATE POLICY "Users can update skills for their job matches"
  ON public.job_match_skills
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.job_matches
    WHERE job_matches.id = job_match_skills.job_match_id
    AND job_matches.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete skills for their job matches"
  ON public.job_match_skills
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.job_matches
    WHERE job_matches.id = job_match_skills.job_match_id
    AND job_matches.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_job_matches_updated_at
  BEFORE UPDATE ON public.job_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();