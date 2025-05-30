export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          balance: number
          created_at: string
          updated_at: string
          fixed_issues_count: number
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
          fixed_issues_count?: number
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
          fixed_issues_count?: number
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          image_url: string
          location: string
          latitude: number | null
          longitude: number | null
          reward: number
          claimed: boolean
          claimed_by: string | null
          claimed_at: string | null
          fixed: boolean
          fixed_at: string | null
          fixed_image_url: string | null
          fixed_by: string | null
          created_at: string
          group_id: string | null
          city: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          image_url: string
          location: string
          latitude?: number | null
          longitude?: number | null
          reward: number
          claimed?: boolean
          claimed_by?: string | null
          claimed_at?: string | null
          fixed?: boolean
          fixed_at?: string | null
          fixed_image_url?: string | null
          fixed_by?: string | null
          created_at?: string
          group_id?: string | null
          city?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          image_url?: string
          location?: string
          latitude?: number | null
          longitude?: number | null
          reward?: number
          claimed?: boolean
          claimed_by?: string | null
          claimed_at?: string | null
          fixed?: boolean
          fixed_at?: string | null
          fixed_image_url?: string | null
          fixed_by?: string | null
          created_at?: string
          group_id?: string | null
          city?: string | null
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
          invite_code: string
          group_code: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          invite_code?: string
          group_code?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          invite_code?: string
          group_code?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: "admin" | "member"
          status: "pending" | "approved" | "rejected"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: "admin" | "member"
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: "admin" | "member"
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: "deposit" | "withdrawal" | "internal"
          amount: number
          status: "pending" | "completed" | "failed"
          r_hash_str: string | null
          payment_request: string | null
          payment_hash: string | null
          memo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: "deposit" | "withdrawal" | "internal"
          amount: number
          status?: "pending" | "completed" | "failed"
          r_hash_str?: string | null
          payment_request?: string | null
          payment_hash?: string | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: "deposit" | "withdrawal" | "internal"
          amount?: number
          status?: "pending" | "completed" | "failed"
          r_hash_str?: string | null
          payment_request?: string | null
          payment_hash?: string | null
          memo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Post = Database["public"]["Tables"]["posts"]["Row"]
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type Group = Database["public"]["Tables"]["groups"]["Row"]
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"]
