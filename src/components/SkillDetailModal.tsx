import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, FileText, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SkillDetailModalProps {
  skill: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SkillDetailModal = ({ skill, open, onOpenChange }: SkillDetailModalProps) => {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && skill?.id) {
      fetchEvidence();
    }
  }, [open, skill?.id]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("skill_evidence")
        .select("*")
        .eq("extracted_skill_id", skill.id)
        .order("evidence_date", { ascending: false });
      
      setEvidence(data || []);
    } catch (error) {
      console.error("Error fetching evidence:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!skill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{skill.skill_name}</DialogTitle>
          <DialogDescription>
            Detailed view of skill metrics and evidence
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Skill Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Proficiency</div>
                <Badge variant="secondary" className="capitalize">
                  {skill.proficiency_level || "N/A"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full" 
                      style={{ width: `${skill.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">
                    {Math.round(skill.confidence_score * 100)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Experience</div>
                <div className="font-semibold">
                  {skill.years_experience ? `${skill.years_experience} years` : "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Last Used</div>
                <div className="font-semibold">
                  {skill.last_used ? new Date(skill.last_used).toLocaleDateString() : "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Evidence Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Evidence & Sources</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : evidence.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No evidence recorded for this skill yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {evidence.map((item) => (
                  <Card key={item.id} className="border-l-4 border-l-primary/50">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {/* Evidence Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="capitalize">
                                {item.evidence_type}
                              </Badge>
                              <Badge variant="secondary" className="capitalize">
                                {item.source_type}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm font-medium">{item.description}</p>
                            )}
                          </div>
                          {item.source_reliability && (
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Reliability</div>
                              <div className="text-sm font-semibold">
                                {Math.round(item.source_reliability * 100)}%
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Evidence Content */}
                        {item.snippet && (
                          <div className="bg-muted/50 rounded-md p-3">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-muted-foreground italic">
                                "{item.snippet}"
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Evidence Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {item.evidence_date ? new Date(item.evidence_date).toLocaleDateString() : "Date unknown"}
                          </div>
                          {item.link && (
                            <a 
                              href={item.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              View source
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
