/**
 * ASES — Master Timetable Manager
 * ─────────────────────────────────
 * Manages the fixed weekly timetable for weekdays and Saturdays.
 */

import { supabase } from '../config/supabase.js';

// ── getTimeSlots ──────────────────────────────────────────────────────────────
/**
 * All time slots for a given day_type, sorted by sort_order.
 */
export async function getTimeSlots(dayType) {
  const { data, error } = await supabase
    .from('time_slots')
    .select('id, slot_label, start_time, end_time, slot_type, sort_order')
    .eq('day_type', dayType)
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}

// ── getActiveRooms ────────────────────────────────────────────────────────────
export async function getActiveRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, room_code')
    .eq('is_active', true)
    .order('room_code');

  if (error) throw error;
  return data ?? [];
}

// ── getMasterTimetable ────────────────────────────────────────────────────────
/**
 * All active master timetable entries for a day_type, fully joined.
 * Returns a map: { [timeSlotId]: { [roomId]: row } } for O(1) cell lookup.
 */
export async function getMasterTimetable(dayType) {
  const { data, error } = await supabase
    .from('master_timetable')
    .select(`
      id,
      day_type,
      is_active,
      time_slot:time_slots!time_slot_id (id, slot_label, start_time, end_time, slot_type, sort_order),
      room:rooms!room_id (id, room_code),
      course:courses!course_id (id, course_code, year, program, division),
      subject:subjects!subject_id (id, subject_name),
      faculty:faculty!faculty_id (id, full_name),
      csf_id,
      course_id,
      subject_id,
      faculty_id
    `)
    .eq('day_type', dayType)
    .eq('is_active', true);

  if (error) throw error;

  // Build lookup map
  const map = {};
  for (const row of (data ?? [])) {
    const tsId = row.time_slot?.id;
    const rId  = row.room?.id;
    if (!tsId || !rId) continue;
    if (!map[tsId]) map[tsId] = {};
    map[tsId][rId] = row;
  }
  return map;
}

// ── upsertMasterEntry ─────────────────────────────────────────────────────────
/**
 * Assign or update a cell in the master timetable.
 * Upserts on (day_type, time_slot_id, room_id).
 */
export async function upsertMasterEntry({ dayType, timeSlotId, roomId, csfId, courseId, subjectId, facultyId }) {
  const { data, error } = await supabase
    .from('master_timetable')
    .upsert(
      {
        day_type:     dayType,
        time_slot_id: timeSlotId,
        room_id:      roomId,
        csf_id:       csfId,
        course_id:    courseId,
        subject_id:   subjectId,
        faculty_id:   facultyId,
        is_active:    true,
      },
      { onConflict: 'day_type,time_slot_id,room_id', returning: 'representation' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── clearMasterEntry ──────────────────────────────────────────────────────────
/**
 * Soft-clear a cell (sets is_active = false).
 */
export async function clearMasterEntry(entryId) {
  const { error } = await supabase
    .from('master_timetable')
    .update({ is_active: false })
    .eq('id', entryId);

  if (error) throw error;
}

// ── getCSFForCourse ───────────────────────────────────────────────────────────
/**
 * Returns active CSF rows for a course, formatted for the timetable cell modal.
 * Each option: { csfId, subjectId, subjectName, facultyId, facultyName, label }
 */
export async function getCSFForCourse(courseId) {
  const { data, error } = await supabase
    .from('course_subject_faculty')
    .select(`
      id,
      subject_id,
      faculty_id,
      subject:subjects!subject_id (id, subject_name),
      faculty:faculty!faculty_id  (id, full_name)
    `)
    .eq('course_id', courseId)
    .eq('is_active', true);

  if (error) throw error;

  return (data ?? []).map(row => ({
    csfId:       row.id,
    subjectId:   row.subject_id,
    subjectName: row.subject.subject_name,
    facultyId:   row.faculty_id,
    facultyName: row.faculty.full_name,
    label:       `${row.subject.subject_name} — Prof. ${row.faculty.full_name}`,
  }));
}

// ── getAllActiveCourses ───────────────────────────────────────────────────────
export async function getAllActiveCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, course_code, year, program, division')
    .eq('is_active', true)
    .order('year').order('program').order('division');

  if (error) throw error;
  return (data ?? []).map(c => ({
    ...c,
    label: c.division ? `${c.year} ${c.program} ${c.division}` : `${c.year} ${c.program}`,
  }));
}
