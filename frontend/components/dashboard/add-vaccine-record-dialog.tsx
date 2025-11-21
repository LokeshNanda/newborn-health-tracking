"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { VaccineStatus } from "@/lib/types";

const vaccineSchema = z.object({
  vaccine_name: z.string().min(2, { message: "Vaccine name is required" }),
  scheduled_date: z.string().min(1, { message: "Date is required" }),
  status: z.enum(["PENDING", "COMPLETED"]),
});

export type VaccineFormValues = z.infer<typeof vaccineSchema>;

interface AddVaccineRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: VaccineFormValues) => Promise<void> | void;
  isSubmitting: boolean;
  mode?: "create" | "edit";
  initialValues?: VaccineFormValues | null;
}

const getDefaultVaccineValues = (): VaccineFormValues => ({
  vaccine_name: "",
  scheduled_date: new Date().toISOString().slice(0, 10),
  status: "PENDING",
});

export function AddVaccineRecordDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  mode = "create",
  initialValues,
}: AddVaccineRecordDialogProps) {
  const isEdit = mode === "edit";
  const form = useForm<VaccineFormValues>({
    resolver: zodResolver(vaccineSchema),
    defaultValues: getDefaultVaccineValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(initialValues ?? getDefaultVaccineValues());
    } else {
      form.reset(getDefaultVaccineValues());
    }
  }, [form, initialValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vaccine record" : "Schedule vaccine"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Adjust the vaccine details." : "Track upcoming or completed vaccine milestones."}
          </DialogDescription>
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
              name="vaccine_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vaccine</FormLabel>
                  <FormControl>
                    <Input placeholder="Hepatitis B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scheduled_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {(["PENDING", "COMPLETED"] as VaccineStatus[]).map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0) + option.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEdit ? "Update record" : "Save record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
