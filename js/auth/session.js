/**
 * ASES — Session & Role Guard
 * ────────────────────────────
 * Provides:
 *   getSession()          → { user, role, profile } | null
 *   requireRole(role)     → redirects to login if not authenticated / wrong role
 *   redirectByRole()      → send user to the right landing page after login
 *   logout()              → sign out and go to login
 *
 * Role is stored in the `profiles` table:
 *   profiles (id uuid FK → auth.users, role text CHECK ('admin','faculty'), full_name text, is_active bool)
 *
 * Call requireRole('admin')   at the top of every admin page.
 * Call requireRole('faculty') at the top of faculty-portal.html.
 * Call requireRole()          to just require any authenticated user.
 */

import { supabase } from '../config/supabase.js';

// ─── Internal: fetch user's profile row ───────────────────────────────────────

async function _fetchProfile(userId) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('role, full_name, is_active')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[ASES] Failed to fetch profile:', error.message);
    return null;
  }
  return data;
}

// ─── getSession ───────────────────────────────────────────────────────────────
/**
 * Returns the currently authenticated user along with their ASES profile,
 * or null if no session exists.
 *
 * @returns {Promise<{ user: object, role: string, profile: object } | null>}
 *
 * @example
 *   const session = await getSession();
 *   if (!session) { window.location.href = '/index.html'; }
 *   console.log(session.role);       // 'admin' | 'faculty'
 *   console.log(session.profile.full_name);
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) return null;

  const profile = await _fetchProfile(session.user.id);
  if (!profile) return null;

  // Deactivated accounts must not proceed
  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    user: session.user,
    role: profile.role,        // 'admin' | 'faculty'
    profile,                   // { role, full_name, is_active }
  };
}

// ─── requireRole ─────────────────────────────────────────────────────────────
/**
 * Guards a page. Call at the very top of each page's JS module.
 *
 * - If the user is NOT logged in          → redirects to /index.html
 * - If the user IS logged in but deactivated → redirects to /index.html
 * - If `requiredRole` is provided and the user's role doesn't match → redirects to their correct landing page
 * - Returns the session object so the page can use it immediately.
 *
 * @param {'admin'|'faculty'|undefined} requiredRole  — omit to allow any role
 * @returns {Promise<{ user, role, profile }>}
 *
 * @example
 *   // At the top of dashboard.html's script:
 *   const session = await requireRole('admin');
 *   document.getElementById('welcome').textContent = session.profile.full_name;
 */
export async function requireRole(requiredRole) {
  const session = await getSession();

  // Not logged in (or deactivated)
  if (!session) {
    window.location.href = _loginPath();
    return;   // execution stops; browser is navigating away
  }

  // Logged in but wrong role — redirect to their correct page
  if (requiredRole && session.role !== requiredRole) {
    window.location.href = _landingFor(session.role);
    return;
  }

  return session;
}

// ─── redirectByRole ───────────────────────────────────────────────────────────
/**
 * After a successful login, send the user to their role-appropriate landing page.
 * Call this from login.js once auth is confirmed.
 *
 * @param {'admin'|'faculty'} role
 */
export function redirectByRole(role) {
  window.location.href = _landingFor(role);
}

// ─── logout ──────────────────────────────────────────────────────────────────
/**
 * Signs the user out of Supabase and returns them to the login page.
 */
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = _loginPath();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _landingFor(role) {
  // Works whether the app is served from root or a sub-directory.
  // Adjust paths if your deployment differs.
  return role === 'admin' ? '/dashboard.html' : '/faculty-portal.html';
}

function _loginPath() {
  return '/index.html';
}
