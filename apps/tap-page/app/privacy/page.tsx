// The privacy page linked from the chat's disclosure line and the sign-in form
// (docs/PRD-ai-assistant.md §7.1, D19). Plain language, written to match what
// the code collects. Draft until the legal review in ACTION_ITEMS.md; update
// "Last updated" whenever it changes.
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy · TapShelf" };

const CONTACT = "hello@tapshelf.co";
const UPDATED = "5 October 2026";

const h2: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 600, color: "#111", margin: "2rem 0 0.5rem" };
const p: React.CSSProperties = { margin: "0 0 0.75rem" };
const ul: React.CSSProperties = { margin: "0 0 0.75rem", paddingLeft: "1.25rem", listStyle: "disc", display: "grid", gap: "0.4rem" };

export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT}`} style={{ color: "#111", textDecoration: "underline" }}>{CONTACT}</a>;
  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem", fontSize: "0.95rem", lineHeight: 1.6, color: "#333" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111", margin: "0 0 0.25rem" }}>Privacy</h1>
      <p style={{ ...p, fontSize: "0.85rem", color: "#888" }}>Last updated {UPDATED}</p>

      <p style={p}>
        TapShelf runs the product pages that open when you tap a tag on a store shelf. This page explains what we
        collect, why, who sees it, and your choices. Questions? Email {mail}.
      </p>

      <h2 style={h2}>When you tap a product</h2>
      <ul style={ul}>
        <li>We set a cookie called <code>nfc_session</code> that holds a random ID. It doesn&apos;t contain your name or contact details. It lets us count taps and remember your reactions and chat during your visit. It lasts up to a year.</li>
        <li>We record which product was tapped, when, and the kind of device (phone or tablet). We don&apos;t store your IP address or your location.</li>
        <li>If you react to a product (loved, liked or passed), we save that against the same random ID.</li>
      </ul>

      <h2 style={h2}>When you ask a question</h2>
      <ul style={ul}>
        <li>Answers are written by AI (Claude, made by Anthropic) from the store&apos;s product information. They can be wrong, so check the label or ask an associate for anything important.</li>
        <li>Before your question is saved or sent to the AI, we remove anything that looks like an email address, phone number or card number. Please don&apos;t type other personal details.</li>
        <li>We save your question and the answer with the random ID, not your name. The store sees the questions asked about its products, grouped by topic, so it can improve its information and train its staff.</li>
        <li>Anthropic processes your question to write the answer. Under its commercial terms, it doesn&apos;t use it to train its models.</li>
      </ul>

      <h2 style={h2}>If you sign in</h2>
      <ul style={ul}>
        <li>You sign in with your email address. We email you a one-time link; there&apos;s no password.</li>
        <li>We keep your email address, plus a display name, phone number and preferred contact method if you add them, the products you&apos;ve tapped, and your reactions. A cookie called <code>nfc_customer</code> keeps you signed in for up to a year.</li>
        <li>If you ask to hear about a sale, restock or offer, we save that request and the contact details to use. The store can then send you those alerts by email, text message or WhatsApp. You can change these settings on your profile page at any time.</li>
      </ul>

      <h2 style={h2}>Who sees your information</h2>
      <ul style={ul}>
        <li><strong>The store</strong> sees taps, reactions, questions and alert sign-ups for its own products. Stores can&apos;t see each other&apos;s data.</li>
        <li><strong>TapShelf</strong> can see data across all stores, to run the service and improve it.</li>
        <li><strong>Brands</strong> may see totals, such as how many times their products were tapped in a week across stores that agree to share. Never individual taps, questions or contact details.</li>
        <li>We don&apos;t sell personal information, and we don&apos;t use advertising trackers or third-party analytics on these pages.</li>
      </ul>

      <h2 style={h2}>Services we use</h2>
      <ul style={ul}>
        <li><strong>Railway</strong> hosts our servers and database.</li>
        <li><strong>Anthropic</strong> writes the chat answers.</li>
        <li><strong>Resend</strong> sends sign-in links and email alerts.</li>
        <li><strong>Twilio</strong> sends text message and WhatsApp alerts.</li>
      </ul>
      <p style={p}>Some of these companies are in the United States, so your information may be stored or processed outside Canada.</p>

      <h2 style={h2}>How long we keep it</h2>
      <p style={p}>
        Taps, reactions and questions are kept for up to 24 months. Account details are kept until you ask us to
        delete them.
      </p>

      <h2 style={h2}>Your choices</h2>
      <ul style={ul}>
        <li>Change or turn off alerts on your profile page.</li>
        <li>Clear your browser&apos;s cookies to get a new random ID.</li>
        <li>Email {mail} to see the information we hold about you, correct it, or have it deleted.</li>
        <li>If you&apos;re not happy with our answer, you can complain to the Office of the Privacy Commissioner of Canada.</li>
      </ul>

      <h2 style={h2}>Changes</h2>
      <p style={p}>If we change how we handle your information, we&apos;ll update this page and the date at the top.</p>

      <p style={{ marginTop: "2.5rem" }}>
        <Link href="/me" style={{ fontSize: "0.85rem", color: "#666" }}>← Back</Link>
      </p>
    </main>
  );
}
