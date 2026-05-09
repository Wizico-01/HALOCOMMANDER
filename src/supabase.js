import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://blvnevjduekmvkwthszh.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdm5ldmpkdWVrbXZrd3Roc3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODc5MDAsImV4cCI6MjA5MzU2MzkwMH0.zZ9rVspdr8rzrXrXOQw_vMMg5c93ejAQ5euuaC2uJCo'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)