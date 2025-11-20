"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const growthSchema = z.object({
  record_date: z.string().min(1, { message: "Date is required" }),
  weight_kg: z
    .number({ invalid_type_error: "Enter a weight" })
    .positive("Weight must be positive")
    .max(20, "Weight must be realistic"),
  height_cm: z
    .number({ invalid_type_error: "Enter a height" })
    .positive("Height must be positive")
    .max(120, "Height must be realistic"),
});

export type GrowthFormValues = z.infer<typeof growthSchema>;

interface AddGrowthLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GrowthFormValues) => Promise<void> | void;
  isSubmitting: boolean;
  childName?: string;
}

export function AddGrowthLogDialog({ open, onOpenChange, onSubmit, isSubmitting, childName }: AddGrowthLogDialogProps) {
  const form = useForm<GrowthFormValues>({
    resolver: zodResolver(growthSchema),
    defaultValues: {
      record_date: new Date().toISOString().slice(0, 10),
      weight_kg: 3,
      height_cm: 50,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        record_date: new Date().toISOString().slice(0, 10),
        weight_kg: 3,
        height_cm: 50,
      });
    }
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log growth</DialogTitle>
          <DialogDescription>Track {childName ? `${childName}'s` : "the child's"} latest measurements.</DialogDescription>
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
              name="record_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Record date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) => field.onChange(parseFloat(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        value={Number.isNaN(field.value) ? "" : field.value}
                        onChange={(event) => field.onChange(parseFloat(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save log"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
