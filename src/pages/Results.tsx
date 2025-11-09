import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, CheckCircle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Skill {
  id: string;
  skill_name: string;
  skill_category: string;
  confidence_score: number;
  proficiency_level: string;
  is_explicit: boolean;
  created_at: string;
}

const Results = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    explicit: 0,
    implicit: 0,
    avgConfidence: 0,
  });

  useEffect(() => {
    if (user) {
      fetchLatestSkills();
    }
  }, [user]);

  const fetchLatestSkills = async () => {
    try {
      // Fetch skills from the last 5 minutes (recently added)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("user_id", user?.id)
        .gte("created_at", fiveMinutesAgo)
        .order("confidence_score", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // If no recent skills, fetch all skills
        const { data: allSkills, error: allError } = await supabase
          .from("skills")
          .select("*")
          .eq("user_id", user?.id)
          .order("confidence_score", { ascending: false });

        if (allError) throw allError;
        setSkills(allSkills || []);
        calculateStats(allSkills || []);
      } else {
        setSkills(data);
        calculateStats(data);
      }
    } catch (error: any) {
      console.error("Error fetching skills:", error);
      toast({
        title: "Error loading results",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (skillsData: Skill[]) => {
    const explicit = skillsData.filter(s => s.is_explicit).length;
    const implicit = skillsData.length - explicit;
    const avgConfidence = skillsData.length > 0
      ? skillsData.reduce((sum, s) => sum + s.confidence_score, 0) / skillsData.length
      : 0;

    setStats({
      total: skillsData.length,
      explicit,
      implicit,
      avgConfidence,
    });
  };

  const groupedSkills = {
    technical: skills.filter(s => s.skill_category === "technical"),
    tools: skills.filter(s => s.skill_category === "tools"),
    soft_skills: skills.filter(s => s.skill_category === "soft_skills"),
    domain: skills.filter(s => s.skill_category === "domain"),
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      technical: "bg-blue-500/10 text-blue-700 border-blue-200",
      tools: "bg-green-500/10 text-green-700 border-green-200",
      soft_skills: "bg-purple-500/10 text-purple-700 border-purple-200",
      domain: "bg-orange-500/10 text-orange-700 border-orange-200",
    };
    return colors[category as keyof typeof colors] || "bg-secondary";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Analysis Complete!
          </h1>
          <p className="text-lg text-muted-foreground">
            Found {stats.total} skills in your resume
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Explicit Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.explicit}</div>
              <p className="text-xs text-muted-foreground mt-1">From skills section</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Implicit Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.implicit}</div>
              <p className="text-xs text-muted-foreground mt-1">Discovered from context</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </div>
              <Progress value={stats.avgConfidence * 100} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Skills by Category */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Skills</CardTitle>
            <CardDescription>
              Skills organized by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="technical">Technical ({groupedSkills.technical.length})</TabsTrigger>
                <TabsTrigger value="tools">Tools ({groupedSkills.tools.length})</TabsTrigger>
                <TabsTrigger value="soft_skills">Soft Skills ({groupedSkills.soft_skills.length})</TabsTrigger>
                <TabsTrigger value="domain">Domain ({groupedSkills.domain.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="outline"
                      className={`${getCategoryColor(skill.skill_category)} px-3 py-2`}
                    >
                      <span className="font-medium">{skill.skill_name}</span>
                      <span className="ml-2 text-xs opacity-70">
                        {(skill.confidence_score * 100).toFixed(0)}%
                      </span>
                      {skill.is_explicit && (
                        <span className="ml-1 text-xs">✓</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </TabsContent>

              {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                <TabsContent key={category} value={category} className="mt-6">
                  <div className="flex flex-wrap gap-2">
                    {categorySkills.map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="outline"
                        className={`${getCategoryColor(skill.skill_category)} px-3 py-2`}
                      >
                        <span className="font-medium">{skill.skill_name}</span>
                        <span className="ml-2 text-xs opacity-70">
                          {(skill.confidence_score * 100).toFixed(0)}%
                        </span>
                        {skill.is_explicit && (
                          <span className="ml-1 text-xs">✓</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate("/dashboard/skills")}
              className="w-full justify-between"
            >
              View Skills Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="w-full justify-between"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/skill-gap-analysis")}
              className="w-full justify-between"
            >
              Analyze Skill Gaps
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Results;
