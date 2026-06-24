export const HOTELS = {
  KASHI: {
    name: 'Hotel in Kashi',
    rooms: ['101', '102', '103', '104', '105']
  },
  VARANASI: {
    name: 'Hotel in Varanasi',
    rooms: ['101', '102', '105', '201', '202', '203', '204', '205', '301', '302', '304']
  }
};

export const getHotelByRoom = (roomNumber: string) => {
  if (HOTELS.VARANASI.rooms.includes(roomNumber)) return 'VARANASI';
  if (HOTELS.KASHI.rooms.includes(roomNumber)) return 'KASHI';
  return null;
};

export const getRoomType = (roomNumber: string) => {
  const deluxe = ['201', '202', '203', '204', '205'];
  const standard = ['301', '304'];
  const doubleTwin = ['101', '102', '302'];
  const family = ['105'];

  if (deluxe.includes(roomNumber)) return 'Deluxe Room';
  if (standard.includes(roomNumber)) return 'Standard Room';
  if (doubleTwin.includes(roomNumber)) return 'Double Bed Twin Room';
  if (family.includes(roomNumber)) return 'Family Room';
  
  return 'Room';
};
