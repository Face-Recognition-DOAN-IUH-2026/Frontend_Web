"use client";

import { useMemo } from "react";
import * as THREE from "three";
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

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: "#8B5E3C",
    roughness: 0.8,
    metalness: 0,
  });

  return (
    <group position={data.position}>
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
