import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, AlertCircle, BookOpen, ExternalLink, Calendar, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Progress } from "@/components/ui/progress";

// Hardcoded role templates
const ROLE_TEMPLATES = {
  "Software Engineer": [
    { name: "JavaScript", level: "advanced", priority: "critical" },
    { name: "React", level: "advanced", priority: "critical" },
    { name: "Node.js", level: "intermediate", priority: "high" },
    { name: "Git", level: "intermediate", priority: "critical" },
    { name: "Agile", level: "intermediate", priority: "medium" },
    { name: "Problem Solving", level: "advanced", priority: "critical" },
    { name: "Communication", level: "intermediate", priority: "high" },
  ],
  "Data Scientist": [
    { name: "Python", level: "advanced", priority: "critical" },
    { name: "SQL", level: "advanced", priority: "critical" },
    { name: "Machine Learning", level: "advanced", priority: "critical" },
    { name: "Statistics", level: "advanced", priority: "critical" },
    { name: "Data Visualization", level: "intermediate", priority: "high" },
    { name: "TensorFlow", level: "intermediate", priority: "medium" },
    { name: "Pandas", level: "advanced", priority: "high" },
  ],
  "Product Manager": [
    { name: "Product Strategy", level: "advanced", priority: "critical" },
    { name: "User Research", level: "intermediate", priority: "high" },
    { name: "Data Analysis", level: "intermediate", priority: "high" },
    { name: "Communication", level: "advanced", priority: "critical" },
    { name: "Agile", level: "intermediate", priority: "high" },
    { name: "Roadmap Planning", level: "advanced", priority: "critical" },
    { name: "Stakeholder Management", level: "advanced", priority: "critical" },
  ],
  "Full Stack Developer": [
    { name: "JavaScript", level: "advanced", priority: "critical" },
    { name: "React", level: "advanced", priority: "critical" },
    { name: "Node.js", level: "advanced", priority: "critical" },
    { name: "SQL", level: "intermediate", priority: "high" },
    { name: "REST API", level: "advanced", priority: "critical" },
    { name: "Git", level: "intermediate", priority: "high" },
    { name: "DevOps", level: "intermediate", priority: "medium" },
  ],
  "DevOps Engineer": [
    { name: "Docker", level: "advanced", priority: "critical" },
    { name: "Kubernetes", level: "advanced", priority: "critical" },
    { name: "CI/CD", level: "advanced", priority: "critical" },
    { name: "AWS", level: "advanced", priority: "critical" },
    { name: "Linux", level: "advanced", priority: "critical" },
    { name: "Terraform", level: "intermediate", priority: "high" },
    { name: "Monitoring", level: "intermediate", priority: "high" },
  ],
};

const LEARNING_RESOURCES = {
  "JavaScript": { time: "3-4 months", courses: ["freeCodeCamp", "JavaScript.info", "Udemy JS Bootcamp"] },
  "React": { time: "2-3 months", courses: ["React Official Docs", "Scrimba React Course", "Udemy React Complete"] },
  "Node.js": { time: "2-3 months", courses: ["NodeSchool", "Udemy Node.js", "FreeCodeCamp APIs"] },
  "Python": { time: "3-4 months", courses: ["Python.org Tutorial", "Coursera Python", "Automate Boring Stuff"] },
  "SQL": { time: "1-2 months", courses: ["SQLBolt", "Mode Analytics SQL", "Khan Academy SQL"] },
  "Machine Learning": { time: "4-6 months", courses: ["Coursera ML", "Fast.ai", "Google ML Crash Course"] },
  "Git": { time: "2-4 weeks", courses: ["Git Official Docs", "GitHub Learning Lab", "Atlassian Git Tutorials"] },
  "Docker": { time: "1-2 months", courses: ["Docker Official Docs", "Play with Docker", "Udemy Docker"] },
  "AWS": { time: "3-4 months", courses: ["AWS Training", "A Cloud Guru", "FreeCodeCamp AWS"] },
  default: { time: "2-3 months", courses: ["Coursera", "Udemy", "YouTube Tutorials"] },
};

interface MatchAnalysis {
  skill: string;
  required: string;
  status: "match" | "missing" | "partial";
  currentLevel?: string;
  priority: string;
}

export default function SkillGapAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("Software Engineer");
  const [customRole, setCustomRole] = useState("");
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserSkills();
    }
  }, [user]);

  useEffect(() => {
    if (userSkills.length > 0) {
      analyzeGaps();
    }
  }, [selectedRole, userSkills]);

  const fetchUserSkills = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error fetching your skills",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUserSkills(data || []);
    }
    setLoading(false);
  };

  const analyzeGaps = () => {
    const roleToAnalyze = customRole.trim() || selectedRole;
    const requiredSkills = ROLE_TEMPLATES[roleToAnalyze as keyof typeof ROLE_TEMPLATES] || [];

    const analysis: MatchAnalysis[] = requiredSkills.map(reqSkill => {
      const userSkill = userSkills.find(
        us => us.skill_name.toLowerCase() === reqSkill.name.toLowerCase() ||
             us.skill_name.toLowerCase().includes(reqSkill.name.toLowerCase()) ||
             reqSkill.name.toLowerCase().includes(us.skill_name.toLowerCase())
      );

      const proficiencyOrder = ["beginner", "intermediate", "advanced", "expert"];
      
      if (!userSkill) {
        return {
          skill: reqSkill.name,
          required: reqSkill.level,
          status: "missing" as const,
          priority: reqSkill.priority,
        };
      }

      const userLevel = proficiencyOrder.indexOf(userSkill.proficiency_level || "beginner");
      const requiredLevel = proficiencyOrder.indexOf(reqSkill.level);

      if (userLevel >= requiredLevel) {
        return {
          skill: reqSkill.name,
          required: reqSkill.level,
          status: "match" as const,
          currentLevel: userSkill.proficiency_level,
          priority: reqSkill.priority,
        };
      } else {
        return {
          skill: reqSkill.name,
          required: reqSkill.level,
          status: "partial" as const,
          currentLevel: userSkill.proficiency_level,
          priority: reqSkill.priority,
        };
      }
    });

    setMatchAnalysis(analysis);
  };

  const getMatchRate = () => {
    if (matchAnalysis.length === 0) return 0;
    const matches = matchAnalysis.filter(m => m.status === "match").length;
    return Math.round((matches / matchAnalysis.length) * 100);
  };

  const getMissingSkills = () => matchAnalysis.filter(m => m.status === "missing");
  const getPartialSkills = () => matchAnalysis.filter(m => m.status === "partial");
  const getMatchingSkills = () => matchAnalysis.filter(m => m.status === "match");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getLearningResource = (skillName: string) => {
    return LEARNING_RESOURCES[skillName as keyof typeof LEARNING_RESOURCES] || LEARNING_RESOURCES.default;
  };

  const generateActionPlan = () => {
    const missing = getMissingSkills().filter(s => s.priority === "critical" || s.priority === "high");
    const partial = getPartialSkills().filter(s => s.priority === "critical");
    
    const prioritySkills = [...missing, ...partial].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });

    return prioritySkills.slice(0, 6);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const matchRate = getMatchRate();
  const actionPlan = generateActionPlan();
  const missingSkills = getMissingSkills();
  const partialSkills = getPartialSkills();
  const matchingSkills = getMatchingSkills();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Skill Gap Analysis
          </h1>
          <p className="text-muted-foreground">
            Discover what skills you need to achieve your career goals
          </p>
        </div>

        {/* Role Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Your Target Role</CardTitle>
            <CardDescription>Choose a popular role or enter a custom one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="role">Popular Roles</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_TEMPLATES).map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="custom">Or Enter Custom Role</Label>
              <Input
                id="custom"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g., Senior Frontend Engineer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Required Skills Display */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Required Skills for {customRole || selectedRole}</CardTitle>
            <CardDescription>Skills needed to succeed in this role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(ROLE_TEMPLATES[selectedRole as keyof typeof ROLE_TEMPLATES] || []).map((skill, idx) => (
                <Badge key={idx} variant="outline" className="px-3 py-1">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Match Analysis */}
        {matchAnalysis.length > 0 && (
          <>
            <Card className="mb-8 border-primary/20">
              <CardHeader>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <CardTitle className="text-2xl">Match Analysis</CardTitle>
                    <CardDescription>Your compatibility with this role</CardDescription>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary">{matchRate}%</div>
                    <p className="text-sm text-muted-foreground">Match Rate</p>
                  </div>
                </div>
                <Progress value={matchRate} className="h-3" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-green-500/10 border-green-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <div>
                          <div className="text-2xl font-bold">{matchingSkills.length}</div>
                          <p className="text-sm text-muted-foreground">Skills You Have</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-500/10 border-yellow-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-8 w-8 text-yellow-500" />
                        <div>
                          <div className="text-2xl font-bold">{partialSkills.length}</div>
                          <p className="text-sm text-muted-foreground">Need Improvement</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/10 border-red-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-8 w-8 text-red-500" />
                        <div>
                          <div className="text-2xl font-bold">{missingSkills.length}</div>
                          <p className="text-sm text-muted-foreground">Skills Missing</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-3">
                  {matchAnalysis.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        {item.status === "match" ? (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : item.status === "partial" ? (
                          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{item.skill}</div>
                          <div className="text-sm text-muted-foreground">
                            Required: {item.required}
                            {item.currentLevel && ` • Your Level: ${item.currentLevel}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getPriorityColor(item.priority) as any}>
                          {item.priority}
                        </Badge>
                        {item.status === "match" ? (
                          <Badge className="bg-green-500">✓ Match</Badge>
                        ) : item.status === "partial" ? (
                          <Badge className="bg-yellow-500">⚠ Upgrade</Badge>
                        ) : (
                          <Badge variant="destructive">✗ Missing</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Learning Recommendations */}
            {(missingSkills.length > 0 || partialSkills.length > 0) && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Learning Recommendations
                  </CardTitle>
                  <CardDescription>Resources to help you bridge the gap</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[...missingSkills, ...partialSkills].map((item, idx) => {
                      const resource = getLearningResource(item.skill);
                      return (
                        <div key={idx} className="p-4 border rounded-lg space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">{item.skill}</h3>
                              <p className="text-sm text-muted-foreground">
                                Target Level: {item.required}
                                {item.currentLevel && ` • Current: ${item.currentLevel}`}
                              </p>
                            </div>
                            <Badge variant={getPriorityColor(item.priority) as any}>
                              {item.priority} priority
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Est. Time: {resource.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Focus: {item.status === "partial" ? "Skill Enhancement" : "New Skill"}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2">Suggested Resources:</p>
                            <div className="flex flex-wrap gap-2">
                              {resource.courses.map((course, cidx) => (
                                <Button key={cidx} variant="outline" size="sm" className="h-8">
                                  {course}
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Plan */}
            {actionPlan.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Your Learning Action Plan
                  </CardTitle>
                  <CardDescription>
                    To become a {customRole || selectedRole}, focus on these skills in this order
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {actionPlan.map((item, idx) => {
                      const resource = getLearningResource(item.skill);
                      const monthRange = `Month ${idx * 2 + 1}-${idx * 2 + 2}`;
                      return (
                        <div key={idx} className="flex gap-4 p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-transparent">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                              {idx + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{item.skill}</h3>
                                <p className="text-sm text-muted-foreground">{monthRange}</p>
                              </div>
                              <Badge variant={getPriorityColor(item.priority) as any}>
                                {item.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Estimated: {resource.time}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 p-4 bg-accent rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 <strong>Pro Tip:</strong> Focus on one skill at a time for best results. 
                      Start with critical priority skills first to maximize your impact.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
