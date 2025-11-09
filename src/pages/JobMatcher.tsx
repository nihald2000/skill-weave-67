import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { toast } from "sonner";
import { 
  Loader2, 
  Upload, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Briefcase,
  Target,
  Clock,
  Trash2,
  AlertCircle
} from "lucide-react";

interface JobMatch {
  id: string;
  job_title: string;
  job_company?: string;
  job_description: string;
  match_score: number;
  matched_skills_count: number;
  missing_skills_count: number;
  created_at: string;
}

interface MatchSkill {
  skill_name: string;
  required_level: string;
  is_matched: boolean;
  is_critical: boolean;
  user_confidence?: number;
  user_proficiency?: string;
}

export default function JobMatcher() {
  const { user } = useAuth();
  
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [currentMatch, setCurrentMatch] = useState<any>(null);
  const [savedMatches, setSavedMatches] = useState<JobMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<{
    matchedSkills: MatchSkill[];
    missingSkills: MatchSkill[];
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchSavedMatches();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedMatchId) {
      fetchMatchDetails(selectedMatchId);
    }
  }, [selectedMatchId]);

  const fetchSavedMatches = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("job_matches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load saved job matches");
      console.error(error);
    } else {
      setSavedMatches(data || []);
    }
    setLoading(false);
  };

  const fetchMatchDetails = async (matchId: string) => {
    const { data, error } = await supabase
      .from("job_match_skills")
      .select("*")
      .eq("job_match_id", matchId);

    if (error) {
      toast.error("Failed to load match details");
      console.error(error);
      return;
    }

    const matched = data?.filter(s => s.is_matched) || [];
    const missing = data?.filter(s => !s.is_matched) || [];

    setMatchDetails({
      matchedSkills: matched,
      missingSkills: missing,
    });
  };

  const analyzeJobMatch = async () => {
    if (!jobDescription.trim()) {
      toast.error("Please enter a job description");
      return;
    }

    setAnalyzing(true);
    setCurrentMatch(null);

    try {
      // Call edge function to analyze match
      const { data, error } = await supabase.functions.invoke('analyze-job-match', {
        body: {
          jobDescription,
          userId: user?.id,
        },
      });

      if (error) {
        throw error;
      }

      console.log("Match analysis result:", data);

      // Save job match to database
      const { data: jobMatchData, error: insertError } = await supabase
        .from("job_matches")
        .insert({
          user_id: user?.id,
          job_title: jobTitle || "Untitled Job",
          job_company: jobCompany || null,
          job_description: jobDescription,
          match_score: data.matchScore,
          matched_skills_count: data.matchedCount,
          missing_skills_count: data.missingCount,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Save matched and missing skills
      const allSkills = [
        ...data.matchedSkills,
        ...data.missingSkills,
      ].map(skill => ({
        job_match_id: jobMatchData.id,
        ...skill,
      }));

      const { error: skillsError } = await supabase
        .from("job_match_skills")
        .insert(allSkills);

      if (skillsError) {
        console.error("Error saving skills:", skillsError);
      }

      setCurrentMatch({
        ...data,
        id: jobMatchData.id,
        job_title: jobTitle || "Untitled Job",
      });

      setMatchDetails({
        matchedSkills: data.matchedSkills,
        missingSkills: data.missingSkills,
      });

      toast.success("Job match analysis complete!");
      fetchSavedMatches();
      
      // Clear form
      setJobDescription("");
      setJobTitle("");
      setJobCompany("");

    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze job match");
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteJobMatch = async (matchId: string) => {
    const { error } = await supabase
      .from("job_matches")
      .delete()
      .eq("id", matchId);

    if (error) {
      toast.error("Failed to delete job match");
      console.error(error);
    } else {
      toast.success("Job match deleted");
      fetchSavedMatches();
      if (selectedMatchId === matchId) {
        setSelectedMatchId(null);
        setMatchDetails(null);
      }
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getMatchLabel = (score: number) => {
    if (score >= 80) return "Great Match!";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Partial Match";
    return "Low Match";
  };

  const getRecommendation = (score: number, missingCritical: number) => {
    if (score >= 80) {
      return "You're a strong candidate for this role! Consider applying with confidence.";
    } else if (score >= 60) {
      return "You're a good fit for this role. Highlight your matching skills in your application.";
    } else if (missingCritical > 0) {
      return `Focus on developing ${missingCritical} critical skill${missingCritical > 1 ? 's' : ''} before applying.`;
    } else {
      return "Consider building more relevant skills to strengthen your candidacy.";
    }
  };

  const displayMatch = currentMatch || (selectedMatchId ? savedMatches.find(m => m.id === selectedMatchId) : null);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Job Matcher
          </h1>
          <p className="text-muted-foreground">
            Discover how well you match with job opportunities
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Analyze Job Posting
                </CardTitle>
                <CardDescription>Paste a job description to see how you match</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Frontend Developer"
                  />
                </div>
                <div>
                  <Label htmlFor="jobCompany">Company (Optional)</Label>
                  <Input
                    id="jobCompany"
                    value={jobCompany}
                    onChange={(e) => setJobCompany(e.target.value)}
                    placeholder="e.g., Tech Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="jobDesc">Job Description</Label>
                  <Textarea
                    id="jobDesc"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here..."
                    rows={10}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={analyzeJobMatch}
                  disabled={analyzing || !jobDescription.trim()}
                  className="w-full"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Target className="mr-2 h-4 w-4" />
                      Analyze Match
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Saved Matches */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Jobs I'm Tracking
                </CardTitle>
                <CardDescription>{savedMatches.length} saved job{savedMatches.length !== 1 ? 's' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : savedMatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No saved job matches yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedMatches.map(match => (
                      <div
                        key={match.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMatchId === match.id ? 'bg-accent border-primary' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => setSelectedMatchId(match.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{match.job_title}</h3>
                            {match.job_company && (
                              <p className="text-xs text-muted-foreground">{match.job_company}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteJobMatch(match.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${getMatchColor(match.match_score)}`}>
                            {match.match_score}%
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getMatchLabel(match.match_score)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2">
            {displayMatch && matchDetails ? (
              <div className="space-y-6">
                {/* Match Score Card */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-2xl">{displayMatch.job_title || "Job Match"}</CardTitle>
                        <CardDescription>
                          {displayMatch.job_company || "Company not specified"}
                        </CardDescription>
                      </div>
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${getMatchColor(displayMatch.matchScore || displayMatch.match_score)}`}>
                          {displayMatch.matchScore || displayMatch.match_score}%
                        </div>
                        <Badge className="mt-2" variant="outline">
                          {getMatchLabel(displayMatch.matchScore || displayMatch.match_score)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress 
                      value={displayMatch.matchScore || displayMatch.match_score} 
                      className="h-4 mb-4" 
                    />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-500">
                          {matchDetails.matchedSkills.filter(s => s.is_matched).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Matched Skills</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-500">
                          {matchDetails.matchedSkills.filter(s => !s.is_matched).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Partial Matches</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-500">
                          {matchDetails.missingSkills.length}
                        </div>
                        <p className="text-xs text-muted-foreground">Missing Skills</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendation */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">Recommendation</h3>
                        <p className="text-sm text-muted-foreground">
                          {getRecommendation(
                            displayMatch.matchScore || displayMatch.match_score,
                            matchDetails.missingSkills.filter(s => s.is_critical).length
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Matched Skills */}
                {matchDetails.matchedSkills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-500">
                        <CheckCircle className="h-5 w-5" />
                        Skills You Have
                      </CardTitle>
                      <CardDescription>
                        These skills match the job requirements
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {matchDetails.matchedSkills.map((skill, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 border rounded-lg bg-green-500/5">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <div>
                                <div className="font-medium">{skill.skill_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Required: {skill.required_level}
                                  {skill.user_proficiency && ` • Your Level: ${skill.user_proficiency}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {skill.is_critical && (
                                <Badge variant="destructive" className="text-xs">
                                  Critical
                                </Badge>
                              )}
                              {skill.user_confidence && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(skill.user_confidence * 100)}% confident
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Missing Skills */}
                {matchDetails.missingSkills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-500">
                        <XCircle className="h-5 w-5" />
                        Skills to Develop
                      </CardTitle>
                      <CardDescription>
                        Consider learning these skills to improve your match
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {matchDetails.missingSkills
                          .sort((a, b) => (b.is_critical ? 1 : 0) - (a.is_critical ? 1 : 0))
                          .map((skill, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 border rounded-lg bg-red-500/5">
                            <div className="flex items-center gap-3">
                              {skill.is_critical ? (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-orange-500" />
                              )}
                              <div>
                                <div className="font-medium">{skill.skill_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Required Level: {skill.required_level}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {skill.is_critical ? (
                                <Badge variant="destructive">Must Have</Badge>
                              ) : (
                                <Badge variant="secondary">Nice to Have</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Job Selected</h3>
                  <p className="text-muted-foreground mb-6">
                    Analyze a new job posting or select a saved match to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}