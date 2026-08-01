/**
 * Client Supabase (optionnel en mode local).
 * En mode développement local (sans Supabase), ce module exporte un client null
 * et les uploads utilisent le fallback local du serveur (/uploads/).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
