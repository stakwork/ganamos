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
