import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalyzeDocumentParams {
  documentId: string;
  extractedText: string;
  userId: string;
  onProgress?: (message: string) => void;
}

interface AnalyzeDocumentResult {
  success: boolean;
  skillsCount: number;
  explicitSkills: number;
  implicitSkills: number;
  averageConfidence: number;
  error?: string;
}

/**
 * Analyzes a document and extracts skills using AI
 * @param params Document analysis parameters
 * @returns Analysis results with skill counts
 */
export const analyzeDocument = async ({
  documentId,
  extractedText,
  userId,
  onProgress,
}: AnalyzeDocumentParams): Promise<AnalyzeDocumentResult> => {
  try {
    // Step 1: Update document status to processing
    onProgress?.("Preparing document for analysis...");
    
    const { error: updateError } = await supabase
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document status:", updateError);
      throw new Error("Failed to update document status");
    }

    // Step 2: Call extract-skills edge function
    onProgress?.("Analyzing your skills...");
    
    const { data, error: functionError } = await supabase.functions.invoke("extract-skills", {
      body: {
        extracted_text: extractedText,
        document_id: documentId,
        user_id: userId,
      },
    });

    if (functionError) {
      console.error("Edge function error:", functionError);
      throw new Error(functionError.message || "Failed to extract skills");
    }

    if (!data || !data.success) {
      throw new Error(data?.error || "Skill extraction failed");
    }

    // Step 3: Return success results
    onProgress?.(`✓ Analysis complete! Found ${data.skillsCount} skills`);
    
    return {
      success: true,
      skillsCount: data.skillsCount || 0,
      explicitSkills: data.explicitSkills || 0,
      implicitSkills: data.implicitSkills || 0,
      averageConfidence: parseFloat(data.averageConfidence) || 0,
    };

  } catch (error: any) {
    console.error("Error analyzing document:", error);
    
    // Update document status to failed
    try {
      await supabase
        .from("documents")
        .update({ processing_status: "failed" })
        .eq("id", documentId);
    } catch (updateError) {
      console.error("Error updating document to failed status:", updateError);
    }

    // Show user-friendly error message
    const errorMessage = getErrorMessage(error);
    toast.error("Analysis Failed", {
      description: errorMessage,
    });

    return {
      success: false,
      skillsCount: 0,
      explicitSkills: 0,
      implicitSkills: 0,
      averageConfidence: 0,
      error: errorMessage,
    };
  }
};

/**
 * Converts technical errors into user-friendly messages
 */
const getErrorMessage = (error: any): string => {
  const message = error.message || error.toString();

  if (message.includes("auth") || message.includes("Unauthorized")) {
    return "Authentication error. Please try logging in again.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }

  if (message.includes("timeout")) {
    return "The analysis is taking longer than expected. Please try again.";
  }

  if (message.includes("rate limit")) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (message.includes("No skills found")) {
    return "We couldn't find any skills in this document. Please make sure it contains relevant professional information.";
  }

  // Default user-friendly message
  return "Something went wrong during analysis. Please try uploading your document again.";
};
