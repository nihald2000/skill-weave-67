import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, CheckCircle, Github, Linkedin, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { z } from "zod";

const onboardingSchema = z.object({
  linkedinUrl: z.string().url({ message: "Invalid LinkedIn URL" }).optional().or(z.literal("")),
  githubUsername: z.string().trim().max(39, { message: "GitHub username too long" }).optional().or(z.literal("")),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [errors, setErrors] = useState<Partial<OnboardingFormData>>({});
  const [saving, setSaving] = useState(false);
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    setUploading(true);

    try {
      if (!user) throw new Error("Not authenticated");

      // Upload to storage
      const fileExt = "pdf";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("cvs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploading(false);
      setProcessing(true);

      // Process the CV
      const { data, error: functionError } = await supabase.functions.invoke("process-cv", {
        body: { filePath: fileName, fileName: file.name }
      });

      if (functionError) throw functionError;

      setProcessing(false);
      setUploadSuccess(true);

      toast({
        title: "Resume processed!",
        description: `Extracted ${data.skillsCount || 0} skills from your resume`,
      });
    } catch (error: any) {
      console.error("Error uploading resume:", error);
      setUploading(false);
      setProcessing(false);

      toast({
        title: "Upload failed",
        description: error.message || "Failed to process resume",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploading || processing || uploadSuccess,
  });

  const handleSaveProfiles = async () => {
    setErrors({});
    setSaving(true);

    try {
      const validationResult = onboardingSchema.safeParse({
        linkedinUrl: linkedinUrl || "",
        githubUsername: githubUsername || "",
      });

      if (!validationResult.success) {
        const fieldErrors: Partial<OnboardingFormData> = {};
        validationResult.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof OnboardingFormData] = issue.message;
          }
        });
        setErrors(fieldErrors);
        setSaving(false);
        return;
      }

      const documentsToInsert = [];

      if (linkedinUrl) {
        documentsToInsert.push({
          user_id: user?.id,
          document_type: "linkedin",
          file_name: "LinkedIn Profile",
          file_url: linkedinUrl,
          processing_status: "pending",
        });
      }

      if (githubUsername) {
        documentsToInsert.push({
          user_id: user?.id,
          document_type: "github",
          file_name: "GitHub Profile",
          file_url: `https://github.com/${githubUsername}`,
          processing_status: "pending",
        });
      }

      if (documentsToInsert.length > 0) {
        const { error } = await supabase
          .from("documents")
          .insert(documentsToInsert);

        if (error) throw error;

        toast({
          title: "Profiles saved!",
          description: "Your social profiles have been added to your account",
        });
      }

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profiles",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !uploadSuccess) {
      toast({
        title: "Upload required",
        description: "Please upload your resume to continue",
        variant: "destructive",
      });
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSaveProfiles();
    }
  };

  const handleSkip = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to SkillSense! 🎉</h1>
          <p className="text-muted-foreground text-lg">
            Let's discover your hidden skills with AI
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="border-border/50 shadow-xl">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Upload Your Resume</CardTitle>
                <CardDescription>
                  Upload your resume (PDF only, max 5MB) and let our AI extract your skills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragActive ? "border-primary bg-primary/5 scale-105" : "border-border hover:border-primary/50"}
                    ${(uploading || processing || uploadSuccess) ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <input {...getInputProps()} />

                  <div className="flex flex-col items-center gap-4">
                    {uploading || processing ? (
                      <>
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                        <div>
                          <p className="text-lg font-semibold">
                            {uploading ? "Uploading..." : "Processing with AI..."}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {processing ? "Extracting skills from your resume" : "This may take a moment"}
                          </p>
                        </div>
                      </>
                    ) : uploadSuccess ? (
                      <>
                        <CheckCircle className="h-16 w-16 text-green-500" />
                        <div>
                          <p className="text-lg font-semibold">Resume processed successfully!</p>
                          <p className="text-sm text-muted-foreground">
                            {uploadedFile?.name}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        {isDragActive ? (
                          <Upload className="h-16 w-16 text-primary animate-bounce" />
                        ) : (
                          <FileText className="h-16 w-16 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-lg font-semibold mb-1">
                            {isDragActive ? "Drop your resume here" : "Upload your resume"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Drag & drop or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            PDF only • Max 5MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1"
                    disabled={uploading || processing}
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-gradient-accent"
                    disabled={!uploadSuccess || uploading || processing}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Linkedin className="h-6 w-6 text-blue-600" />
                  LinkedIn Profile (Optional)
                </CardTitle>
                <CardDescription>
                  Add your LinkedIn profile URL to enrich your skill data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder="https://www.linkedin.com/in/yourprofile"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                  {errors.linkedinUrl && (
                    <p className="text-sm text-destructive">{errors.linkedinUrl}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    We'll analyze your LinkedIn profile to discover additional skills
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-gradient-accent"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Github className="h-6 w-6" />
                  GitHub Profile (Optional)
                </CardTitle>
                <CardDescription>
                  Add your GitHub username to analyze your coding skills
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github">GitHub Username</Label>
                  <Input
                    id="github"
                    type="text"
                    placeholder="yourusername"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                  />
                  {errors.githubUsername && (
                    <p className="text-sm text-destructive">{errors.githubUsername}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    We'll analyze your repositories and contributions
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="flex-1"
                    disabled={saving}
                  >
                    Skip to Dashboard
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-gradient-accent"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete
                        <CheckCircle className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
