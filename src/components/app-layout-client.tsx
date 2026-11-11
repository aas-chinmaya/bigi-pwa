"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { loadBusiness, syncPendingBusiness } from "@/lib/business";
import type { Business } from "@/lib/business";
import { getCurrentUser } from "@/lib/supabase/client";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<{ business: Business | null; email: string } | null>(null);

  useEffect(() => {
    let active = true;
    const restoreIdentity = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace("/login");
          return;
        }
        let business: Business | null;
        try {
          business = await syncPendingBusiness(user.id);
        } catch (error) {
          console.error("Could not sync the saved business profile", error);
          business = await loadBusiness(user.id);
          toast.error("Business changes are saved on this device but could not sync.");
        }
        if (active) {
          setIdentity({ business, email: user.email ?? "" });
        }
      } catch (error) {
        console.error("Could not restore the saved session", error);
        router.replace("/login");
      }
    };

    window.addEventListener("if:business-updated", restoreIdentity);
    window.addEventListener("online", restoreIdentity);
    void restoreIdentity();
    return () => {
      active = false;
      window.removeEventListener("if:business-updated", restoreIdentity);
      window.removeEventListener("online", restoreIdentity);
    };
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
