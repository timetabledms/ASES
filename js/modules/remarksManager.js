import { supabase } from '../config/supabase.js';
import { initSidebar } from '../components/sidebar.js';

let allRemarks = []; 
let activeFaculty = []; // Store faculty list for the autocomplete

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Auth & Sidebar
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
        window.location.href = '../index.html';
        return;
    }

    const { data: userData } = await supabase
        .from('admin_users')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

    const userSession = {
        profile: { full_name: userData?.full_name || 'User' },
        role: userData?.role || 'admin'
    };

    initSidebar(userSession, 'remarks');

    // 2. Load Initial Data
    await fetchActiveFaculty();
    await fetchAllRemarksFromDB();

    // 3. Initialize Autocomplete Component
    initFacultyAutocomplete();

    // 4. Form Submission Logic
    const form = document.getElementById('remark-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const date = document.getElementById('remark-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const facultyId = document.getElementById('selected-faculty-id').value; // Get from hidden input
        const remarkText = document.getElementById('remark-text').value;

        if (!facultyId) {
            alert('Please select a valid faculty member from the list.');
            return;
        }

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
            document.getElementById('selected-faculty-id').value = ''; // Clear hidden ID
            await fetchAllRemarksFromDB(); 
            
        } catch (error) {
            console.error('Error adding remark:', error);
            alert('Failed to add remark. Please check the console.');
        }
    });

    // 5. Table Event Listeners
    document.getElementById('table-search-input').addEventListener('input', applyFiltersAndSort);
    document.getElementById('sort-select').addEventListener('change', applyFiltersAndSort);
    document.getElementById('export-btn').addEventListener('click', exportToCSV);
});

// --- FACULTY AUTOCOMPLETE LOGIC --- //
async function fetchActiveFaculty() {
    try {
        const { data, error } = await supabase
            .from('faculty')
            .select('id, full_name')
            .eq('is_active', true)
            .order('full_name', { ascending: true });

        if (error) throw error;
        activeFaculty = data || [];
    } catch (error) {
        console.error('Error loading faculty:', error);
    }
}

function initFacultyAutocomplete() {
    const input = document.getElementById('faculty-search');
    const suggestionsBox = document.getElementById('faculty-suggestions');
    const hiddenIdInput = document.getElementById('selected-faculty-id');

    input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        suggestionsBox.innerHTML = ''; // Clear old list
        hiddenIdInput.value = ''; // Reset ID if they start typing again

        if (!query) {
            suggestionsBox.classList.remove('active');
            return;
        }

        // Filter faculty
        const filtered = activeFaculty.filter(f => f.full_name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            const li = document.createElement('li');
            li.textContent = "No faculty found";
            li.style.color = "var(--text-muted)";
            suggestionsBox.appendChild(li);
        } else {
            filtered.forEach(faculty => {
                const li = document.createElement('li');
                li.textContent = faculty.full_name;
                li.addEventListener('click', () => {
                    input.value = faculty.full_name;
                    hiddenIdInput.value = faculty.id;
                    suggestionsBox.classList.remove('active');
                });
                suggestionsBox.appendChild(li);
            });
        }
        suggestionsBox.classList.add('active');
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== suggestionsBox) {
            suggestionsBox.classList.remove('active');
        }
    });
}

// --- TABLE DATA LOGIC --- //
async function fetchAllRemarksFromDB() {
    const tbody = document.getElementById('remarks-tbody');
    try {
        const { data: remarks, error } = await supabase
            .from('faculty_remarks')
            .select('*, faculty(full_name)');

        if (error) throw error;

        allRemarks = remarks || [];
        applyFiltersAndSort(); 

    } catch (error) {
        console.error('Error loading remarks:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red; padding: 2rem;">Failed to load remarks.</td></tr>';
    }
}

function applyFiltersAndSort() {
    const searchTerm = document.getElementById('table-search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-select').value;

    let filteredData = allRemarks.filter(record => {
        const facName = (record.faculty?.full_name || '').toLowerCase();
        const remarkText = (record.remark || '').toLowerCase();
        return facName.includes(searchTerm) || remarkText.includes(searchTerm);
    });

    filteredData.sort((a, b) => {
        if (sortBy === 'date-desc') {
            const dateA = new Date(a.date + 'T' + (a.start_time || '00:00:00'));
            const dateB = new Date(b.date + 'T' + (b.start_time || '00:00:00'));
            return dateB - dateA;
        } else if (sortBy === 'date-asc') {
            const dateA = new Date(a.date + 'T' + (a.start_time || '00:00:00'));
            const dateB = new Date(b.date + 'T' + (b.start_time || '00:00:00'));
            return dateA - dateB;
        } else if (sortBy === 'name-asc') {
            const nameA = (a.faculty?.full_name || '').toLowerCase();
            const nameB = (b.faculty?.full_name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        }
        return 0;
    });

    renderTable(filteredData);
}

function renderTable(data) {
    const tbody = document.getElementById('remarks-tbody');
    tbody.innerHTML = ''; 

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 3rem; color: var(--text-muted);">No matching remarks found.</td></tr>';
        return;
    }

    const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';

    data.forEach(record => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${new Date(record.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</strong></td>
            <td>${formatTime(record.start_time)} - ${formatTime(record.end_time)}</td>
            <td>${record.faculty?.full_name || '<span style="color:var(--text-muted)">Unknown</span>'}</td>
            <td>${record.remark}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportToCSV() {
    if (allRemarks.length === 0) {
        alert("No data available to export.");
        return;
    }

    const searchTerm = document.getElementById('table-search-input').value.toLowerCase();
    const exportData = allRemarks.filter(record => {
        const facName = (record.faculty?.full_name || '').toLowerCase();
        const remarkText = (record.remark || '').toLowerCase();
        return facName.includes(searchTerm) || remarkText.includes(searchTerm);
    });

    const headers = ["Date", "Start Time", "End Time", "Faculty Name", "Remark"];
    
    const rows = exportData.map(record => {
        const facName = record.faculty?.full_name || "Unknown";
        const safeRemark = `"${record.remark.replace(/"/g, '""')}"`; 
        return [record.date, record.start_time, record.end_time, `"${facName}"`, safeRemark];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Faculty_Remarks_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
