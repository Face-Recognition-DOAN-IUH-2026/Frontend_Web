"use client";

import React from "react";
import { Box, Paper, Typography, Button, Stack, Divider } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReplayIcon from "@mui/icons-material/Replay";
import type { ScannedCardData } from "@/lib/ocr";

interface CardPreviewProps {
  data: ScannedCardData;
  onConfirm: () => void;
  onRetake: () => void;
  onSkip?: () => void;
}

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

export function CardPreview({ data, onConfirm, onRetake, onSkip }: CardPreviewProps) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
          <CheckCircleIcon color="success" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Thông tin từ thẻ sinh viên
          </Typography>
        </Stack>
        <Divider />
        <InfoRow label="MSSV" value={data.studentCode} />
        <InfoRow label="Họ tên" value={data.fullName} />
        {data.className != null && <InfoRow label="Lớp" value={data.className} />}
        {data.dateOfBirth != null && <InfoRow label="Ngày sinh" value={data.dateOfBirth} />}
        {data.course != null && <InfoRow label="Khóa học" value={data.course} />}
        {data.permanentAddress != null && <InfoRow label="HKTT" value={data.permanentAddress} />}
        {data.faculty != null && <InfoRow label="Khoa" value={data.faculty} />}
        {data.rawText && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ cursor: "pointer", userSelect: "none" }}
              onClick={(e) => {
                const el = (e.currentTarget as HTMLElement).nextElementSibling;
                if (el) (el as HTMLElement).style.display = el?.getAttribute("data-open") === "1" ? "none" : "block";
                e.currentTarget.setAttribute("data-open", e.currentTarget.getAttribute("data-open") === "1" ? "0" : "1");
              }}
            >
              ▸ Raw OCR text (debug)
            </Typography>
            <Box data-open="0" sx={{ display: "none", mt: 1, p: 1.5, bgcolor: "grey.900", borderRadius: 1, maxHeight: 120, overflow: "auto" }}>
              <Typography variant="caption" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", color: "grey.300", fontSize: "0.7rem" }}>
                {data.rawText}
              </Typography>
            </Box>
          </Box>
        )}
        <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
          <Button variant="contained" onClick={onConfirm} fullWidth>
            Xác nhận
          </Button>
          <Button variant="outlined" startIcon={<ReplayIcon />} onClick={onRetake} fullWidth>
            Chụp lại
          </Button>
        </Stack>
        {onSkip && (
          <Button color="inherit" variant="text" onClick={onSkip} fullWidth size="small">
            Nhập thủ công
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
