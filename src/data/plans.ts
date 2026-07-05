import type { PlanData } from '@/types/plan';

export const planDatabase: PlanData[] = [
  {
    plan_id: '30x40_2bhk_east',
    meta: {
      title: '30×40 Vastu East-Facing 2BHK',
      plot_width: 30,
      plot_length: 40,
      facing: 'East',
      bhk: 2,
      floors: 3,
      vastu_score: 95,
    },
    setbacks: { front: 5, rear: 3, left: 2, right: 2 },
    floors: [
      {
        level: 0,
        label: 'Ground',
        rooms: [
          { id: 'stairs_g', name: 'Staircase / Entry', x: 0, y: 0, width: 10, length: 8, type: 'outdoor' },
          { id: 'parking', name: 'Porch / Parking', x: 10, y: 0, width: 20, length: 12, type: 'outdoor' },
          { id: 'living', name: 'Living Hall', x: 0, y: 8, width: 18, length: 18, type: 'living' },
          { id: 'kitchen', name: 'Kitchen', x: 18, y: 8, width: 12, length: 12, type: 'service' },
          { id: 'common_toilet', name: 'Toilet', x: 18, y: 20, width: 12, length: 8, type: 'service' },
          { id: 'dining', name: 'Dining Area', x: 0, y: 26, width: 18, length: 14, type: 'living' },
        ],
      },
      {
        level: 1,
        label: '1st Floor',
        rooms: [
          { id: 'stairs_1', name: 'Staircase Void', x: 0, y: 0, width: 10, length: 8, type: 'outdoor' },
          { id: 'balcony_1', name: 'Front Balcony', x: 10, y: 0, width: 20, length: 8, type: 'outdoor' },
          { id: 'master_bedroom', name: 'Master Bedroom', x: 0, y: 8, width: 30, length: 16, type: 'bedroom' },
          { id: 'bedroom_2', name: 'Bedroom 2', x: 0, y: 24, width: 30, length: 16, type: 'bedroom' },
        ],
      },
      {
        level: 2,
        label: '2nd Floor',
        rooms: [
          { id: 'terrace_2', name: 'Roof Terrace', x: 0, y: 0, width: 30, length: 22, type: 'outdoor' },
          { id: 'utility_2', name: 'Utility / Store', x: 0, y: 22, width: 30, length: 18, type: 'service' },
        ],
      },
    ],
  },
  {
    plan_id: '20x30_2bhk_duplex',
    meta: {
      title: '20×30 Compact 2BHK Duplex',
      plot_width: 20,
      plot_length: 30,
      facing: 'North',
      bhk: 2,
      floors: 2,
      vastu_score: 88,
    },
    setbacks: { front: 3, rear: 2, left: 0, right: 0 },
    floors: [
      {
        level: 0,
        label: 'Ground',
        rooms: [
          { id: 'stairs_g', name: 'Staircase / Entry', x: 0, y: 0, width: 11, length: 7, type: 'outdoor' },
          { id: 'parking_g', name: 'Parking', x: 11, y: 0, width: 9, length: 14, type: 'outdoor' },
          { id: 'living_g', name: 'Living Hall', x: 0, y: 7, width: 11, length: 15, type: 'living' },
          { id: 'toilet_g', name: 'Toilet', x: 11, y: 14, width: 9, length: 8, type: 'service' },
          { id: 'kitchen_g', name: 'Kitchen', x: 0, y: 22, width: 20, length: 8, type: 'service' },
        ],
      },
      {
        level: 1,
        label: '1st Floor',
        rooms: [
          { id: 'stairs_1', name: 'Staircase Void', x: 0, y: 0, width: 11, length: 7, type: 'outdoor' },
          { id: 'balcony_1', name: 'Front Balcony', x: 11, y: 0, width: 9, length: 7, type: 'outdoor' },
          { id: 'master_bed_1', name: 'Master Bedroom', x: 0, y: 7, width: 20, length: 23, type: 'bedroom' },
        ],
      },
    ],
  },
  {
    plan_id: '40x60_4bhk_luxury',
    meta: {
      title: '40×60 Luxury 4BHK Villa',
      plot_width: 40,
      plot_length: 60,
      facing: 'East',
      bhk: 4,
      floors: 3,
      vastu_score: 92,
    },
    setbacks: { front: 8, rear: 4, left: 3, right: 3 },
    floors: [
      {
        level: 0,
        label: 'Ground',
        rooms: [
          { id: 'car_porch', name: 'Car Porch', x: 0, y: 0, width: 40, length: 16, type: 'outdoor' },
          { id: 'living_4060', name: 'Formal Living', x: 0, y: 16, width: 40, length: 18, type: 'living' },
          { id: 'dining_4060', name: 'Dining Room', x: 0, y: 34, width: 20, length: 26, type: 'living' },
          { id: 'kitchen_4060', name: 'Premium Kitchen', x: 20, y: 34, width: 20, length: 26, type: 'service' },
        ],
      },
      {
        level: 1,
        label: '1st Floor',
        rooms: [
          { id: 'bed_first_1', name: 'Executive Master Bed', x: 0, y: 0, width: 40, length: 34, type: 'bedroom' },
          { id: 'lounge_first_1', name: 'Family Lounge', x: 0, y: 34, width: 40, length: 26, type: 'living' },
        ],
      },
      {
        level: 2,
        label: '2nd Floor',
        rooms: [
          { id: 'terrace_2', name: 'Roof Terrace', x: 0, y: 0, width: 40, length: 34, type: 'outdoor' },
          { id: 'gym_2', name: 'Home Gym', x: 0, y: 34, width: 40, length: 26, type: 'bedroom' },
        ],
      },
    ],
  },
];

export function findPlan(size: string, bhk: number): PlanData {
  const match = planDatabase.find((plan) => {
    const planSize = `${plan.meta.plot_width}x${plan.meta.plot_length}`;
    return planSize === size && plan.meta.bhk === bhk;
  });
  return match ?? planDatabase[0];
}

export function clonePlan(plan: PlanData): PlanData {
  return JSON.parse(JSON.stringify(plan)) as PlanData;
}
