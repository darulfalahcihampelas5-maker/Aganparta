import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://ikiruonvyfdphpxqszna.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraXJ1b252eWZkcGhweHFzem5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNjYyMzYsImV4cCI6MjEwMzc0MjIzNn0.4pfSXgg1j9z5fhP9HM9YF9zJhtbg0FIRrL0EhBAR2OA";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY.trim().length > 10 &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY"
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

