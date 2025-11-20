"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const medicationSchema = z.object({
  medicine_name: z.string().min(2, { message: "Medicine name is required" }),
  dosage: z.string().optional(),
  administered_at: z.string().min(1, { message: "Date and time required" }),
});

export type MedicationFormValues = z.infer<typeof medicationSchema>;

interface AddMedicationLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MedicationFormValues) => Promise<void> | void;
  isSubmitting: boolean;
}

export function AddMedicationLogDialog({ open, onOpenChange, onSubmit, isSubmitting }: AddMedicationLogDialogProps) {
  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      medicine_name: "",
      dosage: "",
      administered_at: new Date().toISOString().slice(0, 16),
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        medicine_name: "",
        dosage: "",
        administered_at: new Date().toISOString().slice(0, 16),
      });
    }
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log medication</DialogTitle>
          <DialogDescription>Capture dosage and administration time.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit(values);
            })}
          >
            <FormField
              control={form.control}
              name="medicine_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicine</FormLabel>
                  <FormControl>
                    <Input placeholder="Acetaminophen" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dosage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosage (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="5 ml" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="administered_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Administered at</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save log"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
