import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { libraryTourData, Room } from "@/lib/vr/tourData";

const CONFIG_PATH = path.join(process.cwd(), "public", "VRLIB", "tour-config.json");
const VRLIB_DIR = path.join(process.cwd(), "public", "VRLIB");

export async function GET() {
  try {
    let rooms: Record<string, Room> = libraryTourData;
    let isCustom = false;

    try {
      const content = await fs.readFile(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        rooms = parsed;
        isCustom = true;
      }
    } catch {
      // Config file doesn't exist yet, use default libraryTourData
    }

    // List all existing panorama images in public/VRLIB for quick selection
    let availableImages: string[] = [];
    try {
      const files = await fs.readdir(VRLIB_DIR);
      availableImages = files
        .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
        .map((f) => `/VRLIB/${f}`);
    } catch {
      availableImages = ["/VRLIB/LIB1.jpg", "/VRLIB/LIB2.jpg", "/VRLIB/LIB3.jpg", "/VRLIB/LIB4.jpg", "/VRLIB/LIB5.jpg"];
    }

    return NextResponse.json({
      success: true,
      rooms,
      isCustom,
      availableImages,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load tour rooms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rooms = body.rooms;

    if (!rooms || typeof rooms !== "object" || Object.keys(rooms).length === 0) {
      return NextResponse.json(
        { success: false, error: "Dữ liệu cấu hình phòng không hợp lệ" },
        { status: 400 }
      );
    }

    // Ensure VRLIB directory exists
    await fs.mkdir(VRLIB_DIR, { recursive: true });

    // Save configuration
    await fs.writeFile(CONFIG_PATH, JSON.stringify(rooms, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "Đã lưu cấu hình khu vực VR Tour thành công",
      rooms,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Không thể lưu cấu hình" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    try {
      await fs.unlink(CONFIG_PATH);
    } catch {
      // File may not exist, ignore
    }

    return NextResponse.json({
      success: true,
      message: "Đã khôi phục cấu hình mặc định ban đầu",
      rooms: libraryTourData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Không thể khôi phục mặc định" },
      { status: 500 }
    );
  }
}

