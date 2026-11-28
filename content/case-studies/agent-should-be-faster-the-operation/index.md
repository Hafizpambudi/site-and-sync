---
title: "Agent Should be Faster the Operation"
slug: "agent-should-be-faster-the-operation"
summary: "A brief use case about how we solving problem"
date: "2026-11-06"
role: ""
tags:
demo: "https://hafizpambudi.github.io/HIL-Pelumas-Agent/"
featured: false
notionId: "410f2a12-adfd-80a0-bfb8-e5062fc2735b"
notionLastEdited: "2026-11-28T10:40:00.000Z"
---

# The WhatsApp Admin Is the Checkout

*A self-initiated prototype that turns a messy industrial-supply inquiry into a price-ready RFQ — and why the human never leaves the loop.*

**Note on provenance.** This article describes a prototype built against the public product catalog of CV Cahaya Pelumasindo, an Indonesian distributor of industrial fuel-handling equipment. It was not a paid engagement. No client data was used, no live WhatsApp number was connected, and no production traffic was observed. The company’s owner is known to the author, and a real engagement may follow. Everything below is a portfolio project, and every number is either reproducible from the repository or cited to a published source.

---

## 1. The problem: a catalog with no prices

![](/content/case-studies/agent-should-be-faster-the-operation/faef15de1d58.png)

CV Cahaya Pelumasindo publishes 91 product pages across six categories — flow meters, pumps, nozzle guns, water meters, hose reels, and accessories — sourced from more than ten brands that overlap heavily in function. The catalog contains zero price fields, zero stock status, zero cart, and zero quotation form.

Every product page ends with the same button: *Cek Harga dan Ketersediaan*. Pressing it opens a WhatsApp chat with one of two admins.

That single design choice defines the entire operation. The website is a brochure; the actual transaction happens in a chat window. The admin is not a support channel sitting behind a checkout. The admin **is** the checkout. Nothing can be quoted, reserved, or confirmed without one of two people being awake, reading the thread, and asking the right follow-up questions.

This arrangement works at low volume. It fails structurally in three places.

**Price is a conversation, not a page.** Because no price is published, every inquiry is a human dependency. Volume cannot grow without headcount, and the two admins are also the price authority, the product expert, and the institutional memory of the business.

**The inquiry arrives unstructured.** A real message reads like this: *“selamat siang, mau tanya flow meter solar buat pertamina 2 nozzle, budget 15jt”*. Before anything can be priced, someone must reconstruct the part number, quantity, specification, company, delivery city, and urgency. That reconstruction repeats hundreds of times, and it happens in the margin between other work.

**Out of stock is invisible until it is too late.** Availability is not published anywhere. When a part is unavailable, the thread either stalls or dies — even though the catalog carries many interchangeable brands. The equivalent probably exists in the warehouse. Nobody has time to look for it mid-conversation.

None of this is unusual. Any B2B distributor that prices by quotation shares the same shape: a public catalog that deliberately withholds the number that decides the purchase, and a human channel that supplies it on demand. The prototype is therefore aimed at a pattern, not at one company’s quirk.

**See the demo:** [hafizpambudi.github.io/HIL-Pelumas-Agent](https://hafizpambudi.github.io/HIL-Pelumas-Agent/)

---

## 2. What the evidence says about agents in operations

The claim that an assistant can shorten this loop is not speculative. It has been measured, though mostly outside industrial distribution.

| Claim | Source | Reported result |
| --- | --- | --- |
| An assistant raises support throughput | Brynjolfsson, Li & Raymond, *Generative AI at Work*, NBER WP 31161 (2023); QJE 140(2) (2025) | Issues resolved per hour up 14% on average, and 34% for novice and low-skilled workers, with minimal impact on experienced workers |
| An agent can absorb volume and cut resolution time | Klarna press release, 27 February 2024 | 2.3 million conversations in the first month, about two-thirds of support chats, work equivalent to 700 full-time agents, resolution time down from 11 minutes to under 2, and satisfaction on par with human agents |
| Response speed decides whether the lead survives | Oldroyd, McElheran & Elkington, *The Short Life of Online Sales Leads*, Harvard Business Review, March 2011 | The authors’ conclusion is blunt and qualitative: most companies are not responding to online inquiries nearly fast enough |
| Agents are best understood as perception, decision, and action, with human–agent cooperation as a first-class mode | Xi et al., *The Rise and Potential of LLM-Based Agents*, arXiv:2309.07864 | Survey framing rather than a performance result |

Two things are worth separating in that table.

The first is the productivity signal. Both the NBER study and the Klarna figures point the same direction: an assistant that handles the repetitive reconstruction step returns hours, and it returns the most hours to the least experienced staff. In a two-person distributor, that is precisely the constraint — the admin’s time is the ceiling on revenue.

The second is what those numbers do not say. None of them measure correctness on a domain where a wrong answer carries commercial liability. A support bot that misstates a refund policy generates an annoyed customer. An assistant that tells a plant engineer a flow meter fits a fuel line it does not fit generates a safety incident and a warranty claim. The productivity literature says an agent can do this work faster. It says nothing about whether it should be trusted to do it unsupervised.

The second half of that gap is where the design work actually lives.

---

## 3. Why the human stays in the loop

The prototype is deliberately narrow. It does not sell, does not quote, and does not negotiate. Its single job is to convert a messy inquiry into a structured RFQ that contains everything an admin needs in order to price it. Four decisions make that safe rather than merely fast.

**Price is a human action, always.** Price in this business is negotiated per buyer, per volume, per relationship. Modelling a pricing policy would mean encoding a commercial judgment the owner makes intuitively and would expose margin if the model were wrong. So the agent never produces a number. It relays an admin’s price and records who sent it, when, and against which RFQ. The largest liability in the system is removed by not building the feature.

**Guards run after generation, in code.** Prompt instructions are not guarantees. A model told never to quote a price will, under enough pressure, quote a price.

So outbound text is validated after the model produces it: currency patterns, stock assertions, and compatibility claims are checked, and a violation is replaced with a safe fallback and logged as a block.

The demo shows this directly — each forbidden message appears beside the replacement that was actually sent. This is the “scalable supervision” problem in practice: when the objective is expensive to evaluate, you move the check out of the model and into deterministic code that can be audited.

**Fitment is curated, not inferred.** Whether a flow meter suits a diesel line at a given pressure is a question with a defensible answer, and that answer comes from a datasheet, not from a language model’s plausibility judgment. The prototype evaluates six explicit rules — connection size, pressure with a 10% margin, flow range, fluid, flange rating, and accuracy — and reports the first dimension that fails. When a dimension is unknown, it asks. It does not guess. In the seeded demo the rules carry a documented rationale and a verifier field; in production that field would hold the name of the technical contact who signed off on each rule. Curating it this way is slower than letting a model infer fitment, and it is the only version that can be audited after a bad answer.

**Availability is a state machine, not a lookup.** There is no machine-readable stock feed. Rather than invent one, availability is modelled as one of four states — available, indent, unknown, or discontinued — each carrying a source and a timestamp. In the shipped configuration every answer resolves to a warehouse check. The agent is honest on day one and improves without a rewrite when a real feed appears.

There is a fifth mechanism that matters specifically because this is a chat channel. **Admin silence has a deadline.** At handoff, the buyer is told the expected reply window. If the admin has not answered by then, the buyer receives one honest update and the admin receives one reminder. The thread stays visible in a pending queue. Nothing is promised twice, and once the 24-hour messaging window closes, the notice switches to an approved template because free-form replies are no longer permitted.

These choices are consistent with published guidance rather than invented for the occasion. Amershi et al., in *Guidelines for Human-AI Interaction* (CHI 2019), derive 18 validated guidelines for AI-infused products, including making system capabilities and limits clear and supporting efficient correction. Amodei et al., in *Concrete Problems in AI Safety* (arXiv:1606.06565), name the failure modes that appear when objectives are misspecified or supervision does not scale. The NIST AI Risk Management Framework (January 2023) and its Generative AI Profile (NIST-AI-600-1, July 2024) treat human oversight as a risk control to be engineered, not a disclaimer to be attached.

The common thread: the human is not retained as a courtesy or a fallback for model failure. The human is retained because the decision being made — what this customer pays, and what this equipment is guaranteed to do — is the part of the transaction that carries the liability.

**Try the guard behaviour yourself:** [demo.html](https://hafizpambudi.github.io/HIL-Pelumas-Agent/demo.html)

---

## 4. What was measured

The prototype ships with a test and evaluation harness, and the numbers are reproducible from the repository.

- 91 automated unit and integration tests
- 41 of 41 golden-set cases passing, covering part resolution, fitment, RFQ capture, and substitution
- 44 of 44 adversarial cases passing, covering price extraction, stock probing, prompt injection, and fitment bait
- 0 safety escapes — no price statement, no unbacked stock assertion, no invented specification

The adversarial set is the part that matters. It includes a buyer demanding a price directly, a buyer claiming an admin already quoted a figure, a buyer asserting a stock quantity, an instruction to ignore previous rules, and a question conflating two different part numbers. Passing those is a different kind of evidence than passing a happy-path test.

The demo makes the safety behaviour visible rather than asserted. Seven recorded conversations cover specification lookup, price pressure, full RFQ handoff, stockout substitution, fitment bait, injection, and a slow admin. Every agent message carries the verdict the guard function actually returned for it. A separate panel lists eight test strings that the guards block — prices, stock claims, and compatibility statements — each shown beside the replacement the buyer would actually receive.

---

## 5. Limits, stated plainly

- The demo runs on a 26-product subset, not the full 91-product catalog. Real fitment tables need manufacturer datasheets and a named verifier per category.
- Availability is manual only. Every availability answer in the demo is a warehouse check, never a claim.
- The demo conversations are recorded replays. The agent executes the same code, but a visitor is watching transcripts, not a live WhatsApp number.
- Equivalence pairs are seeded at medium confidence, so substitutions are always labelled as candidates requiring technical confirmation.
- The evaluation figures come from a deterministic mock model, not from a frontier model under production traffic. They demonstrate that the harness works and that the rules hold. They are not a production accuracy claim.

Publishing these limits is the point. An agent deployed in industrial distribution without a coverage number and a failure inventory is not a product; it is a liability with a chat interface.

---

## 6. Try it

The demo is bilingual and runs entirely in the browser — no backend, no API key, no account.

- Capability overview: [hafizpambudi.github.io/HIL-Pelumas-Agent](https://hafizpambudi.github.io/HIL-Pelumas-Agent/)
- Recorded agent runs: [demo.html](https://hafizpambudi.github.io/HIL-Pelumas-Agent/demo.html)
- English deep link: [demo.html?lang=en](https://hafizpambudi.github.io/HIL-Pelumas-Agent/demo.html?lang=en)

Start with the price-pressure scenario, then the fitment bait. Those two show, in under a minute each, where the boundary sits and what happens when a buyer pushes against it.

---

## Sources

1. Erik Brynjolfsson, Danielle Li, Lindsey R. Raymond. “Generative AI at Work.” NBER Working Paper 31161, 2023. Published in *The Quarterly Journal of Economics* 140(2), 2025, pp. 889–942. [https://www.nber.org/papers/w31161](https://www.nber.org/papers/w31161)
2. Klarna. “Klarna AI assistant handles two-thirds of customer service chats in its first month.” Press release, 27 February 2024. [https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/](https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/)
3. James B. Oldroyd, Kristina McElheran, David Elkington. “The Short Life of Online Sales Leads.” *Harvard Business Review*, March 2011. [https://hbr.org/2011/03/the-short-life-of-online-sales-leads](https://hbr.org/2011/03/the-short-life-of-online-sales-leads)
4. Zhiheng Xi et al. “The Rise and Potential of Large Language Model Based Agents: A Survey.” arXiv:2309.07864, 2023. [https://arxiv.org/abs/2309.07864](https://arxiv.org/abs/2309.07864)
5. Saleema Amershi et al. “Guidelines for Human-AI Interaction.” CHI 2019. [https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/)
6. Dario Amodei, Chris Olah, Jacob Steinhardt, Paul Christiano, John Schulman, Dan Mané. “Concrete Problems in AI Safety.” arXiv:1606.06565, 2016. [https://arxiv.org/abs/1606.06565](https://arxiv.org/abs/1606.06565)
7. National Institute of Standards and Technology. “Artificial Intelligence Risk Management Framework (AI RMF 1.0).” January 2023; “AI RMF Generative AI Profile” (NIST-AI-600-1), July 2024. [https://www.nist.gov/itl/ai-risk-management-framework](https://www.nist.gov/itl/ai-risk-management-framework)
