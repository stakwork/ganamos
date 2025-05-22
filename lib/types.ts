export interface Post {
  id: string
  userId?: string
  user_id?: string
  title: string
  description: string
  imageUrl?: string
  image_url?: string
  location: string
  reward: number
  claimed: boolean
  claimed_by?: string
  claimed_at?: string
  fixed: boolean
  fixed_at?: string
  createdAt?: Date
  created_at?: string
  group_id?: string
}

export interface User {
  id: string
  name: string
  email: string
  balance: number
  avatar?: string
}

export interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface Group {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
  invite_code: string
  memberCount?: number
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: "admin" | "member"
  status: "pending" | "approved" | "rejected"
  created_at: string
  updated_at: string
  profile?: {
    name: string
    avatar_url?: string
    email?: string
  }
}
