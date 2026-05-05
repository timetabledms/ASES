/**
 * ASES — Execution Logger
 * ────────────────────────
 * Marks and manages lecture execution records for a given day.
 */

import { supabase } from '../config/supabase.js';

// ── markExecution ─────────────────────────────────────────────────────────────
/**
 * Upserts a lecture_execution row for a daily_schedule entry.
 * is_modified is computed by the DB (generated column) — never set here.
 */
export async function markExecution(dailyScheduleId, payload, adminId) {
  const {
    schedule_date, actual_faculty_id, faculty_status = 'not_marked',
    is_time_changed = false, is_room_changed = false, is_replaced = false,
    time_swap_partner_id = null, actual_start_time = null, actual_end_time = null,
    actual_room_id = null, replacement_faculty_id = null,
    modification_note = null, remarks = null,
  } = payload;

  const { data, error } = await supabase
    .from('lecture_execution')
    .upsert(
      {
        daily_schedule_id:     dailyScheduleId,
        schedule_date,
        actual_faculty_id:     actual_faculty_id || null,
        faculty_status,
        is_time_changed,
        is_room_changed,
        is_replaced,
        time_swap_partner_id:  time_swap_partner_id || null,
        actual_start_time:     actual_start_time  || null,
        actual_end_time:       actual_end_time    || null,
        actual_room_id:        actual_room_id     || null,
        replacement_faculty_id: replacement_faculty_id || null,
        modification_note:     modification_note  || null,
        remarks:               remarks            || null,
        marked_by:             adminId,
        marked_at:             new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      },
      { onConflict: 'daily_schedule_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── swapLectureTimes ──────────────────────────────────────────────────────────
/**
 * Swaps the time slots of two lectures on the same day.
 * BLOCKS with an error if the swap would create a room conflict.
 *
 * A conflict exists if:
 *  - Room of A already has a DIFFERENT (non-A, non-B) lecture at B's time slot
 *  - Room of B already has a DIFFERENT lecture at A's time slot
 */
export async function swapLectureTimes(scheduleIdA, scheduleIdB, date, adminId) {
  // Fetch both schedule rows with their time slot and room info
  const { data: rows, error: fetchErr } = await supabase
    .from('daily_schedule')
    .select(`
      id,
      room_id,
      time_slot_id,
      time_slot:time_slots!time_slot_id (id, start_time, end_time)
    `)
    .in('id', [scheduleIdA, scheduleIdB])
    .eq('schedule_date', date);

  if (fetchErr) throw fetchErr;
  if (!rows || rows.length < 2) throw new Error('Could not fetch both lecture rows for swap.');

  const A = rows.find(r => r.id === scheduleIdA);
  const B = rows.find(r => r.id === scheduleIdB);
  if (!A || !B) throw new Error('One or both lectures not found on this date.');

  // ── Conflict check ────────────────────────────────────────────────
  // Check if Room A is occupied at B's time slot (by something other than B)
  const { data: conflictA } = await supabase
    .from('daily_schedule')
    .select('id')
    .eq('schedule_date', date)
    .eq('room_id', A.room_id)
    .eq('time_slot_id', B.time_slot_id)
    .eq('is_cancelled', false)
    .neq('id', scheduleIdB) // B itself is allowed there
    .limit(1);

  if (conflictA && conflictA.length > 0) {
    throw new Error(
      `Room conflict — Room already occupied at ${B.time_slot?.start_time?.slice(0,5)} (${B.time_slot?.end_time?.slice(0,5)}). Cannot swap.`
    );
  }

  // Check if Room B is occupied at A's time slot
  const { data: conflictB } = await supabase
    .from('daily_schedule')
    .select('id')
    .eq('schedule_date', date)
    .eq('room_id', B.room_id)
    .eq('time_slot_id', A.time_slot_id)
    .eq('is_cancelled', false)
    .neq('id', scheduleIdA)
    .limit(1);

  if (conflictB && conflictB.length > 0) {
    throw new Error(
      `Room conflict — Room already occupied at ${A.time_slot?.start_time?.slice(0,5)} (${A.time_slot?.end_time?.slice(0,5)}). Cannot swap.`
    );
  }

  // ── Write both execution rows ──────────────────────────────────────
  const upsertBoth = await Promise.all([
    supabase.from('lecture_execution').upsert({
      daily_schedule_id:    scheduleIdA,
      schedule_date:        date,
      is_time_changed:      true,
      time_swap_partner_id: scheduleIdB,
      actual_start_time:    B.time_slot?.start_time,
      actual_end_time:      B.time_slot?.end_time,
      marked_by:            adminId,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'daily_schedule_id' }),

    supabase.from('lecture_execution').upsert({
      daily_schedule_id:    scheduleIdB,
      schedule_date:        date,
      is_time_changed:      true,
      time_swap_partner_id: scheduleIdA,
      actual_start_time:    A.time_slot?.start_time,
      actual_end_time:      A.time_slot?.end_time,
      marked_by:            adminId,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'daily_schedule_id' }),
  ]);

  for (const { error } of upsertBoth) {
    if (error) throw error;
  }

  return { swapped: true, slotA: B.time_slot, slotB: A.time_slot };
}

// ── getReplacementFacultyOptions ──────────────────────────────────────────────
/**
 * Returns CSF options for is_replaced — tagged with absence/busy warnings.
 */
export async function getReplacementFacultyOptions(courseId, date, timeSlotId, excludeFacultyId = null) {
  const { data: csfRows, error } = await supabase
    .from('course_subject_faculty')
    .select(`
      id, faculty_id, subject_id,
      subject:subjects!subject_id (subject_name),
      faculty:faculty!faculty_id  (id, full_name)
    `)
    .eq('course_id', courseId)
    .eq('is_active', true);

  if (error) throw error;
  if (!csfRows?.length) return [];

  const [leavesRes, busyRes] = await Promise.all([
    supabase.from('faculty_leaves').select('faculty_id').eq('leave_date', date).eq('status', 'approved'),
    supabase.from('daily_schedule').select('assigned_faculty_id').eq('schedule_date', date).eq('time_slot_id', timeSlotId).eq('is_cancelled', false),
  ]);

  const absentIds = new Set((leavesRes.data ?? []).map(l => l.faculty_id));
  const busyIds   = new Set((busyRes.data   ?? []).map(s => s.assigned_faculty_id));

  return csfRows
    .filter(r => !excludeFacultyId || r.faculty_id !== excludeFacultyId)
    .map(r => ({
      csfId:       r.id,
      subjectId:   r.subject_id,
      subjectName: r.subject.subject_name,
      facultyId:   r.faculty_id,
      facultyName: r.faculty.full_name,
      label:       `${r.subject.subject_name} — Prof. ${r.faculty.full_name}`,
      warnAbsent:  absentIds.has(r.faculty_id),
      warnBusy:    busyIds.has(r.faculty_id),
    }));
}

// ── autoMarkUnmarked ──────────────────────────────────────────────────────────
/**
 * Finds all un-executed lecture slots for a date and bulk-inserts "not_marked" rows.
 */
export async function autoMarkUnmarked(date, adminId) {
  // 1. All lecture (non-break) schedule rows for this date
  const { data: scheduleRows, error: schErr } = await supabase
    .from('daily_schedule')
    .select(`
      id, assigned_faculty_id, schedule_date,
      time_slot:time_slots!time_slot_id (slot_type)
    `)
    .eq('schedule_date', date)
    .eq('is_cancelled', false);

  if (schErr) throw schErr;

  const lectureRows = (scheduleRows ?? []).filter(r => r.time_slot?.slot_type === 'lecture');
  if (!lectureRows.length) return 0;

  // 2. Find which ones already have an execution row
  const { data: existing } = await supabase
    .from('lecture_execution')
    .select('daily_schedule_id')
    .in('daily_schedule_id', lectureRows.map(r => r.id));

  const existingIds = new Set((existing ?? []).map(e => e.daily_schedule_id));
  const unmarked    = lectureRows.filter(r => !existingIds.has(r.id));

  if (!unmarked.length) return 0;

  // 3. Bulk insert
  const { error: insertErr } = await supabase
    .from('lecture_execution')
    .insert(unmarked.map(r => ({
      daily_schedule_id: r.id,
      schedule_date:     date,
      actual_faculty_id: r.assigned_faculty_id,
      faculty_status:    'not_marked',
      marked_by:         adminId,
    })));

  if (insertErr) throw insertErr;
  return unmarked.length;
}

// ── getDailyExecutionSummary ──────────────────────────────────────────────────
/**
 * Counts for the status bar.
 */
export async function getDailyExecutionSummary(date) {
  const { data, error } = await supabase
    .from('lecture_execution')
    .select('faculty_status, is_modified, is_replaced, is_time_changed, is_room_changed')
    .eq('schedule_date', date);

  if (error) throw error;

  const rows = data ?? [];
  return {
    total:        rows.length,
    on_time:      rows.filter(r => r.faculty_status === 'on_time').length,
    late:         rows.filter(r => r.faculty_status === 'late').length,
    not_engaged:  rows.filter(r => r.faculty_status === 'not_engaged').length,
    not_marked:   rows.filter(r => r.faculty_status === 'not_marked').length,
    modified:     rows.filter(r => r.is_modified).length,
    replaced:     rows.filter(r => r.is_replaced).length,
    time_changed: rows.filter(r => r.is_time_changed).length,
    room_changed: rows.filter(r => r.is_room_changed).length,
  };
}

// ── getFullDayExecution ───────────────────────────────────────────────────────
/**
 * Loads all daily_schedule rows for a date with joined execution data.
 */
export async function getFullDayExecution(date) {
  const { data, error } = await supabase
    .from('daily_schedule')
    .select(`
      id, schedule_date, is_cancelled, cancel_reason, is_rescheduled,
      time_slot:time_slots!time_slot_id (id, start_time, end_time, slot_type, sort_order, slot_label),
      room:rooms!room_id (id, room_code),
      course:courses!course_id (id, course_code, year, program, division),
      subject:subjects!subject_id (id, subject_name),
      assigned_faculty:faculty!assigned_faculty_id (id, full_name),
      csf_id, course_id, time_slot_id,
      execution:lecture_execution!daily_schedule_id (
        id, faculty_status, is_time_changed, is_room_changed, is_replaced,
        is_modified, actual_start_time, actual_end_time,
        actual_room_id, replacement_faculty_id, modification_note, remarks,
        time_swap_partner_id, actual_faculty_id
      )
    `)
    .eq('schedule_date', date)
    .order('time_slot_id');

  if (error) throw error;

  // Sort by time slot sort_order
  const sorted = (data ?? []).sort((a, b) => (a.time_slot?.sort_order ?? 0) - (b.time_slot?.sort_order ?? 0));
  return sorted;
}

// ── getFacultyListForDate ─────────────────────────────────────────────────────
/**
 * Returns all active faculty (for dropdown in modal).
 */
export async function getActiveFacultyForExecution() {
  const { data, error } = await supabase
    .from('faculty')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name');
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
