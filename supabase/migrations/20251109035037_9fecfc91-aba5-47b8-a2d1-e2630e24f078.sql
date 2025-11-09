-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create job_requirements table
CREATE TABLE IF NOT EXISTS public.job_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on job_requirements
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;

-- Create required_skills table
CREATE TABLE IF NOT EXISTS public.required_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_requirement_id UUID NOT NULL REFERENCES public.job_requirements(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT NOT NULL,
  importance TEXT NOT NULL DEFAULT 'required',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on required_skills
ALTER TABLE public.required_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their organizations"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their organizations"
  ON public.organizations FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for organization_members
CREATE POLICY "Members can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_members.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can remove members"
  ON public.organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = organization_members.organization_id
      AND organizations.created_by = auth.uid()
    )
  );

-- RLS Policies for job_requirements
CREATE POLICY "Users can view their own job requirements"
  ON public.job_requirements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own job requirements"
  ON public.job_requirements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job requirements"
  ON public.job_requirements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job requirements"
  ON public.job_requirements FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for required_skills
CREATE POLICY "Users can view required skills for their job requirements"
  ON public.required_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_requirements
      WHERE job_requirements.id = required_skills.job_requirement_id
      AND job_requirements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add required skills to their job requirements"
  ON public.required_skills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_requirements
      WHERE job_requirements.id = required_skills.job_requirement_id
      AND job_requirements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update required skills for their job requirements"
  ON public.required_skills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_requirements
      WHERE job_requirements.id = required_skills.job_requirement_id
      AND job_requirements.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete required skills from their job requirements"
  ON public.required_skills FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_requirements
      WHERE job_requirements.id = required_skills.job_requirement_id
      AND job_requirements.user_id = auth.uid()
    )
  );

-- Create trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for job_requirements updated_at
CREATE TRIGGER update_job_requirements_updated_at
  BEFORE UPDATE ON public.job_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();