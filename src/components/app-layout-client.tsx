"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { loadBusiness } from "@/lib/business";
import type { Business } from "@/lib/business";
import { getCurrentUser } from "@/lib/supabase/client";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<{ business: Business | null; email: string } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace("/login");
          return;
        }
        const business = await loadBusiness(user.id);
        if (active) {
          setIdentity({ business, email: user.email ?? "" });
        }
      } catch (error) {
        console.error("Could not restore the saved session", error);
        router.replace("/login");
      }
    })();
    return () => { active = false; };
  }, [router]);

  if (!identity) {
    return <div className="min-h-screen animate-pulse bg-background" aria-label="Restoring session" />;
  }

  return (
    <AppShell business={identity.business} email={identity.email}>
      {children}
    </AppShell>
  );
}
