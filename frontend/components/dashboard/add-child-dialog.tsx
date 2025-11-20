"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Gender } from "@/lib/types";

const childSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  dob: z.string().min(1, { message: "Date of birth is required" }),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  blood_type: z.string().optional(),
});

export type ChildFormValues = z.infer<typeof childSchema>;

interface AddChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ChildFormValues) => Promise<void> | void;
  isSubmitting: boolean;
}

export function AddChildDialog({ open, onOpenChange, onSubmit, isSubmitting }: AddChildDialogProps) {
  const form = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: "",
      dob: "",
      gender: "MALE",
      blood_type: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Child</DialogTitle>
          <DialogDescription>Provide basic information to start tracking health records.</DialogDescription>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Baby name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {(["MALE", "FEMALE", "OTHER"] as Gender[]).map((option) => (
                        <option value={option} key={option}>
                          {option.charAt(0) + option.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="blood_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood type (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. O+" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save child"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
