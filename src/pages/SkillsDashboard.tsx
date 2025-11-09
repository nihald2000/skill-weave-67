import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, Eye, EyeOff, FileText, Target, Search, ChevronDown, CheckCircle2, Sparkles, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportSkillsDashboardPDF } from "@/utils/exportSkillsDashboardPDF";
import { toast as sonnerToast } from "sonner";

interface Skill {
  id: string;
  skill_name: string;
  skill_category: string;
  confidence_score: number;
  proficiency_level: string;
  is_explicit: boolean;
  years_experience: number | null;
  created_at: string;
}

interface SkillEvidence {
  id: string;
  evidence_text: string;
  evidence_type: string;
  context: string;
  reliability_score: number;
  document_id: string;
}

const SkillsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [proficiencyFilter, setProficiencyFilter] = useState("all");
  const [explicitFilter, setExplicitFilter] = useState("all");
  const [sortBy, setSortBy] = useState("confidence");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillEvidence, setSkillEvidence] = useState<SkillEvidence[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      
      setProfile(profileData);

      // Fetch skills
      const { data: skillsData, error: skillsError } = await supabase
        .from("skills")
        .select("*")
        .eq("user_id", user?.id)
        .order("confidence_score", { ascending: false });

      if (skillsError) throw skillsError;
      setSkills(skillsData || []);

      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user?.id);

      if (docsError) throw docsError;
      setDocuments(docsData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error loading skills",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkillClick = async (skill: Skill) => {
    setSelectedSkill(skill);
    setModalOpen(true);
    
    // Fetch evidence for this skill
    try {
      const { data, error } = await supabase
        .from("skill_evidence")
        .select("*")
        .eq("skill_id", skill.id);

      if (error) throw error;
      setSkillEvidence(data || []);
    } catch (error: any) {
      console.error("Error fetching evidence:", error);
      toast({
        title: "Error loading evidence",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      sonnerToast.info("Generating PDF report...", {
        description: "This may take a few moments",
      });

      const userName = profile?.full_name || user?.email || "User";
      
      await exportSkillsDashboardPDF(skills, stats, userName);
      
      sonnerToast.success("PDF exported successfully!", {
        description: "Your skills dashboard has been downloaded",
      });
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      sonnerToast.error("Export failed", {
        description: error.message || "Failed to generate PDF",
      });
    } finally {
      setExporting(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = skills.length;
    const hidden = skills.filter(s => !s.is_explicit).length;
    const avgConfidence = total > 0
      ? skills.reduce((sum, s) => sum + s.confidence_score, 0) / total
      : 0;
    const analyzedDocs = documents.filter(d => d.processing_status === "completed").length;

    return { total, hidden, avgConfidence, analyzedDocs };
  }, [skills, documents]);

  // Filter and sort skills
  const filteredSkills = useMemo(() => {
    let filtered = skills.filter(skill => {
      // Search filter
      if (searchQuery && !skill.skill_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all" && skill.skill_category !== selectedCategory) {
        return false;
      }

      // Confidence filter
      if (confidenceFilter === "high" && skill.confidence_score < 0.8) return false;
      if (confidenceFilter === "medium" && (skill.confidence_score < 0.6 || skill.confidence_score >= 0.8)) return false;
      if (confidenceFilter === "low" && skill.confidence_score >= 0.6) return false;

      // Proficiency filter
      if (proficiencyFilter !== "all" && skill.proficiency_level !== proficiencyFilter) {
        return false;
      }

      // Explicit/Inferred filter
      if (explicitFilter === "explicit" && !skill.is_explicit) return false;
      if (explicitFilter === "inferred" && skill.is_explicit) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "confidence":
          return b.confidence_score - a.confidence_score;
        case "name":
          return a.skill_name.localeCompare(b.skill_name);
        case "proficiency":
          const profOrder = { expert: 4, advanced: 3, intermediate: 2, beginner: 1 };
          return (profOrder[b.proficiency_level as keyof typeof profOrder] || 0) - 
                 (profOrder[a.proficiency_level as keyof typeof profOrder] || 0);
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [skills, searchQuery, selectedCategory, confidenceFilter, proficiencyFilter, explicitFilter, sortBy]);

  // Group skills by category
  const skillsByCategory = useMemo(() => ({
    technical: skills.filter(s => s.skill_category === "technical"),
    soft_skills: skills.filter(s => s.skill_category === "soft_skills"),
    tools: skills.filter(s => s.skill_category === "tools"),
    domain: skills.filter(s => s.skill_category === "domain"),
  }), [skills]);

  const getCategoryColor = (category: string) => {
    const colors = {
      technical: "bg-blue-500/10 text-blue-700 border-blue-200",
      tools: "bg-green-500/10 text-green-700 border-green-200",
      soft_skills: "bg-purple-500/10 text-purple-700 border-purple-200",
      domain: "bg-orange-500/10 text-orange-700 border-orange-200",
    };
    return colors[category as keyof typeof colors] || "bg-secondary";
  };

  const getProficiencyColor = (level: string) => {
    const colors = {
      expert: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
      advanced: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white",
      intermediate: "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
      beginner: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white",
    };
    return colors[level as keyof typeof colors] || "bg-secondary";
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
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Skills Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive overview of your professional skills
            </p>
          </div>
          <Button 
            onClick={handleExportPDF} 
            disabled={exporting || skills.length === 0}
            size="lg"
            className="gap-2"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Skills
                </CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">Skills discovered</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Hidden Skills
                </CardTitle>
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.hidden}</div>
              <p className="text-xs text-muted-foreground mt-1">Inferred from context</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Confidence
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {(stats.avgConfidence * 100).toFixed(0)}%
              </div>
              <Progress value={stats.avgConfidence * 100} className="h-2 mt-2" />
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Documents
                </CardTitle>
                <FileText className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.analyzedDocs}</div>
              <p className="text-xs text-muted-foreground mt-1">Analyzed successfully</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search skills by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Confidence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Confidence</SelectItem>
                    <SelectItem value="high">High (&gt;80%)</SelectItem>
                    <SelectItem value="medium">Medium (60-80%)</SelectItem>
                    <SelectItem value="low">Low (&lt;60%)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={proficiencyFilter} onValueChange={setProficiencyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Proficiency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={explicitFilter} onValueChange={setExplicitFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="explicit">Explicit Only</SelectItem>
                    <SelectItem value="inferred">Inferred Only</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confidence">Confidence</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="proficiency">Proficiency</SelectItem>
                    <SelectItem value="date">Date Added</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setConfidenceFilter("all");
                    setProficiencyFilter("all");
                    setExplicitFilter("all");
                    setSortBy("confidence");
                    setSelectedCategory("all");
                  }}
                >
                  Reset Filters
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Showing {filteredSkills.length} of {skills.length} skills
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs with Skills Grid */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all">All ({skills.length})</TabsTrigger>
            <TabsTrigger value="technical">Technical ({skillsByCategory.technical.length})</TabsTrigger>
            <TabsTrigger value="soft_skills">Soft Skills ({skillsByCategory.soft_skills.length})</TabsTrigger>
            <TabsTrigger value="tools">Tools ({skillsByCategory.tools.length})</TabsTrigger>
            <TabsTrigger value="domain">Domain ({skillsByCategory.domain.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory}>
            {filteredSkills.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No skills found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or upload more documents
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map((skill) => (
                  <Card 
                    key={skill.id} 
                    className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => handleSkillClick(skill)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-foreground mb-2">
                            {skill.skill_name}
                          </CardTitle>
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className={getCategoryColor(skill.skill_category)}>
                              {skill.skill_category.replace("_", " ")}
                            </Badge>
                            {skill.is_explicit ? (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Explicit
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-200">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Inferred
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Confidence Score */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground">Confidence</span>
                          <span className="text-xs font-bold text-foreground">
                            {(skill.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={skill.confidence_score * 100} className="h-2" />
                      </div>

                      {/* Proficiency Badge */}
                      <div className="flex items-center justify-between">
                        <Badge className={`${getProficiencyColor(skill.proficiency_level)} capitalize`}>
                          {skill.proficiency_level}
                        </Badge>
                        {skill.years_experience && (
                          <span className="text-xs text-muted-foreground">
                            {skill.years_experience} years
                          </span>
                        )}
                      </div>

                      {/* View Details */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        View Evidence
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Skill Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{selectedSkill?.skill_name}</DialogTitle>
            <DialogDescription>
              Detailed skill analysis and evidence
            </DialogDescription>
          </DialogHeader>

          {selectedSkill && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Skill Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                    <Badge variant="outline" className={getCategoryColor(selectedSkill.skill_category)}>
                      {selectedSkill.skill_category.replace("_", " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Type</p>
                    {selectedSkill.is_explicit ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Explicit
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-700">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Inferred
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedSkill.confidence_score * 100} className="h-2 flex-1" />
                      <span className="text-sm font-bold">
                        {(selectedSkill.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Proficiency</p>
                    <Badge className={`${getProficiencyColor(selectedSkill.proficiency_level)} capitalize`}>
                      {selectedSkill.proficiency_level}
                    </Badge>
                  </div>
                </div>

                {/* Evidence Trail */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Evidence Trail
                  </h3>
                  {skillEvidence.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No evidence available</p>
                  ) : (
                    <div className="space-y-3">
                      {skillEvidence.map((evidence) => (
                        <Card key={evidence.id} className="border-l-4 border-l-primary">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="outline" className="capitalize">
                                {evidence.evidence_type.replace("_", " ")}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {(evidence.reliability_score * 100).toFixed(0)}% reliable
                              </span>
                            </div>
                            <p className="text-sm text-foreground mb-2 italic">
                              "{evidence.evidence_text}"
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {evidence.context}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SkillsDashboard;
