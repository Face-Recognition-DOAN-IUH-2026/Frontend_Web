import { AxiosInstance } from 'axios';
import {
  AccessLogList,
  AccessLogPublic,
  CameraEvent,
  FaceResultEvent,
  ActivePatron,
  AccessFrequencyResponse,
  StatsResponse,
  PatronLookupResult,
  KioskResult,
  CameraStatus,
} from '../types';
import { normalizeAccessLog } from './utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80';

export function createAccessMethods(client: AxiosInstance) {
  return {
    async getAccessLogs(
      params?: {
        patronId?: string;
        cameraId?: string;
        status?: string;
        accessType?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
        skip?: number;
        limit?: number;
      }
    ): Promise<AccessLogList> {
      const query: any = {};
      if (params) {
        if (params.patronId) query.patron_id = params.patronId;
        if (params.cameraId) query.camera_id = params.cameraId;
        if (params.status) query.status = params.status;
        if (params.accessType) query.access_type = params.accessType;
        if (params.dateFrom) query.date_from = params.dateFrom;
        if (params.dateTo) query.date_to = params.dateTo;
        if (params.search) query.search = params.search;
        query.skip = params.skip ?? 0;
        query.limit = Math.min(params.limit ?? 50, 200);
      }
      const response = await client.get<AccessLogList | AccessLogPublic[]>("/api/access/logs", { params: query });
      const data = response.data;
      if (Array.isArray(data)) {
        const items = data.map(normalizeAccessLog);
        return { items, total: items.length };
      }
      const items = Array.isArray(data?.items) ? data.items.map(normalizeAccessLog) : [];
      return {
        items,
        total: typeof data?.total === "number" ? data.total : items.length,
      };
    },

    connectAccessSSE(
      onEvent: (event: CameraEvent) => void,
      onConnectionChange?: (connected: boolean) => void,
    ): () => void {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          token = localStorage.getItem('token') || localStorage.getItem('access_token');
        } catch {}
      }
      const url = token
        ? `${API_BASE_URL}/api/access/events?token=${encodeURIComponent(token)}`
        : `${API_BASE_URL}/api/access/events`;
      const es = new EventSource(url, { withCredentials: true });
      es.addEventListener("open", () => onConnectionChange?.(true));
      es.addEventListener("camera_event", (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data) as CameraEvent;
          onEvent(data);
        } catch { /* ignore parse errors */ }
      });
      es.addEventListener("error", () => { onConnectionChange?.(false); });
      return () => es.close();
    },

    connectFaceResultSSE(
      onEvent: (event: FaceResultEvent) => void,
      onConnectionChange?: (connected: boolean) => void,
    ): () => void {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          token = localStorage.getItem('token') || localStorage.getItem('access_token');
        } catch {}
      }
      const url = token
        ? `${API_BASE_URL}/api/access/events?token=${encodeURIComponent(token)}`
        : `${API_BASE_URL}/api/access/events`;
      const es = new EventSource(url, { withCredentials: true });
      es.addEventListener("open", () => onConnectionChange?.(true));
      es.addEventListener("face_result", (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data) as FaceResultEvent;
          onEvent(data);
        } catch { /* ignore parse errors */ }
      });
      es.addEventListener("error", () => { onConnectionChange?.(false); });
      return () => es.close();
    },

    async getRecentLogs(): Promise<AccessLogList> {
      const response = await client.get<AccessLogList | AccessLogPublic[]>("/api/access/recent");
      const data = response.data;
      if (Array.isArray(data)) {
        const items = data.map(normalizeAccessLog);
        return { items, total: items.length };
      }
      const items = Array.isArray(data?.items) ? data.items.map(normalizeAccessLog) : [];
      return {
        items,
        total: typeof data?.total === "number" ? data.total : items.length,
      };
    },

    async getActivePatrons(): Promise<{ items: ActivePatron[]; total: number }> {
      const response = await client.get<{ items: ActivePatron[]; total: number } | any[]>("/api/access/active");
      const data = response.data;
      const rawItems = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const items = rawItems.map((item: any) => ({
        ...item,
        id: item.id || item.patron_id,
        full_name: item.full_name || item.fullName || "",
        student_code: item.student_code || item.studentCode || "",
        entered_at: item.entered_at || item.last_entry_at || item.lastEntryAt || "",
        camera_id: item.camera_id || item.last_entry_camera || item.lastEntryCamera || "",
        image_url: item.image_url || null,
        confidence: item.confidence ?? null,
      }));
      return {
        items,
        total: typeof (data as any)?.total === "number" ? (data as any).total : items.length,
      };
    },

    async forceExitPatron(patronId: string): Promise<void> {
      await client.post("/api/access/force-exit", { patron_id: patronId });
    },

    async getAccessFrequency(params?: { dateFrom?: string; dateTo?: string }): Promise<AccessFrequencyResponse> {
      const query: any = {};
      if (params?.dateFrom) query.date_from = params.dateFrom;
      if (params?.dateTo) query.date_to = params.dateTo;
      const response = await client.get<AccessFrequencyResponse | any[]>("/api/access/frequency", { params: query });
      const data = response.data;
      if (!Array.isArray(data)) {
        return { daily: Array.isArray(data?.daily) ? data.daily : [] };
      }
      const byDate = new Map<string, { date: string; entry: number; exit: number }>();
      data.forEach((row: any) => {
        const date = new Date(row.date).toISOString().split("T")[0];
        const item = byDate.get(date) || { date, entry: 0, exit: 0 };
        const type = row.access_type || row.accessType;
        const count = Number(row.count || 0);
        if (type === "entry") item.entry += count;
        if (type === "exit") item.exit += count;
        byDate.set(date, item);
      });
      return { daily: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) };
    },

    async getStats(): Promise<StatsResponse> {
      const response = await client.get<any>("/api/patrons/stats");
      const data = response.data || {};
      return {
        total_patrons: data.totalPatrons ?? 0,
        active_patrons: data.activePatrons ?? 0,
        today_entries: data.todayEntries ?? 0,
        today_exits: data.todayExits ?? 0,
      };
    },

    async kioskLookup(studentCode?: string, cardNumber?: string): Promise<PatronLookupResult> {
      const params: any = {};
      if (studentCode) params.student_code = studentCode;
      if (cardNumber) params.card_number = cardNumber;
      const response = await client.post<PatronLookupResult>("/api/kiosk/lookup", null, { params });
      return response.data;
    },

    async kioskEnroll(
      imageFile: File, fullName: string, studentCode: string, membershipExpiry: string,
      className?: string, angle: string = "frontal"
    ): Promise<KioskResult> {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("full_name", fullName);
      formData.append("student_code", studentCode);
      formData.append("membership_expiry", membershipExpiry);
      formData.append("angle", angle);
      if (className) formData.append("class_name", className);
      const response = await client.post<KioskResult>("/api/kiosk/enroll", formData);
      return response.data;
    },

    async kioskEnter(imageFile: File, studentCode: string): Promise<KioskResult> {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("student_code", studentCode);
      const response = await client.post<KioskResult>("/api/kiosk/enter", formData);
      return response.data;
    },

    async kioskBatchEnroll(
      imageFrontal: File, imageRight: File, imageLeft: File, imageDown: File,
      fullName: string, studentCode: string, membershipExpiry: string, className?: string,
    ): Promise<KioskResult> {
      const formData = new FormData();
      formData.append("image_frontal", imageFrontal);
      formData.append("image_right", imageRight);
      formData.append("image_left", imageLeft);
      formData.append("image_down", imageDown);
      formData.append("full_name", fullName);
      formData.append("student_code", studentCode);
      formData.append("membership_expiry", membershipExpiry);
      if (className) formData.append("class_name", className);
      const response = await client.post<KioskResult>("/api/kiosk/batch-enroll", formData);
      return response.data;
    },

    async kioskPresence(patronId: string, studentCode: string, deviceId: string): Promise<{ current_status: string; message: string }> {
      const response = await client.post("/api/access/kiosk/presence", { patron_id: patronId, student_code: studentCode, device_id: deviceId });
      return response.data;
    },

    async confirmEntry(patronId: string): Promise<{ current_status: string; message: string }> {
      const response = await client.post(`/api/access/patrons/${patronId}/confirm-entry`);
      return response.data;
    },

    async revertPending(patronId: string): Promise<{ current_status: string; message: string }> {
      const response = await client.post(`/api/access/patrons/${patronId}/revert-pending`);
      return response.data;
    },

    async createKioskApprovalRequest(data: { device_id: string; patron_id: string; student_code: string; fail_image_url?: string; isbns?: string }) {
      const response = await client.post("/api/access/kiosk/approval-request", data);
      return response.data;
    },

    async getPendingApprovalRequests() {
      const response = await client.get("/api/access/kiosk/approval-requests/pending");
      return response.data;
    },

    async getApprovalRequestStatus(code: string) {
      const response = await client.get(`/api/access/kiosk/approval-requests/${code}`);
      return response.data;
    },

    async approveKioskRequest(code: string, approvedBy: string): Promise<{ status: string; event_code: string }> {
      const response = await client.post(`/api/access/kiosk/approval-requests/${code}/approve`, { approved_by: approvedBy });
      return response.data;
    },

    async rejectKioskRequest(code: string, approvedBy: string, reason?: string): Promise<{ status: string; event_code: string }> {
      const response = await client.post(`/api/access/kiosk/approval-requests/${code}/reject`, { approved_by: approvedBy, reason });
      return response.data;
    },

    async kioskEnrollFace(patronId: string, imageFile: File, angle: string = "frontal"): Promise<{ success: boolean; message: string }> {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("angle", angle);
      const response = await client.post(`/api/kiosk/enroll-face/${patronId}`, formData);
      return response.data;
    },

    async getCameraStatus(): Promise<CameraStatus[]> {
      const response = await client.get<CameraStatus[]>("/api/camera/status");
      return response.data;
    },

    async reconnectCamera(cameraId: string): Promise<{ message: string }> {
      const response = await client.post<{ message: string }>(`/api/camera/reconnect/${cameraId}`);
      return response.data;
    },

    async reconnectAllCameras(): Promise<{ message: string; cameras: string[] }> {
      const response = await client.post<{ message: string; cameras: string[] }>("/api/camera/reconnect-all");
      return response.data;
    },
  };
}
