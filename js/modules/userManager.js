/**
 * ASES — User Manager
 * ────────────────────
 * Admin-only. Creates and manages admin_users and faculty accounts.
 *
 * IMPORTANT: createUser calls require the Supabase service_role key,
 * which must NEVER be exposed in client-side code.
 * These calls should go through a Supabase Edge Function.
 *
 * Expected Edge Function: /functions/v1/admin-create-user
 * Payload: { email, password, fullName, role, type, employeeCode, phone, department }
 * Returns: { userId } on success
 *
 * If you have not set up the Edge Function yet, the createAdmin / createFaculty
 * functions below will throw a clear error explaining what is needed.
 */

import { supabase } from '../config/supabase.js';

// ── Edge Function endpoint ────────────────────────────────────────────────────
// Deploy the Edge Function from /functions/admin-create-user/index.ts
// then set this to your project's functions URL.
const EDGE_FN_URL = '/functions/v1/admin-create-user';

// ── createAdmin ───────────────────────────────────────────────────────────────
/**
 * Creates a new admin account:
 * 1. Calls Edge Function → creates Supabase Auth user
 * 2. Edge Function inserts into admin_users table
 *
 * @param {{ fullName: string, email: string, password: string, role: 'admin'|'super_admin' }} params
 */
export async function createAdmin({ fullName, email, password, role = 'admin' }) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      type:     'admin',
      email,
      password,
      fullName,
      role,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to create admin account');
  }

  return res.json();
}

// ── createFaculty ─────────────────────────────────────────────────────────────
/**
 * Creates a new faculty account:
 * 1. Calls Edge Function → creates Supabase Auth user
 * 2. Edge Function inserts into faculty table with supabase_uid
 *
 * @param {{ fullName, email, password, employeeCode, phone, department }} params
 */
export async function createFaculty({ fullName, email, password, employeeCode, phone, department }) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      type:         'faculty',
      email,
      password,
      fullName,
      employeeCode,
      phone:        phone || null,
      department:   department || null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to create faculty account');
  }

  return res.json();
}

// ── deactivateUser ────────────────────────────────────────────────────────────
/**
 * Soft-deactivates a user. Does NOT delete the Supabase auth account.
 * @param {'admin'|'faculty'} userType
 * @param {string} userId  — admin_users.id or faculty.id
 */
export async function deactivateUser(userType, userId) {
  const table = userType === 'admin' ? 'admin_users' : 'faculty';
  const { error } = await supabase
    .from(table)
    .update({ is_active: false })
    .eq('id', userId);

  if (error) throw error;
}

// ── reactivateUser ────────────────────────────────────────────────────────────
export async function reactivateUser(userType, userId) {
  const table = userType === 'admin' ? 'admin_users' : 'faculty';
  const { error } = await supabase
    .from(table)
    .update({ is_active: true })
    .eq('id', userId);

  if (error) throw error;
}

// ── getAllAdmins ───────────────────────────────────────────────────────────────
export async function getAllAdmins() {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ── getAllFaculty ──────────────────────────────────────────────────────────────
export async function getAllFaculty() {
  const { data, error } = await supabase
    .from('faculty')
    .select('id, employee_code, full_name, email, phone, department, is_active, created_at')
    .order('full_name');

  if (error) throw error;
  return data ?? [];
}
