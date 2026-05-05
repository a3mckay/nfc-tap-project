import { NextRequest, NextResponse } from "next/server";
import { getPool, getStoreByDomain, getTagsByStore } from "@nfc/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const shop = request.nextUrl.searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const tags = await getTagsByStore(pool, store.id);
  const tapBase = `${process.env.TAP_PAGE_CDN_URL ?? "http://localhost:3001"}/p/`;

  const lines = [
    "tag_uuid,tap_url,product_title,status",
    ...tags.map((t) =>
      [
        t.tag_uuid,
        `${tapBase}${t.tag_uuid}`,
        t.product_title ? `"${t.product_title.replace(/"/g, '""')}"` : "",
        t.status,
      ].join(","),
    ),
  ];

  const csv = lines.join("\n");
  const filename = `nfc-tags-${shop.replace(/\./g, "-")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
