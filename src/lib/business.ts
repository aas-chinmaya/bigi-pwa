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
};

/** Load business online from Supabase or offline from Dexie. Never throws. */
export async function loadBusiness(userId: string): Promise<Business | null> {
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
    /* fall through to cache */
  }
  try {
    const cached = await getCache(userId, "business");
    return (cached as Business) || null;
  } catch {
    return null;
  }
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
    // offline: only cache locally (sync later if needed)
    const local = { id: "local", ...payload } as Business;
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
