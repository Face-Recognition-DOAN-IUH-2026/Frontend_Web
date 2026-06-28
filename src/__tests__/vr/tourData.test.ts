import { libraryTourData } from '../../lib/vr/tourData';

describe('Library VR Tour Configuration', () => {
  test('all rooms should have a valid name and imageUrl', () => {
    Object.values(libraryTourData).forEach((room) => {
      expect(room.id).toBeDefined();
      expect(room.name.length).toBeGreaterThan(0);
      expect(room.imageUrl.length).toBeGreaterThan(0);
    });
  });

  test('every navigation arrow targetRoomId must exist in libraryTourData', () => {
    const validRoomIds = Object.keys(libraryTourData);
    
    Object.values(libraryTourData).forEach((room) => {
      room.navigationArrows.forEach((arrow) => {
        expect(validRoomIds).toContain(arrow.targetRoomId);
      });
    });
  });
});
