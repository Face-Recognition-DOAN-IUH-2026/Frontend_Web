"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import "@n8n/chat/dist/style.css";

export interface N8nChatWidgetProps {
  /**
   * Tùy chọn ghi đè Webhook URL nếu không dùng process.env.NEXT_PUBLIC_CHAT_WEBHOOK_URL
   */
  webhookUrl?: string;
  /**
   * Danh sách tiền tố đường dẫn không hiển thị chatbot (mặc định loại trừ kiosk gate)
   */
  disabledPaths?: string[];
  /**
   * Nếu đặt là true, chatbot sẽ hiển thị trên tất cả các trang
   */
  showOnAllPages?: boolean;
}

const DEFAULT_DISABLED_PATHS = ["/gate"];

export default function N8nChatWidget({
  webhookUrl: propWebhookUrl,
  disabledPaths = DEFAULT_DISABLED_PATHS,
  showOnAllPages = false,
}: N8nChatWidgetProps) {
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const [initError, setInitError] = useState<string | null>(null);
  const appRef = useRef<{ unmount: () => void } | null>(null);

  // Chatbot n8n la kenh cua doc gia (patron) va khach (guest).
  // Staff/admin dung trang /ai-assistant noi bo nen an widget de tranh nham lan.
  const isStaffUser = user?.role === "staff" || user?.role === "admin";

  const activeWebhookUrl = useMemo(() => {
    return (
      propWebhookUrl ||
      process.env.NEXT_PUBLIC_CHAT_WEBHOOK_URL ||
      ""
    );
  }, [propWebhookUrl]);

  // Kiểm tra trang hiện tại có thuộc danh sách tắt không
  const isPageDisabled = useMemo(() => {
    if (showOnAllPages) return false;
    if (!pathname) return false;
    return disabledPaths.some((p) => pathname.startsWith(p));
  }, [pathname, showOnAllPages, disabledPaths]);

  useEffect(() => {
    const cleanup = () => {
      if (appRef.current) {
        try {
          appRef.current.unmount();
        } catch (e) {
          console.error("[N8nChatWidget] Lỗi khi unmount:", e);
        }
        appRef.current = null;
      }
      document.querySelector("#n8n-chat-widget-root")?.remove();
    };

    // Cho auth resolve xong; an widget voi staff/admin
    if (authLoading) return;
    if (isStaffUser) {
      cleanup();
      return;
    }

    // Nếu trang hiện tại bị vô hiệu hóa hoặc không có Webhook URL, không khởi tạo
    if (isPageDisabled) {
      cleanup();
      return;
    }

    if (!activeWebhookUrl) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[N8nChatWidget] Cảnh báo: Biến môi trường NEXT_PUBLIC_CHAT_WEBHOOK_URL chưa được cấu hình. Widget chatbot tạm thời ẩn."
        );
      }
      return;
    }

    let isSubscribed = true;
    const targetId = "n8n-chat-widget-root";

    // Đảm bảo phần tử mục tiêu tồn tại trên DOM
    let targetEl = document.getElementById(targetId);
    if (!targetEl) {
      targetEl = document.createElement("div");
      targetEl.id = targetId;
      document.body.appendChild(targetEl);
    }

    const loadChat = async () => {
      try {
        const { createChat } = await import("@n8n/chat");
        if (!isSubscribed) return;

        // Khởi tạo widget n8n chat với các tùy chọn chuẩn
        const chatApp = createChat({
          target: `#${targetId}`,
          webhookUrl: activeWebhookUrl,
          mode: "window",
          showWelcomeScreen: true,
          defaultLanguage: "en",
          initialMessages: [
            "Xin chào! 👋 Tôi là trợ lý AI của Thư viện IUH.",
            "Tôi có thể giúp bạn tra cứu tài liệu, trả lời câu hỏi về sách và giải đáp thắc mắc liên quan đến thư viện.",
            "Hãy đặt câu hỏi để bắt đầu! 📚",
          ],
          i18n: {
            en: {
              title: "Trợ lý AI Thư viện IUH",
              subtitle: "Hỏi đáp thông minh dựa trên tài liệu",
              inputPlaceholder: "Nhập câu hỏi về sách, tài liệu...",
              getStarted: "Bắt đầu trò chuyện",
              closeButtonTooltip: "Đóng cửa sổ chat",
              footer: "",
            },
          },
          enableStreaming: true,
          loadPreviousSession: true,
          allowFileUploads: false,
          metadata: {},
        });

        appRef.current = chatApp;
        setInitError(null);
      } catch (err: unknown) {
        console.error("[N8nChatWidget] Lỗi khởi tạo widget @n8n/chat:", err);
        // Lưu lỗi thân thiện, không throw để tránh làm sập layout
        if (isSubscribed) {
          setInitError("Không thể kết nối với dịch vụ trợ lý chatbot n8n.");
        }
      }
    };

    loadChat();

    // Dọn dẹp an toàn khi unmount hoặc đổi trạng thái (tránh duplicate trong React StrictMode)
    return () => {
      isSubscribed = false;
      if (appRef.current) {
        try {
          appRef.current.unmount();
        } catch (e) {
          console.error("[N8nChatWidget] Lỗi dọn dẹp widget:", e);
        }
        appRef.current = null;
      }
      const el = document.getElementById(targetId);
      if (el) {
        el.remove();
      }
    };
  }, [activeWebhookUrl, isPageDisabled, isStaffUser, authLoading]);

  // Thông báo lỗi nhỏ khi khởi tạo thất bại (chỉ hiển thị kín đáo nếu cần gỡ lỗi)
  if (initError && process.env.NODE_ENV === "development") {
    return (
      <div
        style={{ display: "none" }}
        data-testid="n8n-chat-error"
        aria-hidden="true"
      >
        {initError}
      </div>
    );
  }

  return null;
}
