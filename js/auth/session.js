/**
 * ASES — Session & Role Guard
 * ────────────────────────────
 * Provides:
 *   getSession()          → { user, role, profile } | null
 *   requireRole(role)     → redirects to login if not authenticated / wrong role
 *   redirectByRole()      → send user to the right landing page after login
 *   logout()              → sign out and go to login
 *
 * Role is stored across two tables:
 *   admin_users (id uuid FK → auth.users, role text, full_name text, is_active bool)
 *   faculty     (supabase_uid uuid FK → auth.users, full_name text, is_active bool)
 *
 * Call requireRole('admin')   at the top of every admin page.
 * Call requireRole('faculty') at the top of faculty-portal.html.
 * Call requireRole()          to just require any authenticated user.
 */

import { supabase } from '../config/supabase.js';

// ─── Internal: fetch user's profile row ───────────────────────────────────────

async function _fetchProfile(userId) {
  // 1. Check if the user is an Admin
  const { data: adminData, error: adminError } = await supabase
    .from('admin_users')
    .select('role, full_name, is_active')
    .eq('id', userId)
    .maybeSingle(); // maybeSingle returns null if no row is found, instead of throwing an error

  if (adminError) {
    console.error('[ASES] Error fetching admin profile:', adminError.message);
  }

  if (adminData) {
    return adminData; // Returns { role, full_name, is_active }
  }

  // 2. If not an Admin, check if the user is Faculty
  const { data: facultyData, error: facultyError } = await supabase
    .from('faculty')
    .select('full_name, is_active')
    .eq('supabase_uid', userId)
    .maybeSingle();

  if (facultyError) {
    console.error('[ASES] Error fetching faculty profile:', facultyError.message);
  }

  if (facultyData) {
    return {
      role: 'faculty', // Hardcode 'faculty' since it's implied by the table
      full_name: facultyData.full_name,
      is_active: facultyData.is_active
    };
  }

  console.error('[ASES] Profile not found in either admin_users or faculty tables.');
  return null;
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
    role: profile.role,        // 'admin' | 'super_admin' | 'viewer' | 'faculty'
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
  // Note: If you have granular admin roles ('super_admin', 'viewer'), 
  // you might need to adjust this logic depending on how you group them.
  if (requiredRole) {
    const isFacultyRole = session.role === 'faculty';
    const isAdminRole = ['admin', 'super_admin', 'viewer'].includes(session.role);

    if (requiredRole === 'faculty' && !isFacultyRole) {
      window.location.href = _landingFor(session.role);
      return;
    }

    if (requiredRole === 'admin' && !isAdminRole) {
      window.location.href = _landingFor(session.role);
      return;
    }
  }

  return session;
}

// ─── redirectByRole ───────────────────────────────────────────────────────────
/**
 * After a successful login, send the user to their role-appropriate landing page.
 * Call this from login.js once auth is confirmed.
 *
 * @param {string} role ('admin', 'super_admin', 'viewer', 'faculty')
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
  // Group all admin-type roles into the dashboard route
  if (['admin', 'super_admin', 'viewer'].includes(role)) {
    return '/dashboard.html';
  }
  return '/faculty-portal.html';
}

function _loginPath() {
  return '/index.html';
}
