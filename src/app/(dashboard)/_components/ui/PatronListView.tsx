"use client";

import { useRouter } from "next/navigation";
import { Avatar, Box, Button, Chip, Stack, Typography } from "@mui/material";
import DataTable, { type DataTableColumn } from "./DataTable";
import { initials, statusLabel, statusColor } from "@/lib/utils";
import type { PatronPublic } from "@/lib/types";

interface PatronListViewProps {
  patrons: PatronPublic[];
  onEdit: (p: PatronPublic) => void;
  onRenew: (p: PatronPublic) => void;
  onDelete: (p: PatronPublic) => void;
  onRestore: (p: PatronPublic) => void;
}

export default function PatronListView({ patrons, onEdit, onRenew, onDelete, onRestore }: PatronListViewProps) {
  const router = useRouter();

  const columns: DataTableColumn<PatronPublic>[] = [
    {
      key: "full_name",
      label: "Họ tên",
      sortable: true,
      render: (_, row) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: row.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)", color: row.status === "active" ? "success.main" : "text.secondary", fontWeight: 700, fontSize: 13 }}>
            {initials(row.full_name)}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.full_name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>{row.student_code}</Typography>
          </Box>
        </Stack>
      ),
    },
    { key: "student_code", label: "MSSV", sortable: true },
    { key: "course", label: "Khóa học", sortable: true },
    {
      key: "status",
      label: "Trạng thái",
      render: (_, row) => (
        <Chip label={statusLabel(row.status)} color={statusColor(row.status)} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.7rem" }} />
      ),
    },
    {
      key: "has_face",
      label: "Khuôn mặt",
      render: (_, row) => (
        <Typography variant="caption" color={row.has_face ? "primary.main" : "text.secondary"}>
          {row.has_face ? "Đã đăng ký" : "Chưa có"}
        </Typography>
      ),
    },
    { key: "membership_expiry", label: "Hạn thẻ", sortable: true },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (_, row) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
          {row.status === "deleted" ? (
            <>
              <Button size="small" variant="outlined" color="success" onClick={() => onRestore(row)} sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}>Khôi phục</Button>
              <Button size="small" variant="outlined" color="error" onClick={() => onDelete(row)} sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}>Xóa</Button>
            </>
          ) : (
            <>
              <Button size="small" variant="outlined" onClick={() => onEdit(row)} sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}>Sửa</Button>
              <Button size="small" variant="outlined" color="success" onClick={() => onRenew(row)} sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}>Gia hạn</Button>
              <Button size="small" variant="outlined" color="error" onClick={() => onDelete(row)} sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}>Xóa</Button>
            </>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <DataTable<PatronPublic>
      columns={columns}
      rows={patrons}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/patrons/${row.id}`)}
      emptyTitle="Không tìm thấy độc giả nào"
    />
  );
}
