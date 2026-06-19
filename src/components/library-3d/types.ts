export interface BookData {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: "available" | "borrowed";
  tierIndex: number;
}

export interface ShelfData {
  id: string;
  code: string;
  position: [number, number, number];
  numTiers: number;
  books: BookData[];
}

export interface LibraryMapData {
  shelves: ShelfData[];
}
