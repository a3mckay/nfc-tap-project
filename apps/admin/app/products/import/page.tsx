import Link from "next/link";
import { CsvImportForm } from "./CsvImportForm.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function ImportPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;
  if (!shop) return <main><p>Pass <code>?shop=</code></p></main>;

  return (
    <main>
      <p style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
        <Link href={`/products?shop=${shop}`} style={{ color: "#555" }}>← All products</Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Import from CSV</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Upload a CSV to bulk-create products. Useful when you don&apos;t use Shopify or want to add a batch quickly.
      </p>
      <CsvImportForm shop={shop} />
    </main>
  );
}
