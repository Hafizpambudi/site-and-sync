import { afterEach, describe, expect, it, vi } from "vitest";
import { signWebhookPayload } from "@notionhq/client";
import { verifyNotionSignature } from "./verify-notion-signature";
import { classifyPayload, dispatchNotionSync } from "./notion-webhook";

describe("verifyNotionSignature", () => {
  const token = "secret_test";
  const body = JSON.stringify({ type: "page.content_updated" });

  it("accepts a signature Notion would send", async () => {
    const signature = await signWebhookPayload({ body, verificationToken: token });
    expect(await verifyNotionSignature(body, signature, token)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const signature = await signWebhookPayload({ body, verificationToken: token });
    expect(await verifyNotionSignature(`${body} `, signature, token)).toBe(false);
  });

  it("rejects a signature made with another token", async () => {
    const signature = await signWebhookPayload({ body, verificationToken: "other" });
    expect(await verifyNotionSignature(body, signature, token)).toBe(false);
  });

  it("rejects a missing signature", async () => {
    expect(await verifyNotionSignature(body, null, token)).toBe(false);
  });

  it("rejects a malformed signature instead of throwing", async () => {
    expect(await verifyNotionSignature(body, "not-a-signature", token)).toBe(false);
  });

  it("rejects everything when no token is configured", async () => {
    const signature = await signWebhookPayload({ body, verificationToken: token });
    expect(await verifyNotionSignature(body, signature, "")).toBe(false);
  });
});

describe("classifyPayload", () => {
  it("treats a verification token as the handshake", () => {
    expect(classifyPayload({ verification_token: "abc" })).toBe("handshake");
  });

  it("syncs on page content updates", () => {
    expect(classifyPayload({ type: "page.content_updated" })).toBe("sync");
  });

  it("ignores every other event", () => {
    expect(classifyPayload({ type: "page.created" })).toBe("ignore");
    expect(classifyPayload({ type: "database.content_updated" })).toBe("ignore");
    expect(classifyPayload({})).toBe("ignore");
  });

  it("does not treat a non-string token as a handshake", () => {
    expect(classifyPayload({ verification_token: 42 })).toBe("ignore");
  });
});

describe("dispatchNotionSync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a repository_dispatch with the notion-sync event type", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await dispatchNotionSync({ token: "t", repo: "owner/repo" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/owner/repo/dispatches");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ event_type: "notion-sync" });
  });

  it("throws when GitHub rejects the dispatch", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    await expect(dispatchNotionSync({ token: "t", repo: "owner/repo" })).rejects.toThrow(/401/);
  });
});