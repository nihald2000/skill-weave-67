-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Members can view organization members" ON public.organization_members;

-- Create security definer functions to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_organization_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_creator(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = _org_id
      AND created_by = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  );
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Admins can add members" 
ON public.organization_members
FOR INSERT 
WITH CHECK (
  public.is_organization_admin(auth.uid(), organization_id) 
  OR public.is_organization_creator(auth.uid(), organization_id)
);

CREATE POLICY "Admins can remove members" 
ON public.organization_members
FOR DELETE 
USING (
  public.is_organization_admin(auth.uid(), organization_id)
  OR public.is_organization_creator(auth.uid(), organization_id)
);

CREATE POLICY "Members can view organization members" 
ON public.organization_members
FOR SELECT 
USING (
  public.is_organization_member(auth.uid(), organization_id)
);