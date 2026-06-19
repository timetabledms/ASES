import { supabase } from '../config/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('remark-form');
    
    // Initialize page by loading dropdowns and table data
    await loadFacultyDropdown();
    await loadRemarks();

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get values from the form
        const date = document.getElementById('remark-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const facultyId = document.getElementById('faculty-select').value;
        const remarkText = document.getElementById('remark-text').value;

        try {
            // Insert into Supabase database
            const { error } = await supabase
                .from('faculty_remarks')
                .insert([
                    {
                        date: date,
                        start_time: startTime,
                        end_time: endTime,
                        faculty_id: facultyId,
                        remark: remarkText
                    }
                ]);

            if (error) throw error;

            alert('Remark added successfully!');
            form.reset(); // Clear the form
            await loadRemarks(); // Refresh the table to show the new entry
            
        } catch (error) {
            console.error('Error adding remark:', error);
            alert('Failed to add remark. Please check the console for details.');
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
            .order('full_name', { ascending: true }); // Alphabetize the dropdown

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
        const select = document.getElementById('faculty-select');
        select.innerHTML = '<option value="">Error loading faculty</option>';
    }
}

// Fetch remarks and populate the HTML table
async function loadRemarks() {
    const tbody = document.getElementById('remarks-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Loading remarks...</td></tr>';

    try {
        const { data: remarks, error } = await supabase
            .from('faculty_remarks')
            .select(`
                *,
                faculty ( full_name )
            `)
            .order('date', { ascending: false })
            .order('start_time', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = ''; // Clear loading state

        // Handle empty state
        if (remarks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No remarks found.</td></tr>';
            return;
        }

        // Helper function to format time (e.g., "14:30:00" -> "14:30")
        const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : '';

        // Populate table rows
        remarks.forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${record.date}</td>
                <td>${formatTime(record.start_time)} - ${formatTime(record.end_time)}</td>
                <td>${record.faculty?.full_name || '<span style="color:red;">Unknown Faculty</span>'}</td>
                <td>${record.remark}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading remarks:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Failed to load remarks.</td></tr>';
    }
}
