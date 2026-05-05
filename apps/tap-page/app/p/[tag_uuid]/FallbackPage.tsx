interface Props {
  kind: "not-found" | "unassigned" | "disabled" | "oos";
}

const MESSAGES: Record<Props["kind"], { heading: string; body: string }> = {
  "not-found": {
    heading: "Tag not recognised",
    body: "This tag could not be found. If you scanned the right tag, please ask a staff member for help.",
  },
  unassigned: {
    heading: "Not set up yet",
    body: "This tag hasn't been linked to a product yet. Check back soon.",
  },
  disabled: {
    heading: "Currently unavailable",
    body: "This tag has been taken offline. Please ask a staff member for help.",
  },
  oos: {
    heading: "Out of stock",
    body: "This product is currently out of stock. Ask a staff member about alternatives.",
  },
};

export function FallbackPage({ kind }: Props) {
  const { heading, body } = MESSAGES[kind];
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <p className="mb-4 text-5xl">◈</p>
        <h1 className="mb-3 text-xl font-semibold text-gray-900">{heading}</h1>
        <p className="text-sm text-gray-500">{body}</p>
      </div>
    </main>
  );
}
