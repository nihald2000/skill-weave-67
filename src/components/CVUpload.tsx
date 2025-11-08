import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CVUploadProps {
  onUploadSuccess?: () => void;
}

export const CVUpload = ({ onUploadSuccess }: CVUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadStatus("idle");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("cvs")
        .getPublicUrl(fileName);

      setUploading(false);
      setProcessing(true);

      // Call edge function to process CV
      const { data, error: functionError } = await supabase.functions.invoke("process-cv", {
        body: { filePath: fileName, fileName: file.name }
      });

      if (functionError) throw functionError;

      setProcessing(false);
      setUploadStatus("success");
      
      toast({
        title: "CV processed successfully!",
        description: `Extracted ${data.skillsCount || 0} skills from your CV`,
      });

      onUploadSuccess?.();
    } catch (error: any) {
      console.error("Error uploading CV:", error);
      setUploading(false);
      setProcessing(false);
      setUploadStatus("error");
      
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process CV",
        variant: "destructive",
      });
    }
  }, [toast, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: uploading || processing,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors
            ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            ${(uploading || processing) ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-4">
            {uploading || processing ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {uploading ? "Uploading..." : "Processing CV..."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {processing ? "Extracting skills with AI" : "This may take a moment"}
                  </p>
                </div>
              </>
            ) : uploadStatus === "success" ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div>
                  <p className="text-lg font-semibold text-foreground">Success!</p>
                  <p className="text-sm text-muted-foreground">Your CV has been processed</p>
                </div>
              </>
            ) : uploadStatus === "error" ? (
              <>
                <XCircle className="h-12 w-12 text-destructive" />
                <div>
                  <p className="text-lg font-semibold text-foreground">Upload failed</p>
                  <p className="text-sm text-muted-foreground">Please try again</p>
                </div>
              </>
            ) : (
              <>
                {isDragActive ? (
                  <Upload className="h-12 w-12 text-primary" />
                ) : (
                  <FileText className="h-12 w-12 text-muted-foreground" />
                )}
                <div>
                  <p className="text-lg font-semibold text-foreground mb-1">
                    {isDragActive ? "Drop your CV here" : "Upload your CV"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Supports PDF, DOC, DOCX, TXT (Max 10MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {uploadStatus !== "idle" && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadStatus("idle")}
            >
              Upload Another CV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
