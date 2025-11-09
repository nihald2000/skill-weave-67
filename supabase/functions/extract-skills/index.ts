import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { extracted_text, document_id, user_id } = await req.json();

    // Validate inputs
    if (!extracted_text || !document_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: extracted_text, document_id, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the document
    if (user.id !== user_id) {
      return new Response(JSON.stringify({ error: "Unauthorized access to document" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extracting skills for user:", user_id, "document:", document_id);

    // Call Lovable AI for skill extraction
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an advanced skill extraction AI system specialized in resume/CV analysis. Your task is to identify both EXPLICIT and IMPLICIT skills with high accuracy.

EXTRACTION METHODOLOGY:

1. EXPLICIT SKILLS (Confidence: 0.85-0.95):
   - Skills sections: Look for "Skills", "Technical Skills", "Core Competencies", "Technologies"
   - Programming Languages: JavaScript, TypeScript, Python, Java, C++, C#, Ruby, Go, Rust, Swift, Kotlin, PHP
   - Frameworks: React, Angular, Vue, Next.js, Django, Flask, Spring Boot, Express, FastAPI, .NET, Laravel
   - Databases: PostgreSQL, MySQL, MongoDB, Redis, Cassandra, DynamoDB, Oracle, SQL Server
   - Tools: Git, Docker, Kubernetes, Jenkins, GitHub Actions, Terraform, AWS, Azure, GCP, Jira, Figma
   - Certifications: AWS Certified, PMP, Scrum Master, etc.

2. IMPLICIT SKILLS (Confidence: 0.60-0.80):
   - Job Titles → Skills:
     * "Manager", "Director", "Lead" → Leadership, Team Management, Strategic Planning
     * "Senior" → Mentorship, Code Review, Architecture Design
     * "Architect" → System Design, Technical Leadership
   - Responsibilities → Skills:
     * "Led team of X" → Leadership, Team Management, People Management
     * "Increased performance by X%" → Performance Optimization, Analytics, Data-Driven Decision Making
     * "Collaborated with stakeholders" → Communication, Stakeholder Management, Cross-functional Collaboration
     * "Implemented CI/CD" → DevOps, Automation, Infrastructure
     * "Designed system architecture" → System Design, Architecture, Scalability
     * "Mentored junior developers" → Mentorship, Training, Knowledge Sharing
     * "Managed project timeline" → Project Management, Planning, Time Management
   - Education → Domain Skills:
     * Computer Science degree → Software Engineering, Algorithms, Data Structures
     * Business degree → Business Analysis, Strategy
     * Engineering → Problem Solving, Technical Analysis

3. CONFIDENCE SCORING RULES (0.0-1.0):
   - Skills section + multiple mentions: 0.90-0.95
   - Skills section + single mention: 0.85-0.90
   - Job description with clear evidence: 0.75-0.85
   - Inferred from responsibilities: 0.65-0.75
   - Inferred from job title: 0.60-0.70
   - Weak inference from context: 0.50-0.60
   - Speculative: <0.50 (EXCLUDE)

4. PROFICIENCY ESTIMATION:
   - Expert: 7+ years OR "Expert" mentioned OR Led teams using skill
   - Advanced: 4-6 years OR "Advanced" mentioned OR Significant projects
   - Intermediate: 2-3 years OR Recent job mentions OR Multiple uses
   - Beginner: <2 years OR Single mention OR "Learning" context

5. CATEGORIZATION:
   - Technical: Programming languages, algorithms, data structures
   - Tools: Software tools, platforms, development tools
   - Soft Skills: Leadership, communication, problem-solving, teamwork
   - Domain: Industry-specific expertise (FinTech, Healthcare, etc.)

IMPORTANT:
- Only extract skills with confidence ≥ 0.50
- Provide specific evidence excerpts (max 100 chars)
- Be comprehensive but accurate
- Consider context and frequency`
          },
          {
            role: "user",
            content: `Analyze this resume and extract ALL skills (explicit and implicit):

${extracted_text.slice(0, 20000)}

Extract:
1. All skills from skills/technologies sections
2. Skills implied by job titles and responsibilities
3. Domain expertise from education and industry experience
4. Soft skills demonstrated in work descriptions

For each skill, provide:
- Exact skill name
- Accurate confidence score based on evidence strength
- Proper categorization
- Proficiency level estimate
- Evidence text excerpt showing why you identified this skill
- Whether it was explicitly listed or inferred`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_skills",
              description: "Extract comprehensive skills from resume text with explicit and implicit detection",
              parameters: {
                type: "object",
                properties: {
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill_name: { 
                          type: "string",
                          description: "Clear, standardized skill name"
                        },
                        confidence_score: { 
                          type: "number", 
                          minimum: 0.5, 
                          maximum: 1.0,
                          description: "Confidence based on evidence strength"
                        },
                        skill_category: { 
                          type: "string",
                          enum: ["technical", "tools", "soft_skills", "domain"],
                          description: "Skill classification"
                        },
                        proficiency_level: { 
                          type: "string", 
                          enum: ["beginner", "intermediate", "advanced", "expert"],
                          description: "Estimated proficiency from experience"
                        },
                        is_explicit: { 
                          type: "boolean",
                          description: "True if explicitly listed in skills section, false if inferred"
                        },
                        evidence_text: { 
                          type: "string",
                          description: "Exact excerpt from resume showing this skill (max 100 chars)"
                        },
                        years_experience: { 
                          type: "number", 
                          nullable: true,
                          description: "Estimated years of experience with this skill"
                        }
                      },
                      required: [
                        "skill_name", 
                        "confidence_score", 
                        "skill_category", 
                        "proficiency_level", 
                        "is_explicit", 
                        "evidence_text"
                      ],
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
        tool_choice: { type: "function", function: { name: "extract_skills" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errorText);
      
      // Update document status to failed
      await supabase
        .from("documents")
        .update({ processing_status: "failed" })
        .eq("id", document_id);
      
      return new Response(
        JSON.stringify({ error: `AI extraction failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI extraction complete");

    // Extract skills from tool call response
    let extractedSkills = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      extractedSkills = parsed.skills || [];
    }

    console.log(`Extracted ${extractedSkills.length} skills`);

    if (extractedSkills.length === 0) {
      console.warn("No skills extracted from document");
      await supabase
        .from("documents")
        .update({ processing_status: "completed" })
        .eq("id", document_id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          skillsCount: 0, 
          message: "No skills found in document" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare skills for insertion
    const skillsToInsert = extractedSkills.map((skill: any) => ({
      user_id: user_id,
      skill_name: skill.skill_name,
      skill_category: skill.skill_category,
      confidence_score: skill.confidence_score,
      proficiency_level: skill.proficiency_level,
      is_explicit: skill.is_explicit,
      years_experience: skill.years_experience || null,
      source_documents: [document_id],
      evidence_trail: [{
        evidence: skill.evidence_text,
        document_id: document_id,
        is_explicit: skill.is_explicit
      }]
    }));

    // Insert skills into database
    const { data: insertedSkills, error: skillsError } = await supabase
      .from("skills")
      .insert(skillsToInsert)
      .select("id, skill_name, is_explicit, confidence_score");

    if (skillsError) {
      console.error("Skills insert error:", skillsError);
      
      await supabase
        .from("documents")
        .update({ processing_status: "failed" })
        .eq("id", document_id);
      
      return new Response(
        JSON.stringify({ error: "Failed to save skills", details: skillsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Inserted ${insertedSkills.length} skills`);

    // Create skill evidence entries
    const evidenceToInsert = insertedSkills.map((insertedSkill: any) => {
      const originalSkill = extractedSkills.find((s: any) => s.skill_name === insertedSkill.skill_name);
      return {
        skill_id: insertedSkill.id,
        document_id: document_id,
        evidence_type: originalSkill.is_explicit ? "explicit_mention" : "inferred_from_context",
        evidence_text: originalSkill.evidence_text,
        context: `Extracted from resume`,
        reliability_score: originalSkill.confidence_score
      };
    });

    const { error: evidenceError } = await supabase
      .from("skill_evidence")
      .insert(evidenceToInsert);

    if (evidenceError) {
      console.error("Evidence insert error:", evidenceError);
      // Continue - evidence is supplementary
    }

    // Update document status to completed
    await supabase
      .from("documents")
      .update({ processing_status: "completed" })
      .eq("id", document_id);

    console.log("Skill extraction completed successfully");

    // Calculate statistics
    const explicitCount = insertedSkills.filter((s: any) => s.is_explicit).length;
    const implicitCount = insertedSkills.length - explicitCount;
    const avgConfidence = insertedSkills.reduce((sum: number, s: any) => sum + s.confidence_score, 0) / insertedSkills.length;

    return new Response(
      JSON.stringify({
        success: true,
        skillsCount: insertedSkills.length,
        explicitSkills: explicitCount,
        implicitSkills: implicitCount,
        averageConfidence: avgConfidence.toFixed(2),
        message: "Skills extracted successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in extract-skills function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to extract skills" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
