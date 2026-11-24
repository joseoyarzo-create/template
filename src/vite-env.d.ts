/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_BUSINESS_SLUG?: string
  readonly VITE_BUSINESS_NAME?: string
  readonly VITE_BUSINESS_PHONE?: string
  readonly VITE_BUSINESS_WHATSAPP?: string
  readonly VITE_BUSINESS_ADDRESS?: string
  readonly VITE_MIN_LEAD_MINUTES?: string
  readonly VITE_MAX_ADVANCE_DAYS?: string
  readonly VITE_SHOW_ADMIN_LINK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
