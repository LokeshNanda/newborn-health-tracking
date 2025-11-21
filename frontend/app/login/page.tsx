"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useGoogleLogin, type TokenResponse } from "@react-oauth/google";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { googleLogin, loginUser } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    onError: (error: Error) => toast.error(error.message ?? "Unable to sign in."),
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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-100 via-transparent to-emerald-100" />
        <div className="relative z-10 flex h-full flex-col justify-between border-r p-10">
          <Link href="/" className="text-lg font-semibold text-emerald-900">
            Newborn Health Tracker
          </Link>
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-wide text-emerald-700">Care coordination</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                “We replaced messy spreadsheets with a single workspace.”
              </h2>
            </div>
            <blockquote className="space-y-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
              <p className="text-lg text-slate-700">
                “Every vaccine, dose, and growth update stays in sync for our entire care team. We never miss a milestone now.”
              </p>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="Parent avatar" />
                  <AvatarFallback>NH</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-slate-900">Amelia Diaz</p>
                  <p className="text-xs text-muted-foreground">Caregiver • Austin, TX</p>
                </div>
              </div>
            </blockquote>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue tracking your newborn&apos;s journey.</p>
          </div>
          <Card className="border border-border/70 shadow-2xl">
            <CardContent className="pt-6">
              <div className="space-y-6">
                {googleEnabled ? (
                  <GoogleLoginButton
                    isLoading={googleMutation.isPending}
                    onToken={(token) => googleMutation.mutate({ id_token: token })}
                  />
                ) : (
                  <DisabledGoogleCTA />
                )}
                <div className="flex items-center gap-4 text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or continue with
                  <span className="h-px flex-1 bg-border" />
                </div>
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
                            <Input type="password" placeholder="********" autoComplete="current-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={googleMutation.isPending || loginMutation.isPending}>
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="font-medium text-primary hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">FastAPI secured • Data encrypted in transit</p>
        </div>
      </div>
    </div>
  );
}

function GoogleLoginButton({ isLoading, onToken }: { isLoading: boolean; onToken: (token: string) => void }) {
  const googleLoginHandler = useGoogleLogin({
    flow: "implicit",
    scope: "openid profile email",
    onSuccess: (response: TokenResponse) => {
      const idToken = (response as TokenResponse & { id_token?: string }).id_token;
      if (!idToken) {
        toast.error("Missing Google token");
        return;
      }
      onToken(idToken);
    },
    onError: () => toast.error("Google login was cancelled"),
  });

  return (
    <Button
      variant="outline"
      className="w-full justify-center border border-emerald-100 bg-white py-3 text-base shadow-sm transition hover:bg-emerald-50"
      onClick={() => googleLoginHandler()}
      disabled={isLoading}
    >
      {isLoading ? "Connecting to Google..." : "Sign in with Google"}
    </Button>
  );
}

function DisabledGoogleCTA() {
  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full justify-center border-dashed py-3 text-base" disabled>
        Sign in with Google
      </Button>
      {/* <p className="text-center text-xs text-muted-foreground">Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign in.</p> */}
    </div>
  );
}
