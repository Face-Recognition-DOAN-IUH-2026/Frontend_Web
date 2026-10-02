"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Chip, Stack, Tooltip, Typography } from "@mui/material";
import DataTable, { type DataTableColumn } from "./DataTable";
import AvatarUser from "./AvatarUser";
import { statusLabel, statusColor } from "@/lib/utils";
import type { PatronPublic } from "@/lib/types";
import { usePermission, getPermissionDeniedReason } from "@/lib/permission-context";

interface PatronListViewProps {
  patrons: PatronPublic[];
  onEdit: (p: PatronPublic) => void;
  onRenew: (p: PatronPublic) => void;
  onDelete: (p: PatronPublic) => void;
  onRestore: (p: PatronPublic) => void;
}

export default function PatronListView({ patrons, onEdit, onRenew, onDelete, onRestore }: PatronListViewProps) {
  const router = useRouter();
  const { can } = usePermission();
  const canUpdate = can("patrons", "update");
  const canDelete = can("patrons", "delete");
  const canApproveOrUpdate = can("patrons", "approve") || can("patrons", "update");

  const columns: DataTableColumn<PatronPublic>[] = [
    {
      key: "full_name",
      label: "Họ tên",
      sortable: true,
      render: (_, row) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AvatarUser user={row} role="patron" size={32} />
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
              <Tooltip title={!canUpdate ? getPermissionDeniedReason("patrons", "update") : ""}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    disabled={!canUpdate}
                    onClick={() => {
                      if (!canUpdate) return;
                      onRestore(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}
                  >
                    Khôi phục
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={!canDelete ? getPermissionDeniedReason("patrons", "delete") : ""}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={!canDelete}
                    onClick={() => {
                      if (!canDelete) return;
                      onDelete(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}
                  >
                    Xóa
                  </Button>
                </span>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title={!canUpdate ? getPermissionDeniedReason("patrons", "update") : ""}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!canUpdate}
                    onClick={() => {
                      if (!canUpdate) return;
                      onEdit(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}
                  >
                    Sửa
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={!canApproveOrUpdate ? getPermissionDeniedReason("patrons", "approve") : ""}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    disabled={!canApproveOrUpdate}
                    onClick={() => {
                      if (!canApproveOrUpdate) return;
                      onRenew(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}
                  >
                    Gia hạn
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={!canDelete ? getPermissionDeniedReason("patrons", "delete") : ""}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={!canDelete}
                    onClick={() => {
                      if (!canDelete) return;
                      onDelete(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem" }}
                  >
                    Xóa
                  </Button>
                </span>
              </Tooltip>
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
