"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import MailIcon from "@mui/icons-material/MailOutlined";
import ShieldIcon from "@mui/icons-material/ShieldOutlined";
import FingerprintIcon from "@mui/icons-material/FingerprintOutlined";
import BadgeIcon from "@mui/icons-material/BadgeOutlined";
import ErrorIcon from "@mui/icons-material/ErrorOutlineOutlined";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { initials, roleLabel, statusLabel, statusColor } from "@/lib/utils";
import type { UserPublic } from "@/lib/types";

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 2, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: "none" } }}>
      <Box sx={{ color: "text.secondary", mt: 0.5, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
          {label}
        </Typography>
        <Box sx={{ mt: 0.25 }}>{value}</Box>
      </Box>
    </Stack>
  );
}

export default function UserDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        try {
          const userData = await api.getUser(id);
          setUser(userData);
        } catch {
          const list = await api.listUsers();
          const found = list.users.find((u) => u.id === id);
          if (found) {
            setUser(found);
          } else {
            setError("Không tìm thấy hồ sơ người dùng.");
          }
        }
      } catch {
        setError("Lỗi khi tải dữ liệu người dùng.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 384 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !user) {
    return (
      <Box sx={{ p: 3, space: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/dashboard/admin")} sx={{ mb: 2 }}>
          Quay lại danh sách
        </Button>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!user) return null;

  const userInitials = initials(user.full_name || user.email);
  const avatarBg = user.status === "deleted" ? "grey.500" : "primary.main";

  return (
    <Stack spacing={3}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/dashboard/admin")}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        Quay lại danh sách
      </Button>

      {error && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Chi tiết người dùng
      </Typography>
      <Typography variant="body2" color="text.secondary">
        ID: <Box component="span" sx={{ fontFamily: "monospace" }}>{user.id}</Box>
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
              <Avatar sx={{ width: 96, height: 96, bgcolor: avatarBg, color: "primary.contrastText", fontSize: 36, fontWeight: 900, mx: "auto", mb: 2 }}>
                {user.avatar_url ? undefined : userInitials}
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {user.full_name || "Chưa cập nhật"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                {user.email}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ justifyContent: "center", flexWrap: "wrap" }}>
                <Chip label={roleLabel(user.role)} color={user.role === "admin" ? "warning" : user.role === "staff" ? "primary" : "default"} size="small" />
                <Chip label={statusLabel(user.status || "active")} color={statusColor(user.status || "active")} size="small" />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <FingerprintIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">Sinh trắc học</Typography>
                <Chip
                  size="small"
                  label={user.has_face ? "Đã đăng ký" : "Chưa đăng ký"}
                  color={user.has_face ? "success" : "default"}
                  sx={{ ml: "auto" }}
                />
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
              <BadgeIcon fontSize="small" color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Thông tin hệ thống
              </Typography>
            </Stack>

            <Field
              icon={<BadgeIcon fontSize="small" />}
              label="Họ và tên"
              value={
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user.full_name || <Box component="span" sx={{ color: "text.disabled", fontStyle: "italic" }}>Chưa cập nhật</Box>}
                </Typography>
              }
            />
            <Field
              icon={<MailIcon fontSize="small" />}
              label="Địa chỉ email"
              value={
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-all" }}>
                  {user.email}
                </Typography>
              }
            />
            <Field
              icon={<ShieldIcon fontSize="small" />}
              label="Vai trò trong hệ thống"
              value={
                <Chip label={roleLabel(user.role)} color={user.role === "admin" ? "warning" : user.role === "staff" ? "primary" : "default"} size="small" />
              }
            />
            <Field
              icon={<FingerprintIcon fontSize="small" />}
              label="Trạng thái sinh trắc học"
              value={
                <Chip
                  size="small"
                  icon={<FaceIcon />}
                  label={user.has_face ? "Đã đăng ký khuôn mặt" : "Chưa đăng ký"}
                  color={user.has_face ? "success" : "default"}
                />
              }
            />
            <Field
              icon={<BadgeIcon fontSize="small" />}
              label="UUID người dùng"
              value={
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
                  {user.id}
                </Typography>
              }
            />
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
