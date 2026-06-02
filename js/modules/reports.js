/**
 * ASES — Reports Module
 * ──────────────────────
 * Unified data-fetching for all 9 report types.
 */

import { supabase } from '../config/supabase.js';

// ── getFilteredReport ─────────────────────────────────────────────────────────
/**
 * Master query for lecture execution reports.
 * Faculty role forces facultyId = myFacultyId (enforced client-side + RLS).
 *
 * @param {object} filters
 *   fromDate, toDate, facultyId, faculty_status,
 *   isModified, isReplaced, isTimeChanged, isRoomChanged,
 *   courseId, subjectId, roomId   ← client-side post-filter
 * @param {'admin'|'faculty'} role
 * @param {string|null} myFacultyId
 */
export async function getFilteredReport(filters = {}, role = 'admin', myFacultyId = null) {
  // Enforce faculty scoping
  if (role === 'faculty') {
    filters = { ...filters, facultyId: myFacultyId };
  }

  let q = supabase
    .from('lecture_execution')
    .select(`
      id,
      schedule_date,
      faculty_status,
      is_time_changed,
      is_room_changed,
      is_replaced,
      is_modified,
      actual_start_time,
      actual_end_time,
      modification_note,
      remarks,
      marked_at,
      actual_faculty:faculty!actual_faculty_id       (id, full_name, employee_code),
      replacement_faculty:faculty!replacement_faculty_id (id, full_name),
      actual_room:rooms!actual_room_id               (id, room_code),
      daily_schedule:daily_schedule!daily_schedule_id (
        id, schedule_date, is_cancelled, is_rescheduled,
        course:courses!course_id   (id, course_code, year, program, division),
        subject:subjects!subject_id (id, subject_name),
        room:rooms!room_id          (id, room_code),
        time_slot:time_slots!time_slot_id (id, start_time, end_time, slot_label, sort_order),
        assigned_faculty:faculty!assigned_faculty_id (id, full_name)
      )
    `);

  // ── Server-side filters ───────────────────────────────────────────
  if (filters.fromDate)        q = q.gte('schedule_date', filters.fromDate);
  if (filters.toDate)          q = q.lte('schedule_date', filters.toDate);
  if (filters.facultyId)       q = q.eq('actual_faculty_id', filters.facultyId);
  if (filters.faculty_status)  q = q.eq('faculty_status', filters.faculty_status);
  if (filters.isModified)      q = q.eq('is_modified', true);
  if (filters.isReplaced)      q = q.eq('is_replaced', true);
  if (filters.isTimeChanged)   q = q.eq('is_time_changed', true);
  if (filters.isRoomChanged)   q = q.eq('is_room_changed', true);

  q = q.order('schedule_date', { ascending: false });

  const { data, error } = await q;
  if (error) throw error;

  let rows = data ?? [];

  // ── Client-side filters ───────────────────────────────────────────
  if (filters.courseId)  rows = rows.filter(r => r.daily_schedule?.course?.id  === filters.courseId);
  if (filters.subjectId) rows = rows.filter(r => r.daily_schedule?.subject?.id === filters.subjectId);
  if (filters.roomId)    rows = rows.filter(r => r.daily_schedule?.room?.id    === filters.roomId);

  return rows;
}

// ── getFacultyLeaveSummary ────────────────────────────────────────────────────
/**
 * Leave records for one faculty (or all) with grouped counts.
 * @param {string|null} facultyId  null = all faculty
 */
export async function getFacultyLeaveSummary(facultyId = null, fromDate = null, toDate = null) {
  let q = supabase
    .from('faculty_leaves')
    .select(`
      id, leave_date, leave_type, reason, status,
      faculty:faculty!faculty_id         (id, full_name, employee_code),
      entered_by_admin:admin_users!entered_by (full_name)
    `)
    .order('leave_date', { ascending: false });

  if (facultyId) q = q.eq('faculty_id', facultyId);
  if (fromDate)  q = q.gte('leave_date', fromDate);
  if (toDate)    q = q.lte('leave_date', toDate);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];

  // Build count summary per faculty per leave_type
  const summaryMap = {};
  for (const r of rows) {
    const fid = r.faculty?.id;
    if (!fid) continue;
    if (!summaryMap[fid]) summaryMap[fid] = { faculty: r.faculty, counts: {}, total: 0 };
    summaryMap[fid].counts[r.leave_type] = (summaryMap[fid].counts[r.leave_type] ?? 0) + 1;
    summaryMap[fid].total++;
  }

  return { rows, summary: Object.values(summaryMap) };
}

// ── getDailyStats ─────────────────────────────────────────────────────────────
/**
 * Stats for a single date.
 */
export async function getDailyStats(date) {
  const [execRes, schedRes] = await Promise.all([
    supabase
      .from('lecture_execution')
      .select('faculty_status, is_modified, is_replaced, is_time_changed, is_room_changed')
      .eq('schedule_date', date),
    supabase
      .from('daily_schedule')
      .select('id, is_cancelled, time_slot:time_slots!time_slot_id(slot_type)')
      .eq('schedule_date', date),
  ]);

  if (execRes.error) throw execRes.error;

  const exec  = execRes.data  ?? [];
  const sched = schedRes.data ?? [];

  const lectureSched = sched.filter(r => r.time_slot?.slot_type === 'lecture');

  return {
    total:        lectureSched.length,
    cancelled:    lectureSched.filter(r => r.is_cancelled).length,
    marked:       exec.length,
    on_time:      exec.filter(r => r.faculty_status === 'on_time').length,
    late:         exec.filter(r => r.faculty_status === 'late').length,
    not_engaged:  exec.filter(r => r.faculty_status === 'not_engaged').length,
    not_marked:   exec.filter(r => r.faculty_status === 'not_marked').length,
    modified:     exec.filter(r => r.is_modified).length,
    replaced:     exec.filter(r => r.is_replaced).length,
    time_changed: exec.filter(r => r.is_time_changed).length,
    room_changed: exec.filter(r => r.is_room_changed).length,
  };
}

// ── getRescheduledSlots ───────────────────────────────────────────────────────
export async function getRescheduledSlots(fromDate, toDate) {
  let q = supabase
    .from('daily_schedule')
    .select(`
      id, schedule_date, is_rescheduled, cancel_reason,
      course:courses!course_id   (year, program, division),
      subject:subjects!subject_id (subject_name),
      room:rooms!room_id          (room_code),
      time_slot:time_slots!time_slot_id (start_time, end_time),
      assigned_faculty:faculty!assigned_faculty_id (full_name)
    `)
    .eq('is_rescheduled', true)
    .order('schedule_date', { ascending: false });

  if (fromDate) q = q.gte('schedule_date', fromDate);
  if (toDate)   q = q.lte('schedule_date', toDate);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── getDailyFullTable ─────────────────────────────────────────────────────────
export async function getDailyFullTable(date) {
  const { data, error } = await supabase
    .from('daily_schedule')
    .select(`
      id, is_cancelled, is_rescheduled,
      time_slot:time_slots!time_slot_id (start_time, end_time, slot_type, sort_order),
      room:rooms!room_id (room_code),
      course:courses!course_id (year, program, division),
      subject:subjects!subject_id (subject_name),
      assigned_faculty:faculty!assigned_faculty_id (full_name),
      execution:lecture_execution!daily_schedule_id (
        faculty_status, is_modified, is_replaced, is_time_changed, is_room_changed, remarks
      )
    `)
    .eq('schedule_date', date)
    .order('time_slot_id');

  if (error) throw error;
  return (data ?? [])
    .filter(r => r.time_slot?.slot_type === 'lecture')
    .sort((a,b) => (a.time_slot?.sort_order ?? 0) - (b.time_slot?.sort_order ?? 0));
}

// ── Dropdown helpers for report filters ───────────────────────────────────────
export async function getReportDropdowns() {
  const [facultyRes, courseRes, subjectRes, roomRes] = await Promise.all([
    supabase.from('faculty').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('courses').select('id, course_code, year, program, division').eq('is_active', true).order('year').order('program'),
    supabase.from('subjects').select('id, subject_name').eq('is_active', true).order('subject_name'),
    supabase.from('rooms').select('id, room_code').eq('is_active', true).order('room_code'),
  ]);

  return {
    faculty:  facultyRes.data  ?? [],
    courses:  courseRes.data   ?? [],
    subjects: subjectRes.data  ?? [],
    rooms:    roomRes.data     ?? [],
  };
}

// ── Formatters ────────────────────────────────────────────────────────────────
export function courseLbl(c) {
  if (!c) return '—';
  return c.division ? `${c.year} ${c.program} ${c.division}` : `${c.year} ${c.program}`;
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

export function fmtTime(t) {
  return t ? t.slice(0,5) : '—';
}

export const STATUS_LABELS = {
  on_time: 'On Time', late: 'Late',
  not_engaged: 'Not Engaged', not_marked: 'Not Marked',
};

export const LEAVE_TYPE_LABELS = {
  casual:'Casual', medical:'Medical', earned:'Earned', duty:'Duty',
  half_day_morning:'Half Day (AM)', half_day_afternoon:'Half Day (PM)',
  compensatory:'Compensatory', other:'Other',
};
