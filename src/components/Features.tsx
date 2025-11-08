import { Brain, Target, Users, TrendingUp, Shield, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Extraction",
    description: "Advanced NLP models extract skills from resumes, LinkedIn profiles, and GitHub repos with 95%+ accuracy.",
  },
  {
    icon: Target,
    title: "Smart Job Matching",
    description: "Automatically match candidates to roles based on skill overlap, identifying gaps and providing confidence scores.",
  },
  {
    icon: Users,
    title: "Team Optimization",
    description: "Build optimal teams by analyzing skill complementarity, coverage, and synergy across your organization.",
  },
  {
    icon: TrendingUp,
    title: "Learning Path Generation",
    description: "Create personalized development roadmaps by mapping current skills to target roles with curated resources.",
  },
  {
    icon: Shield,
    title: "Evidence-Based Profiling",
    description: "Every skill claim is backed by evidence with confidence scores, sources, and validation trails.",
  },
  {
    icon: Zap,
    title: "Real-Time Insights",
    description: "Get instant analytics on skill distributions, gaps, and trends across your entire talent pool.",
  },
];

export const Features = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Everything You Need for
            <span className="text-accent"> Skill Intelligence</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Comprehensive features designed to give you complete visibility and control over your organization's skills landscape.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
