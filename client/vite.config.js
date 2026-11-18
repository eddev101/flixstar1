import { defineConfig } from 'vite';

// Supabase settings can be named either VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// or SUPABASE_URL / SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) in Vercel.
// Only these two public values are exposed to the browser — never add the
// service_role key here.
const pick = (...names) => {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return '';
};

const supabaseUrl = pick('VITE_SUPABASE_URL', 'SUPABASE_URL').replace(/\/+$/, '');
const supabaseAnonKey = pick(
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_KEY'
);

export default defineConfig({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
  }
});
