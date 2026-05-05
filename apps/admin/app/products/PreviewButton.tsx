"use client";

export function PreviewButton({ tagUuid, tapPageUrl }: { tagUuid: string; tapPageUrl: string }) {
  function open() {
    const url = `${tapPageUrl}/p/${tagUuid}`;
    window.open(url, "tap-preview", "width=390,height=844,resizable=yes,scrollbars=yes");
  }

  return (
    <button
      onClick={open}
      style={{
        fontSize: "0.78rem",
        color: "#555",
        background: "none",
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "3px 10px",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Preview ↗
    </button>
  );
}
