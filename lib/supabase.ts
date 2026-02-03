import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Check if Supabase credentials are available
export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey)

// Create client only if credentials exist
export const supabase = hasSupabaseCredentials
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

// Database types
export interface WarehouseStatusRow {
  id: string
  ramp_number: number
  active: boolean
  red: boolean
  yellow: boolean
  input_value: string
  truck_value: string
  trailer_value: string
  has_truck: boolean
  is_exiting: boolean
  updated_at: string
}

export interface WarehouseLookupRow {
  id: string
  truck: string
  trailer: string
  row_number: number
  updated_at: string
}
