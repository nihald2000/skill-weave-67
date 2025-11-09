import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-foreground">SkillSense</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <button onClick={() => navigate("/team-skills")} className="text-muted-foreground hover:text-foreground transition-colors">
              Team Skills
            </button>
            <button onClick={() => navigate("/skill-gap")} className="text-muted-foreground hover:text-foreground transition-colors">
              Skill Gap
            </button>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button variant="ghost" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
                <Button 
                  className="bg-gradient-accent hover:opacity-90 transition-opacity"
                  onClick={() => navigate("/signup")}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
          
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6 text-foreground" />
          </button>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              <a href="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <button onClick={() => navigate("/team-skills")} className="text-muted-foreground hover:text-foreground transition-colors text-left">
                Team Skills
              </button>
              <button onClick={() => navigate("/skill-gap")} className="text-muted-foreground hover:text-foreground transition-colors text-left">
                Skill Gap
              </button>
              {user ? (
                <>
                  <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard")}>
                    Dashboard
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="w-full" onClick={() => navigate("/login")}>
                    Sign In
                  </Button>
                  <Button className="w-full bg-gradient-accent" onClick={() => navigate("/signup")}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export { Navigation };
export default Navigation;
