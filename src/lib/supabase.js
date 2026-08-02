import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT'))
export const supabase = isConfigured ? createClient(url, key) : null
