/* Cycling Cities — deployment configuration.

   The contribution inbox is a Supabase project that only accepts inserts from the
   browser; nothing on the published site reads from it (docs/database/README.md).
   The publishable key is public by design, and Row Level Security is what protects
   the inbox, so this file is safe to publish. Empty both values and every send
   button falls back to copy-and-email. */
window.CC_CONFIG = {
  inboxUrl: 'https://opjipfsyxyxghbjvxtur.supabase.co',
  inboxAnonKey: 'sb_publishable_N9aDRyVXy9VdUCd3cVYMZg_Q28W7MVK'
};
