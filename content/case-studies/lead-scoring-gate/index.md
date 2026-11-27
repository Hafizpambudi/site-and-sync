---
title: "A scoring gate for outbound lists"
slug: "lead-scoring-gate"
summary: "Outbound lists were manual and noisy. Added a scoring gate validated on 150 labelled rows: 658 qualified contacts across 173 companies."
date: "2025-11-08"
role: "Full-stack AI engineer"
timeline: "4 weeks"
tags:
  - "Evals"
  - "Growth"
featured: true
---

Outbound ran on a spreadsheet and a hunch. Someone assembled a list by hand, dropped it into a sequence, and the reply rate told us afterwards whether it was any good.

## What the problem actually was

The list was the product, and nobody could say why a company was on it. Worse, there was no way to tell whether a change made the list better or worse. Every improvement was a guess that could not be checked.

## What I built

A scoring gate that sits between "here is a company" and "send this".

1. Collect signals per company: hiring, funding, stack, recent posts.
2. Score against a model, with the reason recorded for each score.
3. Only companies above a threshold enter the sequence.

The gate is allowed to reject. That is the point.

## What changed

| Measure | Before | After |
| --- | --- | --- |
| Qualified contacts | manual, unmeasured | 658 |
| Companies covered | unknown | 173 |
| Decision basis | a hunch | a recorded score |

## How I knew it worked

Before the gate shipped, it was validated on 150 labelled rows. Those rows were scored by hand first, then by the model. The gate had to agree with the human labels at a rate I was willing to defend before it was allowed to decide anything.

That is the reason the number is trustworthy. Not because the model is good, but because I checked what it would do before letting it move.

## What I would do differently

I would label the 150 rows earlier. The gate existed for a week before I could say whether it worked.
