export const CONDITION_CODES = ["new", "good", "minor_damage", "major_damage", "lost"] as const;
export type CopyCondition = typeof CONDITION_CODES[number];

export const CONDITION_LABELS: Record<CopyCondition, string> = {
  new: "Mới",
  good: "Bình thường",
  minor_damage: "Hư nhẹ",
  major_damage: "Hư nặng",
  lost: "Thất lạc",
};

export const COPY_STATUS_CODES = ["available", "borrowed", "maintenance", "disposed"] as const;
export type CopyStatus = typeof COPY_STATUS_CODES[number];

export const COPY_STATUS_LABELS: Record<CopyStatus, string> = {
  available: "Sẵn sàng",
  borrowed: "Đang mượn",
  maintenance: "Bảo quản",
  disposed: "Loại bỏ",
};

export function getConditionColor(condition?: string | null): "success" | "warning" | "error" | "default" {
  switch (condition) {
    case "new":
    case "good":
      return "success";
    case "minor_damage":
      return "warning";
    case "major_damage":
      return "error";
    case "lost":
    default:
      return "default";
  }
}

export function getStatusColor(status?: string | null): "success" | "primary" | "warning" | "error" | "default" {
  switch (status) {
    case "available":
      return "success";
    case "borrowed":
      return "primary";
    case "maintenance":
      return "warning";
    case "disposed":
      return "error";
    default:
      return "default";
  }
}
