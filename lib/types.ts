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
  created_by?: string // Add this line
  created_by_avatar?: string
  createdAt?: Date
  created_at?: string
  group_id?: string
  fixer_note?: string
  original_reward?: number
  total_boost_amount?: number
  boost_applied?: boolean
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

export interface DonationPool {
  id: string
  location_type: "neighborhood" | "city" | "region" | "country" | "global"
  location_name: string
  location_code?: string
  latitude?: number
  longitude?: number
  total_donated: number
  current_balance: number
  total_boosted: number
  boost_percentage: number
  max_daily_boost?: number
  created_at: string
  updated_at: string
}

export interface Donation {
  id: string
  donor_user_id?: string
  donation_pool_id: string
  amount: number
  payment_hash?: string
  payment_request?: string
  status: "pending" | "completed" | "failed"
  donor_name?: string
  message?: string
  created_at: string
  completed_at?: string
}

export interface PostBoost {
  id: string
  post_id: string
  donation_pool_id: string
  boost_amount: number
  boost_percentage: number
  applied_at: string
}

export interface LocationHierarchy {
  id: string
  child_pool_id: string
  parent_pool_id: string
  created_at: string
}
