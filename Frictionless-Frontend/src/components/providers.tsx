"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";
import dynamic from "next/dynamic";
import { Toaster } from "@/components/ui/sonner";

const AuthSessionEffect = dynamic(
  () =>
    import("@/components/auth/AuthSessionEffect").then((mod) => ({
      default: mod.AuthSessionEffect,
    })),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 min before data considered stale
            gcTime: 10 * 60 * 1000,    // 10 min garbage collection
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,                   // Only retry once on failure
            retryDelay: 1000,
          },
        },
      })
  );

  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <AuthSessionEffect />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--popover-foreground))",
          },
        }}
      />
    </QueryClientProvider>
  );
}
