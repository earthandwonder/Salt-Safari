import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Salt Safari — Discover marine life at every dive and snorkel spot in Australia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #062133 0%, #0a3652 50%, #062133 100%)",
        padding: "60px 72px",
        fontFamily: "serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(244, 132, 95, 0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          left: -100,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "rgba(20, 184, 166, 0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 200,
          right: 100,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "rgba(16, 185, 129, 0.06)",
        }}
      />

      {/* Top: branding */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #F4845F, #14B8A6)",
          }}
        />
        <span
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 22,
            letterSpacing: 3,
            fontWeight: 400,
          }}
        >
          SALT SAFARI
        </span>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <span
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            color: "white",
            marginBottom: 20,
          }}
        >
          Discover marine life at{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #F4845F, #14B8A6)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            every dive spot
          </span>
        </span>

        <span
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.5,
            maxWidth: 700,
          }}
        >
          Species guides, seasonal alerts, and a free ID tool for snorkelling and diving across Australia.
        </span>
      </div>

      {/* Bottom bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            borderRadius: 24,
            background: "rgba(244, 132, 95, 0.15)",
            border: "1px solid rgba(244, 132, 95, 0.3)",
          }}
        >
          <span style={{ color: "#F4845F", fontSize: 18, fontWeight: 600 }}>
            saltsafari.com.au
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["#F4845F", "#14B8A6", "#10B981"].map((color) => (
            <div
              key={color}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
