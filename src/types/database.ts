/**
 * Supabase database types stub.
 *
 * Generate the full version with:
 *   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
 *
 * Until then this stub keeps the build passing.
 */
export type Database = {
  public: {
    Tables: {
      dreams:             { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      user_profiles:      { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      user_settings:      { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      user_push_tokens:   { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      push_subscriptions: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      notification_log:   { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      dream_symbols:      { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      dream_symbol_views: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
    Views:    Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums:    Record<string, unknown>;
  };
};
