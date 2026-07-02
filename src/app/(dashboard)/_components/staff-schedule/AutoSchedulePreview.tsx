"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { ScheduleStaff, StaffShift, LibraryZone } from "@/lib/types";

interface AutoScheduleProposal {
  staffId: string;
  shiftId: string;
  zoneId: string;
  workDate: string;
  note: string;
}

interface AutoSchedulePreviewProps {
  proposals: AutoScheduleProposal[];
  staff: ScheduleStaff[];
  shifts: StaffShift[];
  zones: LibraryZone[];
  onConfirm: (selected: AutoScheduleProposal[]) => void;
  onCancel: () => void;
  loading: boolean;
  skippedCount: number;
}

export default function AutoSchedulePreview({
  proposals,
  staff,
  shifts,
  zones,
  onConfirm,
  onCancel,
  loading,
  skippedCount,
}: AutoSchedulePreviewProps) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(proposals.map((_, i) => i))
  );

  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const shiftMap = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts]);
  const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones]);

  const toggleAll = () => {
    if (selected.size === proposals.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(proposals.map((_, i) => i)));
    }
  };

  const toggleRow = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelected(next);
  };

  const handleConfirm = () => {
    const selectedProposals = proposals.filter((_, i) => selected.has(i));
    onConfirm(selectedProposals);
  };

  if (!proposals.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          {skippedCount > 0
            ? `Không có ca nào được đề xuất (${skippedCount} ca đã bỏ qua)`
            : "Không có ca nào được đề xuất"}
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {selected.size}/{proposals.length} ca được chọn
          {skippedCount > 0 && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              ({skippedCount} ca bỏ qua)
            </Typography>
          )}
        </Typography>
        <Button size="small" onClick={toggleAll} sx={{ textTransform: "none" }}>
          {selected.size === proposals.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
        </Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.size > 0 && selected.size < proposals.length}
                  checked={selected.size === proposals.length}
                  onChange={toggleAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Nhân viên</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ca</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Khu vực</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ngày</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ghi chú</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {proposals.map((p, idx) => (
              <TableRow key={idx} hover selected={selected.has(idx)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.has(idx)}
                    onChange={() => toggleRow(idx)}
                  />
                </TableCell>
                <TableCell>{staffMap.get(p.staffId)?.fullName || staffMap.get(p.staffId)?.email || p.staffId}</TableCell>
                <TableCell>{shiftMap.get(p.shiftId)?.name || p.shiftId}</TableCell>
                <TableCell>{zoneMap.get(p.zoneId)?.zoneName || p.zoneId}</TableCell>
                <TableCell>{new Date(p.workDate + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</TableCell>
                <TableCell>{p.note || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
        <Button onClick={onCancel} sx={{ textTransform: "none" }}>
          Hủy
        </Button>
        <Button
          variant="contained"
          disabled={selected.size === 0 || loading}
          onClick={handleConfirm}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {loading ? "Đang xử lý..." : `Xác nhận (${selected.size} ca)`}
        </Button>
      </Stack>
    </Stack>
  );
}
