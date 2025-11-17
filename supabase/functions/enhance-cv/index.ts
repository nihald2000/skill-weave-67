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
    const { originalText, jobDescription, userSkills, userId, action, githubData, linkedInData } = await req.json();

    if (!originalText || !userId) {
      throw new Error("Original text and user ID are required");
    }

    console.log(`CV enhancement request - Action: ${action}, User: ${userId}, Has Job Desc: ${!!jobDescription}, Has GitHub: ${!!githubData}, Has LinkedIn: ${!!linkedInData}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "analyze") {
      systemPrompt = `You are a professional resume consultant. Analyze resumes and provide actionable feedback.
Return your response as a JSON object with this exact structure:
{
  "missingSkills": ["skill1", "skill2"],
  "weakPoints": [
    {
      "section": "section name",
      "issue": "description of issue",
      "suggestion": "how to improve"
    }
  ],
  "quantificationNeeded": [
    {
      "original": "original bullet point",
      "suggestion": "how to add metrics"
    }
  ],
  "skillCoverage": 0.0-1.0
}`;

      const skillsList = userSkills.map((s: any) => s.skill_name).join(", ");
      
      let additionalContext = "";
      if (jobDescription) {
        additionalContext += `\n\nTarget Job Description:\n${jobDescription}\n\nPlease tailor your analysis to this specific job role and identify which skills and experiences are most relevant.`;
      }
      if (githubData) {
        additionalContext += `\n\nGitHub Profile Data:\n- Public Repos: ${githubData.public_repos}\n- Top Languages: ${githubData.languages?.slice(0, 5).join(", ")}\n- Notable Projects: ${githubData.popular_repos?.slice(0, 3).map((r: any) => r.name).join(", ")}\n\nConsider mentioning relevant GitHub projects and contributions.`;
      }
      if (linkedInData) {
        const linkedInSummary = `\n\nLinkedIn Profile Data:\n- Headline: ${linkedInData.headline}\n- Summary: ${linkedInData.summary?.substring(0, 200)}...\n- Skills Listed: ${linkedInData.skills?.split(',').slice(0, 10).join(", ")}\n- Experience: ${linkedInData.experience?.substring(0, 200)}...\n\nCompare the resume with LinkedIn data to identify missing information and inconsistencies.`;
        additionalContext += linkedInSummary;
      }

      userPrompt = `Analyze this resume and provide improvement suggestions.

User's discovered skills: ${skillsList}

Resume text:
${originalText}
${additionalContext}

Identify:
1. Skills the user has but are not mentioned in the resume
2. Weak sections that lack impact
3. Statements that need quantification/metrics
4. Calculate what percentage of the user's skills are actually mentioned
${jobDescription ? "5. How well the resume aligns with the target job requirements" : ""}`;

    } else if (action === "enhance") {
      systemPrompt = `You are a professional resume writer. Rewrite resume content to be more impactful and quantifiable.
Return your response as a JSON object with this exact structure:
{
  "enhancedText": "the complete enhanced resume text",
  "changes": [
    {
      "original": "original text",
      "enhanced": "improved text",
      "reason": "why this change was made"
    }
  ]
}

Guidelines:
- Keep the overall structure and sections
- Add quantifiable metrics where possible
- Use strong action verbs
- Highlight skills naturally
- Make achievements specific and measurable
- Maintain professional tone`;

      const skillsList = userSkills.map((s: any) => 
        `${s.skill_name} (${s.proficiency_level})`
      ).join(", ");

      let additionalContext = "";
      if (jobDescription) {
        additionalContext += `\n\nTarget Job Description:\n${jobDescription}\n\nTailor the resume specifically for this role, emphasizing relevant skills and experiences.`;
      }
      if (githubData) {
        additionalContext += `\n\nGitHub Profile Data:\n- Public Repos: ${githubData.public_repos}\n- Top Languages: ${githubData.languages?.slice(0, 5).join(", ")}\n- Popular Projects: ${githubData.popular_repos?.slice(0, 3).map((r: any) => `${r.name} (${r.stars} stars)`).join(", ")}\n\nIncorporate relevant GitHub projects naturally into the resume.`;
      }
      if (linkedInData) {
        const linkedInSummary = `\n\nLinkedIn Profile Data:\n- Headline: ${linkedInData.headline}\n- Summary: ${linkedInData.summary}\n- Skills: ${linkedInData.skills}\n- Key Experience: ${linkedInData.experience?.substring(0, 300)}\n\nIntegrate compelling elements from the LinkedIn profile that are missing from the current resume.`;
        additionalContext += linkedInSummary;
      }

      userPrompt = `Enhance this resume to be more impactful and highlight the user's skills.

User's skills to incorporate: ${skillsList}

Original resume:
${originalText}
${additionalContext}

Rewrite the resume to be more powerful, adding metrics and quantifiable achievements where possible. Ensure their skills are naturally woven throughout.
${jobDescription ? "Make sure the enhanced resume strongly aligns with the target job requirements." : ""}`;
    } else {
      throw new Error("Invalid action. Must be 'analyze' or 'enhance'");
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: action === "analyze" ? [
          {
            type: "function",
            function: {
              name: "analyze_resume",
              description: "Analyze a resume and provide improvement suggestions",
              parameters: {
                type: "object",
                properties: {
                  missingSkills: {
                    type: "array",
                    items: { type: "string" }
                  },
                  weakPoints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        section: { type: "string" },
                        issue: { type: "string" },
                        suggestion: { type: "string" }
                      },
                      required: ["section", "issue", "suggestion"],
                      additionalProperties: false
                    }
                  },
                  quantificationNeeded: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original: { type: "string" },
                        suggestion: { type: "string" }
                      },
                      required: ["original", "suggestion"],
                      additionalProperties: false
                    }
                  },
                  skillCoverage: { type: "number", minimum: 0, maximum: 1 }
                },
                required: ["missingSkills", "weakPoints", "quantificationNeeded", "skillCoverage"],
                additionalProperties: false
              }
            }
          }
        ] : [
          {
            type: "function",
            function: {
              name: "enhance_resume",
              description: "Generate an enhanced version of a resume",
              parameters: {
                type: "object",
                properties: {
                  enhancedText: { type: "string" },
                  changes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original: { type: "string" },
                        enhanced: { type: "string" },
                        reason: { type: "string" }
                      },
                      required: ["original", "enhanced", "reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["enhancedText", "changes"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { 
          type: "function", 
          function: { name: action === "analyze" ? "analyze_resume" : "enhance_resume" } 
        }
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
    console.log("AI Response received");

    // Extract result from tool call
    let result = {};
    if (aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      result = JSON.parse(aiData.choices[0].message.tool_calls[0].function.arguments);
    }

    console.log(`CV enhancement complete - Action: ${action}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in enhance-cv function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});