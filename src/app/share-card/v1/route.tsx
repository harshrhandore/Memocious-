import { ImageResponse } from "next/og";
export const dynamic = "force-static";
export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#FFF8F0",
        color: "#392c2c",
        padding: 70,
        border: "24px solid #f1dce1",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 22,
          letterSpacing: 7,
          color: "#8e2c48",
          marginBottom: 30,
        }}
      >
        A LITTLE THOUGHT. A LOT OF HEART.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 108,
          fontWeight: 700,
          lineHeight: 1.15,
        }}
      >
        Memocious
      </div>
      <div style={{ display: "flex", fontSize: 36, marginTop: 25 }}>
        Thoughtful gifts, made personal.
      </div>
      <div
        style={{
          display: "flex",
          width: 100,
          height: 3,
          background: "#8e2c48",
          marginTop: 42,
          marginBottom: 28,
        }}
      />
      <div style={{ display: "flex", fontSize: 23, color: "#6b5b61" }}>
        Custom gifts / Bouquets / Hampers
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
