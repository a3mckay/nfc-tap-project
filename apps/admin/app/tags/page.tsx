import Link from "next/link";
import { getPool, getStoreByDomain, getTagsByStore } from "@nfc/db";
import { ProvisionForm } from "./ProvisionForm.js";
import { formatTagUuid, tagStatusLabel, tagTapUrl } from "../../src/tag-utils.js";
import type { TagStatus } from "@nfc/db";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

const STATUS_BADGE: Record<TagStatus, { color: string; bg: string }> = {
  unassigned: { color: "#92400e", bg: "#fef3c7" },
  active:     { color: "#166534", bg: "#dcfce7" },
  disabled:   { color: "#6b7280", bg: "#f3f4f6" },
  oos:        { color: "#c00",    bg: "#fff0f0" },
};

function Badge({ status }: { status: TagStatus }) {
  const { color, bg } = STATUS_BADGE[status] ?? STATUS_BADGE.unassigned;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 600, color, background: bg }}>
      {tagStatusLabel(status)}
    </span>
  );
}

export default async function TagsPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Tag Management</h1>
        <p style={{ color: "#666" }}>
          Pass <code>?shop=your-store.myshopify.com</code> to manage a store&apos;s NFC tags.
        </p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Tag Management</h1>
        <p style={{ color: "#c00" }}>Store not found — connect it via Shopify OAuth first.</p>
      </main>
    );
  }

  const tags = await getTagsByStore(pool, store.id);
  const tapBase = `${process.env.TAP_PAGE_CDN_URL ?? "http://localhost:3001"}/p/`;

  const counts = {
    total: tags.length,
    active: tags.filter((t) => t.status === "active").length,
    unassigned: tags.filter((t) => t.status === "unassigned").length,
  };

  return (
    <main>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Tag Management</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        {shop} &mdash; {counts.total} tag{counts.total !== 1 ? "s" : ""},{" "}
        {counts.active} active, {counts.unassigned} unassigned
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <ProvisionForm shop={shop} />
        {tags.length > 0 && (
          <a
            href={`/tags/export?shop=${shop}`}
            download
            style={{ fontSize: "0.82rem", color: "#555", textDecoration: "none", border: "1px solid #ddd", borderRadius: "4px", padding: "0.35rem 0.75rem" }}
          >
            Export CSV ↓
          </a>
        )}
      </div>

      {tags.length === 0 ? (
        <p style={{ color: "#999", fontSize: "0.9rem" }}>
          No tags yet. Use the form above to provision your first batch.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
              <th style={{ padding: "0.5rem 0.75rem 0.5rem 0", fontWeight: 600 }}>Tag UUID</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Product</th>
              <th style={{ padding: "0.5rem 0", fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "0.55rem 0.75rem 0.55rem 0", fontFamily: "monospace", fontSize: "0.78rem", color: "#555" }}>
                  <a
                    href={tagTapUrl(tapBase, tag.tag_uuid)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#555", textDecoration: "none" }}
                    title="Open tap page"
                  >
                    {formatTagUuid(tag.tag_uuid)}
                  </a>
                </td>
                <td style={{ padding: "0.55rem 0.75rem" }}>
                  <Badge status={tag.status as TagStatus} />
                </td>
                <td style={{ padding: "0.55rem 0.75rem", color: tag.product_title ? "#111" : "#bbb" }}>
                  {tag.product_title ?? "—"}
                </td>
                <td style={{ padding: "0.55rem 0" }}>
                  <Link href={`/tags/${tag.id}?shop=${shop}`} style={{ color: "#555", fontSize: "0.82rem" }}>
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
