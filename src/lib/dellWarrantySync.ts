import { hasDellCredentials, lookupWarranty } from "@/lib/dellApi";
import { supabase, supabaseConfig } from "@/lib/supabase";
import { normalizeServiceTag } from "@/lib/utils";

type WarrantyCandidate = {
  id: string;
  service_tag: string;
};

let activeSync: Promise<number> | null = null;

function toIsoDate(value: string | null): string | null {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateOnly) return dateOnly[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function getWarrantyStatus(endDate: string | null) {
  if (!endDate) return "No Warranty";
  const today = new Date();
  const end = new Date(`${endDate}T00:00:00`);
  const daysRemaining = Math.ceil((end.getTime() - new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()) / 86_400_000);

  if (daysRemaining < 0) return "Expired";
  if (daysRemaining <= 90) return "Expiring Soon";
  return "Active";
}

export function syncUncachedDellWarranties(): Promise<number> {
  if (!supabaseConfig.isConfigured || !hasDellCredentials()) {
    return Promise.resolve(0);
  }
  if (activeSync) return activeSync;

  activeSync = syncWarranties().finally(() => {
    activeSync = null;
  });
  return activeSync;
}

async function syncWarranties(): Promise<number> {
  const { data, error } = await supabase
    .from("assets")
    .select("id, service_tag")
    .in("category", ["Laptop", "Monitor", "Docking Station"])
    .ilike("manufacturer", "%Dell%")
    .not("service_tag", "is", null)
    .is("warranty_checked_at", null);

  if (error) {
    throw new Error(`Could not load unchecked Dell warranty assets: ${error.message}`);
  }

  const candidates = (data ?? []).filter(
    (item): item is WarrantyCandidate =>
      typeof item.id === "string" &&
      typeof item.service_tag === "string" &&
      Boolean(item.service_tag.trim()),
  );
  if (!candidates.length) return 0;

  const results = await lookupWarranty(
    [...new Set(candidates.map((item) => item.service_tag.trim()))],
  );
  const byServiceTag = new Map(
    results.map((item) => [normalizeServiceTag(item.serviceTag), item]),
  );
  const checkedAt = new Date().toISOString();
  let savedCount = 0;

  for (const candidate of candidates) {
    const result = byServiceTag.get(normalizeServiceTag(candidate.service_tag));
    const warrantyStart = result && !result.invalid
      ? toIsoDate(result.warrantyStartDate)
      : null;
    const warrantyEnd = result && !result.invalid
      ? toIsoDate(result.warrantyEndDate)
      : null;
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        warranty_start: warrantyStart,
        warranty_end: warrantyEnd,
        warranty_status: getWarrantyStatus(warrantyEnd),
        warranty_checked_at: checkedAt,
      })
      .eq("id", candidate.id)
      .is("warranty_checked_at", null);

    if (updateError) {
      throw new Error(
        `Dell warranty was retrieved but could not be saved for ${candidate.service_tag}: ${updateError.message}`,
      );
    }
    savedCount += 1;
  }

  return savedCount;
}
