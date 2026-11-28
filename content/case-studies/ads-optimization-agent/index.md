---
title: "Ads Optimization agent"
slug: "ads-optimization-agent"
summary: "Client said “This ads budget is doesn’t make sense”"
date: "2026-11-13"
role: ""
tags:
featured: false
notionId: "417f2a12-adfd-8003-b1eb-eadf26e7c094"
notionLastEdited: "2026-11-28T03:59:00.000Z"
---

### The Proof of Concept. Try demo below

# Ad Spend Is Reported. Whether It Was Worth It Is Not.

A restaurant group buys demand on Meta and Google. Both platforms report spend,
impressions, clicks, and conversions. Neither platform can see the reservation
that the ad produced. Neither knows what a cover is worth after food and labour
cost.

The problem is a missing join, and its fix is arithmetic.

## 1. Three leaks, and one structural problem

Meta spend sits in Ads Manager. Google spend sits in a second dashboard.
Reservation volume sits in a reservation platform. Contribution margin sits in a
spreadsheet that Finance owns. No single view contains all four, so “is this
campaign profitable” gets answered from memory, by whoever checked last.

A campaign showing ROAS 2.4 looks healthy until someone asks what it must beat.
If contribution margin is 30%, break-even ROAS is `1 / 0.30 = 3.33`, and that
campaign is losing money. Display the ratio without the threshold and budget
decisions drift toward intuition.

A budget edit happens inside a vendor UI. There is no record of who changed what,
on which numbers, and why. When performance moves a week later, nobody can
reconstruct the decision.

The fourth problem is structural. An ad platform optimises for the conversion it
can observe. When the real conversion is a reservation completing in a
third-party system, the platform optimises for a proxy instead.

On one audited ad account, 88% of lifetime spend had gone to Website Traffic and
Engagement objectives rather than reservation objectives, against a lifetime spend
of $2,643.98, with no spend recorded since June 2026. That is a finding about one
account on one date, not an industry benchmark, and I present it that way. The
mechanism it exposes is general. The platform did exactly what it was asked, and
nobody had asked it for reservations.

## 2. What an agent actually speeds up

In a study of 5,179 customer support agents, access to a generative AI assistant
raised productivity, measured as issues resolved per hour, by 14% on average. The
effect was uneven: 34% for novice and low-skilled workers, and minimal for
experienced, highly skilled ones.

The tool did not make experts faster. It helped newer workers move down the
experience curve by surfacing the practices of the strongest performers.

> Brynjolfsson, E., Li, D., & Raymond, L. R. (2023). *Generative AI at Work.*
NBER Working Paper 31161. [https://doi.org/10.3386/w31161](https://doi.org/10.3386/w31161)

Ad operations has the same shape. The bottleneck is reconstruction: gathering
numbers from three systems, remembering which month the margin was set,
re-deriving what a good ROAS would have been. That work is repetitive and
identical every week. A deterministic agent performs the join, computes the
threshold, and states the reason, the same way on every run.

I have not measured the saving. By hand, checking one campaign’s ROAS against a
break-even threshold means opening two ad dashboards, exporting, pasting into a
sheet, looking up the margin, and dividing. Call it ten to fifteen minutes. Across
a 32-campaign portfolio that is most of a working day, repeated weekly. That
figure is an estimate from how the work is done, not a timer I ran. The demo
exists so a reader can judge the difference without trusting my number.

The system runs four steps in sequence. It collects campaign-level spend from both
platforms, read-only, then computes ROAS, CPA, CTR, and break-even ROAS from a
contributed margin. From those numbers it assigns one of six verdicts per campaign,
each carrying the exact inputs and thresholds that produced it. Every proposed
change then passes through the gate. The result is joined arithmetic with a refusal
layer.

## 3. Why the human does not leave the loop

The EU AI Act’s human oversight requirement obliges deployers to keep operators
able to understand a system’s limits, correctly interpret its output, decide not
to use it, and override or interrupt it. It names the failure mode: *automation
bias*, the tendency to over-rely on output, “in particular for high-risk AI
systems used to provide information or recommendations for decisions to be taken
by natural persons.”

> Regulation (EU) 2024/1689, Article 14. Human Oversight.
[https://artificialintelligenceact.eu/article/14/](https://artificialintelligenceact.eu/article/14/)

A recommendation about where to spend money falls in that category. The gate is
four `if` statements and a dispatch, evaluated in this order:

1. Safety flags. `DRY_RUN=true` or `ACTIONS_ENABLED=false` returns
`blocked_safety_gate`.
2. Approval. A missing, unapproved, or mismatched approval returns
`blocked_no_approval`. The approval must carry the same action id as the
proposal.
3. Guardrail. A change beyond ±20% of the current daily budget returns
`blocked_guardrail` unless a human explicitly overrides.
4. Manual-only. Conversion action changes and asset cleanup return
`manual_required` regardless of approval, because they reshape historical
comparisons or are judged visually.

Only a proposal passing all four reaches a connector. The action id is
deterministic, `sha1("action_type:target_id:proposed_value")[:16]`, so an
identical regenerated proposal still matches its approval, while a changed one
cannot replay a stale approval.

No language model sits anywhere near the gate. Determinism is a property of code,
and a prompt is a suggestion. The defaults are closed, `DRY_RUN=true` and
`ACTIONS_ENABLED=false`, so the normal outcome of pressing the button is a
refusal. The UI renders that refusal as a normal result, not an error.

The Meta connector has no write path, and its token carries `ads_read` only.
Opening the gate cannot by itself cause a Meta write. That requires implementing a
mutation and obtaining a re-scoped token, which is a decision with its own review.

Human-in-the-loop research treats human input as a design component rather than a
patch (Wu et al., 2022, [https://arxiv.org/abs/2108.00941](https://arxiv.org/abs/2108.00941)). Hosted model
behaviour drifts measurably over time (Chen, Zaharia & Zou, 2023,
[https://arxiv.org/abs/2307.09009](https://arxiv.org/abs/2307.09009)), which argues for putting judgement inside
deterministic code and re-checking it continuously. NIST AI 100-1 states the same
posture in policy language:
[https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf).

The system refuses a legitimate action sometimes. I accept that cost on purpose.

## 4. Try it yourself

The demo runs the verdict engine, the proposal builders, and the gate in the
browser, against a synthetic dataset of 32 campaigns over 30 days. No backend, no
credentials, and no network requests after the first load.

[**Open the interactive demo**](https://hafizpambudi.github.io/ads-optimization-agent/demo.html)

Five steps, in order:

1. Leave the margin unset. Profitability verdicts downgrade to `need_more_data`.
The system will not guess a threshold it does not have.
2. Set the margin to 0.30. Break-even becomes 3.33, and six distinct verdicts
appear across the portfolio.
3. Force conversion value to zero. A campaign with 22 conversions and no recorded
revenue becomes `unknown_missing_revenue` instead of `pause_candidate`. A
working campaign with unrecorded revenue must not be paused on a data bug.
4. Read the rationale panel. Every verdict shows its inputs and thresholds, so you
can recompute it by hand.
5. Press “Send through the gate”. With defaults, it refuses. Toggle the switches
and watch the refusal change. It never reaches a write path.

The dataset is synthetic and the page says so. The browser engine is a
reimplementation of the reference Python engine, and the two must agree on 37
golden cases within `1e-9` before anything is published, so the numbers you see
are arithmetic rather than illustration.

The source is private. The demo, its tests, and the parity fixtures are public.

---

## References

1. Brynjolfsson, E., Li, D., & Raymond, L. R. (2023). *Generative AI at Work.*
NBER Working Paper 31161; published in *The Quarterly Journal of Economics*,
140(2), 889–942 (2025). [https://doi.org/10.3386/w31161](https://doi.org/10.3386/w31161)
2. Regulation (EU) 2024/1689 (Artificial Intelligence Act), Article 14. Human
Oversight. [https://artificialintelligenceact.eu/article/14/](https://artificialintelligenceact.eu/article/14/)
3. Wu, X., Xiao, L., Sun, Y., Zhang, J., Ma, T., & He, L. (2022). *A Survey of
Human-in-the-loop for Machine Learning.* Future Generation Computer Systems.
[https://arxiv.org/abs/2108.00941](https://arxiv.org/abs/2108.00941)
4. Chen, L., Zaharia, M., & Zou, J. (2023). *How is ChatGPT’s behavior changing
over time?* [https://arxiv.org/abs/2307.09009](https://arxiv.org/abs/2307.09009)
5. National Institute of Standards and Technology (2023). *Artificial
Intelligence Risk Management Framework (AI RMF 1.0)*, NIST AI 100-1.
[https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf)

[https://hafizpambudi.github.io/ads-optimization-agent/](https://hafizpambudi.github.io/ads-optimization-agent/)
