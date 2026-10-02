# TapShelf — Shelf-Side AI Assistant (PRD draft)

| | |
|---|---|
| Status | **Draft v0.2 — in discovery.** Priority: full build once approved (decision D2). Open questions are in §9; decisions so far are in §0. |
| Parent spec | [`docs/PRD-v4.md`](PRD-v4.md) (roadmap §9, decision §11.5). Builds on the staff experience: [`docs/staff-experience.md`](staff-experience.md) (PRD-v4 §7 Step 13, built) and manager roles (Step 14, [PR #12](https://github.com/a3mckay/nfc-tap-project/pull/12), open). |
| Origin | Advisory conversation with Sarah Young (Servizio Group), 2026-10-01 |
| Updated | 2026-10-02 (round 1 answers) |

> **For a Claude session:** this is a discovery draft. Don't build from it until §9 is resolved and the status above says *Approved*. When it's approved, its build steps move into PRD-v4 §7.

---

## 0. Decisions log

Round 1 (2026-10-02), answering the ★ questions from v0.1:

| # | Decision |
|---|---|
| D1 | **Ship all three surfaces.** Customer Ask, the owner Questions tab, and staff access to the same data and AI. |
| D2 | **Full build, not a demo slice.** Once this spec is approved, it becomes a new build phase in PRD-v4 §7. |
| D3 | **Tap page:** keep today's header carousel. Photos come first, and the video stays a carousel slide; it isn't autoplayed, so the < 2 s target holds. Below the header: name/price, 3 key points, then Ask. Long-form details collapse behind "More details." |
| D4 | **Ask placement:** a sticky "Ask about this ✦" bar near the bottom of the page that opens a half-screen chat. Customers can minimize the chat back to the bar and reopen it, and the conversation is kept for the session. |
| D5 | **No answer available:** the AI replies "Thanks for asking. We don't have an answer to that one yet, but we've sent your question to {store}." The question is marked **Submitted** and goes into the owner's review queue. The AI doesn't hand off to WhatsApp/SMS. |
| D6 | **Staff:** use the **existing** staff experience (Step 13). Owners/managers add staff on the Staff page, staff sign in with an emailed link, and on tap they see the training view with the Training / Customer toggle. This PRD only **adds to** that view: common customer questions about the product (with counts) and an Ask box for staff (training, or helping in the middle of a sale). No new staff identity is needed. |
| D7 | **Questions tab** in the admin. It's its own nav item. Any product with at least one question appears automatically, with counts. Owners click a product to review its questions. |
| D8 | **Grouping:** automatic at two levels: product themes, rolling up into store-wide themes. Owners can rename, merge and split. Inside a product, the **default view is grouped summaries**, with a toggle to see questions **verbatim**. |
| D9 | **Regulated facts** (allergens, alcohol, supplements, health): the AI answers only from explicit store data and always adds "check the label." |
| D10 | **PII:** the chat never asks for personal details. Anything that looks like PII is removed **before saving**. The saved record keeps a placeholder (e.g. `[phone removed]`) and a `pii_redacted` flag. The customer is told when this happens, and the owner sees the flag. |

Round 2 (2026-10-02):

| # | Decision |
|---|---|
| D11 | **Every product can be asked about.** The LLM answers from all available data for the product. Owners, managers **and co-managers** can add their own answers to questions. **Answer priority:** a staff-authored answer always outranks product description / enrichment data when both exist (§6). |
| D12 | **Owner answers go into a hidden "answer pool,"** not onto the visible page. The pool feeds the LLM but is never shown as a list. The public page stays light: publicly visible info, plus a supporting pool of owner/manager answers behind it. Promoting an answer into the visible FAQ or the training Q&A is a deliberate manual action, never automatic. |
| D13 | **Training view placement:** "Customers are asking" goes directly under the one-line sell, and the staff Ask box is pinned at the bottom. |
| D14 | **The customer AI may use staff training notes,** but it must never sound like selling. No upsell or cross-sell phrasing, no "you should also get…", no revealing that the tool exists to drive bigger baskets. It uses the *facts* in training notes (fit, who it's for, alternatives) only when they answer the customer's question. Internal sales notes (e.g. `worth_the_price` as a pitch, margin, stock pressure) are never quoted or paraphrased as persuasion. See §6.1. |

Round 3 (2026-10-02):

| # | Decision |
|---|---|
| D15 | **First pilot:** none signed yet. Design for a **shoe / menswear boutique or specialty store**, so demo content and the quality test set use footwear and menswear products. (Note: Sarah sees these as more catalogue-driven than inspiration-driven, so fit, sizing, care and comparison questions will dominate. That suits a Q&A tool.) |
| D16 | **Cost:** the founder covers AI costs during a test period, so no tier gating yet. **Model:** the most value-oriented option. Customer and staff answers use **Claude Haiku 4.5** (`claude-haiku-4-5`, $1 / $5 per million input/output tokens), streamed, with the store/product context prompt-cached. Theme grouping runs as a background batch job. If Haiku fails the quality test set (§9.6 Q6), step up to Claude Sonnet 5.5 for the answer route only. |
| D17 | **Bottom of the screen:** the picks bar and the Ask bar both stay, as separate items that aren't merged (see §3.A "Bottom-bar layout"). |
| D18 | **Store policies:** owners and managers enter short free-text policies (returns, exchanges, alterations, price match, gift wrap) in admin **Settings**, and the AI cites them. |
| D19 | **Disclosure:** do the legal minimum (see §7.1). Final wording is subject to the legal review already in ACTION_ITEMS. |
| D20 | **Data ownership:** each store sees **only its own** question data. The founder (super admin) can see question data across all stores, to build cross-store products later (parent PRD §8). Stores aren't shown each other's data. This must be disclosed in the store Terms of Service. |
| D21 | **Key points:** a new problem-first field, **"Great when…"** (3 short bullets), written by owners, managers or co-managers, or drafted by the existing Brave-grounded AI tool and edited by them. When it's empty, the page shows the first 3 `reasons_to_buy`. |


Today, a tap tells us a customer was curious. It doesn't tell us *why*. And when a customer has a question, the only path is **Ask Us**, which sends them to a human over WhatsApp or SMS. That only works when someone is free to answer, and we capture nothing from it.

Advisor feedback (Sarah Young, 2026-10-01):
- **Keep the static page short:** a few key points and some inspiration, then *invite the customer to ask*.
- **Sell the problem, not the features.** Customers want to know "will this work for *my* situation?"
- **Retention won't come from training.** Associates need a tool they can ask whatever the customer just asked them.
- **Shelf-side data is the edge.** What customers ask before they buy is data nobody else collects.
- **Warning:** AI chat on product pages will soon be on every retailer's website. A chatbot isn't the differentiator. Being at the shelf, with in-store context and data from questions captured there, is.

## 2. Goals

1. **Customers** get a fast, trustworthy answer to their specific question at the shelf, with no app and no waiting for staff.
2. **Associates** get the same intelligence through a staff view, so any associate can answer like the best one.
3. **Every question is captured**, then grouped into themes and shown to owners and managers. They see what customers want to know, where content falls short, and what to train staff on.
4. **Common questions feed training**: "Common questions about this product," shown as soon as there's data, with a count of how many times each was asked.
5. **The question data strengthens §8 of the parent PRD**: a new "why they were curious" signal, governed like tap data.

### Non-goals (for this version)
- Not a general shopping chatbot. It's scoped to the tapped product, the store, and the store's catalog.
- No checkout or cart inside the chat (parent PRD §4.3: the tap page is not the storefront).
- No voice input or output (deferred; see Q4.6).
- No answering from the open web without grounding (see §6).

## 3. The three surfaces

The same engine drives three surfaces. Sarah's framing: one technology, three uses.

| Surface | Who | Where | Job |
|---|---|---|---|
| **A. Customer Ask** | Shopper | Tap page `tapshelf.store/p/<tag>` | Answer *my* question about *this* product, now |
| **B. Associate Assist** | Floor staff | Staff view (same tag, staff mode) | Answer the customer in front of me; have talking points ready |
| **C. Question Insights** | Owner / manager | Admin `tapshelf.co` | What are people asking? Where is our content weak? What should we train on? |

### 3.A Customer Ask (tap page)

**Flow:** tap → header carousel (photos, then video) → name/price → 3 key points → sticky **"Ask about this ✦"** bar → half-screen chat with 2–3 suggested questions → streamed answer grounded in the store's data → follow-ups. Customers can minimize the chat to the bar and reopen it. If the AI can't answer, the question is **submitted to the store** (D5).

**Bottom-bar layout (D17):** both bars stay on screen without competing.
- **Proposed:** the Ask bar is the full-width bottom bar. The picks bar becomes a small floating "Your picks (3)" pill that sits just above it, on the right, and only appears once the customer has reacted to something. Tapping the pill opens the picks tray, as it does today.
- When the chat is open (half sheet), the picks pill hides. Minimizing the chat brings it back.
- Alternatives, if the pill feels cramped: (b) stack two slim bars, with picks above Ask; (c) put picks in the page header next to the store logo.

**Draft behaviour:**
- Suggested-question chips: seeded from the product's FAQ and enrichment at first, then replaced by the most-asked real questions once there's data.
- Answers draw only on approved sources (§6). When the AI isn't confident, it doesn't guess. It says: "Thanks for asking. We don't have an answer to that one yet, but we've sent your question to {store}." The question is saved as `submitted`.
- The chat never asks for contact details or other personal information. If a customer types something that looks like PII, it's removed before saving, and the chat tells them: "We removed contact details from your message to keep it private." 
- Answers are short (2–4 sentences, sized for a phone) and written in the store's voice.
- Can point to other products in this store ("we also carry it in a wider fit") without becoming a cross-sell widget. See Q2.5.
- Works anonymously, keyed to the `session_id` cookie. A signed-in customer can see their past questions in `/me` (Q2.8).

### 3.B Associate Assist (inside the existing staff training view)

**Already built (Step 13):** owner/manager adds staff on `/staff` → staff get an emailed sign-in link → sign-in carries over to `tapshelf.store` (`nfc_staff` cookie) → tapping a tag from their store shows `StaffShell` (training view) by default, with `StaffViewToggle` to the customer view. Training content lives in `product_training` (one-line sell, who it's for, fit, worth the price, closest alternative, **common Q&A**, companions, brand context, stock note). Staff taps are excluded from customer analytics, and training progress is tracked in `staff_product_views`.

**What this PRD adds to the training view:**
1. **"Customers are asking"**: the top grouped question themes for this product, each with a count ("Sizing: runs small · 14"), and the approved answer. It appears as soon as there's one question, with the total shown ("3 questions so far").
2. **Ask box for staff:** the same AI engine, but it can also use `product_training` and `internal_staff_notes`. It's useful in quiet periods ("what's the difference between this and X?") and during a sale ("does this come in a wide fit?").
3. **Customer view toggle:** unchanged. It previews the customer page, including the new Ask bar. Questions asked in preview mode are not logged as customer questions.

**How customer questions feed training content:**
- `product_training.common_questions` (owner-written Q&A) stays the curated source. In the admin, a question theme can be **promoted** into it with one click, and the answer is pre-filled from the AI or owner answer.
- Staff questions are logged with `asked_by = staff` and the staff member's id. They're kept out of the customer counts but are visible to owners as a training signal ("staff keep asking about care instructions").
- A later idea, not in this scope: the planned weekly staff quizzes could draw from the most-asked customer questions.

### 3.C Question Insights (admin)

**Draft behaviour:**
- A new top-level **Questions** tab in the admin (D7).
- **Landing view:** a list of every product with at least one question, added automatically. Each row shows: product, total questions, new since the owner last reviewed, submitted (unanswered) count, top theme, and last asked. Rows with unreviewed or submitted questions sort first.
- **Product view** (click a product): grouped theme summaries by default, each with a count and the AI's typical answer. A **Verbatim** toggle shows each question as asked, with the AI's answer, date, asked-by (customer/staff), helpful rating, and the `PII removed` flag where it applies.
- **Submitted queue:** questions the AI couldn't answer. An owner, manager or co-manager writes an answer, which goes into the product's hidden **answer pool** (D12). The AI uses it from then on. Any theme (answered or not) can also get a staff-authored answer that overrides the AI's default.
- **Optional promotion:** "Show on product page" (adds it to the visible FAQ) and "Add to training Q&A" are explicit buttons, never automatic.
- **Themes view:** questions grouped into themes (e.g. "Sizing / runs small," "Gluten / allergens," "Occasion: wedding"), each with a count, trend, products affected, and how well the AI answered.
- **Per product:** a "Common questions about this product" panel on the enrichment editor, with counts. Each theme can be answered (into the answer pool), or explicitly promoted to the visible FAQ.
- **Content gaps:** the submitted queue plus low-confidence answers, sorted by frequency. This is the owner's to-do list.
- **Visibility:** each panel appears as soon as it has one question, with the count stated ("3 questions so far"). Grouping gets better with volume, so a small-sample notice appears below a threshold (Q5.4).
- Raw questions can be read and searched by owners and managers. Staff see grouped views only (Q5.6).

## 4. How this changes the existing experiences

| Existing feature | Proposed change | Open? |
|---|---|---|
| **Tap page structure** (parent §5.4) | Keep the header carousel (photos, then video slide). Below it: name/price, 3 key points, then **Ask** (sticky bar). Long-form fields (backstory, materials, care, sustainability) collapse behind "More details." | D3; Q2.2 |
| **Ask Us** (WhatsApp / SMS) | The AI no longer hands off to it (D5). Does the card stay anywhere? | Q0.4 |
| **FAQ accordion** (`enrichments.faq`) | Unchanged as a *visible* list, which stays owner-curated. It's also an AI source. The new hidden answer pool is separate, so answering questions doesn't grow the page. | D12 |
| **AI copy generation** (Step 5) | Prompts move toward problem-first framing ("what it solves, when to use it") per Sarah's advice. The same grounding (Brave) could add material facts for the AI. | Q6.3 |
| **Enrichment editor** | Adds a "Common questions" panel and a "turn into FAQ" action | — |
| **Analytics** | Adds question metrics: asks per tap, top themes, unanswered rate. A question becomes a stronger engagement signal than dwell. | Q5.2 |
| **Reactions / picks bar / offers** | Unchanged in this version. Possible trigger: an offer `after_question`. | Q2.9 |
| **NotifyMe** | An unanswered question can offer "Get notified when the store answers." | Q2.7 |
| **Customer accounts / `/me`** | Optional "My questions" history | Q2.8 |
| **Staff training view** (Step 13, built: `StaffShell`, `StaffViewToggle`) | Adds a "Customers are asking" section and a staff Ask box. Customer-view preview shows the Ask bar but doesn't log questions. | D6 |
| **Training notes** (`product_training.common_questions`) | Owners can promote a customer question theme into the curated training Q&A | Q0.9 |
| **Staff page / training progress** (Step 13f) | Possibly show staff Ask usage alongside "12 of 40 reviewed" | Q0.7 |
| **PicksBar** (fixed to the bottom) | Shares the bottom of the screen with the Ask bar, so the two need to be combined or stacked | Q4.9 (§9.4) |
| **Data intelligence** (parent §8) | New signal: question themes per product, brand and category, under the same governance. Cross-store theme reports would need opt-in. | Q7.x |
| **Pricing tiers** (parent §5.6 / §11.1) | AI answers have a per-call cost, so tier limits are needed | Q8.x |
| **Performance** (parent §6.2) | The page must still load in < 2 s. The Ask UI loads lazily, and the AI call never blocks first paint. | — |

## 5. Data (proposal; schema not final)

Principle: **questions are behavioural data, not identity.** Keep them PII-free like `tap_events`.

- `product_questions`
  - fields: `id`, `store_id`, `product_id`, `tag_id`, `session_id`, `asked_by` (`customer` | `staff`), `staff_id` (nullable), `question_text` (redacted), `pii_redacted` (bool), `answer_text`, `sources_used`, `confidence`, `status` (`answered` | `submitted` | `staff_answered`), `reviewed_at` (nullable), `helpful` (thumbs, nullable), `theme_id`, `created_at`
- `staff_id` references the existing `store_staff` table (migration 0017). No new identity tables are needed.
  - Optional `customer_id`, only when the customer is signed in and has opted in, mirroring how `customer_taps` is kept separate (Q7.2).
- `product_answers` (the hidden answer pool, D12): `id`, `store_id`, `product_id` (nullable for store-wide answers), `theme_id` (nullable), `question` (canonical wording), `answer`, `author_admin_id`, `author_role` (owner / manager / co_manager), `created_at`, `updated_at`, `retired_at`. It's never rendered as a list on the customer page.
- `question_themes`
  - fields: `id`, `store_id`, `label`, `kind` (fit, materials, allergen, occasion, care, price, availability, …), `product_id` nullable for store-wide themes, `question_count`, `last_asked_at`
- **Grouping job** (worker): assigns each new question to a theme, using embeddings or an LLM classifier against the store's existing themes, and creates a new theme when nothing fits. Admins can rename, merge or split themes (Q5.3).
- **PII redaction** before storage: strip emails, phone numbers and names typed into questions (Q7.1).
- **Retention:** same 24-month rule as raw tap events (parent §8)

## 6. Answer grounding & trust (proposal)

The AI answers only from these sources, **in priority order**. When two sources disagree, the higher one wins (D11):
1. **Answer pool:** answers written by an owner, manager or co-manager (`product_answers`), for this product and then store-wide
2. **Owner-written product content:** enrichment (incl. the visible FAQ) and `product_training` facts (D14)
3. **Imported product data:** title, description, variants, inventory
4. **Approved reviews:** cited as "customers say," never as fact
5. **Store policies** the owner enters, such as returns and alterations (new; Q6.2)

`internal_staff_notes` are used by the **staff** Ask box only.

**Using the existing AI research tool (founder's preference):** there won't be a seed list of real questions at launch, so the product data has to carry the answers. The existing Brave-grounded "Generate" tool (Step 5) already researches each product to fill enrichment fields. **Proposal:** extend it to also save a short **product fact sheet** (materials, fit, care, sizing, origin, certifications, with the source URL for each fact). The AI uses the fact sheet at priority 3, alongside imported data. It never searches the web while a customer waits, because that would be too slow and impossible to vet.

It never invents allergens, materials, certifications or medical claims. In regulated categories (food allergens, alcohol, supplements, cannabis) it defaults to "Check the label / ask staff" unless the fact is explicitly in the data (Q6.4). Each answer can show "Based on: product details · staff notes" so the customer knows where it came from.

### 6.1 Customer-facing tone (D14)
- **Answer the question that was asked.** Mention another product only when the customer's question calls for it ("is there a wider version?"), and phrase it as information, not a recommendation to buy more.
- **Never:** "you might also like," "complete the look," "add X," urgency or scarcity language, price anchoring, or any reference to staff notes, sales goals, margin or stock pressure.
- **Training-note fields are facts, not scripts.** `who_its_for`, `fit_and_sizing` and `closest_alternative` can inform an answer. `worth_the_price` and `companion_products` are used only when the customer asks about value or pairings directly, and are restated neutrally.
- **Eval:** the answer-quality test set (Q6.6) includes "upsell-bait" questions. An answer fails if it pushes an additional purchase.

## 7. Constraints

- **Tap-page performance stays at < 2 s on 4G.** Ask is lazy-loaded. Answers stream in, and the first token should arrive within about 1.5 s (Q4.4).
- **No PII in `tap_events`.** Questions go in their own table, are redacted, and are keyed by `session_id`.
- **Edge runtime:** any middleware involved uses Web Crypto only. The AI call runs in a Node route handler or server action, not in middleware.
- **Abuse:** per-session and per-store rate limits, prompt-injection hardening, and moderation for off-topic or abusive input (Q4.5)
- **Cost:** model choice and caching must keep the per-question cost well under 1¢ on average (Q8.2)
- **PIPEDA:** the privacy policy must cover the storage of free-text questions. This adds to the existing legal-review item.

### 7.1 Legal minimum for the chat (not legal advice: confirm in the PIPEDA review)
What the law seems to require, and what we'll do:
- **PIPEDA (openness + consent):** questions are saved, and could contain personal details. Because we strip PII before saving and key questions to an anonymous session, the obligation is mainly *openness*: say that questions are saved and why, and link to the privacy policy. **We'll show one line under the input:** "Answers are AI-generated. Questions are saved anonymously to help {store} improve. Privacy" (with "Privacy" as a link).
- **Don't pretend to be human.** No federal AI-disclosure law is in force in Canada, but presenting a bot as a person risks a misleading-representation complaint under the Competition Act. Saying "AI-generated" covers this. No persona names, no "I'm Sarah from the store."
- **Quebec (Law 25):** if Quebec shoppers use it, the privacy policy must describe the use of the technology. That's covered by the privacy policy update. We make no automated decisions about individuals, so the extra Law 25 notice rules shouldn't apply.
- **Privacy policy and store ToS updates:** cover saved questions, PII stripping, retention, and the founder's cross-store access (D20).
- **Not needed:** a consent checkbox, a pop-up, or an age gate. We don't collect identity, and the tool isn't aimed at children.

## 8. Success metrics (draft)

| Metric | Draft target |
|---|---|
| Ask rate | > 15% of tap sessions ask at least one question |
| Answered without handoff | > 80% |
| Helpful (thumbs-up share of rated answers) | > 85% |
| Content gaps closed | Owners act on > 50% of the top-10 unanswered themes within 30 days |
| Staff usage | > 50% of active stores have staff using Assist weekly |
| Conversion | Sessions with a question convert higher than tap-only sessions (needs orders sync, parent §7 Step 8) |

---

## 9. Open questions (work through these before building)

Each question has a **proposed default** so you can answer "agree," or override it. Questions marked ★ block the first build slice.

### 9.0 Round 2: new questions raised by the round 1 answers (★ = blocks build)
1. ✅ *Resolved: the staff experience already exists (Step 13).* ~~**Staff accounts.**~~
2. ✅ *Resolved, D11: owner, manager and co-manager can all view and answer.* ~~**Who can see the Questions tab?**~~
3. 🟡 *Mostly resolved, D12: answers go into the hidden answer pool.* Still open: **notify a signed-in customer when their submitted question is answered?** Proposed: yes, via their NotifyMe channel. Anonymous customers can't be reached.
4. **Does the Ask Us card (WhatsApp/SMS) stay anywhere?** Options: (a) remove it, (b) keep it under "More details," (c) offer it inside the chat as "Prefer to message the store?" Proposed: (c), but only if the store has numbers set.
5. **Reviewed state:** does "review the questions" mean an explicit *Mark reviewed* per product (which clears the "new" badge), or does opening the product count as reviewed? Proposed: opening the product clears "new," and submitted questions stay flagged until they're answered or dismissed.
6. ✅ *Resolved, D13.*
7. **Staff questions in the owner view:** shown alongside customer questions with a "Staff" label (proposed), or in a separate tab? Should owners see *which* staff member asked? (They already see per-person training progress, so naming them is consistent.)
9. ✅ *Resolved, D12: manual only.*
10. ✅ *Resolved, D14: yes, with the tone rules in §6.1.*
8. **PII notice wording:** shown to the customer in the chat, and as a flag on the owner's verbatim view. Is a plain "contact details removed" enough, or should we name the type ("phone number removed")? Proposed: name the type.


1. ✅ *Resolved, D1.* ~~**Which surface ships first?**~~ Proposed: **C-lite + A**. Customer Ask captures questions, and owners get a minimal Questions page. Associate Assist (B) follows, because it depends on staff identity, which doesn't exist yet.
2. ✅ *Resolved, D2: full build.* ~~**Is this V1 (pre-launch) or post-launch?**~~ It competes with the open V1 gaps: dwell capture, orders sync, Web NFC mapping, onboarding. Proposed: build a thin slice for *demos* now, because it's the strongest pitch hook. Harden it after the first pilots.
3. ✅ *Resolved, D15.*
4. **Is this a TapShelf feature or a product line?** Sarah framed it as "shelf-side data" sold three ways. Does it get its own name and pricing, or is it just part of the tiers?

### 9.2 Customer Ask: functionality
1. ✅ *Resolved, D3.* ~~**How short is the static page?**~~ Proposed: hero, 3 key points, 1 video, Ask, with "More details" collapsed. Do we keep reviews above the fold?
2. ✅ *Resolved, D21.*
3. **One question or a conversation?** Proposed: a short conversation, capped at about 5 turns per product per session.
4. **Should suggested-question chips show counts** ("12 people asked this")? That's social proof, but it could look empty early on.
5. ✅ *Resolved, D14 / §6.1: only when the question calls for it, phrased as information.*
6. ✅ *Resolved, D5.* ~~**Human handoff:**~~ when the AI can't answer, what do we offer? WhatsApp or SMS (existing), "find an associate" (no tech needed), or both? Should the handoff message include the customer's question and the AI's attempt?
7. ➡️ *Merged into Q0.3.*
8. **Should signed-in customers see a "My questions" history in `/me`?**
9. **Should a question trigger offers** (new `after_question` trigger)? Proposed: not in this version.
10. **Languages:** answer in the language the question was asked in? Proposed: yes, since the cost is low and it helps in Toronto.
11. **Stock questions** ("do you have a 9?"): answer from live per-location inventory? Proposed: yes, for this store's location only.

### 9.3 Associate Assist: functionality
1. ✅ *Resolved by Step 13.* ~~**Staff identity**~~: approved emails, emailed sign-in link, handoff to the tap page.
2. ✅ *Resolved by Step 13.* ~~**Same tag or a staff app?**~~ Same tag; a signed-in staff member sees the training view by default.
3. **What can the staff Ask box use that the customer one can't?** Proposed: `product_training`, `internal_staff_notes`, and the raw recent questions for this product. Cross-location stock stays deferred (see staff-experience.md, "Live store data").
4. ✅ *Proposed in §3.B.* ~~**Are staff questions logged?**~~ Yes, `asked_by = staff`, and kept out of the customer counts.
5. ✅ *Resolved by Step 13 (browse by tapping; the staff home page lists what's left). Quizzes are planned separately.* ~~**Training mode format.**~~
6. ✅ *Resolved, D11/D12: a staff-authored answer in the answer pool is the pinned answer and always wins.*

### 9.4 Customer Ask: UI
1. ✅ *Resolved, D4.* ~~**Where does Ask live on the page?**~~
   - (a) an inline section after the key points
   - (b) a sticky bottom bar ("Ask about this ✦") that opens a sheet
   - (c) both

   Proposed: (b), since it stays reachable and matches the picks-bar pattern. Watch for conflicts with the PicksBar, which is already fixed to the bottom.
2. **What does the chat look like?** A full-screen sheet, a half sheet, or inline expansion? Proposed: a half sheet that expands, so the product image stays visible.
3. **Branding:** does it inherit the store theme fully, and does it carry any TapShelf mark? (Parent §4.1: the page must feel like the store's.)
4. **Latency UX:** stream the answer token by token, or show a typing indicator and then the full answer? Proposed: stream.
5. **Abuse and off-topic:** what does the customer see? Proposed: a polite redirect to product questions, with no lecture.
6. **Voice input** (the phone keyboard mic already works): add a dedicated mic button? Proposed: no, rely on the keyboard mic.
7. **Should "Based on:" source chips be visible by default** or behind a tap?
8. **Feedback control:** thumbs up/down on every answer, or only after the last one?
9. 🟡 *D17: keep both bars.* Confirm the proposed layout in §3.A.

### 9.5 Question Insights (admin): functionality & UI
1. ✅ *Resolved, D7.* ~~**Where does it go in the nav?**~~ A top-level "Questions" item, or a tab in Analytics? Proposed: top-level. It's an action list, not just a chart.
2. **What goes on the dashboard home?** Proposed: a "Customers asked 38 questions this week · top theme: Sizing" card.
3. ✅ *Resolved, D8.* ~~**Grouping:**~~ fully automatic, or owner-curated? Proposed: automatic, with rename, merge and split. How fine-grained? One theme per product ("Does the Weekend Boot run small?") or across products ("Sizing")? Proposed: both levels. Product-level questions roll up into store-level themes.
4. **Visibility rule:** show from the first question with a count (your stated preference). Do we also show a "low data" badge below N questions? Proposed: a badge under 10.
5. **Should we send a weekly email digest** to owners ("Top 5 new questions")? Proposed: yes. It's cheap and drives the 7-day retention metric.
6. ✅ *Resolved, D11: owners, managers and co-managers. Staff see grouped themes and approved answers.*
7. ✅ *Resolved, D12: the hidden answer pool.*
8. ✅ *Resolved: manager and co-manager roles exist (Step 14, PR #12).*
9. **Export:** CSV export of questions for owners? Proposed: yes, PII-redacted.

### 9.6 Grounding, content & quality
1. **May the AI use general product knowledge** (e.g. what "merino" is), or only store data? Proposed: general knowledge for definitions only, never for product-specific claims.
2. ✅ *Resolved, D18.*
3. **Should AI copy prompts move to problem-first framing now**, independent of the chat?
4. ✅ *Resolved, D9.* ~~**Regulated categories:**~~ for allergens, alcohol, supplements, cannabis and health claims, do we refuse unless the fact is explicitly in the data? Proposed: yes, and always add "check the label."
5. **Brand or vendor content:** Sarah suggested "if you can bring it over, bring it over." Do we ingest the brand's own product pages or Q&A? Who approves that?
6. **How do we measure answer quality** before launch? Proposed: a seed set of 50 real-world questions per demo vertical, with checked answers, as an eval.

### 9.7 Privacy & data
1. ✅ *Resolved, D10.* ~~**PII redaction:**~~ redact before storage (proposed), or store raw and redact on read?
2. **Link questions to signed-in customers?** Proposed: only with opt-in, in a separate table, never in `product_questions`.
3. ✅ *Resolved, D20.*
4. **Retention** for question text: 24 months like taps, or shorter?
5. ✅ *Resolved, D19 / §7.1.*

### 9.8 Business & cost
1. 🟡 *Deferred, D16: no gating during the founder-funded test period.*
2. ✅ *Resolved, D16.*
3. **Does this change the pricing story?** "Cheaper than a part-time associate" becomes stronger with Assist. Does it change the price points in parent §5.6?
4. **Is Changeroom** (Sarah's multi-brand marketplace, 2027) a design partner for this? If so, brand-level questions across many stores become important earlier.

---

## 10. Next steps
1. Work through §9 together, starting with the ★ items.
2. Turn the answers into the final spec (§3–§8) and low-fi wireframes for: the tap-page Ask sheet, staff mode, and the admin Questions page.
3. Split the work into build steps and add them to PRD-v4 §7, where the build plan lives.
