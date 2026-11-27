import { NextResponse } from "next/server";
import { classifyPayload, dispatchNotionSync } from "@/lib/notion-webhook";
import { verifyNotionSignature } from "@/lib/verify-notion-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const no = (status: number) => NextResponse.json({ ok: false }, { status });

export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return no(400);
  }

  if (typeof payload !== "object" || payload === null) return no(400);

  const kind = classifyPayload(payload as { verification_token?: unknown; type?: unknown });

  if (kind === "handshake") {
    // Notion sends this once, unsigned. It has to reach the operator, because
    // the same token is what the deployment needs to verify real events.
    console.log(
      "notion webhook: verification token received, set NOTION_WEBHOOK_VERIFICATION_TOKEN to it",
    );
    console.log(`notion webhook: token=${(payload as { verification_token: string }).verification_token}`);
    return NextResponse.json({ ok: true });
  }

  const verificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN ?? "";
  const valid = await verifyNotionSignature(
    rawBody,
    request.headers.get("x-notion-signature"),
    verificationToken,
  );

  if (!valid) return no(401);
  if (kind === "ignore") return NextResponse.json({ ok: true });

  const dispatchToken = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!dispatchToken || !repo) {
    console.error("notion webhook: GITHUB_DISPATCH_TOKEN or GITHUB_REPO is not set");
    return no(500);
  }

  try {
    await dispatchNotionSync({ token: dispatchToken, repo });
  } catch (error) {
    // A 5xx makes Notion retry the delivery, which is the recovery path.
    console.error(error);
    return no(502);
  }

  return NextResponse.json({ ok: true });
}