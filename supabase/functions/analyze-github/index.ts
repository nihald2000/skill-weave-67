import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();

    if (!username) {
      throw new Error("GitHub username is required");
    }

    console.log(`Analyzing GitHub profile: ${username}`);

    // Fetch user profile
    const userResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lovable-CV-Enhancer'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch GitHub profile: ${userResponse.statusText}`);
    }

    const userData = await userResponse.json();

    // Fetch user repositories
    const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Lovable-CV-Enhancer'
      }
    });

    if (!reposResponse.ok) {
      throw new Error(`Failed to fetch repositories: ${reposResponse.statusText}`);
    }

    const repos = await reposResponse.json();

    // Analyze languages
    const languageCount: Record<string, number> = {};
    repos.forEach((repo: any) => {
      if (repo.language) {
        languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(languageCount)
      .sort(([, a], [, b]) => b - a)
      .map(([lang]) => lang);

    // Get popular repos
    const popularRepos = repos
      .filter((repo: any) => !repo.fork)
      .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map((repo: any) => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        url: repo.html_url
      }));

    const analysisResult = {
      username: userData.login,
      name: userData.name,
      bio: userData.bio,
      location: userData.location,
      company: userData.company,
      blog: userData.blog,
      public_repos: userData.public_repos,
      followers: userData.followers,
      following: userData.following,
      created_at: userData.created_at,
      languages: topLanguages,
      popular_repos: popularRepos,
      total_stars: repos.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0),
      profile_url: userData.html_url
    };

    console.log(`GitHub analysis complete for ${username}`);

    return new Response(
      JSON.stringify(analysisResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('GitHub analysis error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to analyze GitHub profile'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
