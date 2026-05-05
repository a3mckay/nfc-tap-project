"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importProductsCsvAction, type CsvImportResult } from "./actions.js";

export function CsvImportForm({ shop }: { shop: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CsvImportResult | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleImport() {
    if (!csv.trim()) return;
    setResult(null);
    startTransition(async () => {
      const r = await importProductsCsvAction(shop, csv);
      setResult(r);
      if (r.added > 0) router.refresh();
    });
  }

  return (
    <div>
      <p style={{ fontSize: "0.85rem", color: "#444", marginBottom: "0.5rem" }}>
        CSV format: <code style={{ fontFamily: "monospace", background: "#f5f5f5", padding: "1px 5px", borderRadius: "3px" }}>title,vendor,product_type</code> (header row required, only <code>title</code> mandatory).
      </p>

      <input type="file" accept=".csv,text/csv" onChange={handleFile}
        style={{ marginBottom: "1rem", fontSize: "0.85rem" }} />

      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder='title,vendor,product_type&#10;"Canvas Tote Bag","Ally Capellino","Bag"&#10;"Merino Crewneck","Ally Capellino","Knitwear"'
        rows={8}
        style={{
          width: "100%", padding: "0.65rem", fontSize: "0.82rem", fontFamily: "monospace",
          border: "1px solid #ddd", borderRadius: "6px", marginBottom: "1rem",
          boxSizing: "border-box", resize: "vertical",
        }}
      />

      <button type="button" onClick={handleImport} disabled={!csv.trim() || pending}
        style={{
          padding: "0.55rem 1.25rem", background: "#111", color: "#fff",
          border: "none", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600,
          cursor: !csv.trim() || pending ? "default" : "pointer",
          opacity: !csv.trim() || pending ? 0.5 : 1,
        }}>
        {pending ? "Importing…" : "Import products"}
      </button>

      {result && (
        <div style={{ marginTop: "1rem", padding: "0.875rem", background: "#fafafa", border: "1px solid #eee", borderRadius: "6px" }}>
          <p style={{ fontSize: "0.88rem", color: "#111", marginBottom: "0.25rem" }}>
            <strong>{result.added}</strong> added{result.skipped > 0 && `, ${result.skipped} skipped`}
          </p>
          {result.errors.length > 0 && (
            <ul style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#c00" }}>
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
