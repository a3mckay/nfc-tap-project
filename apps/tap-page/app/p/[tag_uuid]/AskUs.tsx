"use client";

interface Props {
  productTitle: string;
  storeName: string;
  whatsappNumber: string | null;
  smsNumber: string | null;
}

/**
 * Builds a WhatsApp deep-link URL. Number must be digits only (E.164 without +).
 * wa.me accepts both +prefixed and plain digits, but plain is most compatible.
 */
function whatsappUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds an SMS deep-link. Uses the sms: scheme which opens the native messages app
 * on both iOS and Android.
 */
function smsUrl(number: string, message: string): string {
  // iOS uses sms:number&body=..., Android uses sms:number?body=...
  // The ?body= form works on both modern platforms.
  return `sms:${number}?body=${encodeURIComponent(message)}`;
}

export function AskUs({ productTitle, storeName, whatsappNumber, smsNumber }: Props) {
  if (!whatsappNumber && !smsNumber) return null;

  const message = `Hi! I have a question about the ${productTitle}.`;

  return (
    <div style={{
      margin: "1.5rem 1.25rem 0",
      padding: "1rem",
      borderRadius: "10px",
      border: "1px solid #eee",
      background: "#fafafa",
    }}>
      <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#444", margin: "0 0 0.1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Have a question?
      </p>
      <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 0.875rem", lineHeight: 1.4 }}>
        Message {storeName} directly — they'll reply right away.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {whatsappNumber && (
          <a
            href={whatsappUrl(whatsappNumber, message)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.65rem 1rem",
              background: "#25D366",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            <WhatsAppIcon />
            Ask on WhatsApp
          </a>
        )}
        {smsNumber && (
          <a
            href={smsUrl(smsNumber, message)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.65rem 1rem",
              background: "#111",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            <SmsIcon />
            Send a text
          </a>
        )}
      </div>

      <p style={{ fontSize: "0.7rem", color: "#bbb", marginTop: "0.65rem", lineHeight: 1.3 }}>
        Opens your messages app with &ldquo;{productTitle}&rdquo; already filled in.
      </p>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
