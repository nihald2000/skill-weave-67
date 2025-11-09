import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportSkillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  skillProfile: any;
  skills: any[];
}

export const ExportSkillsDialog = ({ 
  open, 
  onOpenChange, 
  profile,
  skillProfile,
  skills 
}: ExportSkillsDialogProps) => {
  const [exporting, setExporting] = useState(false);
  const [includeVisualizations, setIncludeVisualizations] = useState(true);
  const [includeSkillsList, setIncludeSkillsList] = useState(true);
  const { toast } = useToast();

  const captureElement = async (elementId: string): Promise<string | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error(`Error capturing ${elementId}:`, error);
      return null;
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(35, 40, 67); // primary color
      pdf.text("Skills Profile Report", margin, yPosition);
      yPosition += 10;

      // User info
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 8;
      
      if (profile?.full_name) {
        pdf.setFontSize(14);
        pdf.setTextColor(35, 40, 67);
        pdf.text(`Profile: ${profile.full_name}`, margin, yPosition);
        yPosition += 10;
      }

      // Stats summary
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Total Skills: ${skillProfile?.total_skills || 0}`, margin, yPosition);
      yPosition += 6;
      pdf.text(
        `Profile Completeness: ${Math.round((skillProfile?.completeness_score || 0) * 100)}%`,
        margin,
        yPosition
      );
      yPosition += 12;

      // Visualizations
      if (includeVisualizations && skills.length > 0) {
        pdf.setFontSize(16);
        pdf.setTextColor(35, 40, 67);
        pdf.text("Skills Visualizations", margin, yPosition);
        yPosition += 10;

        // Try to capture visualization charts
        const visualizationElement = document.getElementById("skills-visualization-export");
        if (visualizationElement) {
          try {
            const canvas = await html2canvas(visualizationElement, {
              scale: 2,
              backgroundColor: "#ffffff",
              logging: false,
            });
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = pageWidth - 2 * margin;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Check if we need a new page
            if (yPosition + imgHeight > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }

            pdf.addImage(imgData, "PNG", margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
          } catch (error) {
            console.error("Error capturing visualizations:", error);
          }
        }
      }

      // Skills list
      if (includeSkillsList && skills.length > 0) {
        // Check if we need a new page
        if (yPosition + 30 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(35, 40, 67);
        pdf.text("Skills List", margin, yPosition);
        yPosition += 10;

        // Table headers
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text("Skill Name", margin, yPosition);
        pdf.text("Proficiency", margin + 70, yPosition);
        pdf.text("Confidence", margin + 120, yPosition);
        pdf.text("Experience", margin + 155, yPosition);
        yPosition += 6;

        // Line under headers
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;

        // Skills rows
        pdf.setTextColor(35, 40, 67);
        const sortedSkills = [...skills].sort((a, b) => 
          b.confidence_score - a.confidence_score
        );

        for (const skill of sortedSkills) {
          // Check if we need a new page
          if (yPosition + 8 > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          // Truncate long skill names
          const skillName = skill.skill_name.length > 30 
            ? skill.skill_name.substring(0, 27) + "..." 
            : skill.skill_name;

          pdf.text(skillName, margin, yPosition);
          pdf.text(
            (skill.proficiency_level || "N/A").charAt(0).toUpperCase() + 
            (skill.proficiency_level || "N/A").slice(1),
            margin + 70,
            yPosition
          );
          pdf.text(
            `${Math.round(skill.confidence_score * 100)}%`,
            margin + 120,
            yPosition
          );
          pdf.text(
            skill.years_experience ? `${skill.years_experience} years` : "N/A",
            margin + 155,
            yPosition
          );
          yPosition += 7;
        }
      }

      // Footer
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save the PDF
      const fileName = `skills-profile-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Success",
        description: "Skills profile exported successfully",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to export skills profile",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Skills Profile</DialogTitle>
          <DialogDescription>
            Download your complete skills profile as a PDF report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="visualizations"
              checked={includeVisualizations}
              onCheckedChange={(checked) => setIncludeVisualizations(checked as boolean)}
              disabled={exporting}
            />
            <Label
              htmlFor="visualizations"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include visualizations and charts
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="skillsList"
              checked={includeSkillsList}
              onCheckedChange={(checked) => setIncludeSkillsList(checked as boolean)}
              disabled={exporting}
            />
            <Label
              htmlFor="skillsList"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include complete skills list
            </Label>
          </div>

          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              {skills.length === 0
                ? "No skills to export. Upload your CV or add skills manually first."
                : `Ready to export ${skills.length} skill${skills.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            onClick={exportToPDF}
            disabled={exporting || skills.length === 0}
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
