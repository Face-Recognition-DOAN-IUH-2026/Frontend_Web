import { AxiosInstance } from "axios";
import type {
  PatronCreate,
  PatronLookupResult,
  PatronPublic,
  PatronRegisterRequest,
  PatronUpdate,
  UserPublic,
} from "../types";

export function createPatronMethods(client: AxiosInstance) {
  return {
    searchPatrons: async (
      query?: string,
      status?: string,
      skip: number = 0,
      limit: number = 20
    ): Promise<PatronPublic[]> => {
      const params: any = { skip, limit };
      if (query) params.q = query;
      if (status) params.status = status;
      const response = await client.get<{
        items: PatronPublic[];
        total: number;
      }>("/api/patrons/search", { params });
      return Array.isArray((response.data as any).items)
        ? (response.data as any).items
        : [];
    },

    lookupPatron: async (
      studentCode?: string,
      cardNumber?: string
    ): Promise<PatronLookupResult> => {
      const params: any = {};
      if (studentCode) params.student_code = studentCode;
      if (cardNumber) params.card_number = cardNumber;
      const response = await client.get<PatronLookupResult>(
        "/api/patrons/lookup",
        { params }
      );
      return response.data;
    },

    getPatron: async (id: string): Promise<PatronPublic> => {
      const response = await client.get<PatronPublic>(`/api/patrons/${id}`);
      return response.data;
    },

    createPatron: async (data: PatronCreate): Promise<PatronPublic> => {
      const response = await client.post<PatronPublic>("/api/patrons", data);
      return response.data;
    },

    patronRegister: async (
      data: PatronRegisterRequest
    ): Promise<{
      user: UserPublic;
      access_token: string;
      refresh_token?: string;
    }> => {
      const response = await client.post("/api/patrons/register", data);
      return response.data;
    },

    updatePatron: async (
      id: string,
      data: PatronUpdate
    ): Promise<PatronPublic> => {
      const response = await client.put<PatronPublic>(
        `/api/patrons/${id}`,
        data
      );
      return response.data;
    },

    deletePatron: async (id: string): Promise<void> => {
      await client.delete(`/api/patrons/${id}`);
    },

    restorePatron: async (id: string): Promise<PatronPublic> => {
      const response = await client.put<PatronPublic>(
        `/api/patrons/${id}/restore`,
        {}
      );
      return response.data;
    },

    enrollPatronFace: async (
      patronId: string,
      imageFile: File,
      angle: string = "frontal"
    ): Promise<{ success: boolean; job_id: string; message: string }> => {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("angle", angle);
      const response = await client.post(
        `/api/patrons/${patronId}/enroll-face`,
        formData
      );
      return response.data;
    },

    enrollPatronFaceBatch: async (
      patronId: string,
      files: { frontal: File; right: File; left: File; down: File },
      consent: boolean = true
    ): Promise<{ success: boolean; job_id: string; message: string }> => {
      const formData = new FormData();
      formData.append("frontal", files.frontal);
      formData.append("right", files.right);
      formData.append("left", files.left);
      formData.append("down", files.down);
      formData.append("consent_given", String(consent));
      const response = await client.post(
        `/api/patrons/${patronId}/enroll-batch`,
        formData
      );
      return response.data;
    },
  };
}
