export interface NavigationArrowData {
  id: string;
  position: [number, number, number]; // [x, y, z] coordinate in 3D space
  rotation: number; // Z-axis rotation angle to align the floor arrow direction (degrees)
  targetRoomId: string; // Destination room ID
  label: string; // Destination room display name
  previewUrl: string; // Destination room thumbnail preview image URL
}

export interface Room {
  id: string;
  name: string;
  imageUrl: string; // Path to the 360-degree panorama image
  defaultRotation?: [number, number, number]; // Pitch, yaw, roll rotation when entering
  navigationArrows: NavigationArrowData[];
  leftRoomId?: string;  // ID of the room to transition to when clicking the left arrow on screen edge
  rightRoomId?: string; // ID of the room to transition to when clicking the right arrow on screen edge
}

export const libraryTourData: Record<string, Room> = {
  room1: {
    id: 'room1',
    name: 'SẢNH CHÍNH THƯ VIỆN',
    imageUrl: '/VRLIB/LIB1.jpg',
    defaultRotation: [0, 0, 0],
    leftRoomId: 'room4',
    rightRoomId: 'room2',
    navigationArrows: [
      {
        id: 'arrow_r1_to_r2',
        position: [4.0, -1.5, -5.0],
        rotation: 20,
        targetRoomId: 'room2',
        label: 'KHU THÀNH TÍCH',
        previewUrl: '/VRLIB/LIB2.jpg'
      },
      {
        id: 'arrow_r1_to_r4',
        position: [1.2, -1.5, -5.0],
        rotation: 10,
        targetRoomId: 'room4',
        label: 'KHO SÁCH',
        previewUrl: '/VRLIB/LIB4.jpg'
      },
    ],
  },
  room2: {
    id: 'room2',
    name: 'KHU THÀNH TÍCH',
    imageUrl: '/VRLIB/LIB2.jpg',
    defaultRotation: [0, Math.PI, 0],
    leftRoomId: 'room1',
    rightRoomId: 'room3',
    navigationArrows: [
      {
        id: 'arrow_r2_to_r1',
        position: [-100, -30, -55],
        rotation: -50,
        targetRoomId: 'room1',
        label: 'SẢNH CHÍNH THƯ VIỆN',
        previewUrl: '/VRLIB/LIB1.jpg'
      },
      {
        id: 'arrow_r2_to_r3',
        position: [65, -30, -55],
        rotation: 45,
        targetRoomId: 'room3',
        label: 'PHÒNG TRUYỀN THỐNG',
        previewUrl: '/VRLIB/LIB3.jpg'
      },
    ],
  },
  room3: {
    id: 'room3',
    name: 'PHÒNG TRUYỀN THỐNG',
    imageUrl: '/VRLIB/LIB3.jpg',
    defaultRotation: [0, -Math.PI / 2, 0],
    leftRoomId: 'room2',
    rightRoomId: 'room4',
    navigationArrows: [
      {
        id: 'arrow_r3_to_r2',
        position: [-1.5, -1.2, -4.0],
        rotation: 80,
        targetRoomId: 'room2',
        label: 'KHU THÀNH TÍCH',
        previewUrl: '/VRLIB/LIB2.jpg'
      },
    ],
  },
  room4: {
    id: 'room4',
    name: 'KHO SÁCH',
    imageUrl: '/VRLIB/LIB4.jpg',
    defaultRotation: [0, 0, 0],
    leftRoomId: 'room3',
    rightRoomId: 'room5',
    navigationArrows: [
      {
        id: 'arrow_r4_to_r3',
        position: [0.5, -1, -4.0],
        rotation: 45,
        targetRoomId: 'room1',
        label: 'SẢNH CHÍNH THƯ VIỆN',
        previewUrl: '/VRLIB/LIB1.jpg'
      },
      {
        id: 'arrow_r4_to_r5',
        position: [-0.5, -1, -4.0],
        rotation: -45,
        targetRoomId: 'room5',
        label: 'PHÒNG VẼ KĨ THUẬT',
        previewUrl: '/VRLIB/LIB5.jpg'
      },
    ],
  },
  room5: {
    id: 'room5',
    name: 'PHÒNG VẼ KĨ THUẬT',
    imageUrl: '/VRLIB/LIB5.jpg',
    defaultRotation: [0, Math.PI / 2, 0],
    leftRoomId: 'room4',
    rightRoomId: 'room2',
    navigationArrows: [
      {
        id: 'arrow_r5_to_r4',
        position: [65, -20, -55],
        rotation: 45,
        targetRoomId: 'room4',
        label: 'KHO SÁCH',
        previewUrl: '/VRLIB/LIB4.jpg'
      },
    ],
  },
};
