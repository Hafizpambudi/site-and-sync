import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("returns the first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await withRetry(fn, 3, 0)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries until success", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("429")).mockResolvedValue("ok");
    expect(await withRetry(fn, 3, 0)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws the last error after exhausting attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("500"));
    await expect(withRetry(fn, 2, 0)).rejects.toThrow("500");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-retryable error", async () => {
    const error = Object.assign(new Error("bad request"), { status: 400 });
    const fn = vi.fn().mockRejectedValue(error);
    await expect(withRetry(fn, 4, 0)).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx and 429", async () => {
    const fiveHundred = Object.assign(new Error("boom"), { status: 503 });
    const tooMany = Object.assign(new Error("slow down"), { status: 429 });
    const fn = vi.fn().mockRejectedValueOnce(fiveHundred).mockRejectedValueOnce(tooMany).mockResolvedValue(1);
    expect(await withRetry(fn, 4, 0)).toBe(1);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});