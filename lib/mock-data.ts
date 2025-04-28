import type { Post } from "./types"

export const mockPosts: Post[] = [
  {
    id: "1",
    userId: "456", // Not the current user
    title: "Trash on sidewalk",
    description:
      "There's a pile of trash on the sidewalk that needs to be cleaned up. It's blocking the path and creating an eyesore for the neighborhood.",
    imageUrl: "https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?q=80&w=600&auto=format&fit=crop",
    location: "Downtown",
    reward: 2000,
    claimed: false,
    fixed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: "2",
    userId: "456",
    title: "Graffiti on wall",
    description:
      "Someone has spray painted graffiti on the wall of the community center. It needs to be cleaned or painted over.",
    imageUrl: "https://images.unsplash.com/photo-1585244759837-6b3ca8542be1?q=80&w=600&auto=format&fit=crop",
    location: "Downtown",
    reward: 3500,
    claimed: true,
    claimedBy: "123", // Current user
    claimedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    fixed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
  },
  {
    id: "3",
    userId: "789",
    title: "Overgrown weeds",
    description: "The weeds in the community garden have grown out of control and need to be removed.",
    imageUrl: "https://images.unsplash.com/photo-1635179205130-5a9f8721e4a5?q=80&w=600&auto=format&fit=crop",
    location: "Central Park",
    reward: 5000,
    claimed: true,
    claimedBy: "123", // Current user
    claimedAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    fixed: true,
    fixedAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    fixedImageUrl: "https://images.unsplash.com/photo-1590682300882-cbf8230f4042?q=80&w=600&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "4",
    userId: "123", // Current user
    title: "Broken bench",
    description:
      "The wooden bench in the park is broken and needs repair. Several boards are loose and it's unsafe to sit on.",
    imageUrl: "https://images.unsplash.com/photo-1597261416757-c7a1429c3538?q=80&w=600&auto=format&fit=crop",
    location: "Central Park",
    reward: 4000,
    claimed: true,
    claimedBy: "789",
    claimedAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    fixed: true,
    fixedAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    fixedImageUrl: "https://images.unsplash.com/photo-1533697033956-ac1a8c2d9e3f?q=80&w=600&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
  },
  {
    id: "5",
    userId: "456",
    title: "Pothole in road",
    description:
      "There's a large pothole in the middle of the road that's causing damage to vehicles. It needs to be filled.",
    imageUrl: "https://images.unsplash.com/photo-1594789020554-458e84b5b8de?q=80&w=600&auto=format&fit=crop",
    location: "Downtown",
    reward: 6000,
    claimed: false,
    fixed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
  },
  {
    id: "6",
    userId: "123", // Current user
    title: "Fallen tree branch",
    description: "A large tree branch has fallen and is blocking the sidewalk. It needs to be removed.",
    imageUrl: "https://images.unsplash.com/photo-1517660029921-0cbea2f15f8f?q=80&w=600&auto=format&fit=crop",
    location: "Ocean Beach",
    reward: 3000,
    claimed: true,
    claimedBy: "456",
    claimedAt: new Date(Date.now() - 1000 * 60 * 60 * 10), // 10 hours ago
    fixed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
  },
  {
    id: "7",
    userId: "789",
    title: "Broken street light",
    description: "The street light at the corner is broken and not working at night. This is creating a safety hazard.",
    imageUrl: "https://images.unsplash.com/photo-1611241443322-b5164ba3d672?q=80&w=600&auto=format&fit=crop",
    location: "University Campus",
    reward: 4500,
    claimed: true,
    claimedBy: "123", // Current user
    claimedAt: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    fixed: true,
    fixedAt: new Date(Date.now() - 1000 * 60 * 60 * 70), // Almost 3 days ago
    fixedImageUrl: "https://images.unsplash.com/photo-1573481078935-b9605167e06b?q=80&w=600&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96), // 4 days ago
  },
  {
    id: "8",
    userId: "456",
    title: "Overflowing trash can",
    description: "The public trash can is overflowing and trash is spilling onto the ground. It needs to be emptied.",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=600&auto=format&fit=crop",
    location: "Shopping Mall",
    reward: 1500,
    claimed: false,
    fixed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
  },
  {
    id: "9",
    userId: "123", // Current user
    title: "Damaged playground equipment",
    description:
      "The slide in the children's playground has a crack and is unsafe for use. It needs to be repaired or replaced.",
    imageUrl: "https://images.unsplash.com/photo-1575783970733-1aaedde1db74?q=80&w=600&auto=format&fit=crop",
    location: "Central Park",
    reward: 7000,
    claimed: false,
    fixed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "10",
    userId: "789",
    title: "Clogged storm drain",
    description:
      "The storm drain is clogged with leaves and debris, causing water to pool on the street when it rains.",
    imageUrl: "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?q=80&w=600&auto=format&fit=crop",
    location: "Downtown",
    reward: 3200,
    claimed: true,
    claimedBy: "123", // Current user
    claimedAt: new Date(Date.now() - 1000 * 60 * 60 * 120), // 5 days ago
    fixed: true,
    fixedAt: new Date(Date.now() - 1000 * 60 * 60 * 118), // Almost 5 days ago
    fixedImageUrl: "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?q=80&w=600&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 144), // 6 days ago
  },
  {
    id: "11",
    userId: "456",
    title: "Faded crosswalk lines",
    description:
      "The crosswalk lines at the intersection have faded and are barely visible. They need to be repainted for pedestrian safety.",
    imageUrl: "https://images.unsplash.com/photo-1541447271487-09612b3f49f7?q=80&w=600&auto=format&fit=crop",
    location: "University Campus",
    reward: 5500,
    claimed: false,
    fixed: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18), // 18 hours ago
  },
  {
    id: "12",
    userId: "789",
    title: "Broken fence",
    description:
      "A section of the fence around the community garden is broken and needs to be fixed to keep animals out.",
    imageUrl: "https://images.unsplash.com/photo-1621957837173-3a4b8c0a8734?q=80&w=600&auto=format&fit=crop",
    location: "Central Park",
    reward: 4200,
    claimed: true,
    claimedBy: "456",
    claimedAt: new Date(Date.now() - 1000 * 60 * 60 * 50), // About 2 days ago
    fixed: true,
    fixedAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    fixedImageUrl: "https://images.unsplash.com/photo-1621957837173-3a4b8c0a8734?q=80&w=600&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
  },
]
