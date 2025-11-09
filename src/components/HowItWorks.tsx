import { Upload, Cpu, BarChart3, Rocket, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Upload,
    title: "Ingest Data",
    description: "Upload resumes, connect LinkedIn profiles, and sync GitHub accounts in seconds.",
    detail: "Our platform supports multiple data sources including PDF/DOCX resumes, LinkedIn profiles, and GitHub repositories. Simply drag and drop or connect your accounts."
  },
  {
    icon: Cpu,
    title: "AI Analysis",
    description: "Our NLP engine extracts, categorizes, and validates skills with evidence-based confidence scoring.",
    detail: "Advanced NLP models analyze your data to identify both explicit and implicit skills, providing confidence scores from 0-1 based on multiple evidence sources."
  },
  {
    icon: BarChart3,
    title: "Generate Insights",
    description: "Get comprehensive skill profiles, gap analyses, and team optimization recommendations.",
    detail: "View detailed skill profiles with proficiency levels, evidence trails, and visual analytics. Identify gaps and opportunities for growth."
  },
  {
    icon: Rocket,
    title: "Take Action",
    description: "Match to jobs, create learning paths, build teams, and make data-driven talent decisions.",
    detail: "Use your skill intelligence to match candidates to roles, build learning roadmaps, assemble optimal teams, and make strategic hiring decisions."
  },
];

export const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            From data ingestion to actionable insights in four simple steps
          </p>
        </div>

        {/* Interactive Demo Video Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 p-1">
            <div className="bg-background rounded-xl overflow-hidden">
              {!showVideo ? (
                <div className="relative aspect-video bg-muted/50 flex items-center justify-center group cursor-pointer hover-scale"
                     onClick={() => setShowVideo(true)}>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20"></div>
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="h-10 w-10 text-primary-foreground ml-1" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">Watch Interactive Demo</p>
                    <p className="text-sm text-muted-foreground">See SkillSense in action (2 min)</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                    title="SkillSense Demo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </div>
          </div>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => setShowVideo(!showVideo)}>
              {showVideo ? "Hide Video" : "Show Demo Video"}
            </Button>
          </div>
        </div>
        
        {/* Interactive Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connection line for desktop */}
            <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-primary to-accent opacity-20"></div>
            
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="relative"
                onMouseEnter={() => setActiveStep(index)}
                onMouseLeave={() => setActiveStep(null)}
              >
                <div className={`flex flex-col items-center text-center transition-all duration-300 ${
                  activeStep === index ? 'scale-105' : ''
                }`}>
                  <div className={`relative z-10 w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center mb-6 shadow-xl transition-all duration-300 ${
                    activeStep === index ? 'shadow-2xl scale-110' : ''
                  }`}>
                    <step.icon className="h-10 w-10 text-primary-foreground" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                  <p className={`text-muted-foreground transition-all duration-300 ${
                    activeStep === index ? 'opacity-0 h-0' : 'opacity-100'
                  }`}>
                    {step.description}
                  </p>
                  <p className={`text-sm text-muted-foreground transition-all duration-300 ${
                    activeStep === index ? 'opacity-100 mt-2' : 'opacity-0 h-0 absolute'
                  }`}>
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
