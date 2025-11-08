import { Upload, Cpu, BarChart3, Rocket } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Ingest Data",
    description: "Upload resumes, connect LinkedIn profiles, and sync GitHub accounts in seconds.",
  },
  {
    icon: Cpu,
    title: "AI Analysis",
    description: "Our NLP engine extracts, categorizes, and validates skills with evidence-based confidence scoring.",
  },
  {
    icon: BarChart3,
    title: "Generate Insights",
    description: "Get comprehensive skill profiles, gap analyses, and team optimization recommendations.",
  },
  {
    icon: Rocket,
    title: "Take Action",
    description: "Match to jobs, create learning paths, build teams, and make data-driven talent decisions.",
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            From data ingestion to actionable insights in four simple steps
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connection line for desktop */}
            <div className="hidden lg:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-primary to-accent opacity-20"></div>
            
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center mb-6 shadow-xl">
                    <step.icon className="h-10 w-10 text-primary-foreground" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
