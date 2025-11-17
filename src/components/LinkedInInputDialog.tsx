import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface LinkedInInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LinkedInData) => void;
  loading?: boolean;
}

export interface LinkedInData {
  headline: string;
  summary: string;
  experience: string;
  skills: string;
  education: string;
}

export function LinkedInInputDialog({ open, onOpenChange, onSubmit, loading }: LinkedInInputDialogProps) {
  const [formData, setFormData] = useState<LinkedInData>({
    headline: "",
    summary: "",
    experience: "",
    skills: "",
    education: "",
  });

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleClear = () => {
    setFormData({
      headline: "",
      summary: "",
      experience: "",
      skills: "",
      education: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import LinkedIn Profile Data</DialogTitle>
          <DialogDescription>
            Copy and paste information from your LinkedIn profile to enhance your resume analysis.
            Visit your LinkedIn profile and copy the relevant sections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder="e.g., Senior Software Engineer | Full-Stack Developer"
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">About / Summary</Label>
            <Textarea
              id="summary"
              placeholder="Paste your LinkedIn 'About' section here..."
              className="min-h-[100px]"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <Textarea
              id="experience"
              placeholder="Paste your work experience from LinkedIn (job titles, companies, descriptions)..."
              className="min-h-[120px]"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Textarea
              id="skills"
              placeholder="Paste your skills from LinkedIn (comma-separated or as they appear)..."
              className="min-h-[80px]"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="education">Education</Label>
            <Textarea
              id="education"
              placeholder="Paste your education details from LinkedIn..."
              className="min-h-[80px]"
              value={formData.education}
              onChange={(e) => setFormData({ ...formData, education: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.summary.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Import & Analyze"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
