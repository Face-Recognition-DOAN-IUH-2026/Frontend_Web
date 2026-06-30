/**
 * Shared utility functions for the design system.
 */

/** Extract initials from a name (max 2 characters). */
export function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Format date as DD/MM/YYYY. */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Format datetime as DD/MM/YYYY HH:mm. */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format time as HH:mm. */
export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/** Get human-readable label for user status. */
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Đang hoạt động",
    inactive: "Ngừng hoạt động",
    suspended: "Bị đình chỉ",
    unverified: "Chưa xác thực",
    deleted: "Đã xóa",
    outside: "Ở ngoài",
    inside: "Ở trong",
    borrowed: "Đang mượn",
    overdue: "Quá hạn",
    returned: "Đã trả",
    pending: "Đang chờ",
    approved: "Đã duyệt",
    rejected: "Bị từ chối",
  };
  return map[status] || status;
}

/** Get MUI color for a status value. */
export function statusColor(status: string): "success" | "error" | "warning" | "info" | "default" {
  const map: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
    active: "success",
    inactive: "default",
    suspended: "error",
    unverified: "warning",
    deleted: "error",
    outside: "info",
    inside: "success",
    borrowed: "info",
    overdue: "error",
    returned: "success",
    pending: "warning",
    approved: "success",
    rejected: "error",
  };
  return map[status] || "default";
}

/** Get human-readable label for user role. */
export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: "Quản trị viên",
    staff: "Nhân viên",
    patron: "Độc giả",
  };
  return map[role] || role;
}

/** Truncate a string to a given length with ellipsis. */
export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/** Generate a color from a string (for avatars). */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}
