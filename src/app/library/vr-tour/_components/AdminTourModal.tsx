"use client";

import React, { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import NavigationOutlinedIcon from "@mui/icons-material/NavigationOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import type { NavigationArrowData, Room } from "@/lib/vr/tourData";
import { useToast } from "@/lib/toast-context";

interface AdminTourModalProps {
  open: boolean;
  onClose: () => void;
  rooms: Record<string, Room>;
  currentRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onSaveRooms: (newRooms: Record<string, Room>) => Promise<boolean>;
  onResetDefault: () => Promise<boolean>;
  availableImages: string[];
}

export default function AdminTourModal({
  open,
  onClose,
  rooms,
  currentRoomId,
  onSelectRoom,
  onSaveRooms,
  onResetDefault,
  availableImages = [],
}: AdminTourModalProps) {
  const theme = useTheme();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<number>(0);
  const [localRooms, setLocalRooms] = useState<Record<string, Room>>(rooms);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State for editing / creating room
  const [formName, setFormName] = useState("");
  const [formId, setFormId] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formLeftRoomId, setFormLeftRoomId] = useState("");
  const [formRightRoomId, setFormRightRoomId] = useState("");
  const [formArrows, setFormArrows] = useState<NavigationArrowData[]>([]);

  // Keep local rooms in sync when modal opens
  React.useEffect(() => {
    if (open) {
      setLocalRooms(rooms);
      setEditingRoomId(null);
      setActiveTab(0);
    }
  }, [open, rooms]);

  const handleStartEdit = (room: Room) => {
    setEditingRoomId(room.id);
    setFormId(room.id);
    setFormName(room.name);
    setFormImageUrl(room.imageUrl);
    setFormLeftRoomId(room.leftRoomId || "");
    setFormRightRoomId(room.rightRoomId || "");
    setFormArrows(JSON.parse(JSON.stringify(room.navigationArrows || [])));
    setActiveTab(1);
  };

  const handleStartCreate = () => {
    const nextIdx = Object.keys(localRooms).length + 1;
    const newId = `room${Date.now().toString().slice(-4)}`;
    setEditingRoomId(null);
    setFormId(newId);
    setFormName(`KHU VỰC MỚI ${nextIdx}`);
    setFormImageUrl(availableImages[0] || "/VRLIB/LIB1.jpg");
    setFormLeftRoomId("");
    setFormRightRoomId("");
    setFormArrows([]);
    setActiveTab(1);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/vr/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Tải ảnh lên thất bại");
      }

      setFormImageUrl(data.url);
      toast("Đã tải ảnh toàn cảnh 360° lên thành công!", "success");
    } catch (err: any) {
      toast(err.message || "Lỗi khi tải ảnh", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCurrentRoomForm = () => {
    if (!formId.trim()) {
      toast("Mã định danh phòng không được để trống", "warning");
      return;
    }
    if (!formName.trim()) {
      toast("Tên phòng không được để trống", "warning");
      return;
    }
    if (!formImageUrl.trim()) {
      toast("Vui lòng chọn hoặc tải lên ảnh 360°", "warning");
      return;
    }

    const updatedRoom: Room = {
      id: formId.trim(),
      name: formName.trim().toUpperCase(),
      imageUrl: formImageUrl.trim(),
      defaultRotation: [0, 0, 0],
      leftRoomId: formLeftRoomId || undefined,
      rightRoomId: formRightRoomId || undefined,
      navigationArrows: formArrows,
    };

    setLocalRooms((prev) => {
      const copy = { ...prev };
      // If we changed ID, delete the old one
      if (editingRoomId && editingRoomId !== updatedRoom.id) {
        delete copy[editingRoomId];
      }
      copy[updatedRoom.id] = updatedRoom;
      return copy;
    });

    toast(`Đã cập nhật thông tin phòng "${updatedRoom.name}"`, "success");
    setActiveTab(0);
    setEditingRoomId(null);
  };

  const handleDeleteRoom = (roomId: string) => {
    if (Object.keys(localRooms).length <= 1) {
      toast("Tour phải có ít nhất 1 khu vực, không thể xóa phòng duy nhất", "warning");
      return;
    }

    const roomName = localRooms[roomId]?.name || roomId;
    if (confirm(`Bạn có chắc chắn muốn xóa khu vực "${roomName}" khỏi tour không?`)) {
      setLocalRooms((prev) => {
        const copy = { ...prev };
        delete copy[roomId];
        return copy;
      });
      toast(`Đã xóa khu vực "${roomName}"`, "info");
      if (editingRoomId === roomId) {
        setEditingRoomId(null);
        setActiveTab(0);
      }
    }
  };

  // Add a new navigation arrow inside the room
  const handleAddArrow = () => {
    const otherRooms = Object.values(localRooms).filter((r) => r.id !== formId);
    if (otherRooms.length === 0) {
      toast("Cần có thêm phòng khác để tạo mũi tên chuyển tiếp", "warning");
      return;
    }

    const target = otherRooms[0];
    const newArrow: NavigationArrowData = {
      id: `arrow_${formId}_to_${target.id}_${Date.now().toString().slice(-3)}`,
      position: [0, -1.5, -5.0],
      rotation: 0,
      targetRoomId: target.id,
      label: target.name,
      previewUrl: target.imageUrl,
    };

    setFormArrows((prev) => [...prev, newArrow]);
  };

  const handleRemoveArrow = (arrowId: string) => {
    setFormArrows((prev) => prev.filter((a) => a.id !== arrowId));
  };

  const handleArrowChange = (index: number, field: keyof NavigationArrowData, value: any) => {
    setFormArrows((prev) => {
      const copy = [...prev];
      const arrow = { ...copy[index] };
      (arrow as any)[field] = value;

      // Auto update label & previewUrl if target room changed
      if (field === "targetRoomId") {
        const target = localRooms[value];
        if (target) {
          arrow.label = target.name;
          arrow.previewUrl = target.imageUrl;
        }
      }

      copy[index] = arrow;
      return copy;
    });
  };

  const handleFinalSave = async () => {
    setSaving(true);
    try {
      const ok = await onSaveRooms(localRooms);
      if (ok) {
        toast("Đã lưu và xuất bản cấu hình VR Tour thành công!", "success");
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (confirm("Khôi phục toàn bộ 5 khu vực ban đầu của Thư viện IUH? Các ảnh và phòng tùy chỉnh thêm sẽ bị xóa.")) {
      setSaving(true);
      try {
        const ok = await onResetDefault();
        if (ok) {
          toast("Đã khôi phục tour VR 3D về cấu hình mặc định!", "success");
          onClose();
        }
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            bgcolor: "background.paper",
            backgroundImage: "none",
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                bgcolor: "rgba(139, 0, 0, 0.08)",
                color: "#8B0000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CameraAltOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Quản lý Không gian Tham quan VR 360°
                </Typography>
                <Chip
                  size="small"
                  label="QUẢN TRỊ VIÊN"
                  sx={{
                    height: 20,
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    bgcolor: "rgba(139, 0, 0, 0.1)",
                    color: "#8B0000",
                  }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Thay đổi ảnh toàn cảnh, thêm khu vực mới hoặc tùy chỉnh mũi tên điều hướng dưới sàn
              </Typography>
            </Box>
          </Stack>

          <IconButton onClick={onClose} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            mt: 1.5,
            minHeight: 44,
            "& .MuiTabs-indicator": { bgcolor: "#8B0000", height: 3, borderRadius: "3px 3px 0 0" },
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.88rem",
              minHeight: 44,
              color: "text.secondary",
              "&.Mui-selected": { color: "#8B0000", fontWeight: 800 },
            },
          }}
        >
          <Tab label={`Danh sách khu vực (${Object.keys(localRooms).length})`} />
          <Tab label={editingRoomId ? `Chỉnh sửa: ${localRooms[editingRoomId]?.name || ""}` : "+ Thêm khu vực mới"} />
        </Tabs>
      </DialogTitle>

      <DialogContent sx={{ p: 3, maxHeight: "68vh", overflowY: "auto" }}>
        {/* TAB 0: DANH SÁCH KHU VỰC HIỆN TẠI */}
        {activeTab === 0 && (
          <Stack spacing={2.5}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Tất cả các phòng và khu vực có trong Tour VR 360°:
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleStartCreate}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: "none",
                  background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
                }}
              >
                Thêm khu vực mới
              </Button>
            </Stack>

            <Grid container spacing={2}>
              {Object.values(localRooms).map((room) => {
                const isCurrent = room.id === currentRoomId;
                const arrowCount = room.navigationArrows?.length || 0;

                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={room.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        borderColor: isCurrent ? "#8B0000" : "divider",
                        borderWidth: isCurrent ? 2 : 1,
                        transition: "all 0.2s ease",
                        "&:hover": { borderColor: "primary.main", boxShadow: "0 6px 20px rgba(0,0,0,0.08)" },
                      }}
                    >
                      <Box sx={{ position: "relative", height: 130, bgcolor: "#0f172a", overflow: "hidden" }}>
                        <CardMedia
                          component="img"
                          height="130"
                          image={room.imageUrl}
                          alt={room.name}
                          sx={{ objectFit: "cover" }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://placehold.co/600x300/1e293b/ffffff?text=360+Panorama";
                          }}
                        />
                        {isCurrent && (
                          <Chip
                            size="small"
                            label="ĐANG XEM"
                            sx={{
                              position: "absolute",
                              top: 8,
                              left: 8,
                              bgcolor: "#8B0000",
                              color: "white",
                              fontWeight: 800,
                              fontSize: "0.65rem",
                              height: 20,
                            }}
                          />
                        )}
                        <Chip
                          size="small"
                          label={`${arrowCount} mũi tên chuyển`}
                          sx={{
                            position: "absolute",
                            bottom: 8,
                            right: 8,
                            bgcolor: "rgba(0,0,0,0.7)",
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.68rem",
                            height: 22,
                          }}
                        />
                      </Box>

                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                          {room.name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary", display: "block", mt: 0.5 }}>
                          ID: {room.id} · Ảnh: {room.imageUrl.split("/").pop()}
                        </Typography>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityOutlinedIcon />}
                            onClick={() => {
                              onSelectRoom(room.id);
                              onClose();
                            }}
                            sx={{ borderRadius: 1.5, fontSize: "0.75rem", fontWeight: 700, textTransform: "none" }}
                          >
                            Xem phòng này
                          </Button>

                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Chỉnh sửa thông tin và ảnh">
                              <IconButton size="small" onClick={() => handleStartEdit(room)} sx={{ color: "primary.main" }}>
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa khu vực này">
                              <IconButton size="small" onClick={() => handleDeleteRoom(room.id)} sx={{ color: "error.main" }}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>
        )}

        {/* TAB 1: FORM CHỈNH SỬA / THÊM MỚI PHÒNG */}
        {activeTab === 1 && (
          <Stack spacing={3}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Bạn có thể tải ảnh chụp toàn cảnh 360° (Equirectangular Panorama) từ máy tính hoặc chọn ảnh có sẵn trong thư viện.
            </Alert>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  label="Tên khu vực (Hiển thị trong Tour)"
                  placeholder="VD: PHÒNG ĐỌC TỰ DO TẦNG 2"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Mã định danh (ID phòng)"
                  placeholder="VD: room6"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  fullWidth
                  size="small"
                  required
                  slotProps={{
                    htmlInput: { style: { fontFamily: "monospace", fontWeight: 700 } },
                  }}
                />
              </Grid>
            </Grid>

            {/* Khung Tải / Chọn Ảnh 360° */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Ảnh toàn cảnh 360° (Panorama Image)
              </Typography>

              <Grid container spacing={2} sx={{ alignItems: "center" }}>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box
                    sx={{
                      position: "relative",
                      height: 160,
                      borderRadius: 2,
                      overflow: "hidden",
                      bgcolor: "#0f172a",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <img
                      src={formImageUrl || "/VRLIB/LIB1.jpg"}
                      alt="360 Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://placehold.co/600x300/1e293b/ffffff?text=Panorama+Image";
                      }}
                    />
                    <Chip
                      size="small"
                      label="Xem trước 360°"
                      sx={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        bgcolor: "rgba(0,0,0,0.75)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.68rem",
                      }}
                    />
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                  <Stack spacing={1.5}>
                    {/* Upload Button */}
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <CloudUploadOutlinedIcon />}
                      disabled={uploading}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        textTransform: "none",
                        bgcolor: "primary.main",
                        "&:hover": { bgcolor: "primary.dark" },
                      }}
                    >
                      {uploading ? "Đang tải ảnh lên..." : "Tải ảnh 360° từ máy tính (.jpg, .png)"}
                      <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                    </Button>

                    <Typography variant="caption" color="text.secondary">
                      Hoặc chọn nhanh từ các ảnh sẵn có trong thư viện:
                    </Typography>

                    {/* Quick photo selector pills */}
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {availableImages.map((img) => {
                        const filename = img.split("/").pop() || img;
                        const isSelected = formImageUrl === img;
                        return (
                          <Chip
                            key={img}
                            label={filename}
                            size="small"
                            clickable
                            onClick={() => setFormImageUrl(img)}
                            color={isSelected ? "primary" : "default"}
                            variant={isSelected ? "filled" : "outlined"}
                            sx={{ fontWeight: 700, fontSize: "0.72rem" }}
                          />
                        );
                      })}
                    </Box>

                    {/* Custom URL Input */}
                    <TextField
                      label="Đường dẫn ảnh URL"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      fullWidth
                      size="small"
                      slotProps={{
                        htmlInput: { style: { fontFamily: "monospace", fontSize: "0.8rem" } },
                      }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Mũi tên điều hướng dưới sàn 3D */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5 }}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Mũi tên điều hướng dưới sàn 3D ({formArrows.length})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Khi độc giả bấm vào mũi tên màu vàng cam dưới sàn sẽ di chuyển sang phòng đích
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddArrow}
                  sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: "none" }}
                >
                  Thêm mũi tên
                </Button>
              </Stack>

              {formArrows.length === 0 ? (
                <Box sx={{ p: 2, textAlign: "center", bgcolor: "action.hover", borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Phòng này chưa có mũi tên di chuyển nào. Bấm &quot;Thêm mũi tên&quot; để liên kết sang khu vực khác.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {formArrows.map((arrow, idx) => (
                    <Paper
                      key={arrow.id || idx}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 2, bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)") }}
                    >
                      <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
                        <Grid size={{ xs: 12, sm: 5 }}>
                          <TextField
                            select
                            label="Dẫn sang phòng đích"
                            value={arrow.targetRoomId}
                            onChange={(e) => handleArrowChange(idx, "targetRoomId", e.target.value)}
                            fullWidth
                            size="small"
                          >
                            {Object.values(localRooms)
                              .filter((r) => r.id !== formId)
                              .map((r) => (
                                <MenuItem key={r.id} value={r.id}>
                                  {r.name} ({r.id})
                                </MenuItem>
                              ))}
                          </TextField>
                        </Grid>

                        <Grid size={{ xs: 8, sm: 5 }}>
                          <TextField
                            label="Nhãn hiển thị khi hover"
                            value={arrow.label}
                            onChange={(e) => handleArrowChange(idx, "label", e.target.value)}
                            fullWidth
                            size="small"
                          />
                        </Grid>

                        <Grid size={{ xs: 4, sm: 2 }} sx={{ textAlign: "right" }}>
                          <Tooltip title="Xóa mũi tên này">
                            <IconButton size="small" color="error" onClick={() => handleRemoveArrow(arrow.id)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>

            {/* Nút thao tác của Tab Form */}
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setActiveTab(0);
                  setEditingRoomId(null);
                }}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
              >
                Quay lại danh sách
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveCurrentRoomForm}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: "none",
                  background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
                }}
              >
                Lưu khu vực này vào Tour
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      {/* Dialog Footer Actions */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider", justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<RestartAltOutlinedIcon />}
          onClick={handleResetToDefault}
          disabled={saving}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
        >
          Khôi phục 5 phòng gốc
        </Button>

        <Stack direction="row" spacing={1.5}>
          <Button onClick={onClose} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
            Đóng
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
            onClick={handleFinalSave}
            disabled={saving}
            sx={{
              borderRadius: 2,
              fontWeight: 800,
              textTransform: "none",
              px: 3,
              background: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
              boxShadow: "0 4px 14px rgba(139,0,0,0.3)",
              "&:hover": { background: "linear-gradient(135deg, #700000 0%, #500000 100%)" },
            }}
          >
            {saving ? "Đang lưu cấu hình..." : "Lưu & Xuất bản Tour 3D"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
