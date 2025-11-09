import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Github, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Google Icon Component with official colors
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path fill="#4285F4" d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"/>
    <path fill="#34A853" d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"/>
    <path fill="#FBBC05" d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"/>
    <path fill="#EA4335" d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"/>
  </svg>
);

interface OAuthButtonProps {
  provider: 'google' | 'github' | 'linkedin_oidc';
  text: string;
}

const providerConfig = {
  google: {
    icon: <GoogleIcon />,
    styles: "bg-white text-[#3c4043] border border-[#dadce0] hover:bg-[#f8f9fa] hover:shadow-lg hover:border-[#d2d3d4]",
  },
  github: {
    icon: <Github className="w-5 h-5" />,
    styles: "bg-[#24292e] text-white hover:bg-[#2f363d] hover:shadow-lg",
  },
  linkedin_oidc: {
    icon: <Linkedin className="w-5 h-5" />,
    styles: "bg-[#0A66C2] text-white hover:bg-[#004182] hover:shadow-lg",
  },
};

export const OAuthButton = ({ provider, text }: OAuthButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const config = providerConfig[provider];

  const handleOAuthLogin = async () => {
    setLoading(true);
    try {
      const scopes = provider === 'github' ? 'read:user user:email' : provider === 'google' ? 'email profile' : 'r_liteprofile r_emailaddress';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: scopes,
        }
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error.message || "Unable to connect. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleOAuthLogin}
      disabled={loading}
      className={`
        w-full h-12 flex items-center justify-center gap-3 font-medium 
        transition-all duration-200 rounded-lg active:scale-[0.98]
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}
        ${config.styles}
      `}
      variant="ghost"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          {config.icon}
          <span>{text}</span>
        </>
      )}
    </Button>
  );
};