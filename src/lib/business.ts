import { createClient } from "@/lib/supabase/client";
import { getCache, setCache } from "@/lib/offline/db";

export type Business = {
  id: string;
  user_id: string;
  business_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  state?: string | null;
  invoice_prefix?: string;
  default_notes?: string | null;
  logo_data?: string | null;
  pendingSync?: boolean;
};

/** Load business online from Supabase or offline from Dexie. Never throws. */
export async function loadBusiness(userId: string): Promise<Business | null> {
  let cached: Business | null = null;
  try {
    cached = (await getCache(userId, "business")) as Business | null;
  } catch {
    // Continue to the online profile when the local cache is unavailable.
  }
  if (cached?.pendingSync) return cached;

  try {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data) {
        await setCache(userId, "business", data);
        return data as Business;
      }
    }
  } catch {
    // Fall through to the cached profile.
  }
  return cached;
}

export async function syncPendingBusiness(userId: string) {
  const cached = (await getCache(userId, "business")) as Business | undefined;
  if (cached?.pendingSync && typeof navigator !== "undefined" && navigator.onLine) {
    return saveBusiness(userId, cached);
  }
  return loadBusiness(userId);
}

export async function saveBusiness(userId: string, body: Partial<Business>) {
  const payload = {
    user_id: userId,
    business_name: body.business_name || "My Business",
    email: body.email || null,
    phone: body.phone || null,
    address: body.address || null,
    gstin: body.gstin || null,
    state: body.state || null,
    invoice_prefix: body.invoice_prefix || "INV",
    default_notes: body.default_notes || "Thank you for your business.",
    logo_data: body.logo_data || null,
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Keep local edits pending until the next successful online save.
    const local = { id: "local", ...payload, pendingSync: true } as Business;
    await setCache(userId, "business", local);
    return local;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("businesses")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  await setCache(userId, "business", data);
  return data as Business;
}
