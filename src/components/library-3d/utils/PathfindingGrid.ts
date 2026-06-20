import * as THREE from "three";

const CELL_SIZE = 0.25; // 0.25m resolution
const GRID_WIDTH = 120; // 30m / 0.25m
const GRID_HEIGHT = 80; // 20m / 0.25m

// Offset to center the grid at (0, 0)
const GRID_OFFSET_X = GRID_WIDTH / 2;
const GRID_OFFSET_Z = GRID_HEIGHT / 2;

interface GridCell {
  x: number;
  z: number;
  walkable: boolean;
}

interface PathNode {
  x: number;
  z: number;
  g: number; // cost from start
  h: number; // heuristic to end
  f: number; // g + h
  parent: PathNode | null;
}

export class PathfindingGrid {
  private grid: Uint8Array;
  private width: number;
  private height: number;

  constructor(shelves: Array<{ position: [number, number, number]; numTiers?: number }>) {
    this.width = GRID_WIDTH;
    this.height = GRID_HEIGHT;
    this.grid = new Uint8Array(this.width * this.height);

    // Initialize all cells as walkable
    this.grid.fill(0);

    // Mark obstacles from shelves
    this.markShelvesAsObstacles(shelves);
  }

  private markShelvesAsObstacles(shelves: Array<{ position: [number, number, number] }>) {
    for (const shelf of shelves) {
      const [worldX, , worldZ] = shelf.position;
      const gridX = this.worldToGridX(worldX);
      const gridZ = this.worldToGridZ(worldZ);

      // Mark shelf footprint as obstacle (shelf size ~ 2m x 1m)
      const shelfWidthCells = Math.ceil(2.0 / CELL_SIZE); // 8 cells
      const shelfDepthCells = Math.ceil(1.0 / CELL_SIZE); // 4 cells

      for (let dx = -1; dx <= shelfWidthCells; dx++) {
        for (let dz = -1; dz <= shelfDepthCells; dz++) {
          const x = gridX + dx;
          const z = gridZ + dz;
          if (x >= 0 && x < this.width && z >= 0 && z < this.height) {
            this.grid[z * this.width + x] = 1; // obstacle
          }
        }
      }
    }
  }

  worldToGridX(worldX: number): number {
    return Math.floor(worldX / CELL_SIZE + GRID_OFFSET_X);
  }

  worldToGridZ(worldZ: number): number {
    return Math.floor(worldZ / CELL_SIZE + GRID_OFFSET_Z);
  }

  gridToWorldX(gridX: number): number {
    return (gridX - GRID_OFFSET_X) * CELL_SIZE;
  }

  gridToWorldZ(gridZ: number): number {
    return (gridZ - GRID_OFFSET_Z) * CELL_SIZE;
  }

  isWalkable(x: number, z: number): boolean {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return false;
    }
    return this.grid[z * this.width + x] === 0;
  }

  setObstacle(x: number, z: number, walkable: boolean) {
    if (x >= 0 && x < this.width && z >= 0 && z < this.height) {
      this.grid[z * this.width + x] = walkable ? 0 : 1;
    }
  }

  findPath(startWorld: THREE.Vector3, endWorld: THREE.Vector3): THREE.Vector3[] {
    const startX = this.worldToGridX(startWorld.x);
    const startZ = this.worldToGridZ(startWorld.z);
    const endX = this.worldToGridX(endWorld.x);
    const endZ = this.worldToGridZ(endWorld.z);

    // Check if start/end are walkable
    if (!this.isWalkable(startX, startZ)) {
      // Find nearest walkable cell
      const nearest = this.findNearestWalkable(startX, startZ);
      if (!nearest) return [];
      return this.findPath(
        new THREE.Vector3(this.gridToWorldX(nearest.x), 0, this.gridToWorldZ(nearest.z)),
        endWorld
      );
    }

    if (!this.isWalkable(endX, endZ)) {
      const nearest = this.findNearestWalkable(endX, endZ);
      if (!nearest) return [];
      return this.findPath(
        startWorld,
        new THREE.Vector3(this.gridToWorldX(nearest.x), 0, this.gridToWorldZ(nearest.z))
      );
    }

    // A* algorithm
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: startX,
      z: startZ,
      g: 0,
      h: this.heuristic(startX, startZ, endX, endZ),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    const directions = [
      { dx: 0, dz: -1, cost: 1 }, // up
      { dx: 0, dz: 1, cost: 1 }, // down
      { dx: -1, dz: 0, cost: 1 }, // left
      { dx: 1, dz: 0, cost: 1 }, // right
      { dx: -1, dz: -1, cost: 1.414 }, // diagonal
      { dx: 1, dz: -1, cost: 1.414 },
      { dx: -1, dz: 1, cost: 1.414 },
      { dx: 1, dz: 1, cost: 1.414 },
    ];

    while (openSet.length > 0) {
      // Find node with lowest f
      let lowestIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }
      const current = openSet[lowestIndex];

      // Found goal
      if (current.x === endX && current.z === endZ) {
        return this.reconstructPath(current);
      }

      // Move current from open to closed
      openSet.splice(lowestIndex, 1);
      closedSet.add(`${current.x},${current.z}`);

      // Check neighbors
      for (const dir of directions) {
        const neighborX = current.x + dir.dx;
        const neighborZ = current.z + dir.dz;
        const neighborKey = `${neighborX},${neighborZ}`;

        // Skip if out of bounds or not walkable
        if (!this.isWalkable(neighborX, neighborZ)) continue;
        if (closedSet.has(neighborKey)) continue;

        // For diagonal movement, check if adjacent cells are walkable
        if (dir.dx !== 0 && dir.dz !== 0) {
          if (
            !this.isWalkable(current.x + dir.dx, current.z) ||
            !this.isWalkable(current.x, current.z + dir.dz)
          ) {
            continue;
          }
        }

        const g = current.g + dir.cost;
        const h = this.heuristic(neighborX, neighborZ, endX, endZ);
        const f = g + h;

        // Check if this path to neighbor is better
        const existingIndex = openSet.findIndex(
          (n) => n.x === neighborX && n.z === neighborZ
        );
        if (existingIndex >= 0 && openSet[existingIndex].g <= g) {
          continue;
        }

        const neighborNode: PathNode = {
          x: neighborX,
          z: neighborZ,
          g,
          h,
          f,
          parent: current,
        };

        if (existingIndex >= 0) {
          openSet[existingIndex] = neighborNode;
        } else {
          openSet.push(neighborNode);
        }
      }
    }

    return []; // No path found
  }

  private heuristic(x1: number, z1: number, x2: number, z2: number): number {
    // Octile distance
    const dx = Math.abs(x1 - x2);
    const dz = Math.abs(z1 - z2);
    return Math.max(dx, dz) + (1.414 - 1) * Math.min(dx, dz);
  }

  private reconstructPath(node: PathNode): THREE.Vector3[] {
    const path: THREE.Vector3[] = [];
    let current: PathNode | null = node;

    while (current) {
      path.unshift(
        new THREE.Vector3(this.gridToWorldX(current.x), 0, this.gridToWorldZ(current.z))
      );
      current = current.parent;
    }

    return path;
  }

  private findNearestWalkable(x: number, z: number): { x: number; z: number } | null {
    const maxRadius = 20;
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
          const nx = x + dx;
          const nz = z + dz;
          if (this.isWalkable(nx, nz)) {
            return { x: nx, z: nz };
          }
        }
      }
    }
    return null;
  }
}
