-- Create RLS policies for storage.objects to secure CV and resume files
-- Note: RLS is already enabled by default on storage.objects in Supabase

-- Policy: Users can only upload files to their own folder in cvs/resumes buckets
CREATE POLICY "Users can upload their own CV/resume files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('cvs', 'resumes') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can only view their own files in cvs/resumes buckets
CREATE POLICY "Users can view their own CV/resume files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('cvs', 'resumes') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can only update their own files in cvs/resumes buckets
CREATE POLICY "Users can update their own CV/resume files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('cvs', 'resumes') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can only delete their own files in cvs/resumes buckets
CREATE POLICY "Users can delete their own CV/resume files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id IN ('cvs', 'resumes') AND
  (storage.foldername(name))[1] = auth.uid()::text
);