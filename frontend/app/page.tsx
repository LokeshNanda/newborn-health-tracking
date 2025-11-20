"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export default function Home() {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(token ? "/dashboard" : "/login");
  }, [loading, router, token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Preparing your experience…</p>
    </div>
  );
}
