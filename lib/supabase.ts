import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

const supabaseUrl = "https://cmftywrrpxbyxxzodbgr.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZnR5d3JycHhieXh4em9kYmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3NTc2NDYsImV4cCI6MjA1MTMzMzY0Nn0.Q7TWVkHg1WK9X5CDy00CC7utoN7-_D16o_u9c41-SmQ"

const storage = Platform.OS !== 'web' ? AsyncStorage : undefined

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})