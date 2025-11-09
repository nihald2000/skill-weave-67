import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ResumeUploadProps {
  onUploadSuccess?: () => void;
}

export const ResumeUpload = ({ onUploadSuccess }: ResumeUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Check file type
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    
    // Check file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return "File size must be less than 5MB";
    }
    
    return null;
  };

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      setErrorMessage(error.message);
      setUploadStatus("error");
      toast({
        title: "Invalid file",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    // Additional validation
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setUploadStatus("error");
      toast({
        title: "Invalid file",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadStatus("idle");
    setUploadProgress(0);
    setErrorMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to storage
      const fileExt = "pdf";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(95);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      // Store metadata in documents table
      const { error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          document_type: "resume",
          processing_status: "processing"
        });

      if (docError) throw docError;

      setUploadProgress(98);

      // Call edge function to process resume
      const { error: functionError } = await supabase.functions.invoke("process-cv", {
        body: { filePath: fileName, fileName: file.name }
      });

      if (functionError) {
        console.error("Processing error:", functionError);
        // Don't throw - file is uploaded, processing can be retried
      }

      setUploadProgress(100);
      setUploadStatus("success");
      
      toast({
        title: "Resume uploaded successfully!",
        description: "Your resume is being processed. This may take a moment.",
      });

      setTimeout(() => {
        setUploadStatus("idle");
        setUploadProgress(0);
      }, 3000);

      onUploadSuccess?.();
    } catch (error: any) {
      console.error("Error uploading resume:", error);
      setUploading(false);
      setUploadStatus("error");
      setErrorMessage(error.message || "Failed to upload resume");
      
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [toast, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploading,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-accent/5"}
            ${uploading ? "opacity-50 cursor-not-allowed" : ""}
            ${uploadStatus === "error" ? "border-destructive/50 bg-destructive/5" : ""}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div className="w-full max-w-xs">
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Uploading...
                  </p>
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {uploadProgress}%
                  </p>
                </div>
              </>
            ) : uploadStatus === "success" ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 animate-in zoom-in duration-300" />
                <div>
                  <p className="text-lg font-semibold text-foreground">Success!</p>
                  <p className="text-sm text-muted-foreground">Your resume is being analyzed</p>
                </div>
              </>
            ) : uploadStatus === "error" ? (
              <>
                <XCircle className="h-12 w-12 text-destructive animate-in zoom-in duration-300" />
                <div>
                  <p className="text-lg font-semibold text-foreground">Upload failed</p>
                  <p className="text-sm text-destructive">{errorMessage}</p>
                  <p className="text-xs text-muted-foreground mt-2">Please try again</p>
                </div>
              </>
            ) : (
              <>
                {isDragActive ? (
                  <Upload className="h-12 w-12 text-primary animate-bounce" />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground" />
                )}
                <div>
                  <p className="text-lg font-semibold text-foreground mb-1">
                    {isDragActive ? "Drop your resume here" : "Upload your resume"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or click to browse
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <AlertCircle className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      PDF only • Max 5MB
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
