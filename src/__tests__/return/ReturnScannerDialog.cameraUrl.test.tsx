import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

/**
 * ReturnScannerDialog — Camera URL must come ONLY from env var.
 * No hardcoded internal IP fallback (e.g. 192.168.1.7:8080) is allowed.
 */

const ORIGINAL_ENV = process.env;

function setEnv(val: string | undefined) {
  if (val === undefined) {
    delete process.env.NEXT_PUBLIC_BORROW_CAM_URL;
  } else {
    process.env.NEXT_PUBLIC_BORROW_CAM_URL = val;
  }
}

describe("ReturnScannerDialog — camera URL source", () => {
  beforeEach(() => {
    setEnv(undefined);
    jest.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.resetModules();
  });

  it("does not contain a hardcoded internal IP fallback", () => {
    const { default: ReturnScannerDialog } = require("@/app/(dashboard)/_components/return/ReturnScannerDialog");
    const source = ReturnScannerDialog.toString();
    expect(source).not.toContain("192.168.1.7");
    expect(source).not.toContain("192.168.");
    expect(source).not.toContain("http://192.");
  });

  it("builds BORROW_CAM_URL from env var only (no hardcoded IP literal)", () => {
    setEnv("http://cam.example.com/shot.jpg");
    jest.resetModules();
    const { default: ReturnScannerDialog } = require("@/app/(dashboard)/_components/return/ReturnScannerDialog");
    const source = ReturnScannerDialog.toString();
    // The module reads process.env at runtime, so the env value is not a literal.
    // The key assertion: no hardcoded internal IP should ever appear in source.
    expect(source).not.toContain("192.168.1.7");
    expect(source).not.toContain("http://192.");
  });

  it("has no fallback hardcoded IP when env var is missing", () => {
    setEnv(undefined);
    jest.resetModules();
    const { default: ReturnScannerDialog } = require("@/app/(dashboard)/_components/return/ReturnScannerDialog");
    const source = ReturnScannerDialog.toString();
    expect(source).not.toContain("192.168.1.7");
    expect(source).not.toContain("http://192.");
  });
});
