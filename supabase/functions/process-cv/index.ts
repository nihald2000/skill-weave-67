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

    // Download the file from storage (supports both 'cvs' and 'resumes' buckets)
    // Determine which bucket to use based on the file path
    const bucketName = filePath.startsWith('resumes/') ? 'resumes' : 'cvs';
    const actualPath = filePath.replace('resumes/', '').replace('cvs/', '');
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(actualPath);

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

    // Create analysis session
    const { data: analysisSession, error: sessionError } = await supabase
      .from("analysis_sessions")
      .insert({
        user_id: user.id,
        session_status: "in_progress",
        documents_analyzed: 0,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Session error:", sessionError);
      throw sessionError;
    }

    // Save to documents table
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        document_type: "resume",
        file_name: fileName,
        file_url: filePath,
        processing_status: "processing",
      })
      .select()
      .single();

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

    // Categorize skills automatically
    const categorizeSkill = (skillName: string): string => {
      const name = skillName.toLowerCase();
      const programmingLanguages = ["python", "javascript", "java", "c++", "c#", "ruby", "go", "rust", "swift", "kotlin"];
      const softSkills = ["leadership", "communication", "teamwork", "problem solving", "critical thinking", "time management"];
      const tools = ["git", "docker", "kubernetes", "jenkins", "jira", "slack", "aws", "azure", "gcp"];
      
      if (programmingLanguages.some(lang => name.includes(lang))) return "language";
      if (softSkills.some(soft => name.includes(soft))) return "soft_skill";
      if (tools.some(tool => name.includes(tool))) return "tool";
      if (name.includes("framework") || name.includes("react") || name.includes("angular") || name.includes("vue")) return "tool";
      return "technical";
    };

    // Insert extracted skills into new skills table
    const skillsToInsert = skills
      .filter((skill: any) => skill.confidence_score >= 0.5)
      .map((skill: any) => ({
        user_id: user.id,
        skill_name: skill.skill_name,
        skill_category: categorizeSkill(skill.skill_name),
        confidence_score: skill.confidence_score,
        proficiency_level: skill.proficiency_level,
        is_explicit: skill.confidence_score >= 0.7,
        years_experience: skill.years_experience || null,
        source_documents: [document!.id],
        evidence_trail: [{ evidence: skill.evidence, document_id: document!.id }],
      }));

    let hiddenSkills = 0;
    if (skillsToInsert.length > 0) {
      const { data: insertedSkills, error: skillsError } = await supabase
        .from("skills")
        .insert(skillsToInsert)
        .select("id, skill_name");

      if (skillsError) {
        console.error("Skills insert error:", skillsError);
        throw skillsError;
      }

      // Create skill evidence entries for new table
      const evidenceToInsert = insertedSkills.flatMap((insertedSkill: any) => {
        const originalSkill = skills.find((s: any) => s.skill_name === insertedSkill.skill_name);
        if (!originalSkill?.evidence) return [];

        return [{
          skill_id: insertedSkill.id,
          document_id: document!.id,
          evidence_type: originalSkill.confidence_score >= 0.7 ? "explicit_mention" : "project_context",
          evidence_text: originalSkill.evidence,
          context: `Extracted from ${fileName}`,
          reliability_score: originalSkill.confidence_score,
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

      // Count hidden skills (low confidence that we filtered out)
      hiddenSkills = skills.filter((s: any) => s.confidence_score < 0.5).length;
    }

    // Update document processing status
    await supabase
      .from("documents")
      .update({ processing_status: "completed" })
      .eq("id", document!.id);

    // Complete analysis session
    await supabase
      .from("analysis_sessions")
      .update({
        session_status: "completed",
        total_skills_found: skillsToInsert.length,
        hidden_skills_count: hiddenSkills,
        documents_analyzed: 1,
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysisSession!.id);

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
