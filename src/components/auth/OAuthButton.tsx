import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OAuthButtonProps {
  provider: 'google' | 'github' | 'linkedin_oidc';
  icon: React.ReactNode;
  text: string;
  variant?: 'google' | 'github' | 'linkedin';
}

const providerStyles = {
  google: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-md",
  github: "bg-[#24292e] text-white hover:bg-[#1a1e22] hover:shadow-md",
  linkedin: "bg-[#0A66C2] text-white hover:bg-[#004182] hover:shadow-md",
};

export const OAuthButton = ({ provider, icon, text, variant = 'google' }: OAuthButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOAuthLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: provider === 'github' ? 'read:user user:email' : undefined,
        }
      });
      
      if (error) {
        throw error;
      }
      // Note: The actual redirect happens automatically, so we don't set loading to false
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
        transition-all duration-200 rounded-lg
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}
        ${providerStyles[variant]}
      `}
      variant="outline"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          {icon}
          <span>{text}</span>
        </>
      )}
    </Button>
  );
};