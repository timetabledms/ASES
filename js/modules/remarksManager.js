import { supabase } from '../config/supabase.js';
import { initSidebar } from '../components/sidebar.js';

document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // 1. INITIALIZE AUTH & SIDEBAR (The missing piece!)
    // ==========================================
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    // Redirect to login if they aren't authenticated
    if (authError || !session) {
        window.location.href = '../index.html';
        return;
    }

    // Fetch user details to correctly populate the sidebar profile
    const { data: userData } = await supabase
        .from('admin_users')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

    const userSession = {
        profile: { full_name: userData?.full_name || 'User' },
        role: userData?.role || 'admin'
    };

    // Inject the sidebar and highlight the 'remarks' tab!
    initSidebar(userSession, 'remarks');

    // ==========================================
    // 2. LOAD PAGE DATA
    // ==========================================
    const form = document.getElementById('remark-form');
    
    await loadFacultyDropdown();
    await loadRemarks();

    // ==========================================
    // 3. FORM SUBMISSION LOGIC
    // ==========================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const date = document.getElementById('remark-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const facultyId = document.getElementById('faculty-select').value;
        const remarkText = document.getElementById('remark-text').value;

        try {
            const { error } = await supabase
                .from('faculty_remarks')
                .insert([{
                    date: date,
                    start_time: startTime,
                    end_time: endTime,
                    faculty_id: facultyId,
                    remark: remarkText
                }]);

            if (error) throw error;

            alert('Remark added successfully!');
            form.reset();
            await loadRemarks(); // Refresh table
            
        } catch (error) {
            console.error('Error adding remark:', error);
            alert('Failed to add remark. Please check the console.');
        }
    });
});

// Fetch active faculty members and populate the dropdown
async function loadFacultyDropdown() {
    try {
        const { data: facultyList, error } = await supabase
            .from('faculty')
            .select('id, full_name')
            .eq('is_active', true)
            .order('full_name', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('faculty-select');
        facultyList.forEach(person => {
            const option = document.createElement('option');
            option.value = person.id;
            option.textContent = person.full_name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading faculty:', error);
    }
}

// Fetch remarks and populate the HTML table
async function loadRemarks() {
    const tbody = document.getElementById('remarks-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Loading remarks...</td></tr>';

    try {
        const { data: remarks, error } = await supabase
            .from('faculty_remarks')
            .select('*, faculty(full_name)')
            .order('date', { ascending: false })
            .order('start_time', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = ''; 

        if (remarks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No remarks found.</td></tr>';
            return;
        }

        const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';

        remarks.forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.date}</td>
                <td>${formatTime(record.start_time)} - ${formatTime(record.end_time)}</td>
                <td>${record.faculty?.full_name || 'Unknown Faculty'}</td>
                <td>${record.remark}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading remarks:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Failed to load remarks.</td></tr>';
    }
}
