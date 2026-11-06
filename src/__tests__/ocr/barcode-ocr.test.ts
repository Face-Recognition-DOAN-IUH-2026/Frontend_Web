import {
  extractBookCodeFromOcr,
  normalizeLibBarcode,
  normalizeIsbn,
  looksLikeBookCode,
} from "../../lib/ocr/barcode-ocr";

describe("barcode-ocr", () => {
  describe("normalizeLibBarcode", () => {
    it("chuẩn hóa LIB-9780140328721-001", () => {
      expect(normalizeLibBarcode("LIB-9780140328721-001")).toBe("LIB-9780140328721-001");
    });

    it("padding số seq (1 -> 001)", () => {
      expect(normalizeLibBarcode("LIB-9780140328721-1")).toBe("LIB-9780140328721-001");
    });

    it("padding số seq (0001 -> 001)", () => {
      expect(normalizeLibBarcode("LIB-9780140328721-0001")).toBe("LIB-9780140328721-001");
    });

    it("thiếu dấu gạch ngang", () => {
      expect(normalizeLibBarcode("LIB9780140328721001")).toBe("LIB-9780140328721-001");
    });

    it("chữ O đọc nhầm thành 0", () => {
      expect(normalizeLibBarcode("LIB-978014032872O-001")).toBe("LIB-9780140328720-001");
    });

    it("trả về null khi không khớp", () => {
      expect(normalizeLibBarcode("ABC-123")).toBeNull();
      expect(normalizeLibBarcode("9780140328721")).toBeNull();
    });
  });

  describe("normalizeIsbn", () => {
    it("ISBN-13", () => {
      expect(normalizeIsbn("9780140328721")).toBe("9780140328721");
    });

    it("ISBN-10", () => {
      expect(normalizeIsbn("0140328726")).toBe("0140328726");
    });

    it("ISBN-10 với X", () => {
      expect(normalizeIsbn("014032872X")).toBe("014032872X");
    });

    it("trả về null khi không hợp lệ", () => {
      expect(normalizeIsbn("123")).toBeNull();
      expect(normalizeIsbn("LIB-9780140328721-001")).toBeNull();
    });
  });

  describe("extractBookCodeFromOcr", () => {
    it("trích xuất mã bản sao LIB-...", () => {
      const result = extractBookCodeFromOcr("LIB-9780140328721-001");
      expect(result).toEqual({ type: "copy", value: "LIB-9780140328721-001" });
    });

    it("trích xuất mã bản sao từ văn bản dài hơn", () => {
      const result = extractBookCodeFromOcr("Mã sách: LIB-9780140328721-001, vị trí kệ A1");
      expect(result).toEqual({ type: "copy", value: "LIB-9780140328721-001" });
    });

    it("trích xuất ISBN khi không có LIB-", () => {
      const result = extractBookCodeFromOcr("9780140328721");
      expect(result).toEqual({ type: "isbn", value: "9780140328721" });
    });

    it("trả về null khi không tìm thấy", () => {
      expect(extractBookCodeFromOcr("abc def ghi")).toBeNull();
      expect(extractBookCodeFromOcr("")).toBeNull();
    });

    it("Ưu tiên LIB- hơn ISBN", () => {
      const result = extractBookCodeFromOcr("LIB-9780140328721-001 ISBN 9780140328721");
      expect(result).toEqual({ type: "copy", value: "LIB-9780140328721-001" });
    });
  });

  describe("looksLikeBookCode", () => {
    it("phát hiện LIB-", () => {
      expect(looksLikeBookCode("LIB-9780140328721-001")).toBe(true);
    });

    it("phát hiện ISBN-13", () => {
      expect(looksLikeBookCode("9780140328721")).toBe(true);
    });

    it("phát hiện ISBN-10", () => {
      expect(looksLikeBookCode("0140328726")).toBe(true);
    });

    it("trả về false cho văn bản thường", () => {
      expect(looksLikeBookCode("Hello World")).toBe(false);
      expect(looksLikeBookCode("")).toBe(false);
    });
  });
});
