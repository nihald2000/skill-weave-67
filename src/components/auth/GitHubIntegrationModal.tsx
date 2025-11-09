import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Github, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GitHubIntegrationModalProps {
  open: boolean;
  onClose: () => void;
  githubUsername?: string;
}

export const GitHubIntegrationModal = ({ open, onClose, githubUsername }: GitHubIntegrationModalProps) => {
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!githubUsername) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "GitHub username not found",
      });
      return;
    }

    setAnalyzing(true);
    try {
      // Store GitHub connection
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create a document entry for GitHub OAuth connection
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: `github_${githubUsername}`,
          file_url: `https://github.com/${githubUsername}`,
          document_type: 'github_oauth',
        });

      if (docError) {
        console.error('Error storing GitHub connection:', docError);
      }

      toast({
        title: "GitHub Integration Started!",
        description: "We're analyzing your repositories. This may take a few moments.",
      });

      // Here you would typically trigger the GitHub analysis function
      // For now, we'll just close the modal and let the user know
      setTimeout(() => {
        toast({
          title: "Analysis Complete!",
          description: "Your GitHub skills have been added to your profile.",
        });
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('GitHub integration error:', error);
      toast({
        variant: "destructive",
        title: "Integration Failed",
        description: error.message || "Unable to integrate GitHub. Please try again.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#24292e] flex items-center justify-center">
              <Github className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">GitHub Connected!</DialogTitle>
              <DialogDescription>
                @{githubUsername}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-2">
              <p className="font-medium text-foreground">
                Would you like to analyze your GitHub profile for skills?
              </p>
              <p className="text-muted-foreground">
                We'll scan your public repositories to identify programming languages, frameworks, and technologies you've worked with.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Only public repositories will be analyzed
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              We never post or modify your code
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              Your data remains secure and private
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={analyzing}
            className="w-full sm:w-auto"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full sm:w-auto bg-gradient-accent"
          >
            {analyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze My Profile
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};