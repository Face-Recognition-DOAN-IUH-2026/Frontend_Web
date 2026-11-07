"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import FaceIcon from "@mui/icons-material/FaceRetouchingNaturalOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import RestoreFromTrashOutlinedIcon from "@mui/icons-material/RestoreFromTrashOutlined";
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

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Tự động đưa về trang đầu tiên nếu danh sách thay đổi và trang hiện tại vượt quá số lượng
  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= patrons.length) {
      setPage(0);
    }
  }, [patrons.length, page, rowsPerPage]);

  const columns: DataTableColumn<PatronPublic>[] = [
    {
      key: "full_name",
      label: "Độc giả",
      sortable: true,
      render: (_, row) => (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AvatarUser user={row} role="patron" size={38} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
              {row.full_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", display: "block" }}>
              {row.student_code}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: "class_name",
      label: "Lớp & Khóa",
      sortable: true,
      render: (_, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.class_name || "—"}
          </Typography>
          {row.course ? (
            <Typography variant="caption" color="text.secondary">
              {row.course}
            </Typography>
          ) : null}
        </Box>
      ),
    },
    {
      key: "contact",
      label: "Liên hệ",
      render: (_, row) => (
        <Box>
          <Typography variant="caption" sx={{ display: "block", color: "text.primary", fontWeight: 500 }}>
            {row.email || "—"}
          </Typography>
          {row.phone ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
              {row.phone}
            </Typography>
          ) : null}
        </Box>
      ),
    },
    {
      key: "has_face",
      label: "Khuôn mặt",
      sortable: true,
      render: (_, row) =>
        row.has_face ? (
          <Chip
            size="small"
            icon={<FaceIcon sx={{ fontSize: "14px !important" }} />}
            label="Đã đăng ký"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 700, fontSize: "0.7rem", height: 24 }}
          />
        ) : (
          <Chip
            size="small"
            label="Chưa có"
            variant="outlined"
            sx={{
              fontWeight: 600,
              fontSize: "0.7rem",
              height: 24,
              color: "text.secondary",
              borderColor: "divider",
            }}
          />
        ),
    },
    {
      key: "membership_expiry",
      label: "Hạn thẻ",
      sortable: true,
      render: (_, row) => {
        if (!row.membership_expiry) return "—";
        const expDate = new Date(row.membership_expiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
        const isExp = diffDays < 0;
        const isExpiringSoon = !isExp && diffDays <= 30;
        const formattedDate = expDate.toLocaleDateString("vi-VN");

        if (isExp) {
          return (
            <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "error.main" }}>
                {formattedDate}
              </Typography>
              <Chip
                size="small"
                label={`Hết hạn ${Math.abs(diffDays)} ngày`}
                color="error"
                sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
              />
            </Stack>
          );
        }
        if (isExpiringSoon) {
          return (
            <Stack spacing={0.25} sx={{ alignItems: "flex-start" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "warning.main" }}>
                {formattedDate}
              </Typography>
              <Chip
                size="small"
                label={`Còn ${diffDays} ngày`}
                color="warning"
                sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
              />
            </Stack>
          );
        }
        return (
          <Typography variant="body2" sx={{ fontSize: "0.82rem", fontWeight: 500 }}>
            {formattedDate}
          </Typography>
        );
      },
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (_, row) => (
        <Chip
          label={statusLabel(row.status)}
          color={statusColor(row.status)}
          size="small"
          variant="filled"
          sx={{ fontWeight: 700, fontSize: "0.7rem", height: 24 }}
        />
      ),
    },
    {
      key: "actions",
      label: "Thao tác",
      align: "right",
      render: (_, row) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
          {row.status === "deleted" ? (
            <>
              <Tooltip title={!canUpdate ? getPermissionDeniedReason("patrons", "update") : "Khôi phục tài khoản"}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    startIcon={<RestoreFromTrashOutlinedIcon sx={{ fontSize: 15 }} />}
                    disabled={!canUpdate}
                    onClick={() => {
                      if (!canUpdate) return;
                      onRestore(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.72rem", borderRadius: 1.5 }}
                  >
                    Khôi phục
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={!canDelete ? getPermissionDeniedReason("patrons", "delete") : "Xóa vĩnh viễn"}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />}
                    disabled={!canDelete}
                    onClick={() => {
                      if (!canDelete) return;
                      onDelete(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.72rem", borderRadius: 1.5 }}
                  >
                    Xóa
                  </Button>
                </span>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title={!canUpdate ? getPermissionDeniedReason("patrons", "update") : "Chỉnh sửa thông tin"}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />}
                    disabled={!canUpdate}
                    onClick={() => {
                      if (!canUpdate) return;
                      onEdit(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }}
                  >
                    Sửa
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={!canApproveOrUpdate ? getPermissionDeniedReason("patrons", "approve") : "Gia hạn thẻ độc giả"}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    startIcon={<AutorenewOutlinedIcon sx={{ fontSize: 15 }} />}
                    disabled={!canApproveOrUpdate}
                    onClick={() => {
                      if (!canApproveOrUpdate) return;
                      onRenew(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }}
                  >
                    Gia hạn
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={!canDelete ? getPermissionDeniedReason("patrons", "delete") : "Xóa độc giả"}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />}
                    disabled={!canDelete}
                    onClick={() => {
                      if (!canDelete) return;
                      onDelete(row);
                    }}
                    sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.72rem", borderRadius: 1.5 }}
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
      page={page}
      rowsPerPage={rowsPerPage}
      totalCount={patrons.length}
      onPageChange={setPage}
      onRowsPerPageChange={(ps) => {
        setRowsPerPage(ps);
        setPage(0);
      }}
    />
  );
}
