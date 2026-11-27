---
title: "Cutting research latency by 26%"
slug: "latency-cut"
summary: "Research answers came back slow and document prep ate the week. Cut end-to-end latency 26% and manual prep 70%."
date: "2026-01-22"
role: "Full-stack AI engineer"
timeline: "5 weeks"
tags:
  - "Performance"
  - "RAG"
featured: true
---

The research workflow worked. That was the problem. It was slow enough that people routed around it, and a tool nobody waits for is a tool nobody uses.

## Where the time went

I instrumented the pipeline before changing anything. Three costs dominated:

- Document prep was manual. Someone opened each file, cleaned it, and pasted it in.
- Retrieval returned too much. Every extra passage added model time and added nothing to the answer.
- The request path re-embedded documents it had already seen.

## What I built

A staged pipeline with a cache in front of it.

1. Ingestion moved off the request path. Documents are normalised once, in a batch job.
2. Retrieval returns fewer, better passages. The reranker sorts, then a threshold drops the tail.
3. Embeddings are keyed by content hash, so nothing is embedded twice.

## What changed

| Measure | Before | After |
| --- | --- | --- |
| End-to-end latency | 100% | 74% |
| Manual document prep | 100% | 30% |

The latency win is not evenly spread. Most requests never hit the slow path at all, because the cache answers them.

## How I knew it worked

Timing came from the pipeline itself, not from a stopwatch. Each stage emits a duration, and the p95 is what I optimised against. Mean latency was already fine; the tail was what made the tool feel slow.

## What I would do differently

Nothing structural. I would add the stage timings on day one instead of day three, because the instrumentation is what found the answer.
