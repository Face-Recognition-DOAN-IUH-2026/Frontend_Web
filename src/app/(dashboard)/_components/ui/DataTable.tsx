import { ReactNode } from "react";
import Table from "antd/es/table";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import EmptyState from "./EmptyState";

export interface DataTableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: number | string;
  fixed?: "left" | "right";
  filterOptions?: { text: string; value: string }[];
  render?: (value: any, row: T, index: number) => ReactNode;
}

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string | number;
  scrollX?: number | string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  loading = false,
  emptyTitle = "Không có dữ liệu",
  emptyDescription,
  page = 0,
  rowsPerPage = 10,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  getRowId,
  scrollX,
}: DataTableProps<T>) {
  const antdColumns: ColumnsType<T> = columns.map((col) => {
    const colDef: ColumnsType<T>[number] = {
      key: col.key,
      dataIndex: col.key,
      title: col.label,
      align: col.align || "left",
      width: col.width,
      fixed: col.fixed,
      sorter: col.sortable ? (a: T, b: T) => {
        const av = a[col.key];
        const bv = b[col.key];
        if (av == null && bv == null) return 0;
        if (av == null) return -1;
        if (bv == null) return 1;
        if (typeof av === "number" && typeof bv === "number") return av - bv;
        return String(av).localeCompare(String(bv));
      } : undefined,
      render: col.render
        ? (value: any, row: T, index: number) => col.render!(value, row, index)
        : (value: any) => value ?? "-",
    };

    if (col.filterOptions) {
      colDef.filters = col.filterOptions.map((o) => ({ text: o.text, value: o.value }));
      colDef.onFilter = (value: any, record: T) => String(record[col.key]) === String(value);
    }

    return colDef;
  });

  const pagination: TablePaginationConfig | false = totalCount !== undefined && onPageChange
    ? {
        current: page + 1,
        pageSize: rowsPerPage,
        total: totalCount,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
        onChange: (p: number, ps: number) => {
          onPageChange(p - 1);
          onRowsPerPageChange?.(ps);
        },
      }
    : false;

  if (!loading && rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table<T>
      columns={antdColumns}
      dataSource={rows}
      rowKey={getRowId ? (row: T) => getRowId(row) : undefined}
      loading={loading}
      size="small"
      pagination={pagination}
      scroll={scrollX ? { x: scrollX } : undefined}
      onRow={onRowClick ? (record: T) => ({ onClick: () => onRowClick(record), style: { cursor: "pointer" } }) : undefined}
    />
  );
}
