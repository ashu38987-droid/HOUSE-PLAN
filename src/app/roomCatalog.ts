export interface ToolboxItem {
  id: string;
  name: string;
  type: 'bedroom' | 'living' | 'service' | 'outdoor' | 'structural' | 'opening' | 'wall' | 'utility' | 'other';
  width: number;
  length: number;
}

export const TOOLBOX_CATEGORIES = [
  {
    id: 'rooms',
    label: 'Rooms',
    icon: '🏠',
    items: [
      { id: 'bedroom', name: 'Bedroom', type: 'bedroom', width: 10, length: 12 },
      { id: 'master_bedroom', name: 'Master Bedroom', type: 'bedroom', width: 12, length: 15 },
      { id: 'guest_room', name: 'Guest Room', type: 'bedroom', width: 10, length: 10 },
      { id: 'kids_bedroom', name: 'Kids Bedroom', type: 'bedroom', width: 9, length: 11 },
      { id: 'living_room', name: 'Living Room', type: 'living', width: 14, length: 18 },
      { id: 'family_lounge', name: 'Family Lounge', type: 'living', width: 12, length: 15 },
      { id: 'dining_room', name: 'Dining Room', type: 'living', width: 10, length: 12 },
      { id: 'study_room', name: 'Study Room', type: 'living', width: 8, length: 10 },
      { id: 'office', name: 'Office', type: 'living', width: 9, length: 12 },
      { id: 'store_room', name: 'Store Room', type: 'service', width: 6, length: 8 },
      { id: 'temple', name: 'Temple', type: 'other', width: 5, length: 5 },
      { id: 'home_theater', name: 'Home Theater', type: 'living', width: 12, length: 16 },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: '🍳',
    items: [
      { id: 'kitchen', name: 'Kitchen', type: 'service', width: 8, length: 12 },
      { id: 'open_kitchen', name: 'Open Kitchen', type: 'service', width: 10, length: 10 },
      { id: 'dry_kitchen', name: 'Dry Kitchen', type: 'service', width: 6, length: 8 },
      { id: 'utility', name: 'Utility', type: 'service', width: 5, length: 7 },
      { id: 'pantry', name: 'Pantry', type: 'service', width: 4, length: 6 },
    ],
  },
  {
    id: 'bathroom',
    label: 'Bathroom',
    icon: '🚿',
    items: [
      { id: 'bathroom', name: 'Bathroom', type: 'service', width: 5, length: 8 },
      { id: 'attached_bathroom', name: 'Attached Bathroom', type: 'service', width: 6, length: 9 },
      { id: 'common_bathroom', name: 'Common Bathroom', type: 'service', width: 5, length: 8 },
      { id: 'powder_room', name: 'Powder Room', type: 'service', width: 4, length: 5 },
      { id: 'wash_area', name: 'Wash Area', type: 'service', width: 4, length: 6 },
    ],
  },
  {
    id: 'outdoor',
    label: 'Outdoor',
    icon: '🚗',
    items: [
      { id: 'parking', name: 'Parking', type: 'outdoor', width: 12, length: 18 },
      { id: 'front_balcony', name: 'Front Balcony', type: 'outdoor', width: 10, length: 4 },
      { id: 'rear_balcony', name: 'Rear Balcony', type: 'outdoor', width: 10, length: 4 },
      { id: 'sit_out', name: 'Sit Out', type: 'outdoor', width: 8, length: 8 },
      { id: 'porch', name: 'Porch', type: 'outdoor', width: 10, length: 10 },
      { id: 'garden', name: 'Garden', type: 'outdoor', width: 15, length: 10 },
      { id: 'lawn', name: 'Lawn', type: 'outdoor', width: 20, length: 15 },
      { id: 'courtyard', name: 'Courtyard', type: 'outdoor', width: 10, length: 10 },
    ],
  },
  {
    id: 'structural',
    label: 'Structural',
    icon: '🏗',
    items: [
      { id: 'staircase', name: 'Staircase', type: 'structural', width: 7, length: 14 },
      { id: 'lift', name: 'Lift', type: 'structural', width: 6, length: 6 },
      { id: 'lobby', name: 'Lobby', type: 'living', width: 8, length: 8 },
      { id: 'passage', name: 'Passage', type: 'other', width: 4, length: 10 },
      { id: 'veranda', name: 'Veranda', type: 'outdoor', width: 15, length: 6 },
      { id: 'shaft', name: 'Shaft', type: 'utility', width: 3, length: 3 },
    ],
  },
  {
    id: 'openings',
    label: 'Openings',
    icon: '🚪',
    items: [
      { id: 'main_door', name: 'Main Door', type: 'opening', width: 4, length: 0.5 },
      { id: 'single_door', name: 'Single Door', type: 'opening', width: 3, length: 0.5 },
      { id: 'double_door', name: 'Double Door', type: 'opening', width: 5, length: 0.5 },
      { id: 'sliding_door', name: 'Sliding Door', type: 'opening', width: 6, length: 0.5 },
    ],
  },
  {
    id: 'windows',
    label: 'Windows',
    icon: '🪟',
    items: [
      { id: 'window', name: 'Window', type: 'opening', width: 4, length: 0.5 },
      { id: 'large_window', name: 'Large Window', type: 'opening', width: 6, length: 0.5 },
      { id: 'corner_window', name: 'Corner Window', type: 'opening', width: 5, length: 5 },
      { id: 'ventilator', name: 'Ventilator', type: 'opening', width: 2, length: 1.5 },
    ],
  },
  {
    id: 'walls',
    label: 'Walls',
    icon: '🧱',
    items: [
      { id: 'straight_wall', name: 'Straight Wall', type: 'wall', width: 10, length: 0.75 },
      { id: 'l_shaped_wall', name: 'L-Shaped Wall', type: 'wall', width: 8, length: 8 },
      { id: 'u_shaped_wall', name: 'U-Shaped Wall', type: 'wall', width: 10, length: 6 },
      { id: 't_shaped_wall', name: 'T-Shaped Wall', type: 'wall', width: 10, length: 10 },
      { id: 'curved_wall', name: 'Curved Wall', type: 'wall', width: 10, length: 5 },
      { id: 'divider_wall', name: 'Divider Wall', type: 'wall', width: 8, length: 0.5 },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: '📐',
    items: [
      { id: 'column', name: 'Column', type: 'utility', width: 1, length: 1 },
      { id: 'beam', name: 'Beam', type: 'utility', width: 10, length: 1 },
      { id: 'duct', name: 'Duct', type: 'utility', width: 2, length: 2 },
      { id: 'void', name: 'Void', type: 'utility', width: 5, length: 5 },
      { id: 'balcony_extension', name: 'Balcony Extension', type: 'outdoor', width: 10, length: 4 },
    ],
  },
];