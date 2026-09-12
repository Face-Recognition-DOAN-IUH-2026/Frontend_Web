/**
 * Event Bus & Multi-Tab Broadcast for Fire Hazards
 * Giúp đồng bộ trạng thái Báo Động Cháy tức thì giữa tất cả các tab trình duyệt
 */

export interface FireAlertEventPayload {
  active: boolean;
  cameraName: string;
  location: string;
  hazardType?: "fire" | "smoke" | "both";
  fireCount: number;
  smokeCount: number;
  timestamp: string;
}

const CHANNEL_NAME = "iuh_library_fire_hazard_channel";
const STORAGE_KEY = "iuh_library_active_fire_hazard";

class FireAlertBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(payload: FireAlertEventPayload | null) => void> = new Set();
  private currentAlert: FireAlertEventPayload | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        if ("BroadcastChannel" in window) {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (event) => {
            const data: FireAlertEventPayload | null = event.data;
            this.currentAlert = data;
            this.notify(data);
          };
        }

        // Lắng nghe storage event (cho trình duyệt cũ hơn hoặc cross-window)
        window.addEventListener("storage", (e) => {
          if (e.key === STORAGE_KEY) {
            try {
              const parsed = e.newValue ? JSON.parse(e.newValue) : null;
              this.currentAlert = parsed;
              this.notify(parsed);
            } catch {}
          }
        });

        // Kiểm tra storage ban đầu
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Chỉ giữ nếu trong vòng 3 phút gần nhất
            if (Date.now() - new Date(parsed.timestamp).getTime() < 3 * 60 * 1000) {
              this.currentAlert = parsed;
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch {}
        }
      } catch (err) {
        console.warn("[FireAlertBus] Init error:", err);
      }
    }
  }

  public publish(alert: FireAlertEventPayload) {
    this.currentAlert = alert;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(alert));
      } catch {}
      if (this.channel) {
        this.channel.postMessage(alert);
      }
      window.dispatchEvent(new CustomEvent("fire_alert_change", { detail: alert }));
    }
    this.notify(alert);
  }

  public clear() {
    this.currentAlert = null;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      if (this.channel) {
        this.channel.postMessage(null);
      }
      window.dispatchEvent(new CustomEvent("fire_alert_change", { detail: null }));
    }
    this.notify(null);
  }

  public subscribe(listener: (payload: FireAlertEventPayload | null) => void): () => void {
    this.listeners.add(listener);
    // Gửi ngay trạng thái hiện tại
    listener(this.currentAlert);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrent(): FireAlertEventPayload | null {
    return this.currentAlert;
  }

  private notify(data: FireAlertEventPayload | null) {
    this.listeners.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error("[FireAlertBus] Listener callback error:", err);
      }
    });
  }
}

export const fireAlertBus = new FireAlertBus();
