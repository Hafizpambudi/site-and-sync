import { verifyWebhookSignature } from "@notionhq/client";

/**
 * The body must be the raw request text. Parsing and re-serialising JSON
 * changes the bytes and invalidates the HMAC.
 */
export async function verifyNotionSignature(
  rawBody: string,
  signature: string | null,
  token: string,
): Promise<boolean> {
  if (!signature || !token) return false;

  try {
    return await verifyWebhookSignature({
      body: rawBody,
      signature,
      verificationToken: token,
    });
  } catch {
    // A malformed header is a failed verification, not a 500.
    return false;
  }
}