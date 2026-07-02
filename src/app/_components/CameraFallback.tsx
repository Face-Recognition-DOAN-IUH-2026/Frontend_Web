"use client";

import { useEffect, useRef } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

interface CameraFallbackProps {
  lastFrameUrl?: string | null;
  onRetry: () => void;
  onManualSubmit?: (value: string) => void;
  manualLabel?: string;
  manualPlaceholder?: string;
  showManualInput?: boolean;
  showFileUpload?: boolean;
  onFileUpload?: (file: File) => void;
}

export default function CameraFallback({
  lastFrameUrl,
  onRetry,
  onManualSubmit,
  manualLabel = "Nhập thông tin thủ công",
  manualPlaceholder = "Nhập tại đây...",
  showManualInput = false,
  showFileUpload = false,
  onFileUpload,
}: CameraFallbackProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showManualInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showManualInput]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  return (
    <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center", py: 2 }}>
      {lastFrameUrl ? (
        <Box
          sx={{
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: 1,
            overflow: "hidden",
            position: "relative",
            bgcolor: "black",
          }}
        >
          <Box
            component="img"
            src={lastFrameUrl}
            alt=""
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "blur(24px)",
              opacity: 0.6,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography variant="body2" color="grey.400">
              Camera đã ngắt kết nối
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: 1,
            bgcolor: "action.hover",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Stack spacing={1} sx={{ alignItems: "center", color: "text.secondary", px: 2 }}>
            <Typography variant="body2">Không thể khởi động camera</Typography>
          </Stack>
        </Box>
      )}

      {showManualInput && (
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.target as HTMLFormElement;
            const input = form.elements.namedItem("manual-input") as HTMLInputElement;
            if (input?.value && onManualSubmit) {
              onManualSubmit(input.value);
            }
          }}
          sx={{ width: "100%" }}
        >
          <TextField
            inputRef={inputRef}
            name="manual-input"
            label={manualLabel}
            placeholder={manualPlaceholder}
            variant="outlined"
            size="small"
            fullWidth
            autoComplete="off"
          />
        </Box>
      )}

      {showFileUpload && (
        <Button
          variant="outlined"
          startIcon={<CloudUploadOutlinedIcon />}
          onClick={() => fileInputRef.current?.click()}
          fullWidth
        >
          Tải ảnh lên
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
        data-testid="file-input"
      />

      <Button
        variant="contained"
        startIcon={<RefreshOutlinedIcon />}
        onClick={onRetry}
        fullWidth
      >
        Thử lại camera
      </Button>
    </Stack>
  );
}
