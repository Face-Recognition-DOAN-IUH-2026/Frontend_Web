"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface Bookshelf3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  shelves?: number;
  booksPerShelf?: number;
}

const SHELF_COLORS = [
  "#5D4037", // Dark wood
  "#6D4C41", // Medium wood
  "#795548", // Light wood
];

const BOOK_COLORS = [
  "#1A73E8", "#4A8C5C", "#C44E4E", "#E6A817",
  "#8B5CF6", "#F59E0B", "#3B82F6", "#10B981",
  "#EF4444", "#6366F1", "#EC4899", "#14B8A6",
];

function ShelfBook({ x, color, height }: { x: number; color: string; height: number }) {
  const materials = useMemo(() => {
    const coverMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
    const spineMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.7),
      roughness: 0.5,
    });
    const pageMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F0, roughness: 0.8 });
    return [pageMat, spineMat, pageMat, pageMat, coverMat, spineMat];
  }, [color]);

  return (
    <mesh position={[x, height / 2, 0]} material={materials} castShadow>
      <boxGeometry args={[0.18, height, 0.22]} />
    </mesh>
  );
}

export default function Bookshelf3D({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  shelves = 4,
  booksPerShelf = 6,
}: Bookshelf3DProps) {
  const shelfColor = useMemo(() => SHELF_COLORS[Math.floor(Math.random() * SHELF_COLORS.length)], []);
  const shelfWidth = 3.2;
  const shelfHeight = 0.06;
  const shelfDepth = 0.4;
  const gap = 0.65;

  const shelfData = useMemo(() => {
    const data: { y: number; books: { x: number; color: string; height: number }[] }[] = [];
    for (let s = 0; s < shelves; s++) {
      const shelfY = s * gap;
      const books: { x: number; color: string; height: number }[] = [];
      let cursorX = -shelfWidth / 2 + 0.15;
      for (let b = 0; b < booksPerShelf; b++) {
        const bookHeight = 0.35 + Math.random() * 0.2;
        const bookWidth = 0.12 + Math.random() * 0.08;
        const color = BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)];
        books.push({ x: cursorX + bookWidth / 2, color, height: bookHeight });
        cursorX += bookWidth + 0.02;
      }
      data.push({ y: shelfY, books });
    }
    return data;
  }, [shelves, booksPerShelf]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {shelfData.map((shelf, si) => (
        <group key={si}>
          {/* Shelf board */}
          <mesh position={[0, shelf.y, 0]} castShadow receiveShadow>
            <boxGeometry args={[shelfWidth, shelfHeight, shelfDepth]} />
            <meshStandardMaterial color={shelfColor} roughness={0.6} metalness={0.05} />
          </mesh>
          {/* Books on shelf */}
          {shelf.books.map((book, bi) => (
            <ShelfBook key={bi} x={book.x} color={book.color} height={book.height} />
          ))}
        </group>
      ))}
      {/* Top board */}
      <mesh position={[0, shelves * gap, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelfWidth, shelfHeight, shelfDepth]} />
        <meshStandardMaterial color={shelfColor} roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Side panels */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * shelfWidth / 2, (shelves * gap) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[shelfHeight, shelves * gap + shelfHeight, shelfDepth]} />
          <meshStandardMaterial color={shelfColor} roughness={0.6} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}
