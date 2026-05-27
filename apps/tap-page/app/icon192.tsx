import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon192() {
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
          borderRadius: "42px",
        }}
      >
        <span
          style={{
            color: "#faf7f2",
            fontSize: 100,
            fontWeight: 700,
            letterSpacing: "-4px",
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
