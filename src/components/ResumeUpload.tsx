import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { analyzeDocument } from "@/utils/analyzeDocument";
import { toast as sonnerToast } from "sonner";

interface FileUploadState {
  file: File;
  status: "pending" | "uploading" | "extracting" | "analyzing" | "success" | "error";
  progress: number;
  error?: string;
  documentId?: string;
}

interface ResumeUploadProps {
  onUploadSuccess?: () => void;
}

export const ResumeUpload = ({ onUploadSuccess }: ResumeUploadProps) => {
  const [uploadQueue, setUploadQueue] = useState<FileUploadState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Only PDF files are allowed";
    }
    if (file.size > 5 * 1024 * 1024) {
      return "File size must be less than 5MB";
    }
    return null;
  };

  const uploadSingleFile = async (fileState: FileUploadState, index: number) => {
    const { file } = fileState;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update status to uploading
      setUploadQueue(prev => prev.map((f, i) => 
        i === index ? { ...f, status: "uploading" as const, progress: 10 } : f
      ));

      // Upload to storage
      const fileExt = "pdf";
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadQueue(prev => prev.map((f, i) => 
        i === index ? { ...f, progress: 30 } : f
      ));

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      // Store metadata in documents table (will update with extracted text later)
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          document_type: "resume",
          processing_status: "processing"
        })
        .select()
        .single();

      if (docError) throw docError;

      setUploadQueue(prev => prev.map((f, i) => 
        i === index ? { ...f, status: "extracting" as const, progress: 50, documentId: document.id } : f
      ));

      // Extract text from PDF
      const fileBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileBuffer);
      let extractedText = "";
      
      try {
        extractedText = new TextDecoder("utf-8", { fatal: false }).decode(uint8Array);
        extractedText = extractedText
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch (e) {
        console.error("Text extraction error:", e);
        extractedText = new TextDecoder().decode(uint8Array);
      }

      // Store extracted text in database for CV enhancer
      await supabase
        .from("documents")
        .update({ extracted_text: extractedText } as any)
        .eq("id", document.id);

      setUploadQueue(prev => prev.map((f, i) => 
        i === index ? { ...f, status: "analyzing" as const, progress: 70 } : f
      ));

      // Analyze document with AI
      const result = await analyzeDocument({
        documentId: document.id,
        extractedText,
        userId: user.id,
        onProgress: (message) => {
          console.log(`[${file.name}] ${message}`);
        }
      });

      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      // Mark as success
      setUploadQueue(prev => prev.map((f, i) => 
        i === index ? { ...f, status: "success" as const, progress: 100 } : f
      ));

      // Show success message
      sonnerToast.success(`✓ ${file.name}`, {
        description: `Found ${result.skillsCount} skills (${result.explicitSkills} explicit, ${result.implicitSkills} implicit)`,
      });

    } catch (error: any) {
      console.error("Error uploading file:", error);
      setUploadQueue(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: "error" as const, 
          progress: 0, 
          error: error.message || "Upload failed" 
        } : f
      ));
    }
  };

  const processQueue = async (files: FileUploadState[]) => {
    setIsProcessing(true);
    
    // Process files in parallel (max 3 at a time)
    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map((fileState, batchIndex) => 
          uploadSingleFile(fileState, i + batchIndex)
        )
      );
    }

    setIsProcessing(false);
    
    const successCount = uploadQueue.filter(f => f.status === "success").length;
    const errorCount = uploadQueue.filter(f => f.status === "error").length;
    
    if (successCount > 0) {
      toast({
        title: `${successCount} resume${successCount > 1 ? 's' : ''} analyzed successfully!`,
        description: errorCount > 0 ? `${errorCount} file${errorCount > 1 ? 's' : ''} failed` : "View your results now",
      });
      onUploadSuccess?.();
      
      // Redirect to results page after a short delay
      setTimeout(() => {
        navigate("/results");
      }, 2000);
    }

    if (errorCount > 0 && successCount === 0) {
      toast({
        title: "All uploads failed",
        description: "Please check the errors and try again",
        variant: "destructive",
      });
    }

    // Clear successful uploads after redirect
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(f => f.status !== "success"));
    }, 3000);
  };

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const error = rejection.errors[0];
        toast({
          title: `Invalid file: ${rejection.file.name}`,
          description: error.message,
          variant: "destructive",
        });
      });
    }

    // Validate and add accepted files to queue
    const validFiles: FileUploadState[] = [];
    
    acceptedFiles.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        toast({
          title: `Invalid file: ${file.name}`,
          description: validationError,
          variant: "destructive",
        });
      } else {
        validFiles.push({
          file,
          status: "pending",
          progress: 0,
        });
      }
    });

    if (validFiles.length === 0) return;

    setUploadQueue(prev => [...prev, ...validFiles]);
    
    // Start processing if not already processing
    if (!isProcessing) {
      await processQueue(validFiles);
    }
  }, [toast, onUploadSuccess, isProcessing]);

  const removeFromQueue = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setUploadQueue(prev => prev.filter(f => f.status !== "success"));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: true,
    disabled: isProcessing,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const getStatusIcon = (status: FileUploadState["status"]) => {
    switch (status) {
      case "pending":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "uploading":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "extracting":
        return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />;
      case "analyzing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusText = (status: FileUploadState["status"]) => {
    switch (status) {
      case "pending":
        return "Waiting...";
      case "uploading":
        return "Uploading...";
      case "extracting":
        return "Extracting text...";
      case "analyzing":
        return "Analyzing your skills...";
      case "success":
        return "Complete!";
      case "error":
        return "Failed";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all duration-300 ease-in-out
              ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-accent/5"}
              ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center gap-4">
              {isDragActive ? (
                <Upload className="h-12 w-12 text-primary animate-bounce" />
              ) : (
                <FileText className="h-12 w-12 text-muted-foreground" />
              )}
              <div>
                <p className="text-lg font-semibold text-foreground mb-1">
                  {isDragActive ? "Drop your resumes here" : "Upload resumes"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop multiple files or click to browse
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    PDF only • Max 5MB per file • Multiple files supported
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Upload Queue ({uploadQueue.length})
              </h3>
              {uploadQueue.some(f => f.status === "success") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCompleted}
                  className="text-xs"
                >
                  Clear Completed
                </Button>
              )}
            </div>
            
            <ScrollArea className={uploadQueue.length > 3 ? "h-[240px]" : ""}>
              <div className="space-y-3">
                {uploadQueue.map((fileState, index) => (
                  <div
                    key={`${fileState.file.name}-${index}`}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(fileState.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {fileState.file.name}
                        </p>
                        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {getStatusText(fileState.status)}
                        </span>
                      </div>
                      
                      {(fileState.status === "uploading" || 
                        fileState.status === "extracting" || 
                        fileState.status === "analyzing") && (
                        <Progress value={fileState.progress} className="h-1" />
                      )}
                      
                      {fileState.error && (
                        <p className="text-xs text-destructive mt-1">
                          {fileState.error}
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {(fileState.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    
                    {fileState.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8"
                        onClick={() => removeFromQueue(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
