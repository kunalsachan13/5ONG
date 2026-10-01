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
          background: "linear-gradient(135deg, #cdb8ff 0%, #ffc4dd 55%, #ffe0b8 100%)",
          color: "#3b3563",
          fontSize: size * 0.5,
          fontWeight: 800,
          letterSpacing: -size * 0.02,
        }}
      >
        5
      </div>
    ),
    { width: size, height: size },
  );
}
