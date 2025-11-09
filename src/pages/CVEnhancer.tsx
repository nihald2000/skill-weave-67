import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/Navigation";
import { toast } from "sonner";
import { 
  Loader2, 
  Sparkles, 
  FileText,
  Copy,
  Download,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";

interface WeakPoint {
  section: string;
  issue: string;
  suggestion: string;
}

interface QuantificationPoint {
  original: string;
  suggestion: string;
}

interface Change {
  original: string;
  enhanced: string;
  reason: string;
}

interface AnalysisResult {
  missingSkills: string[];
  weakPoints: WeakPoint[];
  quantificationNeeded: QuantificationPoint[];
  skillCoverage: number;
}

interface EnhancementResult {
  enhancedText: string;
  changes: Change[];
}

export default function CVEnhancer() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  
  const [originalText, setOriginalText] = useState("");
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [enhancement, setEnhancement] = useState<EnhancementResult | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Fetch user's documents
    const { data: docsData, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", user.id)
      .order("upload_date", { ascending: false });

    if (docsError) {
      console.error("Error fetching documents:", docsError);
    } else {
      setDocuments(docsData || []);
      
      // Load the most recent document's extracted text
      if (docsData && docsData.length > 0 && docsData[0].extracted_text) {
        setOriginalText(docsData[0].extracted_text);
      }
    }

    // Fetch user's skills
    const { data: skillsData, error: skillsError } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", user.id)
      .order("confidence_score", { ascending: false });

    if (skillsError) {
      console.error("Error fetching skills:", skillsError);
    } else {
      setUserSkills(skillsData || []);
    }

    setLoading(false);
  };

  const analyzeResume = async () => {
    if (!originalText.trim() || originalText === "Paste your resume text here or select a document above...") {
      toast.error("Please enter your resume text");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('enhance-cv', {
        body: {
          originalText,
          userSkills,
          userId: user?.id,
          action: 'analyze',
        },
      });

      if (error) throw error;

      setAnalysis(data);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze resume");
    } finally {
      setAnalyzing(false);
    }
  };

  const enhanceResume = async () => {
    if (!originalText.trim() || originalText === "Paste your resume text here or select a document above...") {
      toast.error("Please enter your resume text");
      return;
    }

    setEnhancing(true);
    setEnhancement(null);

    try {
      const { data, error } = await supabase.functions.invoke('enhance-cv', {
        body: {
          originalText,
          userSkills,
          userId: user?.id,
          action: 'enhance',
        },
      });

      if (error) throw error;

      setEnhancement(data);
      toast.success("Enhancement complete!");
    } catch (error: any) {
      console.error("Enhancement error:", error);
      toast.error(error.message || "Failed to enhance resume");
    } finally {
      setEnhancing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const downloadAsPDF = () => {
    if (!enhancement?.enhancedText) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - 2 * margin;

    doc.setFontSize(12);
    const lines = doc.splitTextToSize(enhancement.enhancedText, maxLineWidth);
    
    let y = margin;
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });

    doc.save("enhanced-resume.pdf");
    toast.success("PDF downloaded!");
  };

  const getSkillCoverageColor = (coverage: number) => {
    if (coverage >= 0.8) return "text-green-500";
    if (coverage >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  const getSkillCoverageLabel = (coverage: number) => {
    if (coverage >= 0.8) return "Excellent";
    if (coverage >= 0.6) return "Good";
    if (coverage >= 0.4) return "Fair";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            CV Enhancement
          </h1>
          <p className="text-muted-foreground">
            AI-powered resume optimization to highlight your skills and achievements
          </p>
        </div>

        {userSkills.length === 0 && (
          <Card className="mb-6 border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">No Skills Found</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your resume on the Dashboard first to discover your skills, then come back here for enhancement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Original Resume */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Original Resume
                </CardTitle>
                <CardDescription>Paste your current resume text</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="Paste your resume text here..."
                  rows={20}
                  className="resize-none font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={analyzeResume}
                    disabled={analyzing || !originalText.trim() || userSkills.length === 0}
                    className="flex-1"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Analyze Resume
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={enhanceResume}
                    disabled={enhancing || !originalText.trim() || userSkills.length === 0}
                    className="flex-1"
                  >
                    {enhancing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Enhanced
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Suggestions */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    AI Suggestions
                  </CardTitle>
                  <CardDescription>Areas for improvement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Skill Coverage */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Skill Coverage</span>
                      <span className={`text-2xl font-bold ${getSkillCoverageColor(analysis.skillCoverage)}`}>
                        {Math.round(analysis.skillCoverage * 100)}%
                      </span>
                    </div>
                    <Progress value={analysis.skillCoverage * 100} className="h-2 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {getSkillCoverageLabel(analysis.skillCoverage)} - Goal: 80%+
                    </p>
                  </div>

                  {/* Missing Skills */}
                  {analysis.missingSkills.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        Missing Skills
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Your resume should highlight these skills:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.missingSkills.map((skill, idx) => (
                          <Badge key={idx} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weak Points */}
                  {analysis.weakPoints.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Weak Points
                      </h3>
                      <div className="space-y-3">
                        {analysis.weakPoints.map((point, idx) => (
                          <div key={idx} className="p-3 border rounded-lg bg-accent/50">
                            <div className="font-medium text-sm mb-1">{point.section}</div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Issue: {point.issue}
                            </div>
                            <div className="text-xs text-green-600">
                              💡 {point.suggestion}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantification Needed */}
                  {analysis.quantificationNeeded.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Add Metrics
                      </h3>
                      <div className="space-y-3">
                        {analysis.quantificationNeeded.map((point, idx) => (
                          <div key={idx} className="p-3 border rounded-lg bg-accent/50">
                            <div className="text-xs text-muted-foreground mb-2">
                              "{point.original}"
                            </div>
                            <div className="text-xs text-green-600">
                              💡 {point.suggestion}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Enhanced Version */}
          <div className="space-y-6">
            {enhancement ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-green-500" />
                      Enhanced Resume
                    </CardTitle>
                    <CardDescription>AI-optimized version</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={enhancement.enhancedText}
                      readOnly
                      rows={20}
                      className="resize-none font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyToClipboard(enhancement.enhancedText)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        onClick={downloadAsPDF}
                        variant="outline"
                        className="flex-1"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Changes Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Changes Made
                    </CardTitle>
                    <CardDescription>
                      {enhancement.changes.length} improvement{enhancement.changes.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="all">
                      <TabsList className="grid w-full grid-cols-1">
                        <TabsTrigger value="all">All Changes</TabsTrigger>
                      </TabsList>
                      <TabsContent value="all" className="space-y-4 mt-4">
                        {enhancement.changes.map((change, idx) => (
                          <div key={idx} className="space-y-2 p-4 border rounded-lg">
                            <div className="text-xs font-semibold text-muted-foreground">
                              Change #{idx + 1}
                            </div>
                            <div className="space-y-2">
                              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded">
                                <div className="text-xs font-medium text-red-600 mb-1">Original:</div>
                                <div className="text-sm">{change.original}</div>
                              </div>
                              <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                                <div className="text-xs font-medium text-green-600 mb-1">Enhanced:</div>
                                <div className="text-sm">{change.enhanced}</div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground italic">
                              💡 {change.reason}
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Enhancement Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Click "Generate Enhanced" to create an optimized version of your resume
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