"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

export type ToastSeverity = "success" | "error" | "warning" | "info";

interface ToastState {
  id: number;
  message: string;
  severity: ToastSeverity;
}

export type ToastFn = {
  (message: string, severity?: ToastSeverity): void;
  (severity: ToastSeverity, message: string): void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

export interface ToastContextValue {
  toast: ToastFn;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải được dùng bên trong <ToastProvider>");
  return ctx;
}

const VALID_SEVERITIES = new Set<ToastSeverity>(["success", "error", "warning", "info"]);

/**
 * Toast thông báo toàn cục, hiển thị góc phải phía trên.
 * Mọi màn hình (dashboard, kiosk, login) đều dùng được qua useToast().
 * Thông báo mới nhất sẽ thay thế thông báo đang hiện.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const [open, setOpen] = useState(false);
  const idRef = useRef(0);

  const baseToast = useCallback((arg1: string, arg2?: ToastSeverity | string) => {
    let message = arg1;
    let severity: ToastSeverity = "info";

    // Auto-detect đảo tham số an toàn nếu ai gọi toast("success", "Nội dung")
    if (VALID_SEVERITIES.has(arg1 as ToastSeverity) && typeof arg2 === "string") {
      severity = arg1 as ToastSeverity;
      message = arg2;
    } else if (arg2 && VALID_SEVERITIES.has(arg2 as ToastSeverity)) {
      severity = arg2 as ToastSeverity;
    }

    idRef.current += 1;
    setCurrent({ id: idRef.current, message, severity });
    setOpen(true);
  }, []);

  const toast = useMemo<ToastFn>(() => {
    const fn = ((msg: string, sev?: ToastSeverity) => baseToast(msg, sev)) as ToastFn;
    fn.success = (msg: string) => baseToast(msg, "success");
    fn.error = (msg: string) => baseToast(msg, "error");
    fn.warning = (msg: string) => baseToast(msg, "warning");
    fn.info = (msg: string) => baseToast(msg, "info");
    return fn;
  }, [baseToast]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={current?.id ?? 0}
        open={open}
        autoHideDuration={current?.severity === "error" ? 6000 : 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{
          mt: 7,
          zIndex: (theme) => theme.zIndex.modal + 200,
        }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity ?? "info"}
          variant="filled"
          sx={{ width: "100%", minWidth: 280, borderRadius: 2, boxShadow: 4 }}
        >
          {current?.message ?? ""}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
