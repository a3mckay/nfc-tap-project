const PRODUCTS_QUERY = `
  query GetProducts($cursor: String) {
    products(first: 250, after: $cursor) {
      edges {
        node {
          id
          title
          descriptionHtml
          vendor
          productType
          status
          updatedAt
          images(first: 10) {
            edges { node { url altText } }
          }
          variants(first: 100) {
            edges { node { id sku price inventoryQuantity } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface ShopifyImage {
  url: string;
  altText: string | null;
}

interface ShopifyVariant {
  id: string;
  sku: string | null;
  price: string;
  inventoryQuantity: number | null;
}

interface ShopifyProductNode {
  id: string;
  title: string;
  descriptionHtml: string | null;
  vendor: string | null;
  productType: string | null;
  status: string;
  updatedAt: string;
  images: { edges: Array<{ node: ShopifyImage }> };
  variants: { edges: Array<{ node: ShopifyVariant }> };
}

interface PagedResult {
  products: {
    edges: Array<{ node: ShopifyProductNode }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

// MappedProduct satisfies ProductInput from @nfc/db — types are compatible by structure.
export interface MappedProduct {
  store_id: string;
  shopify_product_id: string;
  title: string;
  description_html: string | null;
  vendor: string | null;
  product_type: string | null;
  images: Array<{ url: string; altText: string | null }>;
  variants: Array<{ id: string; sku: string | null; price: string; inventoryQuantity: number }>;
  inventory_quantity: number;
  status: string;
  shopify_updated_at: string;
}

function extractNumericId(gid: string): string {
  return gid.split("/").at(-1) ?? gid;
}

export function mapShopifyProduct(
  node: ShopifyProductNode,
  storeId: string,
): MappedProduct {
  const variants = node.variants.edges.map(({ node: v }) => ({
    id: extractNumericId(v.id),
    sku: v.sku,
    price: v.price,
    inventoryQuantity: v.inventoryQuantity ?? 0,
  }));

  const inventoryQuantity = variants.reduce(
    (sum, v) => sum + v.inventoryQuantity,
    0,
  );

  return {
    store_id: storeId,
    shopify_product_id: extractNumericId(node.id),
    title: node.title,
    description_html: node.descriptionHtml,
    vendor: node.vendor,
    product_type: node.productType,
    images: node.images.edges.map(({ node: img }) => ({
      url: img.url,
      altText: img.altText,
    })),
    variants,
    inventory_quantity: inventoryQuantity,
    status: node.status.toLowerCase(),
    shopify_updated_at: node.updatedAt,
  };
}

export type ProductFetcher = (cursor: string | null) => Promise<PagedResult>;

export async function paginateProducts(
  fetcher: ProductFetcher,
): Promise<ShopifyProductNode[]> {
  const all: ShopifyProductNode[] = [];
  let cursor: string | null = null;

  do {
    const result = await fetcher(cursor);
    const page = result.products;
    all.push(...page.edges.map((e) => e.node));
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor !== null);

  return all;
}

export function buildProductFetcher(
  shop: string,
  accessToken: string,
): ProductFetcher {
  return async (cursor) => {
    const res = await fetch(
      `https://${shop}/admin/api/2024-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: PRODUCTS_QUERY,
          variables: { cursor },
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`Shopify GraphQL error: ${res.status}`);
    }

    const json = (await res.json()) as { data: PagedResult; errors?: unknown[] };
    if (json.errors?.length) {
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
  };
}

export { PRODUCTS_QUERY };
