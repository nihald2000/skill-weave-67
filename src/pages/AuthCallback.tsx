import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { GitHubIntegrationModal } from "@/components/auth/GitHubIntegrationModal";
import { LinkedInGuideModal } from "@/components/auth/LinkedInGuideModal";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string>();
  const [authProvider, setAuthProvider] = useState<string>();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error("No session found");
        }

        // Check if this is a new user by looking at created_at timestamp
        const user = session.user;
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const isNewUser = (now.getTime() - createdAt.getTime()) < 10000; // Within 10 seconds

        // Check OAuth provider
        const provider = user.app_metadata?.provider;
        setAuthProvider(provider);

        // Extract GitHub username if available
        if (provider === 'github') {
          const username = user.user_metadata?.user_name || user.user_metadata?.preferred_username;
          setGithubUsername(username);
          
          if (isNewUser && username) {
            setShowGitHubModal(true);
            return; // Don't navigate yet, let modal handle it
          }
        }

        // Show LinkedIn guide for new LinkedIn users
        if (provider === 'linkedin_oidc' && isNewUser) {
          setShowLinkedInModal(true);
          return; // Don't navigate yet, let modal handle it
        }

        if (isNewUser) {
          toast({
            title: "Welcome to SkillSense!",
            description: "Your account has been created successfully.",
          });
          navigate("/onboarding");
        } else {
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in.",
          });
          navigate("/dashboard");
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        
        let errorMessage = "Authentication failed. Please try again.";
        
        if (error.message?.includes("cancelled") || error.message?.includes("denied")) {
          errorMessage = "Authorization cancelled. Please try again if you want to sign in.";
        } else if (error.message?.includes("network") || error.message?.includes("timeout")) {
          errorMessage = "Unable to connect. Please check your internet connection and try again.";
        }
        
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: errorMessage,
        });

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate, toast]);

  const handleGitHubModalClose = () => {
    setShowGitHubModal(false);
    navigate("/onboarding");
  };

  const handleLinkedInModalClose = () => {
    setShowLinkedInModal(false);
    navigate("/onboarding");
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-destructive text-2xl">✕</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Authentication Failed</h2>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <GitHubIntegrationModal 
        open={showGitHubModal} 
        onClose={handleGitHubModalClose}
        githubUsername={githubUsername}
      />
      
      <LinkedInGuideModal 
        open={showLinkedInModal}
        onClose={handleLinkedInModalClose}
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Completing sign in...</h2>
          <p className="text-muted-foreground">Please wait while we authenticate you.</p>
        </div>
      </div>
    </>
  );
}