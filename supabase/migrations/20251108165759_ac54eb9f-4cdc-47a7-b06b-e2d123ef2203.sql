-- Create custom types/enums
CREATE TYPE public.privacy_level AS ENUM ('public', 'internal', 'private');
CREATE TYPE public.proficiency_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE public.source_type AS ENUM ('cv', 'linkedin', 'github', 'blog', 'performance_review', 'other');
CREATE TYPE public.evidence_type AS ENUM ('explicit_mention', 'code_repository', 'project', 'certification', 'endorsement', 'achievement', 'tool_usage');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Skill Taxonomy (standardized skill database)
CREATE TABLE public.skill_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- Technical, Soft Skills, Domain
  subcategory TEXT,
  description TEXT,
  aliases TEXT[], -- For matching skill variations (e.g., "JS", "JavaScript")
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skill taxonomy"
  ON public.skill_taxonomy FOR SELECT
  USING (true);

-- Create indexes for taxonomy lookups
CREATE INDEX idx_skill_taxonomy_name ON public.skill_taxonomy(skill_name);
CREATE INDEX idx_skill_taxonomy_category ON public.skill_taxonomy(category);

-- Skill Profiles (main profile per user)
CREATE TABLE public.skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completeness_score NUMERIC(3,2) DEFAULT 0.0 CHECK (completeness_score >= 0 AND completeness_score <= 1),
  total_skills INTEGER DEFAULT 0,
  privacy_level privacy_level DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.skill_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skill profile"
  ON public.skill_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public skill profiles"
  ON public.skill_profiles FOR SELECT
  USING (privacy_level = 'public');

CREATE POLICY "Users can insert their own skill profile"
  ON public.skill_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skill profile"
  ON public.skill_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Data Sources (track uploaded/connected sources)
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type source_type NOT NULL,
  source_name TEXT, -- e.g., filename, "My Resume", "LinkedIn Profile"
  source_url TEXT,
  raw_data JSONB, -- Store parsed content
  file_path TEXT, -- If stored in storage
  processed BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data sources"
  ON public.data_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data sources"
  ON public.data_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data sources"
  ON public.data_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data sources"
  ON public.data_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Extracted Skills (skills found for each user)
CREATE TABLE public.extracted_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_profile_id UUID NOT NULL REFERENCES public.skill_profiles(id) ON DELETE CASCADE,
  skill_taxonomy_id UUID REFERENCES public.skill_taxonomy(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL, -- Store even if not in taxonomy
  proficiency_level proficiency_level,
  confidence_score NUMERIC(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  years_experience INTEGER,
  last_used DATE,
  is_hidden BOOLEAN DEFAULT false, -- Privacy control
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.extracted_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view skills for their profile"
  ON public.extracted_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.skill_profiles
      WHERE skill_profiles.id = extracted_skills.skill_profile_id
      AND skill_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view public profile skills"
  ON public.extracted_skills FOR SELECT
  USING (
    NOT is_hidden AND EXISTS (
      SELECT 1 FROM public.skill_profiles
      WHERE skill_profiles.id = extracted_skills.skill_profile_id
      AND skill_profiles.privacy_level = 'public'
    )
  );

CREATE POLICY "Users can insert skills for their profile"
  ON public.extracted_skills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.skill_profiles
      WHERE skill_profiles.id = extracted_skills.skill_profile_id
      AND skill_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update skills for their profile"
  ON public.extracted_skills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.skill_profiles
      WHERE skill_profiles.id = extracted_skills.skill_profile_id
      AND skill_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete skills for their profile"
  ON public.extracted_skills FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.skill_profiles
      WHERE skill_profiles.id = extracted_skills.skill_profile_id
      AND skill_profiles.user_id = auth.uid()
    )
  );

-- Create indexes for skill queries
CREATE INDEX idx_extracted_skills_profile ON public.extracted_skills(skill_profile_id);
CREATE INDEX idx_extracted_skills_taxonomy ON public.extracted_skills(skill_taxonomy_id);
CREATE INDEX idx_extracted_skills_confidence ON public.extracted_skills(confidence_score DESC);

-- Skill Evidence (evidence trail for each skill)
CREATE TABLE public.skill_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extracted_skill_id UUID NOT NULL REFERENCES public.extracted_skills(id) ON DELETE CASCADE,
  source_type source_type NOT NULL,
  evidence_type evidence_type NOT NULL,
  description TEXT,
  snippet TEXT, -- Exact text/code snippet
  link TEXT,
  evidence_date DATE,
  source_reliability NUMERIC(3,2) CHECK (source_reliability >= 0 AND source_reliability <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidence for their skills"
  ON public.skill_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.extracted_skills
      JOIN public.skill_profiles ON skill_profiles.id = extracted_skills.skill_profile_id
      WHERE extracted_skills.id = skill_evidence.extracted_skill_id
      AND skill_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert evidence for their skills"
  ON public.skill_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.extracted_skills
      JOIN public.skill_profiles ON skill_profiles.id = extracted_skills.skill_profile_id
      WHERE extracted_skills.id = skill_evidence.extracted_skill_id
      AND skill_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete evidence for their skills"
  ON public.skill_evidence FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.extracted_skills
      JOIN public.skill_profiles ON skill_profiles.id = extracted_skills.skill_profile_id
      WHERE extracted_skills.id = skill_evidence.extracted_skill_id
      AND skill_profiles.user_id = auth.uid()
    )
  );

-- Create index for evidence queries
CREATE INDEX idx_skill_evidence_skill ON public.skill_evidence(extracted_skill_id);

-- Update timestamp trigger function
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skill_profiles_updated_at
  BEFORE UPDATE ON public.skill_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extracted_skills_updated_at
  BEFORE UPDATE ON public.extracted_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();