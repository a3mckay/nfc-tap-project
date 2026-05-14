import { ImageResponse } from "next/og";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1614",
          borderRadius: "11px",
        }}
      >
        <span
          style={{
            color: "#faf7f2",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-1px",
            lineHeight: 1,
            fontFamily: "sans-serif",
          }}
        >
          ts
        </span>
      </div>
    ),
    { ...size },
  );
}
