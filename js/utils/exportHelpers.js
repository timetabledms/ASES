/**
 * ASES — Export Helpers
 * ──────────────────────
 * exportToExcel(rows, columns, filename)
 * exportToPDF(rows, columns, title, filename, subtitle)
 * preloadLogoForPDF()  — call once on pages that export PDF
 *
 * Requires: window.XLSX (SheetJS) and window.jspdf (jsPDF + autoTable)
 */

const COLLEGE_LOGO_URL  = 'https://i.ibb.co/9m1dn3hh/IMG-20260505-WA0001-1-jpg.jpg';
const COLLEGE_NAME      = 'B. K. Birla College, Kalyan';
const COLLEGE_SUB1      = '(Empowered Autonomous Status)';
const COLLEGE_SUB2      = 'Department of Management Studies';
const HEADER_H          = 48; // mm — table starts below this

// ── exportToExcel ─────────────────────────────────────────────────────────────
export function exportToExcel(rows, columns, filename) {
  if (!window.XLSX) { alert('Excel library not loaded.'); return; }
  const headers = columns.map(c => c.header);
  const data = rows.map(row => columns.map(c => getNestedVal(row, c.key) ?? ''));
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? Math.max(c.header.length + 2, 12) }));
  const range = window.XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = window.XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[addr]) ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: 'E8ECFF' } } };
  }
  window.XLSX.utils.book_append_sheet(wb, ws, 'Report');
  window.XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── exportToPDF ───────────────────────────────────────────────────────────────
export function exportToPDF(rows, columns, title, filename, subtitle = '') {
  if (!window.jspdf) { alert('PDF library not loaded.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.width;
  _drawHeader(doc, pageW, title, subtitle);
  const tableData = rows.map(row => columns.map(c => String(getNestedVal(row, c.key) ?? '—')));
  doc.autoTable({
    head:   [columns.map(c => c.header)],
    body:   tableData,
    startY: HEADER_H + 4,
    theme:  'grid',
    styles:              { fontSize: 7.5, cellPadding: 2, valign: 'middle' },
    headStyles:          { fillColor: [26, 34, 68], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles:  { fillColor: [245, 246, 252] },
    columnStyles: Object.fromEntries(columns.map((c, i) => [i, { cellWidth: c.pdfWidth ?? 'auto' }])),
    margin: { left: 14, right: 14 },
    didDrawPage(data) {
      if (data.pageNumber > 1) _drawHeader(doc, pageW, title, subtitle);
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text(`Page ${data.pageNumber}`, pageW / 2, doc.internal.pageSize.height - 5, { align: 'center' });
    },
  });
  doc.save(`${filename}.pdf`);
}

// ── _drawHeader ───────────────────────────────────────────────────────────────
function _drawHeader(doc, pageW, reportTitle, subtitle) {
  const cx = pageW / 2;

  // Top border
  doc.setDrawColor(26, 34, 68); doc.setLineWidth(0.6);
  doc.line(14, 8, pageW - 14, 8);

  // Logo
  if (window._ASES_LOGO_DATA) {
    try { doc.addImage(window._ASES_LOGO_DATA, 'PNG', 14, 10, 26, 26); } catch(e) {}
  }

  // College name
  doc.setFont('times', 'bold'); doc.setFontSize(16); doc.setTextColor(26, 34, 68);
  doc.text(COLLEGE_NAME, cx, 17, { align: 'center' });

  doc.setFont('times', 'normal'); doc.setFontSize(10); doc.setTextColor(50, 60, 90);
  doc.text(COLLEGE_SUB1, cx, 23, { align: 'center' });

  doc.setFont('times', 'bolditalic'); doc.setFontSize(10.5);
  doc.text(COLLEGE_SUB2, cx, 29, { align: 'center' });

  // Divider
  doc.setDrawColor(26, 34, 68); doc.setLineWidth(0.4);
  doc.line(14, 33, pageW - 14, 33);

  // Report title
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(26, 34, 68);
  doc.text(reportTitle, cx, 39, { align: 'center' });

  if (subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90, 100, 120);
    doc.text(subtitle, cx, 44.5, { align: 'center' });
  }

  // Generated date top-right
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}`,
    pageW - 14, 12, { align: 'right' }
  );

  // Bottom border
  doc.setDrawColor(26, 34, 68); doc.setLineWidth(0.6);
  doc.line(14, HEADER_H, pageW - 14, HEADER_H);
}

// ── preloadLogoForPDF ─────────────────────────────────────────────────────────
/**
 * Call once on any page that uses PDF export.
 * Fetches the logo and caches as base64 in window._ASES_LOGO_DATA.
 *
 *   import { preloadLogoForPDF } from '/js/utils/exportHelpers.js';
 *   preloadLogoForPDF();
 */
export function preloadLogoForPDF() {
  if (window._ASES_LOGO_DATA) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      window._ASES_LOGO_DATA = canvas.toDataURL('image/png');
    } catch(e) { console.warn('[ASES] Logo preload failed:', e.message); }
  };
  img.src = COLLEGE_LOGO_URL;
}

// ── getNestedVal ──────────────────────────────────────────────────────────────
function getNestedVal(obj, key) {
  if (!obj || !key) return '';
  return key.split('.').reduce((acc, k) => (acc != null ? acc[k] : null), obj);
}
