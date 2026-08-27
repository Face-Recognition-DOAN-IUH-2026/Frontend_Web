/**
 * Classifies an alert message to determine if it is a business/operational warning
 * or a system error.
 */
export function getAlertSeverity(message?: string | null): "warning" | "error" | "info" {
  if (!message) return "info";
  if (
    /chưa|không tìm thấy|hết hạn|khóa|quá hạn|tối đa|vui lòng|đã mượn|đang mượn|tồn tại|hợp lệ|chú ý|lưu ý|yêu cầu/i.test(
      message
    )
  ) {
    return "warning";
  }
  return "error";
}

export function getAlertTitle(message?: string | null): string {
  if (!message) return "Thông báo";
  if (
    /chưa|không tìm thấy|hết hạn|khóa|quá hạn|tối đa|vui lòng|đã mượn|đang mượn|tồn tại|hợp lệ|chú ý|lưu ý|yêu cầu/i.test(
      message
    )
  ) {
    return "Thông báo";
  }
  return "Lỗi";
}
