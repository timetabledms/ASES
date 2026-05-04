// js/auth/session.js
import { supabase } from '../config/supabase.js';

/**
 * Retrieves the current active session from Supabase.
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error fetching session:', error.message);
        return null;
    }
    return session;
}

/**
 * Secures a page by requiring specific roles. 
 * Redirects to index.html if unauthenticated or unauthorized.
 * 
 * @param {Array<string>} allowedRoles - e.g., ['admin'], ['faculty'], or ['admin', 'faculty']
 */
export async function requireRole(allowedRoles = []) {
    const session = await getSession();

    if (!session) {
        window.location.href = '/index.html';
        return null;
    }

    const userId = session.user.id;

    // Fetch the user's role from the public.users table
    const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !userData) {
        console.error('Error fetching user role:', error?.message);
        // Destroy invalid session and redirect
        await supabase.auth.signOut();
        window.location.href = '/index.html';
        return null;
    }

    const userRole = userData.role;

    // Check if the user's role is permitted on this page
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        console.warn(`Access denied. User role '${userRole}' not in allowed roles:`, allowedRoles);
        // Redirect to appropriate landing page based on their actual role
        if (userRole === 'admin') window.location.href = '/dashboard.html';
        else if (userRole === 'faculty') window.location.href = '/faculty-portal.html';
        else window.location.href = '/index.html';
        return null;
    }

    return { session, userRole };
}
