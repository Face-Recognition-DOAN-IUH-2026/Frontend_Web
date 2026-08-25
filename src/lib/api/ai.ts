import { AxiosInstance } from "axios";
import type {
  AICommandCenterSummary,
  AIInsight,
  AIInsightExplanation,
  AIInsightList,
  AIChatResponse,
  AIConfirmResponse,
  AIBookRecommendationResponse,
  CompanionChunk,
} from "../types";

export function createAIMethods(client: AxiosInstance) {
  return {
    async getAICommandCenterSummary(): Promise<AICommandCenterSummary> {
      const response = await client.get<AICommandCenterSummary>("/api/ai/command-center/summary");
      return response.data;
    },

    async refreshAiCommandCenter(): Promise<AICommandCenterSummary> {
      const response = await client.post<AICommandCenterSummary>("/api/ai/command-center/refresh");
      return response.data;
    },

    async getAIInsights(params?: { status?: string; category?: string; severity?: string }): Promise<AIInsightList> {
      const response = await client.get<AIInsightList>("/api/ai/insights", { params });
      return response.data;
    },

    async dismissAIInsight(id: string): Promise<AIInsight> {
      const response = await client.post<AIInsight>(`/api/ai/insights/${id}/dismiss`);
      return response.data;
    },

    async explainAIInsight(id: string): Promise<AIInsightExplanation> {
      const response = await client.get<AIInsightExplanation>(`/api/ai/insights/${id}/explain`);
      return response.data;
    },

    async askAiCommandCenter(question: string): Promise<AIChatResponse> {
      const response = await client.post<AIChatResponse>("/api/ai/command-center/chat", { question });
      return response.data;
    },

    async askAiChat(message: string, sessionId?: string): Promise<AIChatResponse> {
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const userData = storedUser ? JSON.parse(storedUser) : null;
      const role = userData?.role || "staff";

      const endpoint =
        role === "patron"
          ? "/api/ai/patrons/chat"
          : role === "staff"
            ? "/api/ai/staff/chat"
            : "/api/ai/admin/chat";

      const body: Record<string, any> = { message };
      if (sessionId) body.sessionId = sessionId;

      const response = await client.post(endpoint, body);
      return response.data;
    },

    async confirmAction(
      sessionId: string,
      action: "approve" | "reject",
      role?: string
    ): Promise<AIConfirmResponse> {
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const userData = storedUser ? JSON.parse(storedUser) : null;
      const effectiveRole = role || userData?.role || "staff";

      const endpoint =
        effectiveRole === "patron"
          ? "/api/ai/patrons/confirm"
          : effectiveRole === "staff"
            ? "/api/ai/staff/confirm"
            : "/api/ai/admin/confirm";

      const response = await client.post(endpoint, { sessionId, action });
      return response.data;
    },

    async getBookRecommendations(studentCode: string): Promise<AIBookRecommendationResponse> {
      const response = await client.get<AIBookRecommendationResponse>(
        `/api/ai/recommendations/patron/${studentCode}`
      );
      return response.data;
    },

    async streamCompanionChat(
      message: string | undefined,
      audioBase64: string | undefined,
      sessionId: string | undefined,
      onChunk: (chunk: CompanionChunk) => void,
      onError?: (error: Error) => void,
    ): Promise<void> {
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const userData = storedUser ? JSON.parse(storedUser) : null;
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      const body: Record<string, any> = {};
      if (message) body.message = message;
      if (audioBase64) body.audioBase64 = audioBase64;
      if (sessionId) body.sessionId = sessionId;

      try {
        const response = await fetch("/api/ai/companion/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                onChunk(data);
              } catch {}
            }
          }
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
