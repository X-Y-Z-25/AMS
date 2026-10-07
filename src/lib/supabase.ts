import { createClient } from "@supabase/supabase-js";

const getEnv = (primary: string, fallback: string) => {
  const value = import.meta.env[primary] ?? import.meta.env[fallback];
  return typeof value === "string" ? value : "";
};

const supabaseUrl = getEnv("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const supabaseKey = getEnv(
  "VITE_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabaseConfig = {
  url: supabaseUrl,
  key: supabaseKey,
  isConfigured: Boolean(supabaseUrl && supabaseKey),
};
