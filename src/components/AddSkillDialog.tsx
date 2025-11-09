import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const addSkillSchema = z.object({
  skill_name: z.string()
    .trim()
    .min(1, { message: "Skill name is required" })
    .max(100, { message: "Skill name must be less than 100 characters" }),
  proficiency_level: z.union([
    z.literal("beginner"),
    z.literal("intermediate"),
    z.literal("advanced"),
    z.literal("expert")
  ]),
  years_experience: z.number()
    .int()
    .min(0, { message: "Years must be 0 or greater" })
    .max(50, { message: "Years must be less than 50" })
    .optional()
    .nullable(),
  last_used: z.string().optional().nullable(),
});

type AddSkillFormData = z.infer<typeof addSkillSchema>;

interface AddSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillProfileId: string;
  onSkillAdded: () => void;
}

export const AddSkillDialog = ({ open, onOpenChange, skillProfileId, onSkillAdded }: AddSkillDialogProps) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AddSkillFormData>({
    resolver: zodResolver(addSkillSchema),
    defaultValues: {
      skill_name: "",
      proficiency_level: "intermediate",
      years_experience: null,
      last_used: null,
    },
  });

  const proficiencyLevel = watch("proficiency_level");

  const onSubmit = async (data: AddSkillFormData) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("extracted_skills")
        .insert({
          skill_profile_id: skillProfileId,
          skill_name: data.skill_name.trim(),
          proficiency_level: data.proficiency_level,
          confidence_score: 1.0, // Manual entries get full confidence
          years_experience: data.years_experience,
          last_used: data.last_used || null,
          is_hidden: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Skill added successfully",
      });

      reset();
      onOpenChange(false);
      onSkillAdded();
    } catch (error: any) {
      console.error("Error adding skill:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add skill",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Skill</DialogTitle>
          <DialogDescription>
            Manually add a skill to your profile. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill_name">
              Skill Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="skill_name"
              placeholder="e.g., React, Python, Project Management"
              {...register("skill_name")}
              disabled={saving}
            />
            {errors.skill_name && (
              <p className="text-sm text-destructive">{errors.skill_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="proficiency_level">
              Proficiency Level <span className="text-destructive">*</span>
            </Label>
            <Select
              value={proficiencyLevel}
              onValueChange={(value) => setValue("proficiency_level", value as any)}
              disabled={saving}
            >
              <SelectTrigger id="proficiency_level">
                <SelectValue placeholder="Select proficiency level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
            {errors.proficiency_level && (
              <p className="text-sm text-destructive">{errors.proficiency_level.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="years_experience">Years of Experience</Label>
            <Input
              id="years_experience"
              type="number"
              min="0"
              max="50"
              placeholder="e.g., 3"
              {...register("years_experience", {
                setValueAs: (v) => (v === "" ? null : parseInt(v, 10)),
              })}
              disabled={saving}
            />
            {errors.years_experience && (
              <p className="text-sm text-destructive">{errors.years_experience.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_used">Last Used Date</Label>
            <Input
              id="last_used"
              type="date"
              {...register("last_used")}
              disabled={saving}
            />
            {errors.last_used && (
              <p className="text-sm text-destructive">{errors.last_used.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Skill
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
