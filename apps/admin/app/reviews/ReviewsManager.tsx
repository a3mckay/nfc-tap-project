"use client";

import { useState, useTransition } from "react";
import {
  detectReviewAppsAction, configureReviewSourceAction, syncReviewsAction,
  type DetectResult,
} from "./actions.js";
import type { ReviewProvider, ReviewSource } from "@nfc/db";

interface Props {
  shop: string;
  initialSources: ReviewSource[];
  platform: string;
}

const PROVIDER_LABELS: Record<ReviewProvider, string> = {
  judgeme: "Judge.me",
  loox: "Loox",
  okendo: "Okendo",
  yotpo: "Yotpo",
  stamped: "Stamped",
  public_search: "Public Reviews (web search)",
  manual: "Manual entry",
};

// Each provider's required config field. judgeme works with no config (uses shop domain).
const CONFIG_FIELDS: Partial<Record<ReviewProvider, { key: string; label: string; placeholder: string }[]>> = {
  judgeme: [],
  loox:    [{ key: "app_key",       label: "Loox API key",          placeholder: "loox_xxxxx" }],
  okendo:  [{ key: "subscriber_id", label: "Okendo subscriber ID",  placeholder: "abc123…"    }],
  yotpo:   [{ key: "app_key",       label: "Yotpo app key",          placeholder: "xxxxx"      }],
  stamped: [
    { key: "api_key",    label: "Stamped public key", placeholder: "pubkey_xxxxx" },
    { key: "store_hash", label: "Stamped store hash", placeholder: "yourstore"    },
  ],
};

export function ReviewsManager({ shop, initialSources, platform }: Props) {
  const [sources, setSources] = useState(initialSources);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isDetecting, startDetect] = useTransition();
  const [isSyncing, startSync] = useTransition();

  function handleDetect() {
    setDetectResult(null);
    startDetect(async () => {
      const r = await detectReviewAppsAction(shop);
      setDetectResult(r);
      // Refresh local sources from server next render — the page revalidated it
      if (!r.error) {
        // Optimistic: add detected sources locally
        const added = r.detected.filter((d) => !sources.find((s) => s.provider === d.provider));
        if (added.length > 0) {
          setSources([...sources, ...added.map((d) => ({
            id: "tmp-" + d.provider, store_id: "", provider: d.provider, config: {}, last_synced_at: null, enabled: true, created_at: new Date(),
          }))]);
        }
      }
    });
  }

  function handleSync() {
    setSyncMessage(null);
    startSync(async () => {
      const r = await syncReviewsAction(shop);
      if (r.error) {
        setSyncMessage(`Error: ${r.error}`);
      } else {
        const total = r.provider_results.reduce((s, p) => s + p.reviews_added, 0);
        setSyncMessage(`Synced ${total} review${total === 1 ? "" : "s"} across ${r.provider_results.length} provider${r.provider_results.length === 1 ? "" : "s"}.`);
      }
    });
  }

  return (
    <div>
      {/* Auto-detect — Shopify only */}
      {platform === "shopify" && <section style={{ padding: "1.25rem", background: "#f9f9f9", border: "1px solid #eee", borderRadius: "8px", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#111", marginBottom: "0.4rem" }}>
          Auto-detect from Shopify
        </p>
        <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.5, marginBottom: "0.875rem" }}>
          We&apos;ll check which review app is installed on your Shopify store and configure it automatically.
        </p>
        <button type="button" onClick={handleDetect} disabled={isDetecting}
          style={{
            padding: "0.45rem 1rem", background: "#111", color: "#fff",
            border: "none", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600,
            cursor: isDetecting ? "default" : "pointer", opacity: isDetecting ? 0.6 : 1,
          }}>
          {isDetecting ? "Checking…" : "Detect installed apps"}
        </button>
        {detectResult && (
          <div style={{ marginTop: "0.875rem", fontSize: "0.82rem" }}>
            {detectResult.error ? (
              <span style={{ color: "#c00" }}>{detectResult.error}</span>
            ) : detectResult.detected.length === 0 ? (
              <span style={{ color: "#888" }}>No supported review apps found. You can configure one manually below.</span>
            ) : (
              <span style={{ color: "#166534" }}>
                Found: {detectResult.detected.map((d) => d.app_title).join(", ")}
              </span>
            )}
          </div>
        )}
      </section>}

      {/* Configured sources */}
      <h2 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
        Configured providers
      </h2>
      {sources.length === 0 ? (
        <p style={{ fontSize: "0.88rem", color: "#888", marginBottom: "2rem" }}>
          None yet. Click &quot;Detect installed apps&quot; above, or add one manually below.
        </p>
      ) : (
        <div style={{ marginBottom: "2rem" }}>
          {sources.map((src) => (
            <ProviderRow key={src.provider} shop={shop} source={src} onChange={(updated) => {
              setSources(sources.map((s) => s.provider === updated.provider ? updated : s));
            }} />
          ))}
          <button type="button" onClick={handleSync} disabled={isSyncing}
            style={{
              marginTop: "1rem", padding: "0.5rem 1.25rem", background: "#fff", color: "#111",
              border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600,
              cursor: isSyncing ? "default" : "pointer", opacity: isSyncing ? 0.6 : 1,
            }}>
            {isSyncing ? "Syncing…" : "Sync now"}
          </button>
          {syncMessage && (
            <p style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: syncMessage.startsWith("Error") ? "#c00" : "#166534" }}>
              {syncMessage}
            </p>
          )}
        </div>
      )}

      {/* Manual add */}
      <h2 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
        Add manually
      </h2>
      <ManualAdd shop={shop} existingProviders={sources.map((s) => s.provider)} onAdded={(provider) => {
        setSources([...sources, {
          id: "tmp-" + provider, store_id: "", provider, config: {}, last_synced_at: null, enabled: true, created_at: new Date(),
        }]);
      }} />
    </div>
  );
}

function ProviderRow({ shop, source, onChange }: { shop: string; source: ReviewSource; onChange: (s: ReviewSource) => void }) {
  const fields = CONFIG_FIELDS[source.provider] ?? [];
  const [config, setConfig] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, String(source.config[f.key] ?? "")])),
  );
  const [saving, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function handleSave() {
    startSave(async () => {
      await configureReviewSourceAction(shop, source.provider, config);
      setSavedAt(Date.now());
      onChange({ ...source, config });
    });
  }

  return (
    <div style={{ padding: "1rem", border: "1px solid #eee", borderRadius: "6px", marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: fields.length > 0 ? "0.75rem" : 0 }}>
        <div>
          <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111" }}>{PROVIDER_LABELS[source.provider]}</p>
          {source.last_synced_at && (
            <p style={{ fontSize: "0.72rem", color: "#888", marginTop: "2px" }}>
              Last synced: {new Date(source.last_synced_at).toLocaleString()}
            </p>
          )}
          {fields.length === 0 && (
            <p style={{ fontSize: "0.72rem", color: "#888", marginTop: "2px" }}>No configuration needed</p>
          )}
        </div>
      </div>
      {fields.length > 0 && (
        <>
          <div style={{ display: "grid", gap: "0.5rem", marginBottom: "0.5rem" }}>
            {fields.map((f) => (
              <div key={f.key}>
                <label style={{ fontSize: "0.72rem", color: "#666", display: "block", marginBottom: "2px" }}>{f.label}</label>
                <input
                  value={config[f.key] ?? ""}
                  onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "0.4rem 0.6rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.85rem", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ padding: "0.35rem 0.875rem", background: "#fff", color: "#111", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.78rem", cursor: "pointer" }}>
            {saving ? "Saving…" : savedAt ? "Saved ✓" : "Save"}
          </button>
        </>
      )}
    </div>
  );
}

function ManualAdd({ shop, existingProviders, onAdded }: { shop: string; existingProviders: ReviewProvider[]; onAdded: (p: ReviewProvider) => void }) {
  const available: ReviewProvider[] = (["judgeme","loox","okendo","yotpo","stamped"] as ReviewProvider[])
    .filter((p) => !existingProviders.includes(p));
  const [provider, setProvider] = useState<ReviewProvider | "">("");
  const [adding, startAdd] = useTransition();

  if (available.length === 0) return <p style={{ fontSize: "0.85rem", color: "#888" }}>All providers already configured.</p>;

  function handleAdd() {
    if (!provider) return;
    startAdd(async () => {
      await configureReviewSourceAction(shop, provider as ReviewProvider, {});
      onAdded(provider as ReviewProvider);
      setProvider("");
    });
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <select value={provider} onChange={(e) => setProvider(e.target.value as ReviewProvider | "")}
        style={{ padding: "0.45rem 0.75rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.85rem", fontFamily: "inherit" }}>
        <option value="">Select provider…</option>
        {available.map((p) => (<option key={p} value={p}>{PROVIDER_LABELS[p]}</option>))}
      </select>
      <button type="button" onClick={handleAdd} disabled={!provider || adding}
        style={{ padding: "0.45rem 1rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600, cursor: !provider || adding ? "default" : "pointer", opacity: !provider || adding ? 0.5 : 1 }}>
        {adding ? "Adding…" : "Add"}
      </button>
    </div>
  );
}
