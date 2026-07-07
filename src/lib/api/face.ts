import { AxiosInstance } from "axios";

export function createFaceMethods(client: AxiosInstance) {
  return {
    async enrollBatch(
      files: { frontal: File; right: File; left: File; down: File },
      consentGiven: boolean = true,
      token?: string
    ): Promise<{ job_id: string }> {
      const formData = new FormData();
      formData.append("frontal", files.frontal);
      formData.append("right", files.right);
      formData.append("left", files.left);
      formData.append("down", files.down);
      formData.append("consent_given", String(consentGiven));

      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const response = await client.post("/api/face/enroll-batch", formData, config);
      return response.data;
    },

    async verifyFace(
      imageFile: File,
      targetUserId: string,
      consentGiven: boolean = true
    ): Promise<{ job_id: string }> {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("target_user_id", targetUserId);
      formData.append("consent_given", String(consentGiven));

      const response = await client.post("/api/face/verify", formData);
      return response.data;
    },

    async identifyFace(
      imageFile: File,
      consentGiven: boolean = true
    ): Promise<{ job_id: string }> {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("consent_given", String(consentGiven));

      const response = await client.post("/api/face/identify", formData);
      return response.data;
    },

    async livenessCheck(
      imageFile: File,
      consentGiven: boolean = true
    ): Promise<{ job_id: string }> {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("consent_given", String(consentGiven));

      const response = await client.post("/api/face/liveness", formData);
      return response.data;
    },

    async deleteFaceData(userId: string): Promise<{ job_id: string }> {
      const response = await client.delete(`/api/face/${userId}`);
      return response.data;
    },

    async processFaceImage(formData: FormData): Promise<{ task_id: string; status: string }> {
      const response = await client.post("/api/face/process", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },

    async processFaceImageSync(data: {
      image: string;
      camera_id?: string;
      process_type?: string;
      consent_given?: boolean;
      target_user_id?: string;
      connection_id?: string;
    }): Promise<{
      status: string;
      process_type: string;
      result: Record<string, unknown>;
      processing_time_ms: number;
    }> {
      const response = await client.post("/api/face/process-sync", data);
      return response.data;
    },
  };
}
