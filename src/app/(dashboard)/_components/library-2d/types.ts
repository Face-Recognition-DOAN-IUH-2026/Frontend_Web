export interface BookData {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: "available" | "borrowed";
  tierIndex: number;
  face: 0 | 1;
}

export interface ShelfData {
  id: string;
  code: string;
  floor: string;
  shelfNum: number;
  position: [number, number, number];
  numTiers: number;
  books: BookData[];
}

export interface LibraryMapData {
  shelves: ShelfData[];
}
