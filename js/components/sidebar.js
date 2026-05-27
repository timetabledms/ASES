/**
 * ASES — Shared Sidebar Component
 * ─────────────────────────────────
 * Call initSidebar(session) from every page after requireRole().
 * Renders the college header, theme toggle, user pill, and logout.
 * Theme preference is persisted in localStorage.
 */

import { logout } from '../auth/session.js';

const COLLEGE_LOGO = 'https://i.ibb.co/Q3sckzSm/square-crop.png';
const COLLEGE_NAME = 'B. K. Birla College of Arts, Science & Commerce';
const COLLEGE_SUB  = 'Empowered Autonomous Status';

/**
 * @param {object} session  — from requireRole()
 * @param {string} activePage  — e.g. 'users', 'leaves', 'daily-scheduler', etc.
 */
export function initSidebar(session, activePage = '') {
  const { profile } = session;
  const isAdmin = profile.role === 'admin' || profile.role === 'super_admin';

  // ── College header ──────────────────────────────────────────────
  const collegeEl = document.getElementById('sidebarCollege');
  if (collegeEl) {
    collegeEl.innerHTML = `
      <img class="college-logo" src="${COLLEGE_LOGO}" alt="College logo" loading="lazy" />
      <div class="college-text">
        <div class="college-name">${COLLEGE_NAME}</div>
        <div class="college-sub">${COLLEGE_SUB}</div>
      </div>`;
  }

  // ── Nav links ───────────────────────────────────────────────────
  const navEl = document.getElementById('sideNav');
  if (navEl) {
    navEl.innerHTML = buildNav(isAdmin, activePage);
  }

  // ── User pill ───────────────────────────────────────────────────
  const avatarEl = document.getElementById('userAvatar');
  const nameEl   = document.getElementById('userName');
  const roleEl   = document.getElementById('userRole');
  if (avatarEl) avatarEl.textContent = profile.full_name.charAt(0).toUpperCase();
  if (nameEl)   nameEl.textContent   = profile.full_name;
  if (roleEl)   roleEl.textContent   = profile.role;

  // ── Logout ──────────────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', logout);

  // ── Theme toggle ────────────────────────────────────────────────
  initTheme();
}

// ── Theme logic ─────────────────────────────────────────────────
function initTheme() {
  // Default changed to 'light' here
  const savedTheme = localStorage.getItem('ases-theme') || 'light';
  applyTheme(savedTheme);

  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  toggle.checked = savedTheme === 'light';
  toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'light' : 'dark';
    applyTheme(theme);
    localStorage.setItem('ases-theme', theme);
    // Update sun/moon icon label
    updateThemeLabel(theme);
  });
  updateThemeLabel(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeLabel(theme) {
  const lbl = document.getElementById('themeLabel');
  if (!lbl) return;
  lbl.textContent = theme === 'light' ? 'Light mode' : 'Dark mode';
  // swap icon
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML = theme === 'light'
      ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
}

// ── Build nav HTML ────────────────────────────────────────────────
function buildNav(isAdmin, active) {
  const link = (href, id, icon, label) => `
    <a href="${href}" class="nav-link${active === id ? ' active' : ''}">
      ${icon}${label}
    </a>`;

  const icons = {
    dashboard: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    users:     `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    timetable: `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    csf:       `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>`,
    leaves:    `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`,
    holidays:  `<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="15" x2="8" y2="15" stroke-width="2.5"/><line x1="12" y1="15" x2="12" y2="15" stroke-width="2.5"/><line x1="16" y1="15" x2="16" y2="15" stroke-width="2.5"/><line x1="8" y1="19" x2="8" y2="19" stroke-width="2.5"/><line x1="12" y1="19" x2="12" y2="19" stroke-width="2.5"/></svg>`,
    scheduler: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
    execution: `<svg viewBox="0 0 24 24"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    reports:   `<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    portal:    `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
    password:  `<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  };

  if (isAdmin) {
    return `
      <div class="nav-section">Admin</div>
      ${link('/dashboard.html',              'dashboard', icons.dashboard, 'Dashboard')}
      ${link('/pages/users.html',            'users',     icons.users,     'Users')}
      ${link('/pages/master-timetable.html', 'timetable', icons.timetable, 'Master Timetable')}
      ${link('/pages/csf-mapping.html',      'csf',       icons.csf,       'CSF Mapping')}
      ${link('/pages/leaves.html',           'leaves',    icons.leaves,    'Leave Management')}
      ${link('/pages/holidays.html',         'holidays',  icons.holidays,  'Holidays')}
      ${link('/pages/daily-scheduler.html',  'scheduler', icons.scheduler, 'Daily Scheduler')}
      ${link('/pages/execution.html',        'execution', icons.execution, 'Execution Log')}
      ${link('/pages/reports.html',          'reports',   icons.reports,   'Reports')}
      <div class="nav-section">Account</div>
      ${link('/pages/change-password.html',  'password',  icons.password,  'Change Password')}
    `;
  } else {
    return `
      <div class="nav-section">Faculty</div>
      ${link('/faculty-portal.html',        'portal',   icons.portal,   'My Portal')}
      ${link('/pages/reports.html',         'reports',  icons.reports,  'My Reports')}
      <div class="nav-section">Account</div>
      ${link('/pages/change-password.html', 'password', icons.password, 'Change Password')}
    `;
  }
}
