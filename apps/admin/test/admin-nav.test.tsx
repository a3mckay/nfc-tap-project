// On phones the admin sidebar becomes a drawer behind a ☰ top bar; on tablets
// and computers it stays as today (styles in app/admin-shell.css).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminNav } from "../src/AdminNav.js";

const html = renderToStaticMarkup(<AdminNav storeLabel="Queen West Shoes"><a href="/questions">Questions</a></AdminNav>);

describe("AdminNav", () => {
  it("has a top bar with a menu button and the store's name", () => {
    expect(html).toMatch(/<header class="admin-topbar">/);
    expect(html).toMatch(/<button[^>]*aria-label="Open menu"[^>]*aria-expanded="false"[^>]*aria-controls="admin-nav"/);
    expect(html).toContain("Queen West Shoes");
  });

  it("starts with the drawer closed, holding the nav links and a close button", () => {
    expect(html).toMatch(/<nav id="admin-nav" class="admin-sidebar" data-open="false"/);
    expect(html).toContain('aria-label="Close menu"');
    expect(html).toContain('href="/questions"');
    expect(html).not.toContain("admin-backdrop");
  });

  it("only changes the layout on phones (under 768px)", () => {
    const css = readFileSync(new URL("../app/admin-shell.css", import.meta.url), "utf8");
    expect(css).toContain("@media (max-width: 767px)");
    const wide = css.slice(0, css.indexOf("@media"));
    expect(wide).toMatch(/\.admin-topbar[^{]*\{[^}]*display:\s*none/);   // hidden on wider screens
  });
});
