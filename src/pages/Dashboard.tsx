import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, User, TrendingUp, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ResumeUpload } from "@/components/ResumeUpload";
import { DocumentsList } from "@/components/DocumentsList";
import { SkillDetailModal } from "@/components/SkillDetailModal";
import { SkillsVisualization } from "@/components/SkillsVisualization";
import { AddSkillDialog } from "@/components/AddSkillDialog";
import { ExportSkillsDialog } from "@/components/ExportSkillsDialog";
import { Navigation } from "@/components/Navigation";

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [skillProfile, setSkillProfile] = useState<any>(null);
  const [extractedSkills, setExtractedSkills] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [proficiencyFilter, setProficiencyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addSkillDialogOpen, setAddSkillDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [refreshDocuments, setRefreshDocuments] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      
      setProfile(profileData);

      // Fetch skills directly from new skills table
      const { data: skillsData, error: skillsError } = await supabase
        .from("skills")
        .select("*")
        .eq("user_id", user?.id)
        .order("confidence_score", { ascending: false });
      
      if (skillsError) {
        console.error("Error fetching skills:", skillsError);
      }

      setExtractedSkills(skillsData || []);

      // Calculate skill profile stats from skills
      if (skillsData && skillsData.length > 0) {
        setSkillProfile({
          total_skills: skillsData.length,
          completeness_score: Math.min(skillsData.length / 20, 1.0),
        });
      } else {
        setSkillProfile({ total_skills: 0, completeness_score: 0 });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSkillClick = (skill: any) => {
    setSelectedSkill(skill);
    setModalOpen(true);
  };

  const filteredSkills = useMemo(() => {
    return extractedSkills.filter((skill) => {
      const matchesProficiency = proficiencyFilter === "all" || skill.proficiency_level === proficiencyFilter;
      const matchesSearch = skill.skill_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesProficiency && matchesSearch;
    });
  }, [extractedSkills, proficiencyFilter, searchQuery]);

  if (loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name || user.email}!
          </h1>
          <p className="text-muted-foreground">
            Discover and manage your skill intelligence profile
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{skillProfile?.total_skills || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across all categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile Completeness</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((skillProfile?.completeness_score || 0) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Upload data to improve
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                CV, LinkedIn, GitHub
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Resume Upload Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Upload Resume</h2>
          <ResumeUpload 
            onUploadSuccess={() => {
              fetchUserData();
              setRefreshDocuments(prev => prev + 1);
            }} 
          />
        </div>

        {/* Documents List */}
        <div className="mb-8">
          <DocumentsList 
            refreshTrigger={refreshDocuments}
            onDocumentDeleted={fetchUserData}
          />
        </div>

        {/* Skills Visualization */}
        <SkillsVisualization skills={extractedSkills} />

        {/* Skills Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div>
              <CardTitle>Your Skills</CardTitle>
              <CardDescription>
                Skills extracted from your professional data
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setExportDialogOpen(true)}
                disabled={extractedSkills.length === 0}
              >
                Export PDF
              </Button>
              <Button onClick={() => setAddSkillDialogOpen(true)}>
                Add Skill
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {extractedSkills.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No skills yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your CV or connect data sources to start discovering your skills
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search skills..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={proficiencyFilter} onValueChange={setProficiencyFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {filteredSkills.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No skills match your filters</p>
                  </div>
                ) : (
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Proficiency</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Experience</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSkills.map((skill) => (
                    <TableRow 
                      key={skill.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSkillClick(skill)}
                    >
                      <TableCell className="font-medium">{skill.skill_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {skill.proficiency_level || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden max-w-[100px]">
                            <div 
                              className="bg-primary h-full" 
                              style={{ width: `${skill.confidence_score * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(skill.confidence_score * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {skill.years_experience ? `${skill.years_experience} years` : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Skill Detail Modal */}
      <SkillDetailModal 
        skill={selectedSkill}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSkillUpdated={fetchUserData}
        onSkillDeleted={fetchUserData}
      />

      {/* Add Skill Dialog */}
      {user?.id && (
        <AddSkillDialog
          open={addSkillDialogOpen}
          onOpenChange={setAddSkillDialogOpen}
          userId={user.id}
          onSkillAdded={fetchUserData}
        />
      )}

      {/* Export Skills Dialog */}
      <ExportSkillsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        profile={profile}
        skillProfile={skillProfile}
        skills={extractedSkills}
      />
    </div>
  );
};

export default Dashboard;
