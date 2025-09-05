// supabase/functions/whatsapp-webhook/wa.ts
const GRAPH_VERSION = (Deno.env.get("META_GRAPH_VERSION") || "v22.0").toString().trim();
const PHONE_ID = (Deno.env.get("WHATSAPP_PHONE_ID") || "").toString().trim();
const META_TOKEN = (Deno.env.get("META_TOKEN") || "").toString().trim();
// 🔎 Debug log for env vars (do NOT print the token)
console.log("WA env", {
  GRAPH_VERSION,
  PHONE_ID,
  META_TOKEN: !!META_TOKEN
});
/** Parse only TEXT messages; ignore media to avoid accidental AI triggers */ export function parseInbound(body) {
  const out = [];
  try {
    const entry = body?.entry ?? [];
    for (const e of entry){
      const changes = e?.changes ?? [];
      for (const c of changes){
        const value = c?.value;
        const messages = value?.messages ?? [];
        for (const m of messages){
          if (m?.type !== "text") continue; // ignore non-text
          const from = m.from;
          const text = m.text?.body ?? "";
          const messageId = m.id ?? "";
          if (from && text) out.push({
            from,
            text,
            messageId
          });
        }
      }
    }
  } catch  {}
  return out;
}
export async function sendText(toE164, body) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_ID}/messages`;
  // Ensure header values are valid ByteStrings (no newlines/undefined)
  const token = META_TOKEN; // already trimmed above
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: String(toE164),
      type: "text",
      text: {
        body: String(body ?? "")
      }
    })
  });
  let data = null;
  try {
    data = await res.json();
  } catch  {}
  return {
    status: res.status,
    data
  };
}
