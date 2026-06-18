"use client";

import { useCallback, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorIcon from "@mui/icons-material/ErrorOutlineOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import SearchIcon from "@mui/icons-material/Search";
import WarningIcon from "@mui/icons-material/WarningAmberOutlined";
import BorrowScannerDialog from "@/components/BorrowScannerDialog";
import api, { getErrorMessage } from "@/lib/api-client";

const MAX_BORROW_BOOKS = 3;

export default function BorrowPage() {
  const [patronCode, setPatronCode] = useState("");
  const [patronId, setPatronId] = useState<string | null>(null);
  const [patronName, setPatronName] = useState("");
  const [activeCount, setActiveCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ severity: "success" | "error" | "warning"; message: string } | null>(null);

  const remaining = MAX_BORROW_BOOKS - activeCount;
  const canBorrow = remaining > 0 && overdueCount === 0;

  const lookupPatron = useCallback(async (silent = false) => {
    if (!patronCode.trim()) return;
    setIsLookingUp(true);
    setError("");
    try {
      const data = await api.getActiveBorrowsByStudentCode(patronCode.trim());
      setPatronId(data.patron.id);
      setPatronName(data.patron.full_name || data.patron.student_code);
      setActiveCount(data.total);
      setOverdueCount(data.overdue_count);
      if (!silent) {
        if (data.overdue_count > 0) {
          setSnackbar({ severity: "warning", message: `Độc giả có ${data.overdue_count} cuốn sách quá hạn!` });
        } else {
          setSnackbar({ severity: "success", message: `Đã chọn độc giả: ${data.patron.full_name || data.patron.student_code}` });
        }
      }
    } catch (err: any) {
      if (!silent) {
        const status = err?.response?.status || err?.status;
        const detail = err?.response?.data?.detail || "";
        if (status === 403) {
          if (detail.includes("chua vao thu vien")) {
            setError("Độc giả chưa ở trong thư viện. Vui lòng yêu cầu độc giả quét thẻ tại cửa vào.");
          } else {
            setError("Thẻ độc giả đã bị khóa/hết hạn. Vui lòng liên hệ thư viện.");
          }
        } else {
          setError(getErrorMessage(err) || "Không tìm thấy độc giả");
        }
      }
      setPatronId(null);
      setPatronName("");
      setActiveCount(0);
      setOverdueCount(0);
    } finally {
      setIsLookingUp(false);
    }
  }, [patronCode]);

  const handleScanSuccess = useCallback((message: string) => {
    setSnackbar({ severity: "success", message });
    if (patronCode.trim()) {
      lookupPatron(true);
    }
  }, [patronCode, lookupPatron]);

  return (
    <Stack spacing={3}>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>Tạo phiếu mượn sách</Typography>

      {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>Độc giả</Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <TextField
              value={patronCode}
              onChange={(e) => setPatronCode(e.target.value)}
              placeholder="Nhập MSSV..."
              size="small"
              sx={{ minWidth: 260 }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                },
              }}
            />
            <Button variant="contained" onClick={() => lookupPatron()} disabled={isLookingUp || !patronCode.trim()}>
              {isLookingUp ? "Đang tra..." : "Tra cứu"}
            </Button>
            {patronId && (
              <Chip color="success" label={patronName || patronId} onDelete={() => {
                setPatronId(null);
                setPatronName("");
                setActiveCount(0);
                setOverdueCount(0);
              }} />
            )}
          </Stack>
        </CardContent>
      </Card>

      {patronId && (
        <Card variant="outlined" sx={overdueCount > 0 ? { borderLeft: 4, borderLeftColor: "error.main" } : {}}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5 }}>Tình trạng mượn sách</Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Chip
                icon={remaining > 0 ? <CheckCircleIcon /> : <ErrorIcon />}
                color={remaining > 0 ? "success" : "error"}
                label={`Đã mượn: ${activeCount}/${MAX_BORROW_BOOKS}`}
              />
              {overdueCount > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  color="error"
                  label={`Quá hạn: ${overdueCount} cuốn`}
                />
              )}
              <Typography variant="body2" color={remaining > 0 ? "text.secondary" : "error"}>
                {remaining > 0
                  ? `Có thể mượn thêm ${remaining} cuốn`
                  : "Đã đạt giới hạn mượn sách"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {patronId && (
        <Button
          variant="contained"
          size="large"
          startIcon={<QrCodeScannerIcon />}
          disabled={!canBorrow}
          onClick={() => setScannerOpen(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          {canBorrow ? "Quét ISBN" : overdueCount > 0 ? "Cần trả sách quá hạn trước" : "Đã đạt giới hạn mượn"}
        </Button>
      )}

      <BorrowScannerDialog
        open={scannerOpen}
        patronId={patronId || ""}
        maxItems={remaining > 0 ? remaining : undefined}
        onClose={() => setScannerOpen(false)}
        onSuccess={handleScanSuccess}
      />

      <Snackbar open={!!snackbar} autoHideDuration={3200} onClose={() => setSnackbar(null)}>
        {snackbar ? <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Stack>
  );
}
