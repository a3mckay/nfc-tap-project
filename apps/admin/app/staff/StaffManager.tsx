"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveStaffAction, removeStaffAction, setStaffRoleAction } from "./actions.js";

type Role = "staff" | "co_manager" | "manager";

interface StaffRow {
  id: string;
  email: string;
  name: string | null;
  added: string;
  progress: string;
  role: Role;
  roles: Role[];      // roles this viewer may choose for the row (empty = read-only)
  canRemove: boolean;
}

const ROLE_LABEL: Record<Role, string> = { staff: "Staff", co_manager: "Co-manager", manager: "Manager" };

interface Props {
  shop: string;
  canAdd: boolean;
  staff: StaffRow[];
}

const inputStyle = { padding: "0.5rem 0.625rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.85rem" };

export function StaffManager({ shop, canAdd, staff }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const r = await approveStaffAction(shop, email, name);
      if (r.error) { setError(r.error); return; }
      setNotice(r.warning ?? `Added. We've emailed ${email.trim()} an invite to sign in.`);
      setEmail("");
      setName("");
      router.refresh();
    });
  }

  function changeRole(row: StaffRow, role: Role) {
    if (role === row.role) return;
    const promoting = row.role === "staff" && role !== "staff";
    const note = promoting ? ` We'll email ${row.email} a link to set a password for the admin.` : "";
    if (!confirm(`Make ${row.name ?? row.email} ${ROLE_LABEL[role].toLowerCase()}?${note}`)) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const r = await setStaffRoleAction(shop, row.id, role);
      if (r.error) { setError(r.error); return; }
      setNotice(r.warning ?? `${row.name ?? row.email} is now ${ROLE_LABEL[role].toLowerCase()}.`);
      router.refresh();
    });
  }

  function remove(row: StaffRow) {
    if (!confirm(`Remove ${row.email}? They won't be able to sign in as staff.`)) return;
    setError(null);
    startTransition(async () => {
      const r = await removeStaffAction(shop, row.id);
      if (r.error) { setError(r.error); return; }
      router.refresh();
    });
  }

  return (
    <div>
      {canAdd && <form onSubmit={add} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <input type="email" required placeholder="name@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, flex: "2 1 220px" }} />
        <input type="text" placeholder="Name (optional)" value={name}
          onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, flex: "1 1 140px" }} />
        <button type="submit" disabled={pending}
          style={{ padding: "0.5rem 1rem", background: "#111", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.85rem", fontWeight: 600, cursor: pending ? "default" : "pointer" }}>
          Add staff
        </button>
      </form>}
      {error && <p style={{ color: "#c00", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{error}</p>}
      {notice && <p style={{ color: "#166534", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{notice}</p>}

      <div style={{ marginTop: "1.5rem", opacity: pending ? 0.6 : 1 }}>
        {staff.length === 0 ? (
          <p style={{ color: "#888", fontSize: "0.9rem" }}>No staff yet.{canAdd ? " Add an email above." : ""}</p>
        ) : (
          staff.map((row) => (
            <div key={row.id} style={{ padding: "0.75rem 1rem", border: "1px solid #eee", borderRadius: "6px", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111", margin: 0 }}>
                  {row.name ?? row.email}
                  {row.role !== "staff" && (
                    <span style={{ marginLeft: "0.5rem", padding: "1px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: row.role === "manager" ? "#111" : "#e5e7eb", color: row.role === "manager" ? "#fff" : "#333" }}>
                      {ROLE_LABEL[row.role]}
                    </span>
                  )}
                </p>
                <p style={{ fontSize: "0.78rem", color: "#666", margin: 0 }}>
                  {row.name ? `${row.email} · ` : ""}added {new Date(row.added).toLocaleDateString()}
                </p>
                <p style={{ fontSize: "0.78rem", color: "#166534", margin: "2px 0 0" }}>{row.progress}</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                {row.roles.length > 0 && (
                  <select aria-label={`Role for ${row.email}`} value={row.role} disabled={pending}
                    onChange={(e) => changeRole(row, e.target.value as Role)}
                    style={{ padding: "0.3rem 0.5rem", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.78rem", background: "#fff" }}>
                    {row.roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                )}
                {row.canRemove && (
                  <button type="button" onClick={() => remove(row)} disabled={pending}
                    style={{ padding: "0.35rem 0.875rem", background: "transparent", color: "#555", border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.78rem", cursor: pending ? "default" : "pointer" }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
