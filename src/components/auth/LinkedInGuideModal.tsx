import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Linkedin, Download, Upload, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LinkedInGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const LinkedInGuideModal = ({ open, onClose }: LinkedInGuideModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center">
              <Linkedin className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">LinkedIn Connected!</DialogTitle>
              <DialogDescription>
                Import your professional data
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert className="bg-primary/5 border-primary/20">
          <AlertDescription className="text-sm">
            Due to LinkedIn's API restrictions, we can't automatically import your full profile. 
            Follow these steps to export and upload your data manually.
          </AlertDescription>
        </Alert>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              How to Export Your LinkedIn Data
            </h3>
            <ol className="space-y-3 text-sm">
              {[
                "Go to LinkedIn Settings & Privacy",
                "Click 'Get a copy of your data'",
                "Select 'Want something in particular?'",
                "Check: Profile, Positions, Education, Skills",
                "Click 'Request archive'",
                "Wait for email with download link (~10 minutes)",
              ].map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Upload Your Data
            </h3>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-2">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                After receiving your LinkedIn data, come back here to upload it
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Upload Files
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              What We'll Extract
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>• Work experience and positions</li>
              <li>• Skills and endorsements</li>
              <li>• Education and certifications</li>
              <li>• Projects and accomplishments</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            I'll Do This Later
          </Button>
          <Button onClick={onClose} className="bg-gradient-accent">
            Got It!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};