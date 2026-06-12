import { supabase } from '../config/supabase.js';

export function initSidebar(session, activeId) {
  if (!session) return;
  
  // Set College Branding
  const collegeEl = document.getElementById('sidebarCollege');
  if (collegeEl) {
    collegeEl.innerHTML = `<strong>B. K. Birla College</strong><span>Management Studies</span>`;
  }
  
  // Set User Profile Info
  const uName = document.getElementById('userName');
  const uRole = document.getElementById('userRole');
  const uAv = document.getElementById('userAvatar');
  
  if (uName) uName.textContent = session.profile?.full_name || 'User';
  if (uRole) {
    let roleText = session.role || 'Faculty';
    if (roleText === 'super_admin') roleText = 'Super Admin';
    uRole.textContent = roleText.charAt(0).toUpperCase() + roleText.slice(1).replace('_', ' ');
  }
  if (uAv) uAv.textContent = (session.profile?.full_name || 'U').charAt(0).toUpperCase();

  // Render Navigation Menu
  const nav = document.getElementById('sideNav');
  if (nav) {
    let menu = [];
    
    // Admin / Super Admin Menu
    if (session.role === 'admin' || session.role === 'super_admin') {
      menu = [
        { id: 'dashboard', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>', label: 'Dashboard', link: '/dashboard.html' },
        
        { id: 'timetable', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: 'Master Timetable', link: '/pages/master-timetable.html' },
        { id: 'scheduler', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', label: 'Daily Scheduler', link: '/pages/daily-scheduler.html' },
        { id: 'execution', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', label: 'Execution Log', link: '/pages/execution.html' },
        { id: 'leaves', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>', label: 'Faculty Leaves', link: '/pages/leaves.html' },
        { id: 'reports', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>', label: 'Reports', link: '/pages/reports.html' },
        
        // Master Data & Setups
        { id: 'courses', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', label: 'Courses', link: '/pages/courses.html' },
        { id: 'subjects', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>', label: 'Subjects', link: '/pages/subjects.html' },
        { id: 'rooms', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>', label: 'Rooms', link: '/pages/rooms.html' },
        { id: 'csf-mapping', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', label: 'CSF Mapping', link: '/pages/csf-mapping.html' },
        { id: 'holidays', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h8"/><path d="M8 18h4"/></svg>', label: 'Holidays', link: '/pages/holidays.html' },
        { id: 'users', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Users', link: '/pages/users.html' },
      ];
    } else {
      // Faculty Menu
      menu = [
        { id: 'faculty-portal', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: 'My Portal', link: '/faculty-portal.html' }
      ];
    }

    nav.innerHTML = menu.map(m => `
      <a href="${m.link}" class="nav-item ${m.id === activeId ? 'active' : ''}">
        <span class="nav-icon">${m.icon}</span>${m.label}
      </a>
    `).join('');
  }
  
  // Logout Logic
  const logOut = document.getElementById('logoutBtn');
  if (logOut) {
    logOut.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = '/index.html';
    });
  }

  // Theme Toggle Logic
  const themeToggle = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  const themeIcon = document.getElementById('themeIcon');
  
  if (themeToggle) {
    const currentTheme = localStorage.getItem('ases_theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.checked = currentTheme === 'dark';
    updateThemeUI(currentTheme);

    themeToggle.addEventListener('change', (e) => {
      const newTheme = e.target.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('ases_theme', newTheme);
      updateThemeUI(newTheme);
    });
  }

  function updateThemeUI(theme) {
    if(!themeLabel || !themeIcon) return;
    if (theme === 'dark') {
      themeLabel.textContent = 'Dark mode';
      themeIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    } else {
      themeLabel.textContent = 'Light mode';
      themeIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    }
  }
}
