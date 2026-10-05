// Apps that build link previews (Signal, iMessage, WhatsApp, Slack…) load the
// tap page. Those loads aren't customer taps and mustn't count as them.
import { describe, it, expect } from "vitest";
import { isAutomatedVisit } from "@/link-preview-bots.js";

describe("isAutomatedVisit", () => {
  it("spots link-preview fetchers and other bots", () => {
    for (const ua of [
      "WhatsApp/2",                                                    // Signal and WhatsApp
      "WhatsApp/2.23.20.0 A",
      "facebookexternalhit/1.1 Facebot Twitterbot/1.0",                // iMessage
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "TelegramBot (like TwitterBot)",
      "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
      "Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "curl/8.7.1",
      "",
    ]) {
      expect(isAutomatedVisit(ua), ua).toBe(true);
    }
    expect(isAutomatedVisit(null)).toBe(true);
  });

  it("counts real phone and desktop browsers, including in-app browsers", () => {
    for (const ua of [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 340.0.0.22.109",
      "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 Snapchat/12.95.0.40",
    ]) {
      expect(isAutomatedVisit(ua), ua).toBe(false);
    }
  });
});
