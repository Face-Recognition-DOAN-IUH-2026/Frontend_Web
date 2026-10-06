/**
 * Regression test cho bug phân trang DataTable (LIB-252 follow-up):
 * - Click sang trang 2 từng gọi đồng thời onRowsPerPageChange -> parent setPage(0),
 *   kéo bảng về lại trang 1 (tưởng như bị đứng).
 * - Đổi pageSize từng khiến callback chạy 2 lần (onChange + onShowSizeChange).
 *
 * Lưu ý: `antd/es/table` bị mock toàn cục trong jest.setup.js (không render
 * pagination thật), nên file này override mock để mô phỏng đúng hành vi antd:
 * chuyển trang chỉ bắn onChange, đổi size bắn cả onShowSizeChange lẫn onChange.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DataTable from "@/app/(dashboard)/_components/ui/DataTable";

jest.mock("antd/es/table", () => ({
  __esModule: true,
  default: function MockTableWithPagination(props: any) {
    const pageSize = props.pagination?.pageSize ?? 10;
    return (
      <div>
        <table>
          <tbody>
            {(props.dataSource || []).map((r: any, i: number) => (
              <tr key={i}>
                <td>{r.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          data-testid="goto-page-2"
          onClick={() => props.pagination?.onChange?.(2, pageSize)}
        >
          Trang 2
        </button>
        <button
          data-testid="change-size-20"
          onClick={() => {
            props.pagination?.onShowSizeChange?.(1, 20);
            props.pagination?.onChange?.(1, 20);
          }}
        >
          20/trang
        </button>
      </div>
    );
  },
}));

const COLUMNS = [{ key: "name", label: "Tên" }];

function makeRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `u-${i}`, name: `SV ${i + 1}` }));
}

function renderTable(handlers: { onPageChange?: jest.Mock; onRowsPerPageChange?: jest.Mock }) {
  return render(
    <DataTable
      columns={COLUMNS}
      rows={makeRows(25)}
      getRowId={(r) => r.id}
      page={0}
      rowsPerPage={10}
      totalCount={25}
      onPageChange={handlers.onPageChange}
      onRowsPerPageChange={handlers.onRowsPerPageChange}
    />
  );
}

describe("DataTable pagination (regression)", () => {
  it("chuyển sang trang 2 chỉ gọi onPageChange(1), không gọi onRowsPerPageChange", () => {
    const onPageChange = jest.fn();
    const onRowsPerPageChange = jest.fn();
    renderTable({ onPageChange, onRowsPerPageChange });

    fireEvent.click(screen.getByTestId("goto-page-2"));

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onRowsPerPageChange).not.toHaveBeenCalled();
  });

  it("đổi pageSize chỉ gọi onRowsPerPageChange đúng 1 lần với size mới", () => {
    const onPageChange = jest.fn();
    const onRowsPerPageChange = jest.fn();
    renderTable({ onPageChange, onRowsPerPageChange });

    fireEvent.click(screen.getByTestId("change-size-20"));

    expect(onRowsPerPageChange).toHaveBeenCalledTimes(1);
    expect(onRowsPerPageChange).toHaveBeenCalledWith(20);
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
