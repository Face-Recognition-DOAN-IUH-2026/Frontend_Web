"use client";

import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/PrintOutlined";
import LocalLibraryIcon from "@mui/icons-material/LocalLibraryOutlined";

export interface SlipReceiptItem {
  title: string;
  barcode: string;
  author?: string | null;
}

export interface BorrowSlipReceiptProps {
  open: boolean;
  patronName: string;
  patronCode: string;
  borrowDateStr: string;
  dueDateStr: string;
  items: SlipReceiptItem[];
  onClose: () => void;
}

export default function BorrowSlipReceipt({
  open,
  patronName,
  patronCode,
  borrowDateStr,
  dueDateStr,
  items,
  onClose,
}: BorrowSlipReceiptProps) {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      sx={{
        "@media print": {
          "& .MuiBackdrop-root": { display: "none" },
          "& .MuiDialog-container": { height: "auto" },
          "& .MuiPaper-root": {
            boxShadow: "none",
            m: 0,
            p: 0,
            maxWidth: "100%",
            width: "100%",
          },
        },
      }}
    >
      <DialogTitle component="div" sx={{ textAlign: "center", pb: 0 }}>
        <Typography component="div" variant="caption" sx={{ textTransform: "uppercase", fontWeight: 700, color: "text.secondary" }}>
          Trường Đại học Công nghiệp TP.HCM
        </Typography>
        <Typography component="div" variant="subtitle1" sx={{ fontWeight: 800, color: "primary.main", mt: 0.25 }}>
          THƯ VIỆN THÔNG MINH IUH
        </Typography>
        <Typography component="div" variant="body2" sx={{ fontWeight: 700, mt: 0.5, color: "text.primary" }}>
          PHIẾU MƯỢN SÁCH
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 1 }}>
        <Stack spacing={0.5} sx={{ mb: 1 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">Độc giả:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {patronName} ({patronCode})
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">Ngày mượn:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{borrowDateStr}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">Hạn trả:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: "error.main" }}>{dueDateStr}</Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          Danh sách {items.length} cuốn:
        </Typography>
        <Stack spacing={1}>
          {items.map((item, idx) => (
            <Box key={item.barcode || idx} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "text.secondary", width: 24 }}>
                #{idx + 1}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {item.title}
                </Typography>
                {item.author ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {item.author}
                  </Typography>
                ) : null}
                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace", color: "primary.main" }}>
                  {item.barcode}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />

        <Typography variant="caption" color="text.secondary" align="center" sx={{ display: "block", fontStyle: "italic", mt: 1 }}>
          Vui lòng giữ phiếu và trả sách đúng hạn. Chúc bạn đọc sách vui vẻ!
        </Typography>
      </DialogContent>

      <DialogActions className="no-print" sx={{ justifyContent: "space-between", px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Đóng
        </Button>
        <Button
          onClick={() => window.print()}
          variant="contained"
          startIcon={<PrintIcon />}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          In phiếu
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function toSlipReceiptItems(
  scanned: Array<{ book?: { title?: string | null; author?: string | null } | null; barcode: string; copy_barcode?: string | null }>
): SlipReceiptItem[] {
  return scanned.map((item) => ({
    title: item.book?.title || item.barcode,
    barcode: item.copy_barcode || item.barcode,
    author: item.book?.author ?? null,
  }));
}
