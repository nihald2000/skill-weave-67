import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, User, LogOut, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CVUpload } from "@/components/CVUpload";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [skillProfile, setSkillProfile] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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

      // Fetch or create skill profile
      const { data: skillProfileData } = await supabase
        .from("skill_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!skillProfileData && user?.id) {
        // Create skill profile if it doesn't exist
        const { data: newProfile } = await supabase
          .from("skill_profiles")
          .insert([{ user_id: user.id }])
          .select()
          .single();
        
        setSkillProfile(newProfile);
      } else {
        setSkillProfile(skillProfileData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-foreground">SkillSense</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

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

        {/* Getting Started */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Start building your skill profile by uploading your professional data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Upload Your CV/Resume</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload your CV to extract explicit skills and experience
                  </p>
                </div>
              </div>
              <CVUpload onUploadSuccess={fetchUserData} />
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Connect Data Sources</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Link your LinkedIn, GitHub, or other professional profiles
                </p>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Review Your Skill Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI will analyze your data and discover hidden skills with confidence scores
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills Section (Empty State) */}
        <Card>
          <CardHeader>
            <CardTitle>Your Skills</CardTitle>
            <CardDescription>
              Skills extracted from your professional data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No skills yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your CV or connect data sources to start discovering your skills
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
