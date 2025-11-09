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

    const { filePath, fileName } = await req.json();

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

    console.log("Processing CV for user:", user.id);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("cvs")
      .download(filePath);

    if (downloadError) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download file");
    }

    // Convert file to text
    const fileBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    
    let extractedText = "";
    
    // For text files, convert directly
    if (fileName.endsWith(".txt")) {
      extractedText = new TextDecoder().decode(uint8Array);
    } else if (fileName.endsWith(".pdf")) {
      // For PDFs, use basic extraction by converting to text
      // Note: This works for text-based PDFs. For scanned PDFs, OCR would be needed
      try {
        extractedText = new TextDecoder("utf-8", { fatal: false }).decode(uint8Array);
        // Remove common PDF artifacts and control characters
        extractedText = extractedText
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch (e) {
        console.error("PDF extraction error:", e);
        extractedText = new TextDecoder().decode(uint8Array);
      }
    } else {
      // For DOC/DOCX and other formats
      extractedText = new TextDecoder("utf-8", { fatal: false }).decode(uint8Array);
    }

    console.log("Extracted text length:", extractedText.length);

    // Save to data_sources
    const { error: insertError } = await supabase
      .from("data_sources")
      .insert({
        user_id: user.id,
        source_type: "cv",
        source_name: fileName,
        file_path: filePath,
        raw_data: { text: extractedText },
        processed: false,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    // Call Lovable AI to extract skills
    console.log("Calling Lovable AI for skill extraction...");
    
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
            content: `You are an expert skill extraction system for CV/resume analysis. Your task is to identify and extract professional skills with high accuracy.

EXTRACTION RULES:
1. EXPLICIT SKILLS: Extract clearly mentioned skills (e.g., "Python", "Project Management", "React")
2. IMPLICIT SKILLS: Infer skills from context (e.g., "led a team of 10" → Leadership)
3. TECHNICAL SKILLS: Programming languages, tools, frameworks, platforms
4. SOFT SKILLS: Communication, leadership, problem-solving, teamwork
5. DOMAIN SKILLS: Industry-specific expertise (finance, healthcare, etc.)

CONFIDENCE SCORING (0.0-1.0):
- 0.9-1.0: Explicitly listed in skills section or mentioned multiple times
- 0.7-0.89: Clear evidence from job responsibilities or projects
- 0.5-0.69: Implied from job title or single mention
- 0.3-0.49: Weak inference from context
- 0.0-0.29: Speculative (avoid these)

PROFICIENCY ESTIMATION:
- Expert: 7+ years OR clearly stated expertise OR leadership role using skill
- Advanced: 4-6 years OR significant project work
- Intermediate: 2-3 years OR mentioned in recent jobs
- Beginner: <2 years OR listed without context

IMPORTANT: Only extract real skills with confidence ≥ 0.5. Be conservative and accurate.`
          },
          {
            role: "user",
            content: `Extract all skills from this CV/resume. Analyze the entire document carefully:

${extractedText.slice(0, 15000)}

Focus on:
- Skills explicitly listed in "Skills" sections
- Technologies mentioned in job descriptions
- Tools and frameworks used in projects
- Leadership and soft skills demonstrated in experience
- Certifications and training completed

Return a comprehensive list of skills with accurate confidence scores and proficiency levels.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_skills",
              description: "Extract structured skills from CV text",
              parameters: {
                type: "object",
                properties: {
                  skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill_name: { type: "string" },
                        proficiency_level: { 
                          type: "string", 
                          enum: ["beginner", "intermediate", "advanced", "expert"] 
                        },
                        confidence_score: { type: "number", minimum: 0, maximum: 1 },
                        years_experience: { type: "number", nullable: true },
                        evidence: { type: "string" }
                      },
                      required: ["skill_name", "proficiency_level", "confidence_score", "evidence"],
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
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    let skills = [];
    
    // Extract from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      skills = parsed.skills || [];
    }

    console.log("Extracted skills count:", skills.length);

    // Get or create skill profile
    let { data: skillProfile } = await supabase
      .from("skill_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!skillProfile) {
      const { data: newProfile, error: profileError } = await supabase
        .from("skill_profiles")
        .insert({ user_id: user.id })
        .select()
        .single();

      if (profileError) throw profileError;
      skillProfile = newProfile;
    }

    if (!skillProfile) {
      throw new Error("Failed to get or create skill profile");
    }

    // Insert extracted skills with evidence
    const skillsToInsert = skills
      .filter((skill: any) => skill.confidence_score >= 0.5) // Only high-confidence skills
      .map((skill: any) => ({
        skill_profile_id: skillProfile!.id,
        skill_name: skill.skill_name,
        proficiency_level: skill.proficiency_level,
        confidence_score: skill.confidence_score,
        years_experience: skill.years_experience || null,
        is_hidden: false,
      }));

    if (skillsToInsert.length > 0) {
      const { data: insertedSkills, error: skillsError } = await supabase
        .from("extracted_skills")
        .insert(skillsToInsert)
        .select("id, skill_name");

      if (skillsError) {
        console.error("Skills insert error:", skillsError);
        throw skillsError;
      }

      // Create skill evidence entries
      const evidenceToInsert = insertedSkills.flatMap((insertedSkill: any) => {
        const originalSkill = skills.find((s: any) => s.skill_name === insertedSkill.skill_name);
        if (!originalSkill?.evidence) return [];

        return [{
          extracted_skill_id: insertedSkill.id,
          evidence_type: "mention",
          source_type: "cv",
          description: originalSkill.evidence,
          snippet: originalSkill.evidence.slice(0, 500),
          source_reliability: originalSkill.confidence_score,
        }];
      });

      if (evidenceToInsert.length > 0) {
        const { error: evidenceError } = await supabase
          .from("skill_evidence")
          .insert(evidenceToInsert);

        if (evidenceError) {
          console.error("Evidence insert error:", evidenceError);
        }
      }

      // Update skill profile stats
      const { error: updateError } = await supabase
        .from("skill_profiles")
        .update({
          total_skills: skillsToInsert.length,
          completeness_score: Math.min(skillsToInsert.length / 20, 1.0),
        })
        .eq("id", skillProfile!.id);

      if (updateError) console.error("Profile update error:", updateError);
    }

    // Mark data source as processed
    await supabase
      .from("data_sources")
      .update({ processed: true })
      .eq("user_id", user.id)
      .eq("file_path", filePath);

    console.log("CV processing complete");

    return new Response(
      JSON.stringify({ 
        success: true, 
        skillsCount: skills.length,
        message: "CV processed successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error processing CV:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process CV" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
