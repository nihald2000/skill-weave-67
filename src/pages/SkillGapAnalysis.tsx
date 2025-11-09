import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";

export default function SkillGapAnalysis() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [jobRequirements, setJobRequirements] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [requiredSkills, setRequiredSkills] = useState<any[]>([]);
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [gapAnalysis, setGapAnalysis] = useState<any[]>([]);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddSkillDialog, setShowAddSkillDialog] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [skillImportance, setSkillImportance] = useState("required");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchJobRequirements();
    fetchUserSkills();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedJob) {
      fetchRequiredSkills();
    }
  }, [selectedJob]);

  useEffect(() => {
    if (requiredSkills.length > 0 && userSkills.length > 0) {
      analyzeGaps();
    }
  }, [requiredSkills, userSkills]);

  const fetchJobRequirements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_requirements")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching job requirements",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setJobRequirements(data || []);
      if (data && data.length > 0) {
        setSelectedJob(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchUserSkills = async () => {
    const { data: skillProfile } = await supabase
      .from("skill_profiles")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (!skillProfile) return;

    const { data, error } = await supabase
      .from("extracted_skills")
      .select("*")
      .eq("skill_profile_id", skillProfile.id);

    if (error) {
      toast({
        title: "Error fetching your skills",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUserSkills(data || []);
    }
  };

  const fetchRequiredSkills = async () => {
    if (!selectedJob) return;

    const { data, error } = await supabase
      .from("required_skills")
      .select("*")
      .eq("job_requirement_id", selectedJob);

    if (error) {
      toast({
        title: "Error fetching required skills",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRequiredSkills(data || []);
    }
  };

  const analyzeGaps = () => {
    const analysis = requiredSkills.map(reqSkill => {
      const userSkill = userSkills.find(
        us => us.skill_name.toLowerCase() === reqSkill.skill_name.toLowerCase()
      );

      const proficiencyOrder = ["beginner", "intermediate", "advanced", "expert"];
      const hasSkill = !!userSkill;
      const meetsLevel = hasSkill && 
        proficiencyOrder.indexOf(userSkill.proficiency_level || "beginner") >= 
        proficiencyOrder.indexOf(reqSkill.proficiency_level);

      return {
        ...reqSkill,
        hasSkill,
        meetsLevel,
        currentLevel: userSkill?.proficiency_level || null,
      };
    });

    setGapAnalysis(analysis);
  };

  const createJobRequirement = async () => {
    if (!jobTitle.trim()) {
      toast({
        title: "Job title required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { error } = await supabase
      .from("job_requirements")
      .insert({
        user_id: user?.id,
        title: jobTitle,
        description: jobDescription,
      });

    if (error) {
      toast({
        title: "Error creating job requirement",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Job requirement created",
      });
      setShowCreateDialog(false);
      setJobTitle("");
      setJobDescription("");
      fetchJobRequirements();
    }
    setCreating(false);
  };

  const addRequiredSkill = async () => {
    if (!skillName.trim() || !selectedJob) {
      toast({
        title: "Skill name required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { error } = await supabase
      .from("required_skills")
      .insert({
        job_requirement_id: selectedJob,
        skill_name: skillName,
        proficiency_level: skillLevel,
        importance: skillImportance,
      });

    if (error) {
      toast({
        title: "Error adding skill",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Skill added",
      });
      setShowAddSkillDialog(false);
      setSkillName("");
      setSkillLevel("intermediate");
      setSkillImportance("required");
      fetchRequiredSkills();
    }
    setCreating(false);
  };

  const deleteRequiredSkill = async (skillId: string) => {
    const { error } = await supabase
      .from("required_skills")
      .delete()
      .eq("id", skillId);

    if (error) {
      toast({
        title: "Error deleting skill",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Skill removed",
      });
      fetchRequiredSkills();
    }
  };

  const getMatchRate = () => {
    if (gapAnalysis.length === 0) return 0;
    const matches = gapAnalysis.filter(g => g.hasSkill && g.meetsLevel).length;
    return Math.round((matches / gapAnalysis.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Skill Gap Analysis</h1>
            <p className="text-muted-foreground">Compare your skills against job requirements</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Job Requirement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Job Requirement</DialogTitle>
                <DialogDescription>
                  Add a job or role to analyze skill gaps
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Senior Developer"
                  />
                </div>
                <div>
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createJobRequirement} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {jobRequirements.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Job Requirements Yet</CardTitle>
              <CardDescription>Add a job requirement to start analyzing skill gaps</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <Label>Select Job Requirement</Label>
              <select
                className="w-full mt-2 px-4 py-2 border rounded-md bg-background"
                value={selectedJob || ""}
                onChange={(e) => setSelectedJob(e.target.value)}
              >
                {jobRequirements.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Required Skills</CardTitle>
                    <CardDescription>Skills needed for this role</CardDescription>
                  </div>
                  <Dialog open={showAddSkillDialog} onOpenChange={setShowAddSkillDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Skill
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Required Skill</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="skillName">Skill Name</Label>
                          <Input
                            id="skillName"
                            value={skillName}
                            onChange={(e) => setSkillName(e.target.value)}
                            placeholder="React"
                          />
                        </div>
                        <div>
                          <Label htmlFor="level">Required Level</Label>
                          <Select value={skillLevel} onValueChange={setSkillLevel}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                              <SelectItem value="expert">Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="importance">Importance</Label>
                          <Select value={skillImportance} onValueChange={setSkillImportance}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="required">Required</SelectItem>
                              <SelectItem value="preferred">Preferred</SelectItem>
                              <SelectItem value="nice-to-have">Nice to Have</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddSkillDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addRequiredSkill} disabled={creating}>
                          {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Add
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {requiredSkills.length === 0 ? (
                  <p className="text-muted-foreground">No required skills added yet</p>
                ) : (
                  <div className="space-y-3">
                    {requiredSkills.map(skill => (
                      <div key={skill.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">{skill.skill_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {skill.proficiency_level} • {skill.importance}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRequiredSkill(skill.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {gapAnalysis.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Gap Analysis</CardTitle>
                      <CardDescription>Your skill match rate: {getMatchRate()}%</CardDescription>
                    </div>
                    <div className="text-4xl font-bold text-primary">{getMatchRate()}%</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gapAnalysis.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-4 border rounded">
                        <div className="flex items-center gap-3">
                          {item.hasSkill && item.meetsLevel ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : item.hasSkill ? (
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <div className="font-medium">{item.skill_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Required: {item.proficiency_level}
                              {item.currentLevel && ` • Current: ${item.currentLevel}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={item.importance === "required" ? "destructive" : "secondary"}>
                            {item.importance}
                          </Badge>
                          {item.hasSkill && item.meetsLevel ? (
                            <Badge variant="default" className="bg-green-500">Match</Badge>
                          ) : item.hasSkill ? (
                            <Badge variant="default" className="bg-yellow-500">Upgrade Needed</Badge>
                          ) : (
                            <Badge variant="destructive">Missing</Badge>
                          )}
                        </div>
                      </div>
                    ))}
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
