"use client";

import React from "react";
import { Box, Typography, Button, Stack, Chip, Alert } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { ScannedCardData } from "@/lib/ocr";

type ScannerPhase = "detecting" | "processing" | "confirm";

interface ScannerInfoPanelProps {
  phase: ScannerPhase;
  ocrResult: Partial<ScannedCardData> | null;
  error: string;
  cameraReady: boolean;
  processing: boolean;
  onCapture: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSkip?: () => void;
}

const PHASE_LABELS: Record<ScannerPhase, string> = {
  detecting: "Đang phát hiện thẻ...",
  processing: "Đang nhận dạng...",
  confirm: "Đọc thẻ thành công",
};

const PHASE_COLORS: Record<ScannerPhase, "info" | "primary" | "success"> = {
  detecting: "info",
  processing: "primary",
  confirm: "success",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 72, flexShrink: 0, fontSize: "0.8rem" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.85rem", wordBreak: "break-word" }}>
        {value || "—"}
      </Typography>
    </Stack>
  );
}

const PLACEHOLDER_FIELDS = [
  { label: "MSSV", placeholder: "Đang chờ..." },
  { label: "Họ tên", placeholder: "Đang chờ..." },
  { label: "Lớp", placeholder: "—" },
  { label: "Khóa học", placeholder: "—" },
  { label: "HKTT", placeholder: "—" },
];

function PhaseIcon({ phase }: { phase: ScannerPhase }) {
  if (phase === "detecting") return <RadioButtonUncheckedIcon sx={{ fontSize: 14 }} />;
  if (phase === "processing") return <HourglassBottomIcon sx={{ fontSize: 14 }} />;
  return <CheckCircleIcon sx={{ fontSize: 14 }} />;
}

export function ScannerInfoPanel({
  phase, ocrResult, error, cameraReady, processing, onCapture, onFileUpload, onSkip,
}: ScannerInfoPanelProps) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        borderRadius: { xs: "0 0 12px 12px", md: "0 12px 12px 0" },
        borderLeft: { md: "1px solid" },
        borderTop: { xs: "1px solid", md: "none" },
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3 }}>
          Thông tin quét được
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <Chip
            label={PHASE_LABELS[phase]}
            color={PHASE_COLORS[phase]}
            size="small"
            icon={<PhaseIcon phase={phase} />}
            variant="outlined"
            sx={{ fontWeight: 600, height: 24 }}
          />
        </Stack>
      </Box>

      <Box sx={{ flex: 1, px: 2.5, py: 2, overflow: "auto" }}>
        {ocrResult ? (
          <Stack spacing={1.5}>
            <InfoRow label="MSSV" value={ocrResult.studentCode ?? ""} />
            <InfoRow label="Họ tên" value={ocrResult.fullName ?? ""} />
            {ocrResult.className != null && <InfoRow label="Lớp" value={ocrResult.className} />}
            {ocrResult.dateOfBirth != null && <InfoRow label="Ngày sinh" value={ocrResult.dateOfBirth} />}
            {ocrResult.course != null && <InfoRow label="Khóa học" value={ocrResult.course} />}
            {ocrResult.permanentAddress != null && <InfoRow label="HKTT" value={ocrResult.permanentAddress} />}
            {ocrResult.faculty != null && <InfoRow label="Khoa" value={ocrResult.faculty} />}
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {PLACEHOLDER_FIELDS.map((field) => (
              <Stack key={field.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 72, flexShrink: 0, fontSize: "0.8rem" }}>
                  {field.label}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic", fontSize: "0.8rem" }}>
                  {field.placeholder}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      {error && (
        <Box sx={{ px: 2.5, pb: 1 }}>
          <Alert severity="warning" sx={{ fontSize: "0.8rem" }}>{error}</Alert>
        </Box>
      )}

      <Box sx={{ px: 2.5, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Stack spacing={1}>
          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={onCapture}
            disabled={!cameraReady || processing}
            fullWidth
          >
            Chụp thẻ
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            disabled={processing}
            fullWidth
          >
            Tải ảnh
            <input type="file" accept="image/*" onChange={onFileUpload} hidden />
          </Button>
          {onSkip && (
            <Button color="inherit" variant="text" onClick={onSkip} fullWidth size="small">
              Nhập thủ công
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
