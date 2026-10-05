import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ size: string }> }
) {
  try {
    const { size } = await context.params;
    const cleanSize = parseInt(size, 10);
    
    let filePath = path.join(process.cwd(), "public", "logo.png");
    if (cleanSize <= 192) {
      const p192 = path.join(process.cwd(), "public", "icons", "icon-192.png");
      if (fs.existsSync(p192)) filePath = p192;
    } else if (cleanSize <= 512) {
      const p512 = path.join(process.cwd(), "public", "icons", "icon-512.png");
      if (fs.existsSync(p512)) filePath = p512;
    }

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.redirect(new URL("/logo.png", request.url));
  }
}

