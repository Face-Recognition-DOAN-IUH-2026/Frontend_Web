/**
 * OCR cho mã sách trên Web (Tesseract.js client-side).
 *
 * Nhận diện chuỗi mã vạch dạng LIB-<isbn>-<seq> (ví dụ: LIB-9780140328721-001)
 * từ khung hình camera, sau đó chuẩn hóa để gửi lên backend.
 *
 * Xử lý các lỗi phổ biến của OCR:
 * - Chữ O/o đọc nhầm thành số 0 (và ngược lại trong phần ISBN)
 * - Thiếu dấu gạch ngang (LIB9780140328721001 → LIB-9780140328721-001)
 * - Khoảng trắng dư thừa
 */

// Regex tìm mã bản sao: LIB-<isbn 10-13 số>-<seq 1+ số>
// Cho phép thiếu dấu gạch ngang, khoảng trắng, chữ O thay số 0
export const LIB_BARCODE_REGEX = /LIB[-\s]*(\d{10,13})[-\s]*(\d+)/i;

// Regex tìm ISBN thuần (in trên bìa sách): 978/979 + 10 số, hoặc ISBN-10
export const ISBN_REGEX = /(?:97[89]\d{10}|\d{9}[\dXx])/i;

// Các ký tự OCR hay nhầm lẫn trong phần số
const OCR_DIGIT_MAP = {
  O: '0',
  o: '0',
  Q: '0',
  D: '0',
  l: '1',
  I: '1',
  i: '1',
  '|': '1',
  S: '5',
  s: '5',
  B: '8',
  b: '8',
  Z: '2',
  z: '2',
  G: '6',
  g: '6',
  T: '7',
  t: '7',
} as Record<string, string>;

/**
 * Sửa lỗi OCR phổ biến trong chuỗi số: O→0, I→1, S→5, v.v.
 * Chỉ áp dụng cho phần số (không áp dụng cho chữ X ở cuối ISBN-10).
 */
function correctOcrDigits(text: string): string {
  return text.replace(/[OoQDlIi|SsBbZzGgTt]/g, (ch) => OCR_DIGIT_MAP[ch] ?? ch);
}

/**
 * Chuẩn hóa mã vạch LIB- về dạng canonical:
 * LIB-9780140328721-001 (thêm dấu gạch ngang nếu thiếu, padding seq thành 3 chữ số)
 */
export function normalizeLibBarcode(raw: string): string | null {
  const clean = raw.replace(/\s/g, '');

  // Thử match trực tiếp (chuỗi đã sạch, không lỗi OCR)
  const directMatch = clean.match(/^LIB[-\s]*(\d{10,13})[-\s]*(\d+)$/i);
  if (directMatch) {
    const seq = directMatch[2].padStart(3, '0').slice(-3);
    return `LIB-${directMatch[1]}-${seq}`;
  }

  // Nếu không match, thử sửa lỗi OCR chỉ trong phần số (giữ nguyên LIB- prefix)
  const lenientMatch = clean.match(/^LIB[-\s]*([\dOoQDlIi|SsBbZzGgTt]{10,13})[-\s]*([\dOoQDlIi|SsBbZzGgTt]+)$/i);
  if (lenientMatch) {
    const correctedIsbn = correctOcrDigits(lenientMatch[1]);
    const correctedSeq = correctOcrDigits(lenientMatch[2]);
    if (/^\d{10,13}$/.test(correctedIsbn) && /^\d+$/.test(correctedSeq)) {
      const seq = correctedSeq.padStart(3, '0').slice(-3);
      return `LIB-${correctedIsbn}-${seq}`;
    }
  }

  return null;
}

/**
 * Chuẩn hóa ISBN thuần: xóa khoảng trắng, ký tự OCR nhầm, giữ X cuối ISBN-10.
 */
export function normalizeIsbn(raw: string): string | null {
  const clean = raw.replace(/\s/g, '').toUpperCase();
  const isbn = correctOcrDigits(clean);
  // ISBN-13: 13 số bắt đầu 978/979
  if (/^(978|979)\d{10}$/.test(isbn)) return isbn;
  // ISBN-10: 9 số + X hoặc số
  if (/^\d{9}[\dX]$/.test(isbn)) return isbn;
  return null;
}

/**
 * Trích xuất mã sách từ văn bản OCR thô.
 * Ưu tiên trả về mã bản sao LIB-..., nếu không có thì trả về ISBN.
 *
 * Trả về object { type: 'copy' | 'isbn', value: string } hoặc null.
 */
export function extractBookCodeFromOcr(rawText: string): { type: 'copy'; value: string } | { type: 'isbn'; value: string } | null {
  if (!rawText) return null;

  // 1. Thử tìm mã bản sao LIB-...
  const libMatch = rawText.match(LIB_BARCODE_REGEX);
  if (libMatch) {
    const normalized = normalizeLibBarcode(libMatch[0]);
    if (normalized) {
      return { type: 'copy', value: normalized };
    }
  }

  // 2. Thử tìm ISBN thuần
  const isbnMatch = rawText.match(ISBN_REGEX);
  if (isbnMatch) {
    const normalized = normalizeIsbn(isbnMatch[0]);
    if (normalized) {
      return { type: 'isbn', value: normalized };
    }
  }

  return null;
}

/**
 * Kiểm tra xem văn bản OCR có giống mã sách không (dùng để lọc trước khi gọi API nặng).
 */
export function looksLikeBookCode(text: string): boolean {
  if (!text) return false;
  const clean = text.replace(/\s/g, '');
  return /LIB/i.test(clean) || /\b(?:978|979)\d{10}\b/i.test(clean) || /\b\d{9}[\dX]\b/i.test(clean);
}
