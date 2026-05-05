import Link from "next/link";
import { AddProductForm } from "./AddProductForm.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function AddProductPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return <main><p style={{ color: "#666" }}>Pass <code>?shop=</code> to continue.</p></main>;
  }

  return (
    <main>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/products?shop=${shop}`} style={{ fontSize: "0.8rem", color: "#888", textDecoration: "none" }}>
          ← Back to Products
        </Link>
      </div>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Add Product</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Add a product manually — useful for items not in Shopify or for testing.
      </p>
      <AddProductForm shop={shop} />
    </main>
  );
}
