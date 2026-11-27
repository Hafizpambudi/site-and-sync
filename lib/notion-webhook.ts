export type NotionWebhookPayload = {
  verification_token?: unknown;
  type?: unknown;
};

export type PayloadKind = "handshake" | "sync" | "ignore";

/**
 * The handshake arrives unsigned, so it is recognised before the signature
 * check. Everything unknown is ignored rather than rejected: Notion retries on
 * non-2xx, and a retry storm helps nobody.
 */
export function classifyPayload(payload: NotionWebhookPayload): PayloadKind {
  if (typeof payload.verification_token === "string") return "handshake";
  if (payload.type === "page.content_updated") return "sync";
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