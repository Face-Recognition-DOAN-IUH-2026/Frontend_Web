"use client";

import { useState, useEffect, useRef } from "react";
import { getErrorMessage } from "@/lib/api-client";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api-client";
import AvatarUser from "@/app/(dashboard)/_components/ui/AvatarUser";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { user, logout, updateUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      const fetchUser = async () => {
        try {
          const userData = await api.getCurrentUser();
          setAvatarUrl(userData.avatar_url ?? null);
          if (userData.avatar_url !== user.avatar_url) {
            updateUser({ avatar_url: userData.avatar_url ?? null });
          }
        } catch (err) {
          console.error("Failed to fetch user data", err);
        }
      };
      fetchUser();
    }
  }, [open, user, updateUser]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await api.uploadAvatar(file);
      setAvatarUrl(result.avatarUrl);
      updateUser({ avatar_url: result.avatarUrl });
      setSuccess(true);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setUploading(true);
    setError(null);
    try {
      await api.deleteAvatar();
      setAvatarUrl(null);
      updateUser({ avatar_url: null });
      setSuccess(true);
    } catch (err: any) {
      setError(getErrorMessage(err) || "Xóa ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 3, overflow: "visible" } },
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.4)" } },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            pt: 4,
            pb: 3,
            px: 3,
          }}
        >
          <Box sx={{ position: "relative" }}>
            <AvatarUser
              avatarUrl={avatarUrl || user?.avatar_url}
              name={user?.full_name}
              email={user?.email}
              role={user?.role}
              size={88}
              border="3px solid rgba(255,255,255,0.85)"
              sx={{
                fontSize: "2.2rem",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "scale(1.03)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                },
              }}
            />
            <IconButton
              component="label"
              size="small"
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
                boxShadow: 2,
                width: 30,
                height: 30,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileChange}
              />
              <PhotoCameraIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {user.full_name || "Người dùng"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
            <Box
              component="span"
              sx={{
                display: "inline-block",
                mt: 0.75,
                px: 1.5,
                py: 0.25,
                borderRadius: 99,
                bgcolor: "primaryContainer",
                color: "primary.main",
                fontSize: "0.7rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {user.role === "admin" ? "Quản trị viên" : user.role === "staff" ? "Nhân viên" : "Độc giả"}
            </Box>
          </Box>

          {uploading && (
            <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "center" }}>
              <CircularProgress size={14} />
              <Typography variant="caption">Đang xử lý...</Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ width: "100%", py: 0 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ width: "100%", py: 0 }}>
              Cập nhật thành công!
            </Alert>
          )}

          {avatarUrl && !uploading && (
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteAvatar}
              sx={{ mt: -1 }}
            >
              Xóa ảnh
            </Button>
          )}

          <Divider sx={{ width: "100%", my: 1 }} />

          <List sx={{ width: "100%", py: 0 }}>
            <ListItemButton
              onClick={onClose}
              sx={{
                borderRadius: 2,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <FaceIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Cập nhật khuôn mặt"
                slotProps={{ primary: { sx: { fontWeight: 600, fontSize: "0.9rem" } } }}
              />
            </ListItemButton>

            <ListItemButton
              onClick={onClose}
              sx={{
                borderRadius: 2,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LockResetIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Đổi mật khẩu"
                slotProps={{ primary: { sx: { fontWeight: 600, fontSize: "0.9rem" } } }}
              />
            </ListItemButton>

            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <LogoutIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Đăng xuất"
                slotProps={{ primary: { sx: { fontWeight: 600, fontSize: "0.9rem", color: "error.main" } } }}
              />
            </ListItemButton>
          </List>
        </Box>
      </DialogContent>
    </Dialog>
  );
}