import type { ShelfData } from "../types";

export const MOCK_SHELVES: ShelfData[] = [
  {
    id: "shelf-a",
    code: "A-12-3",
    position: [-4, 0, -2],
    numTiers: 3,
    books: [
      { id: "b1", title: "Toán cao cấp T1", author: "Nguyễn Văn A", isbn: "978-0-12-345678-9", status: "available", tierIndex: 0 },
      { id: "b2", title: "Giải tích", author: "Lê Văn B", isbn: "978-0-12-345679-6", status: "available", tierIndex: 0 },
      { id: "b3", title: "Đại số tuyến tính", author: "Trần Văn C", isbn: "978-0-12-345680-2", status: "borrowed", tierIndex: 0 },
      { id: "b4", title: "Vật lý đại cương", author: "Phạm Văn D", isbn: "978-0-12-345681-9", status: "borrowed", tierIndex: 1 },
      { id: "b5", title: "Hóa học cơ bản", author: "Hoàng Văn E", isbn: "978-0-12-345682-6", status: "available", tierIndex: 1 },
      { id: "b6", title: "Cấu trúc dữ liệu", author: "Ngô Văn F", isbn: "978-0-12-345683-3", status: "available", tierIndex: 2 },
      { id: "b7", title: "Giải thuật nâng cao", author: "Lý Văn G", isbn: "978-0-12-345684-0", status: "available", tierIndex: 2 },
    ],
  },
  {
    id: "shelf-b",
    code: "B-05-1",
    position: [0, 0, -2],
    numTiers: 4,
    books: [
      { id: "b8", title: "Lập trình Python", author: "Vũ Văn H", isbn: "978-0-12-345685-7", status: "available", tierIndex: 0 },
      { id: "b9", title: "Java cơ bản", author: "Đinh Văn I", isbn: "978-0-12-345686-4", status: "borrowed", tierIndex: 0 },
      { id: "b10", title: "Cơ sở dữ liệu", author: "Mai Văn K", isbn: "978-0-12-345687-1", status: "available", tierIndex: 1 },
      { id: "b11", title: "Mạng máy tính", author: "Lâm Văn L", isbn: "978-0-12-345688-8", status: "available", tierIndex: 1 },
      { id: "b12", title: "Hệ điều hành", author: "Quách Văn M", isbn: "978-0-12-345689-5", status: "borrowed", tierIndex: 2 },
      { id: "b13", title: "Trí tuệ nhân tạo", author: "Tô Văn N", isbn: "978-0-12-345690-1", status: "available", tierIndex: 3 },
    ],
  },
  {
    id: "shelf-c",
    code: "C-01-1",
    position: [4, 0, -2],
    numTiers: 3,
    books: [
      { id: "b14", title: "Kinh tế vi mô", author: "Phan Văn O", isbn: "978-0-12-345691-8", status: "available", tierIndex: 0 },
      { id: "b15", title: "Kinh tế vĩ mô", author: "Trịnh Văn P", isbn: "978-0-12-345692-5", status: "borrowed", tierIndex: 0 },
      { id: "b16", title: "Thương mại điện tử", author: "Đỗ Văn Q", isbn: "978-0-12-345693-2", status: "available", tierIndex: 1 },
      { id: "b17", title: "Quản trị kinh doanh", author: "Hồ Văn R", isbn: "978-0-12-345694-9", status: "available", tierIndex: 2 },
    ],
  },
];
