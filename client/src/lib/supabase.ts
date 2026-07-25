/**
 * Client Supabase (optionnel en mode local).
 * En mode développement local (sans Supabase), ce module exporte un client null
 * et les uploads utilisent le fallback local du serveur (/uploads/).
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  // Supabase est configuré — on importe dynamiquement
  import('@supabase/supabase-js').then(({ createClient }) => {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Client initialisé');
  }).catch(() => {
    console.warn('[Supabase] Module non disponible, mode local actif');
  });
} else {
  console.info('[Supabase] Credentials non configurées → mode local (uploads via /uploads/)');
}

export { supabase };
