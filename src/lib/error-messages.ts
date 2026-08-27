/**
 * error-messages.ts
 *
 * Centralised lookup table that maps raw backend error strings
 * (often lacking diacritics or using technical English) to
 * friendly, properly-accented Vietnamese messages shown to users.
 *
 * Strategy:
 *  1. Exact match first (fastest).
 *  2. Pattern/substring match for dynamic messages (e.g. contains a title or barcode).
 *  3. Fallback: return the original string cleaned up.
 */

// ---------------------------------------------------------------------------
// Exact-match table
// Keys are lowercased and trimmed for comparison.
// ---------------------------------------------------------------------------
const EXACT_MAP: Record<string, string> = {
  // Auth / Token
  "invalid or expired token": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  "unauthorized": "Bạn không có quyền thực hiện thao tác này.",
  "forbidden": "Truy cập bị từ chối.",
  "not authenticated": "Vui lòng đăng nhập để tiếp tục.",

  // Access / Library presence
  "ban phai co mat trong thu vien de muon sach. vui long quet the tai cua vao.":
    "Bạn chưa có mặt trong thư viện. Vui lòng quét thẻ tại cửa vào trước khi mượn sách.",
  "ban phai co mat trong thu vien de muon sach":
    "Bạn chưa có mặt trong thư viện. Vui lòng quét thẻ tại cửa vào.",
  "độc giả không có mặt trong thư viện.":
    "Độc giả chưa có mặt trong thư viện. Vui lòng cho độc giả quét thẻ tại cửa vào.",
  "doc gia khong co mat trong thu vien":
    "Độc giả chưa có mặt trong thư viện. Vui lòng cho độc giả quét thẻ tại cửa vào.",

  // Book / Copy not found
  "khong co sach nay trong thu vien": "Sách này không có trong thư viện.",
  "khong tim thay ban sao nao": "Không tìm thấy bản sao của sách này.",
  "khong tim thay sach": "Không tìm thấy sách.",
  "sach nay hien da het ban co the muon": "Sách này hiện đã hết bản có thể mượn.",
  "sach nay da het ban co the muon": "Sách này hiện đã hết bản có thể mượn.",
  "bản sao nay hien dang duoc muon": "Bản sao này hiện đang được mượn.",

  // Already borrowed / Overdue
  "sach nay ban dang muon": "Bạn đang mượn cuốn sách này rồi.",
  "ban co sách quá hạn. vui long tra sach truoc khi muon them.":
    "Bạn có sách quá hạn. Vui lòng trả sách trước khi mượn thêm.",
  "ban co sach qua han. vui long tra sach truoc khi muon them.":
    "Bạn có sách quá hạn. Vui lòng trả sách trước khi mượn thêm.",
  "độc giả có sách quá hạn. vui long tra sach truoc khi muon them.":
    "Độc giả có sách quá hạn. Vui lòng trả sách trước khi mượn thêm.",
  "doc gia co sach qua han":
    "Độc giả có sách quá hạn. Vui lòng trả sách trước khi mượn thêm.",

  // Borrow limit
  "qua gioi han muon sach": "Đã vượt quá giới hạn số sách được mượn.",

  // Patron not found
  "không tìm thấy độc giả": "Không tìm thấy thông tin độc giả. Vui lòng kiểm tra lại mã sinh viên.",
  "khong tim thay doc gia": "Không tìm thấy thông tin độc giả. Vui lòng kiểm tra lại mã sinh viên.",
  "patron not found": "Không tìm thấy thông tin độc giả.",

  // Renewal
  "khong tim thay phieu muon": "Không tìm thấy phiếu mượn.",
  "phieu muon nay da het hieu luc": "Phiếu mượn này đã hết hiệu lực.",
  "khong the gia han sách quá hạn. vui long tra sach va muon lai.":
    "Không thể gia hạn sách đã quá hạn. Vui lòng trả sách và mượn lại.",
  "khong the gia han sach qua han":
    "Không thể gia hạn sách đã quá hạn. Vui lòng trả sách và mượn lại.",

  // Data / Validation
  "dữ liệu độc giả không hợp lệ": "Thông tin độc giả không hợp lệ. Vui lòng liên hệ thủ thư.",
  "id độc giả không hợp lệ": "Mã độc giả không hợp lệ. Vui lòng liên hệ thủ thư.",
  "dữ liệu không hợp lệ: copy_id không khớp với book_id":
    "Dữ liệu không hợp lệ. Vui lòng thử lại hoặc liên hệ thủ thư.",
  "dữ liệu không hợp lệ: barcode không khớp":
    "Mã vạch không khớp. Vui lòng quét lại sách.",

  // Network / Server
  "network error": "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.",
  "internal server error": "Hệ thống gặp sự cố. Vui lòng thử lại sau ít phút.",
  "service unavailable": "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.",
  "timeout": "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.",
  "request timeout": "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.",

  // Face Recognition
  "face not recognized": "Không nhận diện được khuôn mặt. Vui lòng thử lại ở nơi đủ sáng.",
  "no face detected": "Không phát hiện được khuôn mặt. Vui lòng nhìn thẳng vào camera.",
  "face already registered": "Khuôn mặt này đã được đăng ký trong hệ thống.",
  "face verification failed": "Xác minh khuôn mặt thất bại. Vui lòng thử lại.",
  "liveness check failed": "Kiểm tra người thật thất bại. Vui lòng thực hiện lại theo hướng dẫn.",

  // Generic fallbacks
  "bad request": "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.",
  "conflict": "Xảy ra xung đột dữ liệu. Vui lòng làm mới trang và thử lại.",
  "not found": "Không tìm thấy thông tin yêu cầu.",
  "lỗi không xác định": "Đã xảy ra lỗi không xác định. Vui lòng thử lại.",
  "unknown error": "Đã xảy ra lỗi không xác định. Vui lòng thử lại.",
};

// ---------------------------------------------------------------------------
// Pattern-match table  (order matters — first match wins)
// ---------------------------------------------------------------------------
interface ErrorPattern {
  pattern: RegExp;
  message: string | ((match: RegExpMatchArray) => string);
}

const PATTERNS: ErrorPattern[] = [
  // "Phiên làm việc đã hết hạn (Xh). Vui lòng vào lại qua cổng."
  {
    pattern: /phi[eê]n l[àa]m vi[eê]c đ[aã] h[eê]t h[aạ]n \((\d+)h\)/i,
    message: (m) =>
      `Phiên làm việc đã hết hạn (${m[1]} giờ). Vui lòng quét thẻ tại cổng để vào lại thư viện.`,
  },
  {
    pattern: /phi[eê]n.*h[eê]t h[aạ]n.*c[oô]ng/i,
    message:
      "Phiên làm việc đã hết hạn. Vui lòng quét thẻ tại cổng để vào lại thư viện.",
  },

  // "Đã quá giới hạn mượn sách (tối đa N cuốn)"
  {
    pattern: /(?:da qua|qua|đã quá) gioi han muon sach.*?(\d+)\s*cu[oô]n/i,
    message: (m) =>
      `Đã đạt giới hạn mượn sách. Bạn chỉ được mượn tối đa ${m[1]} cuốn cùng lúc.`,
  },
  {
    pattern: /qua gioi han muon sach/i,
    message: "Đã đạt giới hạn số sách được phép mượn.",
  },

  // "Đã đạt giới hạn gia hạn tối đa N lần"
  {
    pattern: /da dat gioi han gia han.*?(\d+)\s*l[aâ]n/i,
    message: (m) =>
      `Sách đã được gia hạn tối đa ${m[1]} lần. Vui lòng trả sách và mượn lại nếu cần.`,
  },

  // "Không tìm thấy bản sao nào với mã vạch XXX"
  {
    pattern: /khong tim thay ban sao.*?ma vach (.+)$/i,
    message: (m) =>
      `Không tìm thấy sách với mã vạch "${m[1].trim()}". Vui lòng kiểm tra lại.`,
  },

  // "Bản sao XXX đang được mượn"
  {
    pattern: /b[aả]n sao (.+?) dang du[oơ]c muon/i,
    message: (m) => `Bản sao "${m[1]}" hiện đang được mượn. Vui lòng chọn bản khác.`,
  },

  // "Sách "TITLE" đã được độc giả này mượn"
  {
    pattern: /s[aá]ch\s*[«""](.+?)["""»]\s*(?:da|đã)\s*(?:du[oơ]c|được)\s*(?:doc gia|độc giả)/i,
    message: (m) =>
      `Sách "${m[1].trim()}" đã được độc giả này mượn rồi.`,
  },

  // "Mỗi phiếu mượn tối đa N cuốn"
  {
    pattern: /moi phieu muon toi da (\d+) cu[oô]n/i,
    message: (m) =>
      `Mỗi phiếu mượn chỉ được tối đa ${m[1]} cuốn sách.`,
  },

  // "Bản sao UUID không tồn tại" — hide UUID
  {
    pattern: /b[aả]n sao\s+[0-9a-f-]{8,36}\s+kh[oô]ng t[oồ]n t[aạ]i/i,
    message: "Bản sao sách không tồn tại trong hệ thống. Vui lòng liên hệ thủ thư.",
  },

  // "Sách UUID không tồn tại" — hide UUID
  {
    pattern: /s[aá]ch\s+[0-9a-f-]{8,36}\s+kh[oô]ng t[oồ]n t[aạ]i/i,
    message: "Sách không tồn tại trong hệ thống. Vui lòng liên hệ thủ thư.",
  },

  // Zod / validation errors
  {
    pattern: /required|is required/i,
    message: "Vui lòng điền đầy đủ thông tin bắt buộc.",
  },
  {
    pattern: /invalid.*uuid/i,
    message: "Dữ liệu định danh không hợp lệ. Vui lòng thử lại.",
  },

  // HTTP 5xx generic
  {
    pattern: /5\d\d|internal server|server error/i,
    message: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.",
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Translate a raw backend error string into a user-friendly Vietnamese message.
 * Returns the original string if no mapping is found.
 */
export function translateError(raw: string): string {
  const key = raw.trim().toLowerCase();

  // 1. Exact match
  if (EXACT_MAP[key]) return EXACT_MAP[key];

  // 2. Pattern match
  for (const { pattern, message } of PATTERNS) {
    const m = raw.match(pattern);
    if (m) {
      return typeof message === "function" ? message(m) : message;
    }
  }

  // 3. Return cleaned-up original
  return raw;
}
