import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Skill {
  id: string;
  skill_name: string;
  skill_category: string;
  confidence_score: number;
  proficiency_level: string;
  is_explicit: boolean;
  years_experience: number | null;
}

interface ExportStats {
  total: number;
  hidden: number;
  avgConfidence: number;
  analyzedDocs: number;
}

interface CategoryCounts {
  technical: number;
  tools: number;
  soft_skills: number;
  domain: number;
}

export const exportSkillsDashboardPDF = async (
  skills: Skill[],
  stats: ExportStats,
  userName: string
) => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with word wrap
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return lines.length * (fontSize * 0.35); // Return height used
  };

  // ========== HEADER ==========
  pdf.setFillColor(59, 130, 246); // Blue
  pdf.rect(0, 0, pageWidth, 40, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("Skills Dashboard Report", margin, 20);
  
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(userName, margin, 30);
  pdf.text(new Date().toLocaleDateString(), pageWidth - margin - 40, 30);
  
  yPosition = 50;

  // ========== SUMMARY STATISTICS ==========
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Summary Statistics", margin, yPosition);
  yPosition += 10;

  // Stats boxes
  const boxWidth = (pageWidth - 2 * margin - 15) / 4;
  const boxHeight = 25;
  const boxY = yPosition;

  const statsData = [
    { label: "Total Skills", value: stats.total.toString(), color: [59, 130, 246] },
    { label: "Hidden Skills", value: stats.hidden.toString(), color: [168, 85, 247] },
    { label: "Avg Confidence", value: `${(stats.avgConfidence * 100).toFixed(0)}%`, color: [34, 197, 94] },
    { label: "Documents", value: stats.analyzedDocs.toString(), color: [249, 115, 22] },
  ];

  statsData.forEach((stat, index) => {
    const boxX = margin + (boxWidth + 5) * index;
    
    // Box background
    pdf.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
    pdf.setDrawColor(stat.color[0], stat.color[1], stat.color[2]);
    pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, "FD");
    
    // Value
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(stat.value, boxX + boxWidth / 2, boxY + 12, { align: "center" });
    
    // Label
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(stat.label, boxX + boxWidth / 2, boxY + 20, { align: "center" });
  });

  yPosition += boxHeight + 15;

  // ========== SKILLS DISTRIBUTION CHART ==========
  checkPageBreak(60);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Skills Distribution by Category", margin, yPosition);
  yPosition += 10;

  // Calculate category counts
  const categoryCounts: CategoryCounts = {
    technical: skills.filter(s => s.skill_category === "technical").length,
    tools: skills.filter(s => s.skill_category === "tools").length,
    soft_skills: skills.filter(s => s.skill_category === "soft_skills").length,
    domain: skills.filter(s => s.skill_category === "domain").length,
  };

  const categoryData = [
    { name: "Technical", count: categoryCounts.technical, color: [59, 130, 246] },
    { name: "Tools", count: categoryCounts.tools, color: [34, 197, 94] },
    { name: "Soft Skills", count: categoryCounts.soft_skills, color: [168, 85, 247] },
    { name: "Domain", count: categoryCounts.domain, color: [249, 115, 22] },
  ];

  // Simple bar chart
  const chartStartY = yPosition;
  const chartHeight = 40;
  const maxCount = Math.max(...categoryData.map(d => d.count), 1);
  const barWidth = (pageWidth - 2 * margin - 30) / categoryData.length;

  categoryData.forEach((category, index) => {
    const barHeight = (category.count / maxCount) * chartHeight;
    const barX = margin + (barWidth + 5) * index;
    const barY = chartStartY + chartHeight - barHeight;
    
    // Draw bar
    pdf.setFillColor(category.color[0], category.color[1], category.color[2]);
    pdf.rect(barX, barY, barWidth, barHeight, "F");
    
    // Count on top of bar
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(category.count.toString(), barX + barWidth / 2, barY - 2, { align: "center" });
    
    // Category label
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    const labelLines = pdf.splitTextToSize(category.name, barWidth);
    pdf.text(labelLines, barX + barWidth / 2, chartStartY + chartHeight + 5, { align: "center" });
  });

  yPosition = chartStartY + chartHeight + 15;

  // ========== PROFICIENCY DISTRIBUTION ==========
  checkPageBreak(60);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Proficiency Distribution", margin, yPosition);
  yPosition += 10;

  const proficiencyCounts = {
    expert: skills.filter(s => s.proficiency_level === "expert").length,
    advanced: skills.filter(s => s.proficiency_level === "advanced").length,
    intermediate: skills.filter(s => s.proficiency_level === "intermediate").length,
    beginner: skills.filter(s => s.proficiency_level === "beginner").length,
  };

  const proficiencyData = [
    { name: "Expert", count: proficiencyCounts.expert, color: [168, 85, 247] },
    { name: "Advanced", count: proficiencyCounts.advanced, color: [59, 130, 246] },
    { name: "Intermediate", count: proficiencyCounts.intermediate, color: [34, 197, 94] },
    { name: "Beginner", count: proficiencyCounts.beginner, color: [249, 115, 22] },
  ];

  const profChartStartY = yPosition;
  const profMaxCount = Math.max(...proficiencyData.map(d => d.count), 1);

  proficiencyData.forEach((prof, index) => {
    const barHeight = (prof.count / profMaxCount) * chartHeight;
    const barX = margin + (barWidth + 5) * index;
    const barY = profChartStartY + chartHeight - barHeight;
    
    pdf.setFillColor(prof.color[0], prof.color[1], prof.color[2]);
    pdf.rect(barX, barY, barWidth, barHeight, "F");
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(prof.count.toString(), barX + barWidth / 2, barY - 2, { align: "center" });
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(prof.name, barX + barWidth / 2, profChartStartY + chartHeight + 5, { align: "center" });
  });

  yPosition = profChartStartY + chartHeight + 15;

  // ========== SKILLS BY CATEGORY ==========
  pdf.addPage();
  yPosition = margin;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("Skills Breakdown", margin, yPosition);
  yPosition += 12;

  const categories = [
    { key: "technical", name: "Technical Skills", color: [59, 130, 246] },
    { key: "tools", name: "Tools & Technologies", color: [34, 197, 94] },
    { key: "soft_skills", name: "Soft Skills", color: [168, 85, 247] },
    { key: "domain", name: "Domain Expertise", color: [249, 115, 22] },
  ];

  categories.forEach((category) => {
    const categorySkills = skills.filter(s => s.skill_category === category.key);
    
    if (categorySkills.length === 0) return;
    
    checkPageBreak(20);
    
    // Category header
    pdf.setFillColor(category.color[0], category.color[1], category.color[2]);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 8, "F");
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${category.name} (${categorySkills.length})`, margin + 3, yPosition + 5);
    
    yPosition += 12;
    
    // Skills list
    categorySkills
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .forEach((skill, index) => {
        checkPageBreak(10);
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text(`• ${skill.skill_name}`, margin + 5, yPosition);
        
        // Confidence bar
        const barStartX = margin + 80;
        const barWidth = 40;
        const confidenceWidth = barWidth * skill.confidence_score;
        
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(barStartX, yPosition - 3, barWidth, 4);
        
        pdf.setFillColor(34, 197, 94);
        pdf.rect(barStartX, yPosition - 3, confidenceWidth, 4, "F");
        
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${(skill.confidence_score * 100).toFixed(0)}%`, barStartX + barWidth + 3, yPosition);
        
        // Proficiency
        pdf.text(skill.proficiency_level.charAt(0).toUpperCase() + skill.proficiency_level.slice(1), 
                barStartX + barWidth + 20, yPosition);
        
        // Explicit/Inferred indicator
        pdf.setFontSize(7);
        pdf.setTextColor(skill.is_explicit ? 59 : 168, skill.is_explicit ? 130 : 85, skill.is_explicit ? 246 : 247);
        pdf.text(skill.is_explicit ? "Explicit" : "Inferred", pageWidth - margin - 15, yPosition);
        
        yPosition += 6;
      });
    
    yPosition += 5;
  });

  // ========== FOOTER ON ALL PAGES ==========
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(128, 128, 128);
    pdf.setFontSize(8);
    pdf.text(
      `Generated by SkillSense | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Save PDF
  const fileName = `SkillSense_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
