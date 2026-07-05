"use client";

import { useRouter } from "next/navigation";
import { Avatar, Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import UpdateIcon from "@mui/icons-material/UpdateOutlined";
import SchoolIcon from "@mui/icons-material/SchoolOutlined";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import { initials, statusLabel, statusColor } from "@/lib/utils";
import { staggerSx } from "@/lib/useStaggeredAnimation";
import type { PatronPublic } from "@/lib/types";

const STAT_GRADIENT = {
  active: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  expired: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
};

interface PatronGridViewProps {
  patrons: PatronPublic[];
  onEdit: (p: PatronPublic) => void;
  onRenew: (p: PatronPublic) => void;
  onDelete: (p: PatronPublic) => void;
  onRestore: (p: PatronPublic) => void;
}

export default function PatronGridView({ patrons, onEdit, onRenew, onDelete, onRestore }: PatronGridViewProps) {
  const router = useRouter();

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
      {patrons.map((patron, idx) => {
        const isExpired = new Date(patron.membership_expiry) < new Date();
        const isSoonExp = !isExpired && (new Date(patron.membership_expiry).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
        return (
          <Paper key={patron.id} variant="outlined"
            onClick={() => router.push(`/patrons/${patron.id}`)}
            sx={{ borderRadius: 3, p: 0, cursor: "pointer", transition: "all 0.25s ease", overflow: "hidden",
              ...staggerSx(idx, 0.05),
              "&:hover": { transform: "translateY(-2px)", boxShadow: 4, borderColor: "primary.main" } }}>
            <Box sx={{ height: 4, background: patron.status === "active" ? STAT_GRADIENT.active : patron.status === "expired" ? STAT_GRADIENT.expired : "linear-gradient(135deg, #64748b 0%, #475569 100%)" }} />
            <Box sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", mb: 2 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: patron.status === "active" ? "rgba(16,185,129,0.15)" : patron.status === "expired" ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.15)", color: patron.status === "active" ? "success.main" : patron.status === "expired" ? "warning.main" : "text.secondary", fontWeight: 700, fontSize: 16 }}>
                  {initials(patron.full_name)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{patron.full_name}</Typography>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>{patron.student_code}</Typography>
                </Box>
                <Chip label={statusLabel(patron.status)} color={statusColor(patron.status)} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.7rem", height: 24 }} />
              </Stack>
              <Stack spacing={0.75} sx={{ mb: 2 }}>
                {patron.course ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <SchoolIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">{patron.course}</Typography>
                  </Stack>
                ) : null}
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <FaceIcon sx={{ fontSize: 14, color: patron.has_face ? "primary.main" : "action.disabled" }} />
                  <Typography variant="caption" color={patron.has_face ? "primary.main" : "text.secondary"}>
                    {patron.has_face ? "Đã đăng ký khuôn mặt" : "Chưa có khuôn mặt"}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <BadgeIcon sx={{ fontSize: 14, color: isExpired ? "error.main" : isSoonExp ? "warning.main" : "text.secondary" }} />
                  <Typography variant="caption" color={isExpired ? "error.main" : isSoonExp ? "warning.main" : "text.secondary"}>
                    Hạn thẻ: {patron.membership_expiry}{isExpired ? " — Hết hạn" : isSoonExp ? " — Sắp hết hạn" : ""}
                  </Typography>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end", pt: 1.5, borderTop: 1, borderColor: "divider" }} onClick={(e) => e.stopPropagation()}>
                {patron.status === "deleted" ? (
                  <>
                    <Button size="small" variant="outlined" color="success" onClick={() => onRestore(patron)} sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.75rem" }}>Khôi phục</Button>
                    <IconButton size="small" color="error" onClick={() => onDelete(patron)} title="Xóa vĩnh viễn"><DeleteIcon fontSize="small" /></IconButton>
                  </>
                ) : (
                  <>
                    <Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={() => onEdit(patron)} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Gia hạn thẻ"><IconButton size="small" onClick={() => onRenew(patron)} sx={{ color: "text.secondary", "&:hover": { color: "success.main" } }}><UpdateIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Xóa"><IconButton size="small" onClick={() => onDelete(patron)} sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Xem chi tiết"><IconButton size="small" onClick={() => router.push(`/patrons/${patron.id}`)} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}><ChevronRightIcon fontSize="small" /></IconButton></Tooltip>
                  </>
                )}
              </Stack>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
