// Signing out of the admin also signs out of the tap page (PRD v4 §7 Step 13c).
import { describe, it, expect, afterEach } from "vitest";
import { POST } from "../app/api/logout/route.js";
import { COOKIE_NAME } from "../src/admin-auth.js";

afterEach(() => { delete process.env.TAP_PAGE_URL; });

describe("POST /api/logout", () => {
  it("clears the admin cookie and goes through the tap page's sign-out", async () => {
    const res = await POST(new Request("https://admin.tapshelf.co/api/logout", { method: "POST" }));
    expect(res.headers.get("location")).toBe("https://tapshelf.store/staff/signout");
    // 303 so the browser follows with GET (a 307 would re-send the POST).
    expect(res.status).toBe(303);
    expect(res.cookies.get(COOKIE_NAME)?.maxAge).toBe(0);
  });
});
