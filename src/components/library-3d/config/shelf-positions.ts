import type { ShelfData } from "../types";

export const DEFAULT_NUM_TIERS = 3;

export const AUTO_POSITIONS: [number, number, number][] = [
  [-4, 0, -2], [-4, 0, 2], [-4, 0, 6],
  [0, 0, -2], [0, 0, 2], [0, 0, 6],
  [4, 0, -2], [4, 0, 2], [4, 0, 6],
  [-2, 0, -4], [-2, 0, 4],
  [2, 0, -4], [2, 0, 4],
];

export const SHELF_POSITIONS: Record<string, [number, number, number]> = {
  "A-10": AUTO_POSITIONS[0],
  "A-11": AUTO_POSITIONS[1],
  "A-12": AUTO_POSITIONS[2],
  "B-05": AUTO_POSITIONS[3],
  "B-08": AUTO_POSITIONS[4],
  "C-01": AUTO_POSITIONS[6],
  "C-03": AUTO_POSITIONS[7],
};

export function assignPositions(shelves: ShelfData[]): ShelfData[] {
  return shelves.map((shelf) => ({
    ...shelf,
    numTiers: shelf.numTiers || DEFAULT_NUM_TIERS,
    position: SHELF_POSITIONS[shelf.code] || shelf.position || [0, 0, 0],
  }));
}
