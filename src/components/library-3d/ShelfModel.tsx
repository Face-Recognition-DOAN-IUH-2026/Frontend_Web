"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { BookData, ShelfData } from "./types";
import BookModel from "./BookModel";

interface ShelfModelProps {
  data: ShelfData;
  onBookClick: (book: BookData) => void;
}

const SHELF_WIDTH = 4;
const SHELF_DEPTH = 1;
const SHELF_HEIGHT = 3.2;
const BOARD_THICKNESS = 0.05;

export default function ShelfModel({ data, onBookClick }: ShelfModelProps) {
  const { books, numTiers } = data;

  const tiers = useMemo(() => {
    const result: { y: number; books: BookData[] }[] = [];
    for (let i = 0; i < numTiers; i++) {
      const y = -SHELF_HEIGHT / 2 + BOARD_THICKNESS + (i + 0.5) * ((SHELF_HEIGHT - BOARD_THICKNESS * 2) / numTiers);
      result.push({
        y,
        books: books.filter((b) => b.tierIndex === i),
      });
    }
    return result;
  }, [books, numTiers]);

  const woodMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#5C3D2E",
    roughness: 0.85,
    metalness: 0,
  }), []);

  return (
    <group position={[data.position[0], data.position[1] + SHELF_HEIGHT / 2, data.position[2]]}>
      {/* Backboard */}
      <mesh position={[0, 0, -SHELF_DEPTH / 2 + BOARD_THICKNESS / 2]} material={woodMaterial}>
        <boxGeometry args={[SHELF_WIDTH, SHELF_HEIGHT, BOARD_THICKNESS]} />
      </mesh>

      {/* Left side */}
      <mesh position={[-SHELF_WIDTH / 2 + BOARD_THICKNESS / 2, 0, 0]} material={woodMaterial}>
        <boxGeometry args={[BOARD_THICKNESS, SHELF_HEIGHT, SHELF_DEPTH]} />
      </mesh>

      {/* Right side */}
      <mesh position={[SHELF_WIDTH / 2 - BOARD_THICKNESS / 2, 0, 0]} material={woodMaterial}>
        <boxGeometry args={[BOARD_THICKNESS, SHELF_HEIGHT, SHELF_DEPTH]} />
      </mesh>

      {/* Horizontal tiers */}
      {tiers.map((tier, i) => (
        <mesh key={`tier-${i}`} position={[0, tier.y, 0]} material={woodMaterial}>
          <boxGeometry args={[SHELF_WIDTH - BOARD_THICKNESS * 2, BOARD_THICKNESS, SHELF_DEPTH - BOARD_THICKNESS]} />
        </mesh>
      ))}

      {/* Shelf label */}
      <Html position={[0, SHELF_HEIGHT / 2 + 0.15, 0]} center>
        <div className="px-2 py-0.5 rounded-md bg-surface/80 backdrop-blur-sm border border-primary/20 text-xs text-primary font-medium whitespace-nowrap select-none">
          {data.code}
        </div>
      </Html>

      {/* Books on each tier */}
      {tiers.map((tier, ti) =>
        tier.books.map((book, bi) => {
          const totalBooks = tier.books.length;
          const spacing = (SHELF_WIDTH - BOARD_THICKNESS * 2 - 0.3) / Math.max(totalBooks, 1);
          const x = -SHELF_WIDTH / 2 + BOARD_THICKNESS + 0.15 + spacing * bi + spacing / 2;
          return (
            <BookModel
              key={book.id}
              data={book}
              position={[x, tier.y + BOARD_THICKNESS / 2 + 0.25, 0]}
              onClick={onBookClick}
            />
          );
        })
      )}
    </group>
  );
}
