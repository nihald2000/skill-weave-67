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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Plus, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Navigation } from "@/components/Navigation";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8884d8", "#82ca9d", "#ffc658"];

export default function TeamSkills() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamSkills, setTeamSkills] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOrganizations();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedOrg) {
      fetchTeamData();
    }
  }, [selectedOrg]);

  const fetchOrganizations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching organizations",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOrganizations(data || []);
      if (data && data.length > 0) {
        setSelectedOrg(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchTeamData = async () => {
    if (!selectedOrg) return;

    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("*, profiles(*)")
      .eq("organization_id", selectedOrg);

    if (membersError) {
      toast({
        title: "Error fetching team members",
        description: membersError.message,
        variant: "destructive",
      });
      return;
    }

    setTeamMembers(members || []);

    const userIds = members?.map(m => m.user_id) || [];
    if (userIds.length === 0) {
      setTeamSkills([]);
      return;
    }

    const { data: skillProfiles, error: skillError } = await supabase
      .from("skill_profiles")
      .select("id, user_id")
      .in("user_id", userIds);

    if (skillError) {
      toast({
        title: "Error fetching skill profiles",
        description: skillError.message,
        variant: "destructive",
      });
      return;
    }

    const profileIds = skillProfiles?.map(sp => sp.id) || [];
    if (profileIds.length === 0) {
      setTeamSkills([]);
      return;
    }

    const { data: skills, error: skillsError } = await supabase
      .from("extracted_skills")
      .select("*")
      .in("skill_profile_id", profileIds);

    if (skillsError) {
      toast({
        title: "Error fetching skills",
        description: skillsError.message,
        variant: "destructive",
      });
    } else {
      setTeamSkills(skills || []);
    }
  };

  const createOrganization = async () => {
    if (!orgName.trim()) {
      toast({
        title: "Organization name required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        description: orgDescription,
        created_by: user?.id,
      })
      .select()
      .single();

    if (orgError) {
      toast({
        title: "Error creating organization",
        description: orgError.message,
        variant: "destructive",
      });
      setCreating(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: user?.id,
        role: "admin",
      });

    if (memberError) {
      toast({
        title: "Error adding admin",
        description: memberError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Organization created",
        description: "You've been added as an admin",
      });
      setShowCreateDialog(false);
      setOrgName("");
      setOrgDescription("");
      fetchOrganizations();
    }
    setCreating(false);
  };

  const getSkillDistribution = () => {
    const skillCounts: { [key: string]: number } = {};
    teamSkills.forEach(skill => {
      skillCounts[skill.skill_name] = (skillCounts[skill.skill_name] || 0) + 1;
    });

    return Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  };

  const getProficiencyDistribution = () => {
    const levels: { [key: string]: number } = {};
    teamSkills.forEach(skill => {
      const level = skill.proficiency_level || "beginner";
      levels[level] = (levels[level] || 0) + 1;
    });

    return Object.entries(levels).map(([name, value]) => ({ name, value }));
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
            <h1 className="text-4xl font-bold mb-2">Team Skills Mapping</h1>
            <p className="text-muted-foreground">Visualize organizational skill distribution</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
                <DialogDescription>
                  Create a new organization to track team skills
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createOrganization} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {organizations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Organizations Yet</CardTitle>
              <CardDescription>Create your first organization to start mapping team skills</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <Label>Select Organization</Label>
              <select
                className="w-full mt-2 px-4 py-2 border rounded-md bg-background"
                value={selectedOrg || ""}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamMembers.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamSkills.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique Skills</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Set(teamSkills.map(s => s.skill_name)).size}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Team Skills</CardTitle>
                  <CardDescription>Most common skills across the team</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getSkillDistribution()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Proficiency Distribution</CardTitle>
                  <CardDescription>Team skill levels overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getProficiencyDistribution()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {getProficiencyDistribution().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
