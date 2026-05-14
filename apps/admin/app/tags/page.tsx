import Link from "next/link";
import { getPool, getStoreByDomain, getTagsByStore } from "@nfc/db";
import { ProvisionForm } from "./ProvisionForm.js";
import { formatTagUuid, tagStatusLabel, tagTapUrl } from "../../src/tag-utils.js";
import type { TagStatus, TagSortColumn, SortDir } from "@nfc/db";

interface PageProps {
  searchParams: Promise<{ shop?: string; sort?: string; dir?: string; status?: string }>;
}

const STATUS_BADGE: Record<TagStatus, { color: string; bg: string }> = {
  unassigned: { color: "#92400e", bg: "#fef3c7" },
  active:     { color: "#166534", bg: "#dcfce7" },
  disabled:   { color: "#6b7280", bg: "#f3f4f6" },
  oos:        { color: "#c00",    bg: "#fff0f0" },
};

const ALL_STATUSES: { value: TagStatus | ""; label: string }[] = [
  { value: "",           label: "All" },
  { value: "active",     label: "Active" },
  { value: "unassigned", label: "Unassigned" },
  { value: "oos",        label: "Out of stock" },
  { value: "disabled",   label: "Disabled" },
];

function Badge({ status }: { status: TagStatus }) {
  const { color, bg } = STATUS_BADGE[status] ?? STATUS_BADGE.unassigned;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "99px", fontSize: "0.75rem", fontWeight: 600, color, background: bg }}>
      {tagStatusLabel(status)}
    </span>
  );
}

type SortableCol = { label: string; key: TagSortColumn };
const SORTABLE_COLS: SortableCol[] = [
  { label: "Tag #",    key: "number" },
  { label: "Status",   key: "status" },
  { label: "Product",  key: "product" },
];

function SortLink({
  col, current, dir, href,
}: { col: TagSortColumn; current: TagSortColumn; dir: SortDir; href: (s: TagSortColumn, d: SortDir) => string }) {
  const isActive = col === current;
  const nextDir: SortDir = isActive && dir === "desc" ? "asc" : "desc";
  const arrow = isActive ? (dir === "desc" ? " ↓" : " ↑") : "";
  return (
    <a href={href(col, nextDir)} style={{ color: isActive ? "#111" : "#555", textDecoration: "none", fontWeight: isActive ? 700 : 600 }}>
      {SORTABLE_COLS.find((c) => c.key === col)?.label}{arrow}
    </a>
  );
}

export default async function TagsPage({ searchParams }: PageProps) {
  const { shop, sort: rawSort, dir: rawDir, status: rawStatus } = await searchParams;

  const sort: TagSortColumn = (["number", "status", "product"] as TagSortColumn[]).includes(rawSort as TagSortColumn)
    ? (rawSort as TagSortColumn)
    : "number";
  const dir: SortDir = rawDir === "asc" ? "asc" : "desc";
  const status = rawStatus ?? "";

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

  const tags = await getTagsByStore(pool, store.id, { sort, dir, status: status || undefined });
  const tapBase = `${process.env.TAP_PAGE_CDN_URL ?? "http://localhost:3001"}/p/`;

  // Counts always over all tags (unfiltered) — re-query without status filter for summary
  const allTags = status ? await getTagsByStore(pool, store.id) : tags;
  const counts = {
    total: allTags.length,
    active: allTags.filter((t) => t.status === "active").length,
    unassigned: allTags.filter((t) => t.status === "unassigned").length,
  };

  // Helper to build filtered/sorted hrefs (shop is guaranteed non-null here — we returned early above)
  const shopParam = shop as string;
  function href(newSort: TagSortColumn, newDir: SortDir, newStatus = status) {
    const p = new URLSearchParams({ shop: shopParam, sort: newSort, dir: newDir });
    if (newStatus) p.set("status", newStatus);
    return `/tags?${p.toString()}`;
  }

  function statusHref(newStatus: string) {
    const p = new URLSearchParams({ shop: shopParam, sort, dir });
    if (newStatus) p.set("status", newStatus);
    return `/tags?${p.toString()}`;
  }

  return (
    <main>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Tag Management</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        {shop} &mdash; {counts.total} tag{counts.total !== 1 ? "s" : ""},{" "}
        {counts.active} active, {counts.unassigned} unassigned
      </p>

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {ALL_STATUSES.map(({ value, label }) => {
          const active = value === status;
          return (
            <a
              key={value}
              href={statusHref(value)}
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "0.25rem 0.75rem",
                borderRadius: "99px",
                border: "1px solid",
                borderColor: active ? "#111" : "#ddd",
                background: active ? "#111" : "transparent",
                color: active ? "#fff" : "#555",
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <ProvisionForm shop={shop} />
        {allTags.length > 0 && (
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
          {status ? "No tags match this filter." : "No tags yet. Use the form above to provision your first batch."}
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
              <th style={{ padding: "0.5rem 0.75rem 0.5rem 0", fontWeight: 600, width: "3.5rem" }}>
                <SortLink col="number" current={sort} dir={dir} href={(s, d) => href(s, d)} />
              </th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600, width: "11rem" }}>Tag UUID</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>
                <SortLink col="status" current={sort} dir={dir} href={(s, d) => href(s, d)} />
              </th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>
                <SortLink col="product" current={sort} dir={dir} href={(s, d) => href(s, d)} />
              </th>
              <th style={{ padding: "0.5rem 0", fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "0.55rem 0.75rem 0.55rem 0", fontWeight: 700, fontSize: "0.82rem", color: "#111" }}>
                  #{tag.tag_number}
                </td>
                <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", fontSize: "0.78rem", color: "#555" }}>
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
