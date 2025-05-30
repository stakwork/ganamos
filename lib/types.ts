export interface Post {
  id: string
  userId?: string
  user_id?: string
  title: string
  description: string
  imageUrl?: string
  image_url?: string
  location?: string // Make optional
  latitude?: number // Add optional latitude
  longitude?: number // Add optional longitude
  reward: number
  fixed: boolean
  fixed_at?: string
  fixed_by?: string
  createdAt?: Date
  created_at?: string
  group_id?: string
  fixer_note?: string
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
