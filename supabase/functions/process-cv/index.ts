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

    // Convert file to text (for PDFs, we'll extract text)
    const fileBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    
    // For text files, convert directly
    let extractedText = "";
    if (fileName.endsWith(".txt")) {
      extractedText = new TextDecoder().decode(uint8Array);
    } else {
      // For PDFs and other formats, use a simple text extraction
      // In production, you'd use a PDF parsing library
      extractedText = new TextDecoder().decode(uint8Array);
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
            content: `You are a skill extraction expert. Analyze CV/resume text and extract professional skills with confidence scores.
            
Extract:
- Technical skills (programming languages, tools, frameworks)
- Soft skills (leadership, communication)
- Domain expertise (project management, data analysis)
- Years of experience (if mentioned)
- Last used date (if mentioned)

For each skill, provide:
- skill_name: The skill name (normalized)
- proficiency_level: beginner, intermediate, advanced, or expert
- confidence_score: 0.0-1.0 (how confident you are this is a real skill)
- years_experience: number or null
- evidence: Brief quote or context from CV

Return ONLY valid JSON array of skills, no other text.`
          },
          {
            role: "user",
            content: `Extract skills from this CV:\n\n${extractedText.slice(0, 8000)}`
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

    // Insert extracted skills
    const skillsToInsert = skills.map((skill: any) => ({
      skill_profile_id: skillProfile!.id,
      skill_name: skill.skill_name,
      proficiency_level: skill.proficiency_level,
      confidence_score: skill.confidence_score,
      years_experience: skill.years_experience || null,
      is_hidden: false,
    }));

    if (skillsToInsert.length > 0) {
      const { error: skillsError } = await supabase
        .from("extracted_skills")
        .insert(skillsToInsert);

      if (skillsError) {
        console.error("Skills insert error:", skillsError);
        throw skillsError;
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
