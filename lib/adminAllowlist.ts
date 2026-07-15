/**
 * Admin access allowlist.
 *
 * Only emails listed here can log in or request a password reset for
 * the admin dashboard — checked BEFORE any Supabase auth call is even
 * made, so an unlisted email never gets far enough to reveal whether
 * an account with that address exists at all.
 *
 * This is deliberately a static, hardcoded list rather than a database
 * table: changing who can access the admin panel should require a code
 * change + deploy, not just a database row someone could edit. Add new
 * admin emails here as needed.
 */
export const ADMIN_EMAIL_ALLOWLIST = [
  'lamidecodes@gmail.com',
];

export function isAllowedAdminEmail(email: string): boolean {
  return ADMIN_EMAIL_ALLOWLIST.includes(email.trim().toLowerCase());
}