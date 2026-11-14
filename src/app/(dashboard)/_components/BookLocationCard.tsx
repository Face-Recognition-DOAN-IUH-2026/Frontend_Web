"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOnOutlined";
import MapIcon from "@mui/icons-material/MapOutlined";
import ViewInArIcon from "@mui/icons-material/ViewInArOutlined";
import dynamic from "next/dynamic";
import type { BookCardData } from "./BookCard";

const VRViewer = dynamic(
  () => import("@/app/library/vr-tour/_components/VRViewer"),
  { ssr: false }
);

interface BookLocationCardProps {
  data: BookCardData & { shelf_location?: string };
}

export default function BookLocationCard({ data }: BookLocationCardProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const [vrOpen, setVrOpen] = useState(false);

  const floorMatch = data.shelf_location?.match(/^([A-Za-z]+\d+)/);
  const floorLabel = floorMatch ? `Tầng ${floorMatch[1]}` : null;

  return (
    <>
      <Card
        sx={{
          maxWidth: 360,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          my: 1,
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
            {data.title}
          </Typography>

          {data.author && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Tác giả: {data.author}
            </Typography>
          )}

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
            {data.isbn && (
              <Chip label={`ISBN: ${data.isbn}`} size="small" variant="outlined" />
            )}
            {data.categories && (
              <Chip label={data.categories} size="small" color="primary" variant="outlined" />
            )}
            {data.source && (
              <Chip
                label={data.source === "database" ? "Trong thư viện" : "Google Books"}
                size="small"
                color={data.source === "database" ? "success" : "info"}
              />
            )}
          </Box>

          {data.shelf_location && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mt: 1,
                p: 1,
                bgcolor: "action.hover",
                borderRadius: 1,
              }}
            >
              <LocationOnIcon fontSize="small" color="primary" />
              <Typography variant="body2" color="text.secondary">
                Vị trí: <strong>{data.shelf_location}</strong>
              </Typography>
              {floorLabel && (
                <Chip label={floorLabel} size="small" variant="outlined" sx={{ ml: "auto" }} />
              )}
            </Box>
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<MapIcon />}
            onClick={() => setMapOpen(true)}
            fullWidth
            sx={{ mt: 1.5 }}
            disabled={!floorLabel}
          >
            Xem trên bản đồ
          </Button>
          {data.shelf_location ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<ViewInArIcon />}
              onClick={() => setVrOpen(true)}
              fullWidth
              sx={{ mt: 1, background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", "&:hover": { background: "linear-gradient(135deg, #059669 0%, #047857 100%)" } }}
            >
              Chỉ đường 3D
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <>
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MapIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {data.title} — {floorLabel || "Bản đồ thư viện"}
              </Typography>
            </Box>
            <IconButton onClick={() => setMapOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                p: 4,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <MapIcon sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
              <Typography variant="body1" sx={{ mb: 1 }}>
                Bản đồ tầng đang được tải
              </Typography>
              <Typography variant="body2">
                Sách nằm tại vị trí <strong>{data.shelf_location}</strong>
                {floorLabel ? ` (${floorLabel})` : ""}
              </Typography>
            </Box>
          </DialogContent>
        </>
      </Dialog>

      <Dialog open={vrOpen} onClose={() => setVrOpen(false)} maxWidth="lg" fullWidth fullScreen>
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#0f172a", color: "white" }}>
          <Typography variant="h6">Chỉ đường đến kệ — {data.shelf_location}</Typography>
          <IconButton onClick={() => setVrOpen(false)} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, overflow: "hidden" }}>
          {vrOpen ? <VRViewer /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
