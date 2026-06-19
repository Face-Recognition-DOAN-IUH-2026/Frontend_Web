import type { ShelfData } from "../types";

export const DEFAULT_NUM_TIERS = 3;

export const SHELF_POSITIONS: Record<string, [number, number, number]> = {
  "A-12-3": [-4, 0, -2],
  "A-12-2": [-4, 0, 2],
  "A-12-1": [-4, 0, 6],
  "B-05-1": [0, 0, -2],
  "B-05-2": [0, 0, 2],
  "C-01-1": [4, 0, -2],
  "C-01-2": [4, 0, 2],
};

export function assignPositions(shelves: ShelfData[]): ShelfData[] {
  return shelves.map((shelf) => ({
    ...shelf,
    numTiers: shelf.numTiers || DEFAULT_NUM_TIERS,
    position: SHELF_POSITIONS[shelf.code] || [0, 0, 0],
  }));
}
