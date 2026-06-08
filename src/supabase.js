import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cwuyvnpmbufazmtaepvb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dXl2bnBtYnVmYXptdGFlcHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzYyMDMsImV4cCI6MjA5NjUxMjIwM30.EnndTORUkHueACn6MMzt-0TKrufdnv2zx5KitcmItlA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function sendMessage(message) {
  try { await supabase.from("messages").insert({ message, read: false }); } catch(e) { console.error(e); }
}

export async function markRead(id) {
  try { await supabase.from("messages").update({ read: true }).eq("id", id); } catch(e) { console.error(e); }
}

export async function sendReply() {
  try { await supabase.from("messages").insert({ message: "👍 On my way!", read: true }); } catch(e) { console.error(e); }
}

export function subscribeToMessages(callback) {
  return supabase.channel("messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => { callback(payload.new); })
    .subscribe();
}

export async function loadMessages() {
  try {
    const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(50);
    return data || [];
  } catch(e) { return []; }
}
