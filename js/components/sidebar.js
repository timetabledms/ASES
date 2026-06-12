import { supabase } from '../config/supabase.js';

export function initSidebar(session, activeId) {
  if (!session) return;
  
  // 1. Inject Defensive Styles to guarantee perfect rendering
  if (!document.getElementById('sidebar-injected-styles')) {
    const style = document.createElement('style');
    style.id = 'sidebar-injected-styles';
    style.innerHTML = `
      /* Fix for the College Header Layout WITH LOGO */
      .sidebar-college {
        display: flex !important;
        flex-direction: row !important; /* Side-by-side layout */
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 0.75rem !important;
        padding: 1.5rem 1.25rem 1.25rem 1.25rem !important;
        border-bottom: 1px solid var(--border) !important;
      }
      .sidebar-logo {
        width: 46px; /* Perfect size for the sidebar */
        height: 46px;
        object-fit: contain;
        flex-shrink: 0;
      }
      .sidebar-college-text {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .sidebar-college-text strong {
        font-family: var(--ff-display, sans-serif) !important;
        font-size: 1.05rem !important;
        font-weight: 700 !important;
        line-height: 1.1 !important;
        color: var(--text-primary) !important;
        margin: 0 !important;
      }
      .sidebar-college-text span {
        font-family: var(--ff-body, sans-serif) !important;
        font-size: 0.65rem !important;
        font-weight: 700 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        color: var(--text-muted) !important;
        margin: 0 !important;
      }

      /* Navigation Menu Styles */
      #sideNav { display: flex; flex-direction: column; gap: 0.15rem; margin-top: 0.5rem; padding: 0 0.5rem; overflow-y: auto; }
      .nav-section { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted, #94a3b8); margin: 1.2rem 1rem 0.4rem 1rem; user-select: none; }
      .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 1rem; color: var(--text-muted, #64748b); text-decoration: none; border-radius: 8px; font-size: 0.88rem; font-weight: 500; transition: all 0.2s ease; }
      .nav-item:hover { background: var(--bg-hover, rgba(0,0,0,0.04)); color: var(--text-primary, #1e293b); }
      .nav-item.active { background: rgba(79, 106, 245, 0.1); color: var(--accent, #4f6af5); font-weight: 600; }
      .nav-icon { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; }
      .nav-icon svg { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    `;
    document.head.appendChild(style);
  }

  // 2. Set College Branding (Now with Logo)
  const collegeEl = document.getElementById('sidebarCollege');
  if (collegeEl) {
    // Adjust the src attribute if your logo is in a different folder
    collegeEl.innerHTML = `
      <img src="https://i.ibb.co/wZDKbsK6/image.png" alt="Logo" class="sidebar-logo" onerror="this.style.display='none'">
      <div class="sidebar-college-text">
        <strong>B. K. Birla College</strong>
        <span>Management Studies</span>
      </div>
    `;
  }
  
  // 3. Set User Profile Info
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

  // 4. Render Navigation Menu with Grouping
  const nav = document.getElementById('sideNav');
  if (nav) {
    let menu = [];
    
    // Admin / Super Admin Menu
    if (session.role === 'admin' || session.role === 'super_admin') {
      menu = [
        { isHeader: true, label: 'Main Menu' },
        { id: 'dashboard', icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>', label: 'Dashboard', link: '/dashboard.html' },
        { id: 'timetable', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', label: 'Master Timetable', link: '/pages/master-timetable.html' },
        { id: 'scheduler', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', label: 'Daily Scheduler', link: '/pages/daily-scheduler.html' },
        { id: 'execution', icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', label: 'Execution Log', link: '/pages/execution.html' },
        { id: 'leaves', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>', label: 'Faculty Leaves', link: '/pages/leaves.html' },
        { id: 'reports', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>', label: 'Reports', link: '/pages/reports.html' },
        
        { isHeader: true, label: 'Master Data' },
        { id: 'courses', icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', label: 'Courses', link: '/pages/courses.html' },
        { id: 'subjects', icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>', label: 'Subjects', link: '/pages/subjects.html' },
        { id: 'rooms', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>', label: 'Rooms', link: '/pages/rooms.html' },
        { id: 'csf-mapping', icon: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>', label: 'CSF Mapping', link: '/pages/csf-mapping.html' },
        
        { isHeader: true, label: 'System Setup' },
        { id: 'holidays', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h8"/><path d="M8 18h4"/>', label: 'Holidays', link: '/pages/holidays.html' },
        { id: 'users', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', label: 'Users', link: '/pages/users.html' },
      ];
    } else {
      // Faculty Menu
      menu = [
        { isHeader: true, label: 'Faculty Menu' },
        { id: 'faculty-portal', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>', label: 'My Portal', link: '/faculty-portal.html' }
      ];
    }

    nav.innerHTML = menu.map(m => {
      if (m.isHeader) {
        return `<div class="nav-section">${m.label}</div>`;
      }
      return `
        <a href="${m.link}" class="nav-item ${m.id === activeId ? 'active' : ''}">
          <span class="nav-icon"><svg viewBox="0 0 24 24">${m.icon}</svg></span>
          <span>${m.label}</span>
        </a>
      `;
    }).join('');
  }
  
  // 5. Logout Logic
  const logOut = document.getElementById('logoutBtn');
  if (logOut) {
    logOut.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = '/index.html';
    });
  }

  // 6. Theme Toggle Logic
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
