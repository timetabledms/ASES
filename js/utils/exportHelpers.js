/**
 * ASES — Export Helpers
 * ──────────────────────
 * exportToExcel(rows, columns, filename)
 * exportToPDF(rows, columns, title, filename)
 *
 * Requires: window.XLSX (SheetJS) and window.jspdf (jsPDF + autoTable)
 * loaded via CDN in each HTML page that uses exports.
 */

// ── exportToExcel ─────────────────────────────────────────────────────────────
/**
 * @param {object[]} rows      — flat data array
 * @param {{ header: string, key: string, width?: number }[]} columns
 * @param {string}   filename  — without .xlsx extension
 */
export function exportToExcel(rows, columns, filename) {
  if (!window.XLSX) {
    alert('Excel export library not loaded. Please check your CDN links.');
    return;
  }

  const headers = columns.map(c => c.header);
  const data = rows.map(row => columns.map(c => {
    const val = getNestedVal(row, c.key);
    return val ?? '';
  }));

  const wb  = window.XLSX.utils.book_new();
  const ws  = window.XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? Math.max(c.header.length + 2, 12) }));

  // Header row styling (bold) — basic xlsx styling
  const headerRange = window.XLSX.utils.decode_range(ws['!ref']);
  for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
    const addr = window.XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E8ECFF' } } };
  }

  window.XLSX.utils.book_append_sheet(wb, ws, 'Report');
  window.XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── exportToPDF ───────────────────────────────────────────────────────────────
/**
 * @param {object[]} rows
 * @param {{ header: string, key: string }[]} columns
 * @param {string}   title     — shown at top of PDF
 * @param {string}   filename  — without .pdf extension
 * @param {string}   subtitle  — optional second line under title
 */
export function exportToPDF(rows, columns, title, filename, subtitle = '') {
  if (!window.jspdf) {
    alert('PDF export library not loaded. Please check your CDN links.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Header ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 40, 80);
  doc.text('B.K. Birla College — ASES', 14, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 60);
  doc.text(title, 14, 21);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 110, 140);
    doc.text(subtitle, 14, 27);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150);
  const genText = `Generated: ${new Date().toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}`;
  doc.text(genText, doc.internal.pageSize.width - 14, 14, { align: 'right' });
  doc.text(`Total records: ${rows.length}`, doc.internal.pageSize.width - 14, 19, { align: 'right' });

  // ── Table ────────────────────────────────────────────────────────
  const startY = subtitle ? 32 : 27;
  const tableData = rows.map(row => columns.map(c => String(getNestedVal(row, c.key) ?? '—')));

  doc.autoTable({
    head:          [columns.map(c => c.header)],
    body:          tableData,
    startY,
    theme:         'grid',
    styles:        { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
    headStyles:    { fillColor: [79, 106, 245], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 246, 252] },
    columnStyles:  Object.fromEntries(columns.map((c, i) => [i, { cellWidth: c.pdfWidth ?? 'auto' }])),
    margin:        { left: 14, right: 14 },
    didDrawPage(data) {
      // Page number footer
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber}`,
        doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8,
        { align: 'center' }
      );
    },
  });

  doc.save(`${filename}.pdf`);
}

// ── Helper: nested key access ─────────────────────────────────────────────────
// Supports dot notation: 'daily_schedule.course.subject_name'
function getNestedVal(obj, key) {
  if (!obj || !key) return '';
  return key.split('.').reduce((acc, k) => (acc != null ? acc[k] : null), obj);
}
