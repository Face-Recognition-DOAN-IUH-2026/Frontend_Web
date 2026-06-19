import type { ShelfData } from "../types";

const BOOK_TITLES = [
  "Toán cao cấp","Giải tích","Đại số tuyến tính","Xác suất thống kê","Logic học","Lập trình Python",
  "Cấu trúc dữ liệu","Giải thuật","Cơ sở dữ liệu","Mạng máy tính","Hệ điều hành","Trí tuệ nhân tạo",
  "Học máy","Xử lý ngôn ngữ","Khoa học dữ liệu","Phân tích dữ liệu","An toàn thông tin","Mã hóa",
  "Công nghệ phần mềm","Kiến trúc máy tính","Trí tuệ doanh nghiệp","Quản trị kinh doanh","Marketing",
  "Kinh tế vi mô","Kinh tế vĩ mô","Thương mại điện tử","Tài chính","Kế toán","Luật kinh tế",
  "Ngôn ngữ học","Văn học Việt Nam","Triết học","Tâm lý học","Xã hội học","Nhân chủng học",
  "Sinh học","Hóa học","Vật lý","Địa lý","Môi trường","Năng lượng",
  "Vật liệu mới","Nano technology","Cơ khí","Điện tử","Tự động hóa","Robotic",
  "Y học cơ bản","Dược học","Dinh dưỡng","Sức khỏe cộng đồng","Phòng chống dịch bệnh","Y tế công cộng",
  "Thiết kế","Nghệ thuật","Kiến trúc","Nội thất","Đồ họa","Multimedia",
  "âm nhạc","Sân khấu","Điện ảnh","Truyền thông","Báo chí","Quan hệ công chúng",
];

const AUTHORS = [
  "Nguyễn Văn A","Lê Văn B","Trần Văn C","Phạm Văn D","Hoàng Văn E","Ngô Văn F",
  "Lý Văn G","Dương Văn H","Đinh Văn I","Mai Văn K","Lâm Văn L","Quách Văn M",
  "Tô Văn N","Phan Văn O","Trịnh Văn P","Đỗ Văn Q","Hồ Văn R","Vũ Văn S",
  "Bùi Văn T","Nguyễn Thị U","Trần Thị V","Lê Thị W","Phạm Thị X","Hoàng Thị Y",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateBooks(
  shelfCode: string,
  numTiers: number,
  booksPerTierFace: number,
  seed: number,
) {
  const rand = seededRandom(seed);
  const books: ShelfData["books"] = [];
  let id = 0;
  for (let t = 0; t < numTiers; t++) {
    for (let face = 0 as 0 | 1; face <= 1; face++) {
      for (let i = 0; i < booksPerTierFace; i++) {
        const ti = Math.floor(rand() * BOOK_TITLES.length);
        const ai = Math.floor(rand() * AUTHORS.length);
        const status: "available" | "borrowed" = rand() > 0.3 ? "available" : "borrowed";
        books.push({
          id: `${shelfCode}-b${id++}`,
          title: BOOK_TITLES[ti],
          author: AUTHORS[ai],
          isbn: `978-${String(Math.floor(rand() * 900) + 100)}-${String(Math.floor(rand() * 9000) + 1000)}-${String(Math.floor(rand() * 9) + 1)}`,
          status,
          tierIndex: t,
          face,
        });
      }
    }
  }
  return books;
}

export const MOCK_SHELVES: ShelfData[] = [
  // ── Floor A ──
  {
    id: "shelf-a10",
    code: "A-10",
    floor: "A",
    shelfNum: 10,
    position: [-4, 0, -2],
    numTiers: 3,
    books: generateBooks("A-10", 3, 20, 1),
  },
  {
    id: "shelf-a11",
    code: "A-11",
    floor: "A",
    shelfNum: 11,
    position: [-4, 0, 2],
    numTiers: 4,
    books: generateBooks("A-11", 4, 20, 200),
  },
  {
    id: "shelf-a12",
    code: "A-12",
    floor: "A",
    shelfNum: 12,
    position: [-4, 0, 6],
    numTiers: 3,
    books: generateBooks("A-12", 3, 20, 400),
  },
  // ── Floor B ──
  {
    id: "shelf-b05",
    code: "B-05",
    floor: "B",
    shelfNum: 5,
    position: [0, 0, -2],
    numTiers: 4,
    books: generateBooks("B-05", 4, 20, 600),
  },
  {
    id: "shelf-b08",
    code: "B-08",
    floor: "B",
    shelfNum: 8,
    position: [0, 0, 2],
    numTiers: 3,
    books: generateBooks("B-08", 3, 20, 800),
  },
  // ── Floor C ──
  {
    id: "shelf-c01",
    code: "C-01",
    floor: "C",
    shelfNum: 1,
    position: [4, 0, -2],
    numTiers: 3,
    books: generateBooks("C-01", 3, 20, 1000),
  },
  {
    id: "shelf-c03",
    code: "C-03",
    floor: "C",
    shelfNum: 3,
    position: [4, 0, 2],
    numTiers: 4,
    books: generateBooks("C-03", 4, 20, 1200),
  },
];
