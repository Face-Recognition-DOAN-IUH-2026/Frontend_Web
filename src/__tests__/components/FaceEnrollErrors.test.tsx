import { extractFailedAngles, mapEnrollError, ANGLE_VI_LABELS } from "@/lib/face-enroll-errors";

describe("face-enroll-errors", () => {
  describe("mapEnrollError", () => {
    it("map mã lỗi backend sang tiếng Việt", () => {
      expect(mapEnrollError("LIVENESS_FAILED", "fallback")).toMatch(/khuôn mặt thật/);
      expect(mapEnrollError("NO_FACE_DETECTED", "fallback")).toMatch(/Không tìm thấy khuôn mặt/);
      expect(mapEnrollError("MULTIPLE_FACES", "fallback")).toMatch(/nhiều hơn 1/);
      expect(mapEnrollError("LOW_QUALITY", "fallback")).toMatch(/mờ hoặc thiếu sáng/);
      expect(mapEnrollError("FACE_DETECTION_FAILED", "fallback")).toMatch(/trích xuất/);
    });

    it("giữ nguyên câu lỗi thân thiện từ server, fallback khi là mã lạ", () => {
      expect(mapEnrollError("Quá thời gian chờ kết quả.", "fallback")).toBe("Quá thời gian chờ kết quả.");
      expect(mapEnrollError("SOME_UNKNOWN_CODE", "fallback")).toBe("fallback");
      expect(mapEnrollError(null, "fallback")).toBe("fallback");
    });
  });

  describe("extractFailedAngles", () => {
    it("trích đúng góc lỗi kèm nhãn tiếng Việt từ result worker", () => {
      const result = {
        status: "error",
        error: "1 angle(s) failed, all rolled back",
        results: [
          { angle: "frontal", status: "success" },
          { angle: "right", status: "error", error: "LOW_QUALITY" },
          { angle: "left", status: "success" },
          { angle: "down", status: "success" },
        ],
      };
      const failed = extractFailedAngles(result);
      expect(failed).toEqual([{ angle: "right", label: "Quay phải", error: "LOW_QUALITY" }]);
    });

    it("trả rỗng khi result không có chi tiết từng góc", () => {
      expect(extractFailedAngles(null)).toEqual([]);
      expect(extractFailedAngles({})).toEqual([]);
      expect(
        extractFailedAngles({ status: "success", results: [{ angle: "frontal", status: "success" }] })
      ).toEqual([]);
    });

    it("nhãn góc đầy đủ 4 góc", () => {
      expect(ANGLE_VI_LABELS).toEqual({
        frontal: "Nhìn thẳng",
        right: "Quay phải",
        left: "Quay trái",
        down: "Cúi xuống",
      });
    });
  });
});
