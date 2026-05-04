// js/config/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// TODO: Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://xgwtqcagdngqvzwolgea.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NQDTgflGRo0McYAIApDHxA_ZgX7-6Pb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
