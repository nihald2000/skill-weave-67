import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const navigate = useNavigate();
  
  return (
    <section className="relative overflow-hidden bg-gradient-hero py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
            <Sparkles className="h-4 w-4" />
            AI-Powered Skill Intelligence
          </div>
          
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Transform Talent Data Into
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Strategic Insights</span>
          </h1>
          
          <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
            SkillSense uses advanced AI to extract, analyze, and profile skills from resumes, LinkedIn, and GitHub—giving you unprecedented visibility into your talent landscape.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 transition-opacity group"
              onClick={() => navigate("/signup")}
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => {
                const howItWorks = document.getElementById("how-it-works");
                howItWorks?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Watch Demo
            </Button>
          </div>
          
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="animate-slide-in-left" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
              <div className="text-3xl font-bold text-accent">95%</div>
              <div className="text-sm text-muted-foreground">Extraction Accuracy</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
              <div className="text-3xl font-bold text-accent">10x</div>
              <div className="text-sm text-muted-foreground">Faster Profiling</div>
            </div>
            <div className="animate-slide-in-right" style={{ animationDelay: "0.6s", animationFillMode: "both" }}>
              <div className="text-3xl font-bold text-accent">100+</div>
              <div className="text-sm text-muted-foreground">Skill Categories</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
};
