-- Add extracted_text column to documents table to store parsed resume text
ALTER TABLE public.documents 
ADD COLUMN extracted_text TEXT;

-- Add index for faster text searches
CREATE INDEX idx_documents_extracted_text ON public.documents USING gin(to_tsvector('english', extracted_text));

COMMENT ON COLUMN public.documents.extracted_text IS 'Extracted text content from the uploaded document for AI analysis and enhancement';