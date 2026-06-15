"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AlertIcon from "@mui/icons-material/WarningAmberOutlined";
import BookIcon from "@mui/icons-material/MenuBookOutlined";
import CheckIcon from "@mui/icons-material/CheckCircleOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import UsersIcon from "@mui/icons-material/GroupsOutlined";
import api, { getErrorMessage } from "@/lib/api-client";
import type { BorrowRecord, StaffActiveBorrowerSummary, StaffPatronActiveBorrowsResponse } from "@/lib/types";

type BorrowerFilter = "all" | "overdue" | "active";

function isOverdue(record: BorrowRecord) {
  return new Date(record.due_at) < new Date();
}

function daysUntil(value: string) {
  const today = new Date();
  const due = new Date(value);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

function borrowerName(borrower: StaffActiveBorrowerSummary) {
  return borrower.patron.full_name || borrower.patron.student_code || "Không rõ tên";
}

function dueChip(record: BorrowRecord) {
  const left = daysUntil(record.due_at);
  if (left < 0) return <Chip size="small" color="error" label={`Quá hạn ${Math.abs(left)} ngày`} />;
  if (left <= 2) return <Chip size="small" color="warning" label="Sắp đến hạn" />;
  return <Chip size="small" color="success" label="Đúng hạn" />;
}

export default function ReturnPage() {
  const [borrowers, setBorrowers] = useState<StaffActiveBorrowerSummary[]>([]);
  const [selectedStudentCode, setSelectedStudentCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<StaffPatronActiveBorrowsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BorrowerFilter>("all");
  const [loadingBorrowers, setLoadingBorrowers] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [confirmRecord, setConfirmRecord] = useState<BorrowRecord | null>(null);
  const [error, setError] = useState("");
  const [snackbar, setSnackbar] = useState<{ severity: "success" | "error"; message: string } | null>(null);

  const loadBorrowers = useCallback(async () => {
    setLoadingBorrowers(true);
    setError("");
    try {
      const data = await api.getActiveBorrowers();
      setBorrowers(data.items);
      setSelectedStudentCode((current) => {
        if (current && data.items.some((item) => item.patron.student_code === current)) return current;
        return data.items[0]?.patron.student_code ?? null;
      });
    } catch (err: any) {
      setError(getErrorMessage(err) || "Không thể tải danh sách độc giả đang mượn");
    } finally {
      setLoadingBorrowers(false);
    }
  }, []);

  const loadPatronDetail = useCallback(async (studentCode: string) => {
    setLoadingDetail(true);
    setError("");
    try {
      const data = await api.getActiveBorrowsByStudentCode(studentCode);
      setDetail(data);
    } catch (err: any) {
      setDetail(null);
      setError(getErrorMessage(err) || "Không thể tải sách đang mượn của độc giả");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadBorrowers();
  }, [loadBorrowers]);

  useEffect(() => {
    if (selectedStudentCode) loadPatronDetail(selectedStudentCode);
    else setDetail(null);
  }, [selectedStudentCode, loadPatronDetail]);

  const filteredBorrowers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrowers.filter((borrower) => {
      const matchesSearch = !q
        || borrower.patron.student_code.toLowerCase().includes(q)
        || (borrower.patron.full_name || "").toLowerCase().includes(q);
      const matchesFilter = filter === "all"
        || (filter === "overdue" && borrower.overdue_count > 0)
        || (filter === "active" && borrower.overdue_count === 0);
      return matchesSearch && matchesFilter;
    });
  }, [borrowers, filter, search]);

  const totals = useMemo(() => ({
    borrowers: borrowers.length,
    books: borrowers.reduce((sum, item) => sum + item.total_borrowed, 0),
    overdue: borrowers.reduce((sum, item) => sum + item.overdue_count, 0),
  }), [borrowers]);

  const selectedBorrower = useMemo(
    () => borrowers.find((item) => item.patron.student_code === selectedStudentCode) ?? null,
    [borrowers, selectedStudentCode],
  );

  const handleReturnRecord = async () => {
    if (!confirmRecord) return;
    setReturningId(confirmRecord.id);
    setError("");
    try {
      await api.staffReturnBorrowRecord(confirmRecord.id);
      setSnackbar({ severity: "success", message: "Trả sách thành công" });
      setConfirmRecord(null);
      await loadBorrowers();
      if (selectedStudentCode) await loadPatronDetail(selectedStudentCode);
    } catch (err: any) {
      setSnackbar({ severity: "error", message: getErrorMessage(err) || "Trả sách thất bại" });
    } finally {
      setReturningId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
        {[
          { label: "Độc giả đang mượn", value: totals.borrowers, icon: UsersIcon, color: "primary.main" },
          { label: "Sách chưa trả", value: totals.books, icon: BookIcon, color: "success.main" },
          { label: "Sách quá hạn", value: totals.overdue, icon: AlertIcon, color: "error.main" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} variant="outlined">
              <CardContent>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>{item.label}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>{item.value}</Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: item.color, color: "primary.contrastText" }}>
                    <Icon />
                  </Avatar>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {error ? <Alert severity="error" onClose={() => setError("")}>{error}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "420px minmax(0, 1fr)" }, gap: 3 }}>
        <Paper variant="outlined" sx={{ minHeight: 620, p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
            <Box>
              <Typography variant="h6">Độc giả đang mượn</Typography>
              <Typography variant="body2" color="text.secondary">Chọn độc giả để xem sách cần trả</Typography>
            </Box>
            <Button startIcon={<RefreshIcon />} onClick={loadBorrowers} disabled={loadingBorrowers}>Tải lại</Button>
          </Stack>

          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo MSSV hoặc tên..."
            fullWidth
            size="small"
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              },
            }}
          />

          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={filter}
            onChange={(_, value) => value && setFilter(value)}
            sx={{ mt: 2 }}
          >
            <ToggleButton value="all">Tất cả</ToggleButton>
            <ToggleButton value="overdue">Quá hạn</ToggleButton>
            <ToggleButton value="active">Đúng hạn</ToggleButton>
          </ToggleButtonGroup>

          <Divider sx={{ my: 2 }} />

          {loadingBorrowers ? (
            <Box sx={{ py: 8, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
          ) : borrowers.length === 0 ? (
            <Alert severity="info">Không có độc giả đang mượn sách.</Alert>
          ) : filteredBorrowers.length === 0 ? (
            <Alert severity="info">Không tìm thấy độc giả phù hợp.</Alert>
          ) : (
            <List disablePadding sx={{ maxHeight: 430, overflowY: "auto" }}>
              {filteredBorrowers.map((borrower) => {
                const selected = borrower.patron.student_code === selectedStudentCode;
                return (
                  <ListItemButton
                    key={borrower.patron.id}
                    selected={selected}
                    onClick={() => setSelectedStudentCode(borrower.patron.student_code)}
                    sx={{ mb: 1, border: 1, borderColor: selected ? "primary.main" : "divider", borderRadius: 1 }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                      <Typography sx={{ fontWeight: 900 }} noWrap>{borrowerName(borrower)}</Typography>
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontFamily: "monospace" }}>
                        {borrower.patron.student_code}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.75, alignItems: "center", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">{borrower.total_borrowed} sách đang mượn</Typography>
                        <Typography variant="caption" color="text.secondary">Hạn gần nhất {formatDate(borrower.nearest_due_at)}</Typography>
                      </Stack>
                    </Box>
                    <Chip
                      size="small"
                      color={borrower.overdue_count > 0 ? "error" : "success"}
                      label={borrower.overdue_count > 0 ? `${borrower.overdue_count} quá hạn` : "Đúng hạn"}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ minHeight: 620, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">Chi tiết trả sách</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedBorrower ? `${borrowerName(selectedBorrower)} - ${selectedBorrower.patron.student_code}` : "Chọn một độc giả ở danh sách bên trái"}
            </Typography>
          </Box>

          {!selectedStudentCode ? (
            <Alert severity="info">Chọn một độc giả đang mượn để xem sách và xác nhận trả.</Alert>
          ) : loadingDetail ? (
            <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
          ) : !detail || detail.records.length === 0 ? (
            <Alert severity="success">Độc giả này đã trả hết sách.</Alert>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip color="primary" label={`${detail.total} sách đang mượn`} />
                <Chip color={detail.overdue_count > 0 ? "error" : "success"} label={detail.overdue_count > 0 ? `${detail.overdue_count} quá hạn` : "Không quá hạn"} />
                {detail.patron.email ? <Chip variant="outlined" label={detail.patron.email} /> : null}
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Sách</TableCell>
                      <TableCell>ISBN</TableCell>
                      <TableCell>Ngày mượn</TableCell>
                      <TableCell>Hạn trả</TableCell>
                      <TableCell>Vị trí</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.records.map((record) => (
                      <TableRow key={record.id} selected={isOverdue(record)}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{record.book?.title || record.book_id}</Typography>
                          {record.book?.author ? <Typography variant="caption" color="text.secondary">{record.book.author}</Typography> : null}
                        </TableCell>
                        <TableCell sx={{ fontFamily: "monospace" }}>{record.book?.isbn || record.book_id}</TableCell>
                        <TableCell>{formatDate(record.borrow_at)}</TableCell>
                        <TableCell>{formatDate(record.due_at)}</TableCell>
                        <TableCell>{record.shelf_location || record.book?.shelf_location || "-"}</TableCell>
                        <TableCell>{dueChip(record)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<CheckIcon />}
                            disabled={!!returningId}
                            onClick={() => setConfirmRecord(record)}
                          >
                            Xác nhận trả
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </Paper>
      </Box>

      <Dialog open={!!confirmRecord} onClose={() => setConfirmRecord(null)}>
        <DialogTitle>Xác nhận trả sách</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Trả sách "{confirmRecord?.book?.title || confirmRecord?.book_id}" cho độc giả {detail?.patron.full_name || detail?.patron.student_code}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRecord(null)}>Hủy</Button>
          <Button variant="contained" onClick={handleReturnRecord} disabled={!!returningId}>
            {returningId ? "Đang trả..." : "Xác nhận trả"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={3200} onClose={() => setSnackbar(null)}>
        {snackbar ? <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </Stack>
  );
}
