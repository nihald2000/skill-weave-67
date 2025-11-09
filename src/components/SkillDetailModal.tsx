import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, FileText, Calendar, TrendingUp, Loader2, Edit, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SkillDetailModalProps {
  skill: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkillUpdated?: () => void;
  onSkillDeleted?: () => void;
}

export const SkillDetailModal = ({ skill, open, onOpenChange, onSkillUpdated, onSkillDeleted }: SkillDetailModalProps) => {
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    skill_name: "",
    proficiency_level: "",
    years_experience: "",
    last_used: "",
  });

  useEffect(() => {
    if (open && skill?.id) {
      fetchEvidence();
      setEditForm({
        skill_name: skill.skill_name || "",
        proficiency_level: skill.proficiency_level || "" as any,
        years_experience: skill.years_experience?.toString() || "",
        last_used: skill.last_used || "",
      });
      setIsEditing(false);
    }
  }, [open, skill?.id]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("skill_evidence")
        .select("*")
        .eq("skill_id", skill.id)
        .order("created_at", { ascending: false });
      
      setEvidence(data || []);
    } catch (error) {
      console.error("Error fetching evidence:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("skills")
        .update({
          skill_name: editForm.skill_name,
          proficiency_level: (editForm.proficiency_level || null) as any,
          years_experience: editForm.years_experience ? parseInt(editForm.years_experience) : null,
          last_used_date: editForm.last_used || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", skill.id);

      if (error) throw error;

      toast({
        title: "Skill updated",
        description: "Your changes have been saved successfully.",
      });

      setIsEditing(false);
      onSkillUpdated?.();
    } catch (error) {
      console.error("Error updating skill:", error);
      toast({
        title: "Error",
        description: "Failed to update skill. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("skills")
        .delete()
        .eq("id", skill.id);

      if (error) throw error;

      toast({
        title: "Skill deleted",
        description: "The skill has been removed from your profile.",
      });

      setDeleteDialogOpen(false);
      onOpenChange(false);
      onSkillDeleted?.();
    } catch (error) {
      console.error("Error deleting skill:", error);
      toast({
        title: "Error",
        description: "Failed to delete skill. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      skill_name: skill.skill_name || "",
      proficiency_level: skill.proficiency_level || "" as any,
      years_experience: skill.years_experience?.toString() || "",
      last_used: skill.last_used || "",
    });
    setIsEditing(false);
  };

  if (!skill) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl">
                  {isEditing ? "Edit Skill" : skill.skill_name}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? "Update skill information" : "Detailed view of skill metrics and evidence"}
                </DialogDescription>
              </div>
              {!isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {isEditing ? (
              <>
                {/* Edit Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="skill_name">Skill Name</Label>
                    <Input
                      id="skill_name"
                      value={editForm.skill_name}
                      onChange={(e) => setEditForm({ ...editForm, skill_name: e.target.value })}
                      placeholder="e.g., JavaScript, Project Management"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proficiency_level">Proficiency Level</Label>
                    <Select
                      value={editForm.proficiency_level}
                      onValueChange={(value) => setEditForm({ ...editForm, proficiency_level: value })}
                    >
                      <SelectTrigger id="proficiency_level">
                        <SelectValue placeholder="Select proficiency level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="years_experience">Years of Experience</Label>
                    <Input
                      id="years_experience"
                      type="number"
                      min="0"
                      max="50"
                      value={editForm.years_experience}
                      onChange={(e) => setEditForm({ ...editForm, years_experience: e.target.value })}
                      placeholder="e.g., 5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_used">Last Used Date</Label>
                    <Input
                      id="last_used"
                      type="date"
                      value={editForm.last_used}
                      onChange={(e) => setEditForm({ ...editForm, last_used: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} disabled={saving || !editForm.skill_name.trim()}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} disabled={saving}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the skill "{skill?.skill_name}" and all associated evidence from your profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Skill"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
