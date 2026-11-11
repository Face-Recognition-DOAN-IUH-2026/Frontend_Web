import { AxiosInstance } from 'axios';
import {
  ScheduleStaff,
  LibraryZone,
  StaffShift,
  ScheduleAssignmentList,
  StaffScheduleAssignment,
  ManualCheckInRequest,
} from '../types';

export function createScheduleMethods(client: AxiosInstance) {
  return {
    async getScheduleStaffOptions(): Promise<ScheduleStaff[]> {
      const response = await client.get<ScheduleStaff[]>("/api/schedules/staff-options");
      return response.data;
    },

    async getScheduleZones(): Promise<LibraryZone[]> {
      const response = await client.get<LibraryZone[]>("/api/schedules/zones");
      return response.data;
    },

    async createScheduleZone(data: Partial<LibraryZone>): Promise<LibraryZone> {
      const response = await client.post<LibraryZone>("/api/schedules/zones", data);
      return response.data;
    },

    async deleteScheduleZone(id: string): Promise<{ deleted: boolean; id: string }> {
      const response = await client.delete<{ deleted: boolean; id: string }>(`/api/schedules/zones/${id}`);
      return response.data;
    },

    async getScheduleShifts(): Promise<StaffShift[]> {
      const response = await client.get<StaffShift[]>("/api/schedules/shifts");
      return response.data;
    },

    async createScheduleShift(data: Partial<StaffShift>): Promise<StaffShift> {
      const response = await client.post<StaffShift>("/api/schedules/shifts", data);
      return response.data;
    },

    async deleteScheduleShift(id: string): Promise<{ deleted: boolean; id: string }> {
      const response = await client.delete<{ deleted: boolean; id: string }>(`/api/schedules/shifts/${id}`);
      return response.data;
    },

    async getScheduleAssignments(params?: { from?: string; to?: string; staffId?: string; zoneId?: string; shiftId?: string; status?: string }): Promise<ScheduleAssignmentList> {
      const query: any = {};
      if (params?.from) query.from = params.from;
      if (params?.to) query.to = params.to;
      if (params?.staffId) query.staff_id = params.staffId;
      if (params?.zoneId) query.zone_id = params.zoneId;
      if (params?.shiftId) query.shift_id = params.shiftId;
      if (params?.status) query.status = params.status;
      const response = await client.get<ScheduleAssignmentList>("/api/schedules/assignments", { params: query });
      return response.data;
    },

    async createScheduleAssignment(data: { staffId: string; shiftId: string; zoneId: string; workDate: string; note?: string | null }): Promise<StaffScheduleAssignment> {
      const response = await client.post<StaffScheduleAssignment>("/api/schedules/assignments", data);
      return response.data;
    },

    async createScheduleAssignmentsBulk(data: Array<{ staffId: string; shiftId: string; zoneId: string; workDate: string; note?: string | null }>): Promise<StaffScheduleAssignment[]> {
      const response = await client.post<StaffScheduleAssignment[]>("/api/schedules/assignments/bulk", data);
      return response.data;
    },

    async moveScheduleAssignment(id: string, data: Partial<StaffScheduleAssignment>): Promise<StaffScheduleAssignment> {
      const response = await client.post<StaffScheduleAssignment>(`/api/schedules/assignments/${id}/move`, data);
      return response.data;
    },

    async deleteScheduleAssignment(id: string): Promise<{ deleted: boolean; id: string }> {
      const response = await client.delete<{ deleted: boolean; id: string }>(`/api/schedules/assignments/${id}`);
      return response.data;
    },

    async getMySchedules(params?: { from?: string; to?: string }): Promise<ScheduleAssignmentList> {
      const response = await client.get<ScheduleAssignmentList>("/api/schedules/me", { params });
      return response.data;
    },

    async confirmScheduleAssignment(id: string): Promise<StaffScheduleAssignment> {
      const response = await client.post<StaffScheduleAssignment>(`/api/schedules/assignments/${id}/confirm`);
      return response.data;
    },

    async checkInScheduleAssignment(id: string, options?: { method?: string; lat?: number; lng?: number }): Promise<any> {
      const response = await client.post(`/api/schedules/assignments/${id}/check-in`, { method: options?.method || "web", lat: options?.lat, lng: options?.lng });
      return response.data;
    },

    async checkOutScheduleAssignment(id: string): Promise<any> {
      const response = await client.post(`/api/schedules/assignments/${id}/check-out`);
      return response.data;
    },

    async autoSchedule(data: { from: string; to: string }): Promise<any> {
      const response = await client.post<any>("/api/schedules/auto-schedule", data);
      return response.data;
    },

    async getGeofenceConfigs(): Promise<any[]> {
      const response = await client.get<any>("/api/schedules/geofence");
      return response.data;
    },

    async setGeofenceConfig(data: { zoneId?: string | null; latitude: number; longitude: number; radiusMeters?: number; addressHint?: string | null; allowedWifiSsids?: string[] | null; isGlobal?: boolean }): Promise<any> {
      const response = await client.put("/api/schedules/geofence", data);
      return response.data;
    },

    async deleteGeofenceConfig(zoneId: string): Promise<any> {
      const response = await client.delete(`/api/schedules/geofence/${zoneId}`);
      return response.data;
    },

    async adminConfirmAssignment(id: string): Promise<StaffScheduleAssignment> {
      const response = await client.post<StaffScheduleAssignment>(`/api/schedules/assignments/${id}/admin-confirm`);
      return response.data;
    },

    async adminFixAttendance(scheduleId: string, data: { checkInAt?: string; checkOutAt?: string; status?: string }): Promise<any> {
      const response = await client.put(`/api/schedules/assignments/${scheduleId}/attendance`, data);
      return response.data;
    },

    async autoCheckout(): Promise<{ checkedOut: number }> {
      const response = await client.post<{ checkedOut: number }>("/api/schedules/auto-checkout");
      return response.data;
    },

    async getAuditLogs(params?: {
      page?: number; limit?: number; category?: string; action?: string; entityType?: string;
      actorId?: string; fromDate?: string; toDate?: string; search?: string;
    }): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
      const query: any = {};
      if (params?.page) query.page = params.page;
      if (params?.limit) query.limit = params.limit;
      if (params?.category) query.category = params.category;
      if (params?.action) query.action = params.action;
      if (params?.entityType) query.entityType = params.entityType;
      if (params?.actorId) query.actorId = params.actorId;
      if (params?.fromDate) query.fromDate = params.fromDate;
      if (params?.toDate) query.toDate = params.toDate;
      if (params?.search) query.search = params.search;
      const response = await client.get<any>("/api/schedules/audit-logs", { params: query });
      return response.data;
    },

    async getAuditStats(params?: { fromDate?: string; toDate?: string }): Promise<any> {
      const query: any = {};
      if (params?.fromDate) query.fromDate = params.fromDate;
      if (params?.toDate) query.toDate = params.toDate;
      const response = await client.get<any>("/api/schedules/audit-logs/stats", { params: query });
      return response.data;
    },

    async getScheduleTemplates(): Promise<any[]> {
      const response = await client.get<any[]>("/api/schedules/templates");
      return response.data;
    },

    async createScheduleTemplate(data: any): Promise<any> {
      const response = await client.post<any>("/api/schedules/templates", data);
      return response.data;
    },

    async deleteScheduleTemplate(id: string): Promise<any> {
      const response = await client.delete(`/api/schedules/templates/${id}`);
      return response.data;
    },

    async deleteWeekScheduleAssignments(from: string, to: string, notify: boolean): Promise<{ cancelled: number; skipped: number; message: string }> {
      const response = await client.delete("/api/schedules/assignments/week", { data: { from, to, notify } });
      return response.data;
    },

    async requestManualCheckIn(assignmentId: string, note: string): Promise<any> {
      const response = await client.post("/api/schedules/attendance/manual-checkin", { assignmentId, note });
      return response.data;
    },

    async listManualCheckInRequests(status?: string): Promise<ManualCheckInRequest[]> {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const response = await client.get<ManualCheckInRequest[]>("/api/schedules/attendance/manual-checkin-requests", { params });
      return response.data;
    },

    async approveManualCheckIn(attendanceId: string, checkInAt?: string): Promise<any> {
      const body: Record<string, string> = {};
      if (checkInAt) body.checkInAt = checkInAt;
      const response = await client.put(`/api/schedules/attendance/${attendanceId}/approve-manual`, body);
      return response.data;
    },

    async rejectManualCheckIn(attendanceId: string, reason: string): Promise<any> {
      const response = await client.put(`/api/schedules/attendance/${attendanceId}/reject-manual`, { reason });
      return response.data;
    },
  };
}
