import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, userId } = await req.json();

    if (!jobDescription || !userId) {
      throw new Error("Job description and user ID are required");
    }

    console.log("Starting job match analysis for user:", userId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's skills
    const { data: userSkills, error: skillsError } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', userId);

    if (skillsError) {
      console.error("Error fetching user skills:", skillsError);
      throw skillsError;
    }

    console.log(`Found ${userSkills?.length || 0} user skills`);

    // Extract skills from job description using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a skill extraction expert. Analyze job descriptions and extract all required skills with their proficiency levels and importance.
Return your response as a JSON object with this exact structure:
{
  "skills": [
    {
      "name": "skill name",
      "level": "beginner|intermediate|advanced|expert",
      "critical": true|false
    }
  ]
}

Guidelines:
- Extract technical skills, soft skills, tools, frameworks, languages
- Determine if each skill is critical (must-have) or nice-to-have based on context
- Assign appropriate proficiency levels based on job requirements
- Normalize skill names (e.g., "JS" → "JavaScript", "React.js" → "React")`
          },
          {
            role: 'user',
            content: `Extract all skills from this job description:\n\n${jobDescription}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_job_skills",
              description: "Extract skills from a job description",
              parameters: {
                type: "object",
                properties: {
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        level: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"] },
                        critical: { type: "boolean" }
                      },
                      required: ["name", "level", "critical"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["skills"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_job_skills" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiData));

    // Extract skills from tool call
    let extractedSkills = [];
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      const args = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
      extractedSkills = args.skills || [];
    }

    console.log(`Extracted ${extractedSkills.length} skills from job description`);

    // Match with user's skills
    const proficiencyOrder = ["beginner", "intermediate", "advanced", "expert"];
    const matchedSkills: any[] = [];
    const missingSkills: any[] = [];

    extractedSkills.forEach((reqSkill: any) => {
      const userSkill = userSkills?.find(
        (us: any) => 
          us.skill_name.toLowerCase() === reqSkill.name.toLowerCase() ||
          us.skill_name.toLowerCase().includes(reqSkill.name.toLowerCase()) ||
          reqSkill.name.toLowerCase().includes(us.skill_name.toLowerCase())
      );

      if (userSkill) {
        const userLevel = proficiencyOrder.indexOf(userSkill.proficiency_level || "beginner");
        const requiredLevel = proficiencyOrder.indexOf(reqSkill.level);
        const meetsLevel = userLevel >= requiredLevel;

        matchedSkills.push({
          skill_name: reqSkill.name,
          required_level: reqSkill.level,
          is_matched: meetsLevel,
          is_critical: reqSkill.critical,
          user_confidence: userSkill.confidence_score,
          user_proficiency: userSkill.proficiency_level,
        });
      } else {
        missingSkills.push({
          skill_name: reqSkill.name,
          required_level: reqSkill.level,
          is_matched: false,
          is_critical: reqSkill.critical,
        });
      }
    });

    // Calculate match score
    const totalSkills = extractedSkills.length;
    const fullyMatchedCount = matchedSkills.filter(s => s.is_matched).length;
    const matchScore = totalSkills > 0 ? Math.round((fullyMatchedCount / totalSkills) * 100) : 0;

    console.log(`Match analysis complete: ${matchScore}% (${fullyMatchedCount}/${totalSkills} skills matched)`);

    return new Response(
      JSON.stringify({
        matchScore,
        matchedSkills,
        missingSkills,
        totalSkills,
        matchedCount: matchedSkills.length,
        missingCount: missingSkills.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-job-match function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});