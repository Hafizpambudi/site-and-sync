export type NotionWebhookPayload = {
  verification_token?: unknown;
  type?: unknown;
};

export type PayloadKind = "handshake" | "sync" | "ignore";

/**
 * Publishing is a property change, not a content edit, so the sync has to listen
 * to row creation, status changes, archiving and moves as well as body edits.
 */
const SYNC_EVENTS = new Set([
  "page.created",
  "page.content_updated",
  "page.properties_updated",
  "page.deleted",
  "page.moved",
]);

/**
 * The handshake arrives unsigned, so it is recognised before the signature
 * check. Everything unknown is ignored rather than rejected: Notion retries on
 * non-2xx, and a retry storm helps nobody.
 */
export function classifyPayload(payload: NotionWebhookPayload): PayloadKind {
  if (typeof payload.verification_token === "string") return "handshake";
  if (typeof payload.type === "string" && SYNC_EVENTS.has(payload.type)) return "sync";
  return "ignore";
}

export type DispatchConfig = {
  token: string;
  repo: string;
};

export async function dispatchNotionSync({ token, repo }: DispatchConfig): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ event_type: "notion-sync" }),
  });

  if (!response.ok) {
    throw new Error(`github dispatch failed: ${response.status}`);
  }
}