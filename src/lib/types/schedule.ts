export interface ScheduleStaff {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
  status: string;
}

export interface LibraryZone {
  id: string;
  floor: number;
  zoneName: string;
  description: string | null;
  isActive: boolean;
}

export interface StaffShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  minStaff: number;
  maxStaff: number | null;
  isActive: boolean;
}

export interface StaffScheduleAssignment {
  id: string;
  staffId: string;
  shiftId: string;
  zoneId: string;
  workDate: string;
  status: string;
  assignedBy: string | null;
  note: string | null;
  shift?: StaffShift | null;
  zone?: LibraryZone | null;
  staff?: ScheduleStaff | null;
  attendance?: StaffAttendance | null;
}

export interface StaffAttendance {
  id: string;
  scheduleId: string;
  staffId: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  method: string;
  invalidatedReason: string | null;
  deletedAt: string | null;
}

export interface ScheduleAssignmentList {
  items: StaffScheduleAssignment[];
  total: number;
}

export interface GeofenceConfig {
  id: string;
  zoneId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  addressHint: string | null;
  allowedWifiSsids: string[] | null;
  isActive: boolean;
  zone?: LibraryZone | null;
}

export interface ManualCheckInRequest {
  id: string;
  scheduleId: string;
  staffId: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
  method: string;
  invalidatedReason: string | null;
  deletedAt: string | null;
  schedule?: StaffScheduleAssignment | null;
  staff?: ScheduleStaff | null;
}
