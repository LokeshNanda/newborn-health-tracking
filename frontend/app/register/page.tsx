"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { registerUser } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const registerSchema = z.object({
  full_name: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
    z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  ),
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
    },
  });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      toast.success("Account created. Please sign in.");
      router.push("/login");
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Unable to create your account.");
    },
  });

  const onSubmit = (values: RegisterValues) => {
    mutation.mutate({
      email: values.email,
      password: values.password,
      full_name: values.full_name ?? undefined,
    });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-100" />
        <div className="relative z-10 flex h-full flex-col justify-between border-r p-10">
          <Link href="/" className="text-lg font-semibold text-emerald-900">
            Newborn Health Tracker
          </Link>
          <div className="space-y-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-emerald-700">Why families join</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                “It&apos;s the easiest way to keep grandparents and pediatricians aligned.”
              </h2>
            </div>
            <div className="space-y-4 rounded-3xl border border-white/60 bg-white/85 p-6 shadow-lg backdrop-blur">
              <p className="text-lg text-slate-700">
                “We log vaccines, meds, growth charts, and shared todos in seconds. Everyone sees the same truth.”
              </p>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="Caregiver avatar" />
                  <AvatarFallback>NH</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-slate-900">Marcus Shaw</p>
                  <p className="text-xs text-muted-foreground">Dad • Portland, OR</p>
                </div>
              </div>
            </div>
            <ul className="grid gap-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Unlimited caregiver seats
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> FastAPI-secured auth
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Realtime health timeline
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">Centralize every newborn milestone in minutes.</p>
          </div>
          <Card className="border border-border/70 shadow-2xl">
            <CardContent className="pt-6">
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="Pat Smith" autoComplete="name" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="parent@email.com" autoComplete="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Create a secure password"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? "Creating account..." : "Sign up"}
                  </Button>
                </form>
              </Form>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                By continuing you agree to our{" "}
                <Link href="#" className="text-primary underline-offset-4 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-primary underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </CardContent>
          </Card>
          <p className="text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
