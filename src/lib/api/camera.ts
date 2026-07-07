import { AxiosInstance } from "axios";
import type { CameraStatus } from "../types";

export function createCameraMethods(client: AxiosInstance) {
  return {
    async getCameraStatus(): Promise<CameraStatus[]> {
      const response = await client.get<CameraStatus[]>("/api/camera/status");
      return response.data;
    },

    async reconnectCamera(cameraId: string): Promise<{ message: string }> {
      const response = await client.post(`/api/camera/reconnect/${cameraId}`);
      return response.data;
    },

    async reconnectAllCameras(): Promise<{ message: string; cameras: string[] }> {
      const response = await client.post("/api/camera/reconnect-all");
      return response.data;
    },
  };
}
