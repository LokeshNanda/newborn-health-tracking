"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/auth-provider";
import { googleLogin, loginUser } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      setAuth(data);
      toast.success("Welcome back!");
      router.replace("/dashboard");
    },
    onError: (error: Error) => {
      toast.error(error.message ?? "Unable to sign in.");
    },
  });

  const googleMutation = useMutation({
    mutationFn: googleLogin,
    onSuccess: (data) => {
      setAuth(data);
      toast.success("Signed in with Google");
      router.replace("/dashboard");
    },
    onError: (error: Error) => toast.error(error.message ?? "Google login failed"),
  });

  const onSubmit = (values: LoginValues) => {
    loginMutation.mutate(values);
  };

  const isBusy = loginMutation.isPending || googleMutation.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-3xl">
        <CardHeader className="gap-2">
          <CardTitle className="text-3xl font-semibold">Welcome back</CardTitle>
          <CardDescription>Sign in to manage growth, vaccines, and medication logs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            {googleEnabled ? (
              <GoogleLoginButton
                isLoading={googleMutation.isPending}
                onToken={(token) => googleMutation.mutate({ id_token: token })}
              />
            ) : (
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-center border-dashed py-6 text-base" disabled>
                  Sign in with Google
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign in.
                </p>
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              OR
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="text-sm text-muted-foreground">
              New here?{" "}
              <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
          <div className="rounded-lg border p-6 shadow-sm">
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="caregiver@email.com" autoComplete="email" {...field} />
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
                        <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isBusy}>
                  {loginMutation.isPending ? "Signing in…" : "Continue"}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleLoginButton({ isLoading, onToken }: { isLoading: boolean; onToken: (token: string) => void }) {
  const googleLoginHandler = useGoogleLogin({
    flow: "implicit",
    scope: "openid profile email",
    onSuccess: (response) => {
      if (!response.id_token) {
        toast.error("Missing Google token");
        return;
      }
      onToken(response.id_token);
    },
    onError: () => toast.error("Google login was cancelled"),
  });

  return (
    <Button
      variant="outline"
      className="w-full justify-center border-dashed py-6 text-base"
      onClick={() => googleLoginHandler()}
      disabled={isLoading}
    >
      {isLoading ? "Connecting to Google…" : "Sign in with Google"}
    </Button>
  );
}
