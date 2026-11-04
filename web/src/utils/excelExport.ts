// ============================================================
// EDUMO — Real Excel Export Engine (ExcelJS)
// Compliant with Master Spec Section 8:
// - Styled headers, frozen panes, autofilter, live formulas
// - Formula injection defense (=, +, -, @ neutralized)
// - Real .xlsx generation with proper metadata & print setup
// ============================================================

/**
 * Sanitize cell values against spreadsheet formula injection (CSV/Excel injection)
 * As required by Master Spec Section 5.12
 */
export function sanitizeCellValue(val: unknown): string | number | boolean | null {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`; // Prefix single quote to neutralize formula execution
  }
  return str;
}

/**
 * Trigger browser file download from a Blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface StudentExportItem {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className?: string;
  gender?: string;
  boardingStatus?: string;
  guardianPhone?: string;
  schoolEmail?: string;
  status: string;
}

/**
 * Export Learner Master List to a beautifully formatted .xlsx workbook
 */
export async function exportLearnerMasterList(
  schoolName: string,
  campusCode: string,
  students: StudentExportItem[]
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EDUMO School OS';
  workbook.lastModifiedBy = 'EDUMO System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Learner Master List', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      showGridLines: true,
    },
  });

  // Title Row
  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `${schoolName.toUpperCase()} — OFFICIAL LEARNER MASTER ROSTER`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D5F99' },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  // Metadata Subtitle Row
  sheet.mergeCells('A2:H2');
  const metaCell = sheet.getCell('A2');
  metaCell.value = `Campus Code: ${campusCode} | Generated: ${new Date().toLocaleDateString('en-GB')} | Total Records: ${students.length}`;
  metaCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  // Empty separator row 3
  sheet.getRow(3).height = 8;

  // Header Row (Row 4)
  const headers = [
    'No.',
    'Admission No.',
    'Full Name',
    'Class / Grade',
    'Gender',
    'Boarding Mode',
    'Guardian Phone',
    'Status',
  ];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  });

  // Data Rows
  students.forEach((s, idx) => {
    const row = sheet.addRow([
      idx + 1,
      sanitizeCellValue(s.admissionNumber),
      sanitizeCellValue(`${s.firstName} ${s.lastName}`.trim()),
      sanitizeCellValue(s.className || 'Unassigned'),
      sanitizeCellValue((s.gender || '—').toUpperCase()),
      sanitizeCellValue((s.boardingStatus || 'day').toUpperCase()),
      sanitizeCellValue(s.guardianPhone || '—'),
      sanitizeCellValue((s.status || 'active').toUpperCase()),
    ]);
    row.height = 20;

    // Zebra striping
    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      });
    }

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'center' };
  });

  // Enable Autofilter on Row 4
  sheet.autoFilter = `A4:H${4 + students.length}`;

  // Column Widths
  sheet.columns = [
    { width: 6 },
    { width: 18 },
    { width: 30 },
    { width: 18 },
    { width: 12 },
    { width: 16 },
    { width: 20 },
    { width: 14 },
  ];

  // Write to Buffer & Trigger Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const sanitizedSchool = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadBlob(blob, `${sanitizedSchool}_learners_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface AttendanceExportEntry {
  admissionNo: string;
  name: string;
  status: string;
}

/**
 * Export Attendance Register to .xlsx with live summary formulas
 */
export async function exportAttendanceRegister(
  schoolName: string,
  className: string,
  date: string,
  entries: AttendanceExportEntry[]
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EDUMO School OS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`${className} Attendance`, {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      showGridLines: true,
    },
  });

  // Title
  sheet.mergeCells('A1:D1');
  const title = sheet.getCell('A1');
  title.value = `${schoolName.toUpperCase()} — DAILY ATTENDANCE REGISTER`;
  title.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D5F99' },
  };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 26;

  // Metadata
  sheet.mergeCells('A2:D2');
  const meta = sheet.getCell('A2');
  meta.value = `Class: ${className} | Date: ${date} | Total Learners: ${entries.length}`;
  meta.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
  meta.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  meta.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  sheet.getRow(3).height = 6;

  // Headers
  const headerRow = sheet.getRow(4);
  headerRow.values = ['No.', 'Admission No.', 'Learner Name', 'Attendance Status'];
  headerRow.height = 22;
  headerRow.eachCell((c) => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF475569' },
    };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  entries.forEach((e, idx) => {
    const row = sheet.addRow([
      idx + 1,
      sanitizeCellValue(e.admissionNo),
      sanitizeCellValue(e.name),
      sanitizeCellValue(e.status.toUpperCase()),
    ]);
    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };

    // Highlight status
    const statusUpper = e.status.toUpperCase();
    if (statusUpper === 'PRESENT') {
      row.getCell(4).font = { color: { argb: 'FF15803D' }, bold: true };
    } else if (statusUpper === 'ABSENT') {
      row.getCell(4).font = { color: { argb: 'FFDC2626' }, bold: true };
    } else if (statusUpper === 'LATE') {
      row.getCell(4).font = { color: { argb: 'FFB45309' }, bold: true };
    }
  });

  // Summary Formulas at bottom
  const startRow = 5;
  const endRow = 4 + entries.length;
  const summaryStart = endRow + 2;

  sheet.getCell(`C${summaryStart}`).value = 'Total Present:';
  sheet.getCell(`C${summaryStart}`).font = { bold: true };
  sheet.getCell(`D${summaryStart}`).value = { formula: `COUNTIF(D${startRow}:D${endRow}, "PRESENT")` };
  sheet.getCell(`D${summaryStart}`).font = { bold: true, color: { argb: 'FF15803D' } };

  sheet.getCell(`C${summaryStart + 1}`).value = 'Total Absent:';
  sheet.getCell(`C${summaryStart + 1}`).font = { bold: true };
  sheet.getCell(`D${summaryStart + 1}`).value = { formula: `COUNTIF(D${startRow}:D${endRow}, "ABSENT")` };
  sheet.getCell(`D${summaryStart + 1}`).font = { bold: true, color: { argb: 'FFDC2626' } };

  sheet.columns = [{ width: 8 }, { width: 18 }, { width: 32 }, { width: 22 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `attendance_${className.replace(/\s+/g, '_')}_${date}.xlsx`);
}

export interface StaffExportItem {
  schoolId: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  status: string;
}

/**
 * Export Staff Directory to .xlsx
 */
export async function exportStaffDirectory(
  schoolName: string,
  staffList: StaffExportItem[]
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EDUMO School OS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Staff Directory', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  sheet.mergeCells('A1:F1');
  const title = sheet.getCell('A1');
  title.value = `${schoolName.toUpperCase()} — STAFF & FACULTY DIRECTORY`;
  title.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF683669' },
  };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 26;

  sheet.mergeCells('A2:F2');
  const meta = sheet.getCell('A2');
  meta.value = `Exported: ${new Date().toLocaleDateString('en-GB')} | Total Staff: ${staffList.length}`;
  meta.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
  meta.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  meta.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  sheet.getRow(4).values = ['No.', 'Staff ID', 'Full Name', 'Role', 'Email', 'Phone'];
  sheet.getRow(4).height = 22;
  sheet.getRow(4).eachCell((c) => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  staffList.forEach((st, idx) => {
    const row = sheet.addRow([
      idx + 1,
      sanitizeCellValue(st.schoolId),
      sanitizeCellValue(st.name),
      sanitizeCellValue(st.role.toUpperCase()),
      sanitizeCellValue(st.email || '—'),
      sanitizeCellValue(st.phone || '—'),
    ]);
    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
  });

  sheet.autoFilter = `A4:F${4 + staffList.length}`;
  sheet.columns = [
    { width: 6 },
    { width: 16 },
    { width: 28 },
    { width: 18 },
    { width: 26 },
    { width: 18 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `staff_directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
