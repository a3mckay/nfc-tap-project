import Link from "next/link";
import { getPool, getStoreByDomain, getTagById } from "@nfc/db";
import { TagForm } from "./TagForm.js";
import { formatTagUuid, tagTapUrl } from "../../../src/tag-utils.js";
import type { TagStatus } from "@nfc/db";

interface PageProps {
  params: Promise<{ tag_id: string }>;
  searchParams: Promise<{ shop?: string }>;
}

export default async function TagEditPage({ params, searchParams }: PageProps) {
  const { tag_id } = await params;
  const { shop } = await searchParams;

  if (!shop) {
    return <main><p style={{ color: "#666" }}>Pass <code>?shop=…</code> in the URL.</p></main>;
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;
  }

  const tag = await getTagById(pool, tag_id);
  if (!tag || tag.store_id !== store.id) {
    return <main><p style={{ color: "#c00" }}>Tag not found.</p></main>;
  }

  const { rows: productRows } = await pool.query<{ id: string; title: string }>(
    `select id, title from products where store_id = $1 and status = 'active' order by title`,
    [store.id],
  );

  const tapBase = `${process.env.TAP_PAGE_CDN_URL ?? "http://localhost:3001"}/p/`;
  const tapUrl = tagTapUrl(tapBase, tag.tag_uuid);

  return (
    <main>
      <p style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
        <Link href={`/tags?shop=${shop}`} style={{ color: "#555" }}>← All tags</Link>
      </p>

      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Edit tag</h1>

      <p style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#555", marginBottom: "0.25rem" }}>
        {formatTagUuid(tag.tag_uuid)}
      </p>
      <p style={{ fontSize: "0.8rem", color: "#999", marginBottom: "1.5rem" }}>
        Tap URL:{" "}
        <a href={tapUrl} target="_blank" rel="noreferrer" style={{ color: "#555" }}>{tapUrl}</a>
      </p>

      <TagForm
        shop={shop}
        tagId={tag.id}
        currentProductId={tag.product_id}
        currentStatus={tag.status as TagStatus}
        products={productRows}
      />

      {(tag.encoded_at || tag.shipped_at || tag.deployed_at) && (
        <dl style={{ marginTop: "2rem", fontSize: "0.8rem", color: "#888", display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.25rem 1rem" }}>
          {tag.encoded_at && (
            <><dt style={{ fontWeight: 600 }}>Encoded</dt><dd>{new Date(tag.encoded_at).toLocaleDateString()}</dd></>
          )}
          {tag.shipped_at && (
            <><dt style={{ fontWeight: 600 }}>Shipped</dt><dd>{new Date(tag.shipped_at).toLocaleDateString()}</dd></>
          )}
          {tag.deployed_at && (
            <><dt style={{ fontWeight: 600 }}>Deployed</dt><dd>{new Date(tag.deployed_at).toLocaleDateString()}</dd></>
          )}
        </dl>
      )}
    </main>
  );
}
