import { AxiosInstance } from "axios";
import type { NotificationListResponse } from "../types";

export function createNotificationMethods(client: AxiosInstance) {
  return {
    async getNotifications(params?: {
      unread?: boolean;
      skip?: number;
      limit?: number;
    }): Promise<NotificationListResponse> {
      const query: Record<string, string> = {};
      if (params?.unread !== undefined) query.unread = String(params.unread);
      if (params?.skip !== undefined) query.skip = String(params.skip);
      if (params?.limit !== undefined) query.limit = String(params.limit);
      const response = await client.get<NotificationListResponse>("/api/notifications", {
        params: query,
      });
      return response.data;
    },

    async getUnreadCount(): Promise<number> {
      const response = await client.get<{ count: number }>("/api/notifications/unread-count");
      return response.data.count;
    },

    async markNotificationAsRead(id: string): Promise<void> {
      await client.put(`/api/notifications/${id}/read`);
    },

    async markAllNotificationsAsRead(): Promise<void> {
      await client.put("/api/notifications/read-all");
    },
  };
}
