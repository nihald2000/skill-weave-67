import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/Navigation";
import { toast } from "sonner";
import { 
  Loader2, 
  Github, 
  Star,
  GitFork,
  Code,
  BookOpen,
  Users,
  CheckCircle,
  TrendingUp,
  Package,
  AlertCircle
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface GitHubRepo {
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  topics: string[];
}

interface GitHubProfile {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
}

interface LanguageStat {
  language: string;
  bytes: number;
  percentage: number;
}

interface ExtractedSkill {
  name: string;
  source: string;
  confidence: number;
  evidence: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

const FRAMEWORK_KEYWORDS = {
  'React': ['react', 'reactjs', 'react.js', 'jsx', 'tsx'],
  'Vue': ['vue', 'vuejs', 'vue.js', 'nuxt'],
  'Angular': ['angular', '@angular'],
  'Node.js': ['node', 'nodejs', 'express', 'nest', 'nestjs'],
  'Django': ['django', 'python-django'],
  'Flask': ['flask', 'python-flask'],
  'Spring': ['spring', 'spring-boot', 'springboot'],
  'Docker': ['docker', 'dockerfile', 'docker-compose'],
  'Kubernetes': ['kubernetes', 'k8s', 'kubectl'],
  'PostgreSQL': ['postgres', 'postgresql', 'psql'],
  'MongoDB': ['mongo', 'mongodb'],
  'Redis': ['redis'],
  'GraphQL': ['graphql', 'apollo'],
  'REST API': ['rest', 'api', 'restful'],
  'Git': ['git', 'github'],
  'CI/CD': ['ci', 'cd', 'github-actions', 'jenkins', 'travis'],
  'Testing': ['test', 'jest', 'mocha', 'pytest', 'unittest'],
  'AWS': ['aws', 'amazon-web-services', 's3', 'ec2', 'lambda'],
  'TypeScript': ['typescript', 'ts'],
  'Tailwind CSS': ['tailwind', 'tailwindcss'],
};

export default function GitHubIntegration() {
  const { user } = useAuth();
  
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStat[]>([]);
  const [extractedSkills, setExtractedSkills] = useState<ExtractedSkill[]>([]);

  const analyzeGitHub = async () => {
    if (!username.trim()) {
      toast.error("Please enter a GitHub username");
      return;
    }

    setLoading(true);
    setProfile(null);
    setRepos([]);
    setLanguageStats([]);
    setExtractedSkills([]);

    try {
      // Fetch GitHub profile
      const profileRes = await fetch(`https://api.github.com/users/${username}`);
      
      // Check for rate limiting
      const remaining = profileRes.headers.get('X-RateLimit-Remaining');
      const resetTime = profileRes.headers.get('X-RateLimit-Reset');
      console.log(`GitHub API Rate Limit - Remaining: ${remaining}, Reset: ${resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleString() : 'N/A'}`);
      
      if (profileRes.status === 403) {
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleString() : 'unknown time';
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}`);
      }
      
      if (!profileRes.ok) {
        throw new Error(profileRes.status === 404 ? "GitHub user not found" : `GitHub API error: ${profileRes.status}`);
      }
      const profileData = await profileRes.json();
      setProfile(profileData);

      // Fetch repositories
      const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30`);
      
      if (reposRes.status === 403) {
        const resetTime = reposRes.headers.get('X-RateLimit-Reset');
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleString() : 'unknown time';
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}`);
      }
      
      if (!reposRes.ok) {
        throw new Error(`Failed to fetch repositories: ${reposRes.status}`);
      }
      
      const reposData = await reposRes.json();
      setRepos(reposData);

      // Aggregate language statistics
      const languageMap: Record<string, number> = {};
      const skillsMap: Record<string, ExtractedSkill> = {};

      for (const repo of reposData) {
        // Get languages for each repo
        const langRes = await fetch(repo.languages_url);
        const langData = await langRes.json();

        Object.entries(langData).forEach(([lang, bytes]) => {
          languageMap[lang] = (languageMap[lang] || 0) + (bytes as number);
          
          // Add programming language as skill
          if (!skillsMap[lang]) {
            skillsMap[lang] = {
              name: lang,
              source: 'Programming Language',
              confidence: 0,
              evidence: [],
            };
          }
          skillsMap[lang].evidence.push(`${repo.name} (${Math.round((bytes as number) / 1024)}KB)`);
        });

        // Extract frameworks and tools from repo topics and description
        const searchText = `${repo.description || ''} ${repo.topics?.join(' ') || ''}`.toLowerCase();
        
        Object.entries(FRAMEWORK_KEYWORDS).forEach(([framework, keywords]) => {
          if (keywords.some(kw => searchText.includes(kw))) {
            if (!skillsMap[framework]) {
              skillsMap[framework] = {
                name: framework,
                source: 'Framework/Tool',
                confidence: 0,
                evidence: [],
              };
            }
            skillsMap[framework].evidence.push(repo.name);
          }
        });

        // Try to fetch README for more detailed analysis
        try {
          const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, {
            headers: { 'Accept': 'application/vnd.github.v3.raw' }
          });
          if (readmeRes.ok) {
            const readmeText = await readmeRes.text();
            const readmeLower = readmeText.toLowerCase();
            
            Object.entries(FRAMEWORK_KEYWORDS).forEach(([framework, keywords]) => {
              if (keywords.some(kw => readmeLower.includes(kw))) {
                if (!skillsMap[framework]) {
                  skillsMap[framework] = {
                    name: framework,
                    source: 'Framework/Tool',
                    confidence: 0,
                    evidence: [],
                  };
                }
                if (!skillsMap[framework].evidence.includes(repo.name)) {
                  skillsMap[framework].evidence.push(`${repo.name} (README)`);
                }
              }
            });
          }
        } catch (e) {
          // README not found or rate limited, skip
        }
      }

      // Infer soft skills
      const totalStars = reposData.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0);
      const avgForks = reposData.reduce((sum: number, repo: any) => sum + repo.forks_count, 0) / reposData.length;

      if (totalStars > 50) {
        skillsMap['Popular Projects'] = {
          name: 'Popular Projects',
          source: 'Soft Skill',
          confidence: Math.min(totalStars / 100, 1),
          evidence: [`${totalStars} total stars across repositories`],
        };
      }

      if (avgForks > 5) {
        skillsMap['Collaboration'] = {
          name: 'Collaboration',
          source: 'Soft Skill',
          confidence: Math.min(avgForks / 10, 1),
          evidence: [`Average ${avgForks.toFixed(1)} forks per repository`],
        };
      }

      const reposWithDocs = reposData.filter((r: any) => r.description && r.description.length > 50);
      if (reposWithDocs.length > 5) {
        skillsMap['Technical Writing'] = {
          name: 'Technical Writing',
          source: 'Soft Skill',
          confidence: Math.min(reposWithDocs.length / 10, 1),
          evidence: [`${reposWithDocs.length} well-documented repositories`],
        };
      }

      // Calculate confidence scores for programming languages
      const totalBytes = Object.values(languageMap).reduce((sum, bytes) => sum + bytes, 0);
      Object.keys(languageMap).forEach(lang => {
        const percentage = languageMap[lang] / totalBytes;
        const repoCount = skillsMap[lang]?.evidence.length || 0;
        skillsMap[lang].confidence = Math.min((percentage * 0.7) + (repoCount / 30 * 0.3), 1);
      });

      // Calculate confidence for frameworks/tools
      Object.entries(skillsMap).forEach(([name, skill]) => {
        if (skill.source === 'Framework/Tool') {
          const repoCount = skill.evidence.length;
          skill.confidence = Math.min(repoCount / 5, 1);
        }
      });

      // Convert language map to stats
      const totalLangBytes = Object.values(languageMap).reduce((sum, bytes) => sum + bytes, 0);
      const langStats = Object.entries(languageMap)
        .map(([language, bytes]) => ({
          language,
          bytes,
          percentage: (bytes / totalLangBytes) * 100,
        }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 7);

      setLanguageStats(langStats);
      setExtractedSkills(Object.values(skillsMap).sort((a, b) => b.confidence - a.confidence));

      toast.success(`Analyzed ${reposData.length} repositories!`);
    } catch (error: any) {
      console.error("GitHub analysis error:", error);
      toast.error(error.message || "Failed to analyze GitHub profile");
    } finally {
      setLoading(false);
    }
  };

  const mergeSkillsToProfile = async () => {
    if (extractedSkills.length === 0) {
      toast.error("No skills to merge");
      return;
    }

    setMerging(true);

    try {
      // Get existing skills
      const { data: existingSkills } = await supabase
        .from('skills')
        .select('skill_name')
        .eq('user_id', user?.id);

      const existingSkillNames = new Set(existingSkills?.map(s => s.skill_name.toLowerCase()) || []);

      // Filter out skills that already exist
      const newSkills = extractedSkills.filter(
        skill => !existingSkillNames.has(skill.name.toLowerCase())
      );

      if (newSkills.length === 0) {
        toast.info("All GitHub skills are already in your profile!");
        setMerging(false);
        return;
      }

      // Insert new skills
      const skillsToInsert = newSkills.map(skill => ({
        user_id: user?.id,
        skill_name: skill.name,
        skill_category: skill.source === 'Programming Language' ? 'Technical' : 
                       skill.source === 'Framework/Tool' ? 'Technical' : 'Soft Skills',
        confidence_score: skill.confidence,
        proficiency_level: skill.confidence > 0.7 ? 'advanced' : 
                          skill.confidence > 0.4 ? 'intermediate' : 'beginner',
        source_documents: JSON.stringify([`GitHub: ${profile?.login}`]),
        evidence_trail: JSON.stringify(skill.evidence),
        is_explicit: false,
      }));

      const { error } = await supabase
        .from('skills')
        .insert(skillsToInsert);

      if (error) throw error;

      toast.success(`Added ${newSkills.length} new skill${newSkills.length !== 1 ? 's' : ''} from GitHub!`);
    } catch (error: any) {
      console.error("Merge error:", error);
      toast.error("Failed to merge skills");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            GitHub Integration
          </h1>
          <p className="text-muted-foreground">
            Discover your coding skills from your GitHub profile
          </p>
        </div>

        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Analyze GitHub Profile
            </CardTitle>
            <CardDescription>Enter a GitHub username to extract skills from repositories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">GitHub API Rate Limit</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    Without authentication, GitHub allows 60 API requests per hour. If you see an error, please wait for the rate limit to reset.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="username">GitHub Username</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., octocat"
                  onKeyPress={(e) => e.key === 'Enter' && analyzeGitHub()}
                />
                <Button onClick={analyzeGitHub} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Github className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Profile & Stats */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.name} 
                      className="w-16 h-16 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold">{profile.name || profile.login}</h3>
                      <p className="text-sm text-muted-foreground">@{profile.login}</p>
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="text-sm text-muted-foreground">{profile.bio}</p>
                  )}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{profile.public_repos}</div>
                      <p className="text-xs text-muted-foreground">Repos</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{profile.followers}</div>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{profile.following}</div>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Language Distribution */}
              {languageStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Language Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={languageStats}
                          dataKey="percentage"
                          nameKey="language"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.language} ${entry.percentage.toFixed(1)}%`}
                        >
                          {languageStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Skills & Repos */}
            <div className="lg:col-span-2 space-y-6">
              {/* Extracted Skills */}
              {extractedSkills.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Discovered Skills
                        </CardTitle>
                        <CardDescription>
                          {extractedSkills.length} skill{extractedSkills.length !== 1 ? 's' : ''} extracted from GitHub activity
                        </CardDescription>
                      </div>
                      <Button onClick={mergeSkillsToProfile} disabled={merging}>
                        {merging ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Merging...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Add to Profile
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {extractedSkills.map((skill, idx) => (
                        <div key={idx} className="p-4 border rounded-lg space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{skill.name}</h3>
                              <Badge variant="outline" className="text-xs mt-1">
                                {skill.source}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                {Math.round(skill.confidence * 100)}%
                              </div>
                              <p className="text-xs text-muted-foreground">Confidence</p>
                            </div>
                          </div>
                          <Progress value={skill.confidence * 100} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            <strong>Evidence:</strong> {skill.evidence.slice(0, 3).join(', ')}
                            {skill.evidence.length > 3 && ` (+${skill.evidence.length - 3} more)`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Repositories */}
              {repos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Top Repositories
                    </CardTitle>
                    <CardDescription>Most recent and popular projects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {repos.slice(0, 10).map((repo, idx) => (
                        <a
                          key={idx}
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{repo.name}</h4>
                              {repo.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {repo.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {repo.language && (
                              <span className="flex items-center gap-1">
                                <Code className="h-3 w-3" />
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {repo.stargazers_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              {repo.forks_count}
                            </span>
                          </div>
                          {repo.topics && repo.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {repo.topics.slice(0, 5).map((topic, tidx) => (
                                <Badge key={tidx} variant="secondary" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {!profile && !loading && (
          <Card className="border-dashed">
            <CardContent className="text-center py-16">
              <Github className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Profile Analyzed</h3>
              <p className="text-muted-foreground mb-6">
                Enter a GitHub username above to discover coding skills from repositories
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}