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
| D5 | **No answer available:** the AI replies "Thanks for asking. We don't have an answer to that one yet, but we've shared your question with {store}." The question is flagged **Unanswered**. The LLM still answers everything it can; *Unanswered* only marks the few questions where there's no reliable data to answer from. Owners and managers review **all** questions; the Unanswered ones are where adding an answer to the pool helps most. The AI doesn't hand off to WhatsApp/SMS. |
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

Round 4 (2026-10-05):

| # | Decision |
|---|---|
| D22 | **Conversation cap:** up to **10 questions per product per visit**. |
| D23 | **Suggested-question chips** don't show "N people asked this" until a question has been asked 10+ times. |
| D24 | **Language:** answer in the language the customer asks in. |
| D25 | **Stock and size-availability questions** are saved and grouped like any other question (useful demand data), but **not answered** at launch. Most target stores aren't on Shopify, so live stock can't be a dependency. Fixed reply: "I can help you learn more about this product. An associate can help you find the right size." |
| D26 | **No messaging the store** (WhatsApp/SMS) from the chat for now. |
| D27 | **No offers** triggered by questions. |
| D28 | **Chat look:** a half sheet that can expand, with the product image still visible; fully in the store's theme with no TapShelf mark (the only extra element is the AI disclosure line); answers stream in word by word; off-topic messages get one polite line steering back to the product; no separate mic button. |
| D29 | **Sources** sit behind a small "Sources" tap. Labels include "Product details," "Store answer," "Product research" (the AI research tool's fact sheet), "Reviews" and "Store policy." |
| D30 | **PII notice names the type** ("phone number removed"), both to the customer and on the owner's verbatim view. |
| D31 | **Staff Ask** can also use training notes, internal notes, and recent customer questions for that product. Staff questions appear in the owner's Questions tab with a "Staff" label and the staff member's name. |
| D32 | **No "low data" badge, and no CSV export.** |
| D33 | **Quality test set:** about **100 questions**, mostly shoes and menswear, with some womenswear and home furnishings. It includes questions that invite an upsell; an answer fails if it pushes another purchase. The founder checks the expected answers once. |
| D34 | **Linking questions to signed-in customers:** only in a separate table, if a feature ever needs it. **Retention:** 24 months, the same as taps. |
| D35 | **Positioning:** this is part of TapShelf, and may become its central value. It is not a separate product. **Pricing** is parked until after the test period. |
| D36 | **Build order:** the AI assistant comes before weekly staff quizzes. |
| D37 | **Bottom of the screen: option A.** The Ask bar spans the full width at the bottom. "Your picks (N)" is a small floating pill just above it on the right. The pill appears only after the customer reacts to something and hides while the chat is open. |

Round 5 (2026-10-05):

| # | Decision |
|---|---|
| D38 | **Owner answers apply going forward only.** When owners, managers or co-managers answer an Unanswered question, the answer goes into the answer pool for *future* questions. The customer who asked is never contacted later: no notification and no "My questions" history. They've usually left the store by then. |
| D39 | **Thumbs up/down: parked.** Owner and manager review covers answer quality for now. |
| D40 | **Weekly owner email and a dashboard card are in scope.** They're built as the last step of this phase, before staff quizzes, on the existing Resend setup (`@nfc/email`). Contents are to be defined (§9.9). |
| D41 | **Claims need a source.** Product-specific facts must come from a source in §6: the answer pool, owner content, product data, the research fact sheet, or reviews (phrased as "customers say"). The model's own unsourced knowledge is used only to explain terms. |
| D42 | **Brand/vendor pages are the most trusted research source.** The AI research tool must be updated to do this (§6.2); that's a build step. |
| D43 | **Weekly owner email moves out of this phase** (supersedes the email part of D40). It's a broader piece of work that needs its own design, so it'll be scoped after this feature ships, still ahead of staff quizzes. |
| D44 | **The dashboard card goes on the admin home page**, which should put tap activity and customer questions front and centre. |


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

**Flow:** tap → header carousel (photos, then video) → name/price → 3 key points → sticky **"Ask about this ✦"** bar → half-screen chat with 2–3 suggested questions → streamed answer grounded in the store's data → follow-ups. Customers can minimize the chat to the bar and reopen it. If there's no reliable data to answer from, the question is flagged **Unanswered** for the store (D5).

**Bottom-bar layout (D17, D37):** both bars stay on screen without competing.
- **Chosen (option A):** the Ask bar is the full-width bottom bar. The picks bar becomes a small floating "Your picks (3)" pill that sits just above it, on the right, and only appears once the customer has reacted to something. Tapping the pill opens the picks tray, as it does today.
- When the chat is open (half sheet), the picks pill hides. Minimizing the chat brings it back.
- Options considered and not chosen: (b) two stacked bars; (c) picks in the page header.

**Draft behaviour:**
- Suggested-question chips: seeded from the product's FAQ and enrichment at first, then replaced by the most-asked real questions once there's data.
- Answers draw only on approved sources (§6). When the AI isn't confident, it doesn't guess. It says: "Thanks for asking. We don't have an answer to that one yet, but we've shared your question with {store}." The question is saved as `unanswered`.
- **Stock and size-availability questions** ("do you have a 9?") get a fixed reply and are saved as a "Stock / sizing availability" theme (D25).
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
- **Landing view:** a list of every product with at least one question, added automatically. Each row shows: product, total questions, new since the owner last reviewed, Unanswered count, top theme, and last asked. Rows with new or Unanswered questions sort first.
- **Product view** (click a product): grouped theme summaries by default, each with a count and the AI's typical answer. A **Verbatim** toggle shows each question as asked, with the AI's answer, date, asked-by (customer/staff), helpful rating, and the `PII removed` flag where it applies.
- **Unanswered filter:** questions the AI had no reliable data for. An owner, manager or co-manager writes an answer, which goes into the product's hidden **answer pool** (D12). The AI uses it from then on. Any theme (answered or not) can also get a staff-authored answer that overrides the AI's default.
- **Optional promotion:** "Show on product page" (adds it to the visible FAQ) and "Add to training Q&A" are explicit buttons, never automatic.
- **Themes view:** questions grouped into themes (e.g. "Sizing / runs small," "Gluten / allergens," "Occasion: wedding"), each with a count, trend, products affected, and how well the AI answered.
- **Per product:** a "Common questions about this product" panel on the enrichment editor, with counts. Each theme can be answered (into the answer pool), or explicitly promoted to the visible FAQ.
- **Content gaps:** Unanswered questions plus low-confidence answers, sorted by frequency. This is the owner's to-do list.
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
  - fields: `id`, `store_id`, `product_id`, `tag_id`, `session_id`, `asked_by` (`customer` | `staff`), `staff_id` (nullable), `question_text` (redacted), `pii_redacted` (bool), `answer_text`, `sources_used`, `confidence`, `status` (`answered` | `unanswered` | `staff_answered`), `reviewed_at` (nullable), `helpful` (thumbs, nullable; parked, §9.9), `theme_id`, `created_at`
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
3. **Imported product data and research:** title, description and variants (from Shopify, CSV or manual entry), plus the AI research tool's **fact sheet**. The brand's or vendor's own product page is the preferred source. Stock levels aren't used at launch (D25).
4. **Approved reviews:** cited as "customers say," never as fact
5. **Store policies** the owner enters, such as returns and alterations (new; Q6.2)

`internal_staff_notes` are used by the **staff** Ask box only.

**Claims vs. definitions (D41):** the AI may state product-specific facts only when one of the sources above supports them; reviews are phrased as "customers say." It may use its own general knowledge, with no source, only to explain terms (what "Goodyear welt" or "merino" means), never to describe this product.

**Using the existing AI research tool (founder's preference):** there won't be a seed list of real questions at launch, so the product data has to carry the answers. The existing Brave-grounded "Generate" tool (Step 5) already researches each product to fill enrichment fields. **Proposal:** extend it to also save a short **product fact sheet** (materials, fit, care, sizing, origin, certifications, with the source URL for each fact). The AI uses the fact sheet at priority 3, alongside imported data. It never searches the web while a customer waits, because that would be too slow and impossible to vet.

It never invents allergens, materials, certifications or medical claims. In regulated categories (food allergens, alcohol, supplements, cannabis) it defaults to "Check the label / ask staff" unless the fact is explicitly in the data (Q6.4). Each answer can show "Based on: product details · staff notes" so the customer knows where it came from.

### 6.2 Research tool changes (D42)
Today the Generate action (`apps/admin/app/enrichment/[product_id]/actions.ts`) runs one Brave query, `"{vendor} {title} materials features review"`. It passes the top 6 result *snippets* (title + description) to the copy prompt, then **discards** them: no URLs and no facts are saved, and no source is preferred. To build the fact sheet:
1. **Find the brand's site:** use `brands.website` when set (the column exists, mostly empty); otherwise run a `"{vendor} official site"` search and keep the top result's domain. The owner can correct the domain.
2. **Search the brand's site first** (`site:{domain} {title}`), then the general web. Rank brand/vendor results above retailers, then reviews.
3. **Read the page, not just the snippet:** fetch the top brand result's page text for materials, care, fit and sizing.
4. **Save a fact sheet per product:** each fact keeps its source URL and a type (brand / retailer / review). Owners and managers can see and edit it in the product editor. Regenerating replaces only facts the owner hasn't edited.
5. **Copy drafting** keeps working as today, now reading from the saved fact sheet.

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
3. ✅ *Resolved, D38: no.*
4. ✅ *Resolved, D26.*
5. ✅ *Resolved: opening a product clears its "new" badge; Unanswered questions stay flagged until an owner/manager answers or dismisses them.*
6. ✅ *Resolved, D13.*
7. ✅ *Resolved, D31.*
9. ✅ *Resolved, D12: manual only.*
10. ✅ *Resolved, D14: yes, with the tone rules in §6.1.*
8. ✅ *Resolved, D30.*


1. ✅ *Resolved, D1.* ~~**Which surface ships first?**~~ Proposed: **C-lite + A**. Customer Ask captures questions, and owners get a minimal Questions page. Associate Assist (B) follows, because it depends on staff identity, which doesn't exist yet.
2. ✅ *Resolved, D2: full build.* ~~**Is this V1 (pre-launch) or post-launch?**~~ It competes with the open V1 gaps: dwell capture, orders sync, Web NFC mapping, onboarding. Proposed: build a thin slice for *demos* now, because it's the strongest pitch hook. Harden it after the first pilots.
3. ✅ *Resolved, D15.*
4. ✅ *Resolved, D35.*

### 9.2 Customer Ask: functionality
1. ✅ *Resolved, D3.* ~~**How short is the static page?**~~ Proposed: hero, 3 key points, 1 video, Ask, with "More details" collapsed. Do we keep reviews above the fold?
2. ✅ *Resolved, D21.*
3. ✅ *Resolved, D22.*
4. ✅ *Resolved, D23.*
5. ✅ *Resolved, D14 / §6.1: only when the question calls for it, phrased as information.*
6. ✅ *Resolved, D5.* ~~**Human handoff:**~~ when the AI can't answer, what do we offer? WhatsApp or SMS (existing), "find an associate" (no tech needed), or both? Should the handoff message include the customer's question and the AI's attempt?
7. ➡️ *Merged into Q0.3.*
8. ✅ *Resolved, D38: dropped.*
9. ✅ *Resolved, D27.*
10. ✅ *Resolved, D24.*
11. ✅ *Resolved, D25.*

### 9.3 Associate Assist: functionality
1. ✅ *Resolved by Step 13.* ~~**Staff identity**~~: approved emails, emailed sign-in link, handoff to the tap page.
2. ✅ *Resolved by Step 13.* ~~**Same tag or a staff app?**~~ Same tag; a signed-in staff member sees the training view by default.
3. ✅ *Resolved, D31.*
4. ✅ *Proposed in §3.B.* ~~**Are staff questions logged?**~~ Yes, `asked_by = staff`, and kept out of the customer counts.
5. ✅ *Resolved by Step 13 (browse by tapping; the staff home page lists what's left). Quizzes are planned separately.* ~~**Training mode format.**~~
6. ✅ *Resolved, D11/D12: a staff-authored answer in the answer pool is the pinned answer and always wins.*

### 9.4 Customer Ask: UI
1. ✅ *Resolved, D4.* ~~**Where does Ask live on the page?**~~
   - (a) an inline section after the key points
   - (b) a sticky bottom bar ("Ask about this ✦") that opens a sheet
   - (c) both

   Proposed: (b), since it stays reachable and matches the picks-bar pattern. Watch for conflicts with the PicksBar, which is already fixed to the bottom.
2. ✅ *Resolved, D28.*
3. ✅ *Resolved, D28.*
4. ✅ *Resolved, D28.*
5. ✅ *Resolved, D28.*
6. ✅ *Resolved, D28.*
7. ✅ *Resolved, D29.*
8. ⏸ *Parked (§9.9): thumbs up/down.*
9. ✅ *Resolved, D37: option A.*

### 9.5 Question Insights (admin): functionality & UI
1. ✅ *Resolved, D7.* ~~**Where does it go in the nav?**~~ A top-level "Questions" item, or a tab in Analytics? Proposed: top-level. It's an action list, not just a chart.
2. ✅ *In scope, D40; contents in §9.9.*
3. ✅ *Resolved, D8.* ~~**Grouping:**~~ fully automatic, or owner-curated? Proposed: automatic, with rename, merge and split. How fine-grained? One theme per product ("Does the Weekend Boot run small?") or across products ("Sizing")? Proposed: both levels. Product-level questions roll up into store-level themes.
4. ✅ *Resolved, D32: no badge.*
5. ✅ *In scope, D40; contents in §9.9.*
6. ✅ *Resolved, D11: owners, managers and co-managers. Staff see grouped themes and approved answers.*
7. ✅ *Resolved, D12: the hidden answer pool.*
8. ✅ *Resolved: manager and co-manager roles exist (Step 14, PR #12).*
9. ✅ *Resolved, D32: no export.*

### 9.6 Grounding, content & quality
1. ✅ *Resolved, D41.*
2. ✅ *Resolved, D18.*
3. ⏸ *Parked (§9.9): problem-first framing for AI copy.*
4. ✅ *Resolved, D9.* ~~**Regulated categories:**~~ for allergens, alcohol, supplements, cannabis and health claims, do we refuse unless the fact is explicitly in the data? Proposed: yes, and always add "check the label."
5. ✅ *Resolved, D42 (§6.2).*
6. ✅ *Resolved, D33.*

### 9.7 Privacy & data
1. ✅ *Resolved, D10.* ~~**PII redaction:**~~ redact before storage (proposed), or store raw and redact on read?
2. ✅ *Resolved, D34.*
3. ✅ *Resolved, D20.*
4. ✅ *Resolved, D34.*
5. ✅ *Resolved, D19 / §7.1.*

### 9.8 Business & cost
1. ⏸ *Parked, D35: pricing after the test period.*
2. ✅ *Resolved, D16.*
3. ⏸ *Parked, D35.*

### 9.9 Still to discuss before build
1. **Admin home page (D44):** today `/` is a placeholder list of links, and nobody lands on it: owners go to Tags after sign-in, managers to Tags, co-managers to Content. Should `/` become a real home page (taps + questions at a glance) and the default landing page after sign-in for all three roles?
2. **Thumbs up/down** (D39): parked.
3. **Problem-first framing for the existing AI copy prompt** (Q6.3): parked.
4. The founder's own questions, still to be raised.

---

## 10. Next steps
1. Work through §9 together, starting with the ★ items.
2. Turn the answers into the final spec (§3–§8) and low-fi wireframes for: the tap-page Ask sheet, staff mode, and the admin Questions page.
3. Split the work into build steps and add them to PRD-v4 §7, where the build plan lives.
