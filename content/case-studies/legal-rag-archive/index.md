---
title: "Agentic RAG over 28,000 documents"
slug: "legal-rag-archive"
summary: "Two lawyers, 28,000 documents, no searchable archive. Shipped an agentic retrieval pipeline; eval accuracy rose 20%."
date: "2026-03-14"
role: "Solo full-stack AI engineer"
timeline: "9 weeks"
tags:
  - "RAG"
  - "Evals"
  - "Legal"
featured: true
---

A two-lawyer firm had twenty-eight thousand documents and no way to search them. Every question was answered from memory or from a folder someone half-remembered. The ask arrived as "can we make a chatbot".

## What the problem actually was

The documents were the product. A wrong answer was worse than a slow one, because a lawyer would act on it. That ruled out a plain semantic search box: it returns plausible passages, and plausible is not the same as citable.

So the requirement was not retrieval. It was defensible retrieval, with a source a lawyer could open and check.

## What I built

An agentic pipeline over the full corpus. The model cannot emit an answer without a resolved citation, which turns hallucination into a schema violation rather than a trust problem.

1. Normalise and chunk the corpus. Scanned PDFs go through OCR, everything else through text extraction.
2. Retrieve with hybrid search. Keyword and vector results are merged.
3. Rerank against the question.
4. Compose the answer, with each claim bound to a document id.

The eval harness runs on every change. When accuracy regresses, the build fails.

```ts
const answer = await pipeline.answer(question, {
  requireCitation: true,
  maxSources: 5,
});
```

## What changed

| Measure | Before | After |
| --- | --- | --- |
| Eval accuracy | baseline | +20% |
| End-to-end latency | baseline | −26% |
| Manual document prep | baseline | −70% |

Latency came down as a side effect of the reranker. Fewer, better passages meant less context for the model to read.

## How I knew it worked

The eval set was labelled by hand, question by question, before any of the pipeline existed. Every answer is scored against it. The harness runs in CI, so a regression is caught before it reaches the two people who depend on it.

> The number that mattered was not accuracy. It was that a lawyer stopped asking me whether an answer was right.

## What I would do differently

I would build the eval set before the first retrieval prototype. Two weeks went into tuning a retriever I could not measure.

The stack is Postgres with pgvector, a Python ingestion worker, a TypeScript API, and the eval harness in CI.
