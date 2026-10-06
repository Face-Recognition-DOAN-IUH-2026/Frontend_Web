"use client";

import { useMemo } from "react";
import { Box, useTheme } from "@mui/material";
import Table from "antd/es/table";
import Badge from "antd/es/badge";
import Tooltip from "antd/es/tooltip";
import type { ColumnsType } from "antd/es/table";
import type { StaffScheduleAssignment, StaffShift } from "@/lib/types";
import TimetableCell from "./TimetableCell";

interface TimetableGridProps {
  days: Date[];
  shifts: StaffShift[];
  assignments: StaffScheduleAssignment[];
  filter: string;
  isAdmin?: boolean;
  onCellClick?: (date: string, shiftId: string) => void;
  onDeleteAssignment?: (id: string) => void;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(d: Date) {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function isToday(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

interface ShiftRow {
  key: string;
  shift: StaffShift;
  cells: Record<string, StaffScheduleAssignment[]>;
}

export default function TimetableGrid({
  days, shifts, assignments, filter, isAdmin, onCellClick, onDeleteAssignment,
}: TimetableGridProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const cellMap = useMemo(() => {
    const map: Record<string, StaffScheduleAssignment[]> = {};
    for (const a of assignments) {
      if (a.status === "cancelled") continue;

      if (filter === "active") {
        const now = new Date();
        const today = toDateInput(now);
        if (a.workDate !== today) continue;
        const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const start = (a.shift?.startTime || "").slice(0, 5);
        const end = (a.shift?.endTime || "").slice(0, 5);
        if (!(start && end && current >= start && current <= end)) continue;
      }
      if (filter === "future" && a.workDate <= toDateInput(new Date())) continue;
      if (filter === "past" && a.workDate >= toDateInput(new Date())) continue;

      const key = `${a.shiftId}:${a.workDate}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [assignments, filter]);

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of assignments) {
      if (a.status === "cancelled") continue;
      counts[a.workDate] = (counts[a.workDate] || 0) + 1;
    }
    return counts;
  }, [assignments]);

  const dataSource: ShiftRow[] = useMemo(() =>
    shifts.map((shift) => ({
      key: shift.id,
      shift,
      cells: Object.fromEntries(
        days.map((d) => [toDateInput(d), cellMap[`${shift.id}:${toDateInput(d)}`] || []])
      ),
    })),
    [shifts, days, cellMap]
  );

  const columns: ColumnsType<ShiftRow> = useMemo(() => {
    const shiftCol: ColumnsType<ShiftRow>[number] = {
      title: "Ca / Ngày",
      dataIndex: "shift",
      key: "shift",
      fixed: "left",
      width: 160,
      render: (_: any, row: ShiftRow) => (
        <Tooltip title={`${row.shift.name}: ${row.shift.startTime?.slice(0, 5)} – ${row.shift.endTime?.slice(0, 5)}${row.shift.minStaff ? ` (tối thiểu ${row.shift.minStaff} nhân viên)` : ""}`} placement="right">
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.78rem", color: theme.palette.primary.main }}>
              {row.shift.name}
            </div>
            <div style={{ fontSize: "0.68rem", color: theme.palette.text.secondary, marginTop: 2 }}>
              {row.shift.startTime?.slice(0, 5)} – {row.shift.endTime?.slice(0, 5)}
            </div>
          </div>
        </Tooltip>
      ),
    };

    const dayCols: ColumnsType<ShiftRow> = days.map((d, i) => {
      const dateStr = toDateInput(d);
      const count = dayCounts[dateStr] || 0;
      const today = isToday(d);
      return {
        title: (
          <div style={{ textAlign: "center" }}>
            <Badge count={count} size="small" offset={[0, 0]}>
              <span style={{ fontWeight: 700, fontSize: "0.75rem", color: today ? theme.palette.primary.main : theme.palette.text.primary }}>
                {DAY_LABELS[i]}
              </span>
            </Badge>
            <div style={{ fontSize: "0.65rem", marginTop: 2, color: today ? theme.palette.primary.light : theme.palette.text.secondary }}>
              {formatDate(d)}
            </div>
          </div>
        ),
        dataIndex: "cells",
        key: dateStr,
        width: 140,
        render: (_: any, row: ShiftRow) => {
          const cellAssignments = row.cells[dateStr] || [];
          return (
            <TimetableCell
              assignments={cellAssignments}
              date={dateStr}
              shiftId={row.shift.id}
              isAdmin={isAdmin}
              onCellClick={onCellClick}
              onDeleteAssignment={onDeleteAssignment}
              shift={row.shift}
            />
          );
        },
        onCell: () => ({
          style: {
            background: today
              ? isDark ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.03)"
              : undefined,
          },
        }),
      };
    });

    return [shiftCol, ...dayCols];
  }, [days, dayCounts, isAdmin, onCellClick, onDeleteAssignment, theme, isDark]);

  return (
    <Box sx={{
      width: "100%",
      overflowX: "auto",
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 1,
      "& .ant-table": {
        background: theme.palette.background.paper,
      },
      "& .ant-table-thead > tr > th": {
        background: isDark ? "rgba(99,102,241,0.08)" : theme.palette.action.hover,
        fontWeight: 700,
        fontSize: "0.75rem",
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${theme.palette.divider}`,
      },
      "& .ant-table-tbody > tr > td": {
        borderBottom: `1px solid ${theme.palette.divider}`,
        background: theme.palette.background.paper,
        color: theme.palette.text.primary,
      },
      "& .ant-table-tbody > tr:hover > td": {
        background: isDark ? "rgba(99,102,241,0.04)" : "rgba(99,102,241,0.02)",
      },
      "& .ant-table-cell": {
        padding: "8px",
      },
      "& .ant-table-fixed-left": {
        "& .ant-table-thead > tr > th": {
          background: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)",
        },
        "& .ant-table-tbody > tr > td": {
          background: isDark ? "rgba(99,102,241,0.04)" : "rgba(99,102,241,0.02)",
        },
      },
      "& .ant-table-bordered .ant-table-thead > tr > th": {
        borderInlineEnd: `1px solid ${theme.palette.divider}`,
      },
      "& .ant-table-bordered .ant-table-tbody > tr > td": {
        borderInlineEnd: `1px solid ${theme.palette.divider}`,
      },
    }}>
      <Table<ShiftRow>
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        scroll={{ x: 160 + days.length * 140 }}
        bordered
      />
    </Box>
  );
}
