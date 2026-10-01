import { ImageResponse } from "next/og";

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const raw = Number((await ctx.params).size.replace(/\D/g, "")) || 192;
  const size = Math.min(1024, Math.max(48, raw));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ffffff 0%, #faf6ff 60%, #f3ecff 100%)",
          borderRadius: Math.round(size * 0.28),
          border: `${Math.max(1, Math.round(size * 0.02))}px solid rgba(205, 184, 255, 0.6)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: Math.round(size * 0.82),
            height: Math.round(size * 0.82),
            borderRadius: Math.round(size * 0.24),
            background: "linear-gradient(135deg, #a888f8 0%, #cdb8ff 35%, #ffb3d1 70%, #ffcfa8 100%)",
            color: "#ffffff",
            fontSize: Math.round(size * 0.5),
            fontWeight: 900,
            textShadow: "0 2px 10px rgba(155, 127, 232, 0.5)",
          }}
        >
          5
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
