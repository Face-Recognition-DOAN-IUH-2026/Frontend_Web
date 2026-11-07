import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const VRLIB_DIR = path.join(process.cwd(), "public", "VRLIB");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn file ảnh tải lên" }, { status: 400 });
    }

    // Check extension
    const originalName = file.name || "panorama.jpg";
    const ext = path.extname(originalName).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      return NextResponse.json(
        { success: false, error: "Định dạng file không hỗ trợ. Vui lòng tải file ảnh JPG, PNG hoặc WEBP." },
        { status: 400 }
      );
    }

    // Check size limit: max 25MB for high-res 360 panoramas
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Dung lượng ảnh vượt quá 25MB" },
        { status: 400 }
      );
    }

    const cleanBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const newFileName = `${cleanBaseName}_${Date.now()}${ext}`;
    const targetPath = path.join(VRLIB_DIR, newFileName);

    await fs.mkdir(VRLIB_DIR, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(targetPath, buffer);

    const publicUrl = `/VRLIB/${newFileName}`;

    return NextResponse.json({
      success: true,
      message: "Tải ảnh 360° lên thành công",
      url: publicUrl,
      fileName: newFileName,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Lỗi khi lưu ảnh lên máy chủ" },
      { status: 500 }
    );
  }
}

