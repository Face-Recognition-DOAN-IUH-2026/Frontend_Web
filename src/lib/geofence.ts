/**
 * Đánh giá vị trí geofence phía client — CHỈ dùng để hiển thị bản đồ/trạng thái.
 * Server luôn tính lại (`verifyCheckInGeofence`) nên client không thể bỏ qua bước xác thực.
 *
 * Quy tắc khớp backend: bán kính hiệu dụng = radiusMeters + toleranceMeters (sai số GPS).
 */
export const GPS_TOLERANCE_METERS = 15;

const EARTH_RADIUS_METERS = 6371e3;

export interface GeofenceArea {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface GeofenceEvaluation {
  /** Vị trí nằm trong vùng cho phép (đã cộng sai số GPS) hay không. */
  allowed: boolean;
  /** Khoảng cách Haversine thực tế tới tâm geofence. */
  distanceMeters: number;
  /** Bán kính hiệu dụng dùng để đánh giá. */
  effectiveRadiusMeters: number;
  /** Số mét vượt quá bán kính (0 nếu nằm trong vùng). */
  overflowMeters: number;
}

export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function evaluateGeofence(
  userLat: number,
  userLng: number,
  area: GeofenceArea,
  toleranceMeters: number = GPS_TOLERANCE_METERS,
): GeofenceEvaluation {
  const distanceMeters = haversineDistanceMeters(userLat, userLng, area.latitude, area.longitude);
  const effectiveRadiusMeters = area.radiusMeters + toleranceMeters;
  const allowed = distanceMeters <= effectiveRadiusMeters;

  return {
    allowed,
    distanceMeters,
    effectiveRadiusMeters,
    overflowMeters: allowed ? 0 : Math.round(distanceMeters - effectiveRadiusMeters),
  };
}
