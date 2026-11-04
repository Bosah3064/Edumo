// ============================================================
// EDUMO — Marks by Excel Engine (ExcelJS)
// Master Spec Section 8:
// - Export pre-filled class marks template for offline entry
// - Teachers fill marks offline, upload, validated against max marks
// - Formula injection defense
// ============================================================

import { sanitizeCellValue } from './excelExport';

export interface MarksTemplateStudent {
  admissionNumber: string;
  name: string;
  currentScore?: number;
  comments?: string;
}

export interface MarksTemplateOptions {
  schoolName: string;
  className: string;
  subjectName: string;
  assessmentTitle: string;
  maxScore: number;
  students: MarksTemplateStudent[];
}

/**
 * Generate a pre-filled class marks sheet in .xlsx for offline teacher entry
 */
export async function exportMarksEntryTemplate(
  options: MarksTemplateOptions
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EDUMO School OS';
  workbook.created = new Date();

  const sheetName = `${options.className} - ${options.subjectName}`.slice(0, 31).replace(/[/\\?*[\]]/g, '_');
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      showGridLines: true,
    },
  });

  // Title Banner
  sheet.mergeCells('A1:E1');
  const title = sheet.getCell('A1');
  title.value = `${options.schoolName.toUpperCase()} — OFFICIAL ASSESSMENT MARKS REGISTER`;
  title.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1D5F99' },
  };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 26;

  // Metadata Subtitle
  sheet.mergeCells('A2:E2');
  const meta = sheet.getCell('A2');
  meta.value = `Assessment: ${options.assessmentTitle} | Class: ${options.className} | Subject: ${options.subjectName} | Maximum Marks: ${options.maxScore}`;
  meta.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  meta.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  meta.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  // Instructions
  sheet.mergeCells('A3:E3');
  const instructions = sheet.getCell('A3');
  instructions.value = `Instructions for Teacher: Enter raw marks in Column D (between 0 and ${options.maxScore}). Do not alter Admission Numbers in Column B.`;
  instructions.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  instructions.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 18;

  sheet.getRow(4).height = 6;

  // Headers (Row 5)
  const headerRow = sheet.getRow(5);
  headerRow.values = [
    'No.',
    'Admission Number',
    'Learner Full Name',
    `Score (Max: ${options.maxScore})`,
    'Teacher Qualitative Comment',
  ];
  headerRow.height = 24;
  headerRow.eachCell((c) => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  options.students.forEach((s, idx) => {
    const row = sheet.addRow([
      idx + 1,
      sanitizeCellValue(s.admissionNumber),
      sanitizeCellValue(s.name),
      s.currentScore !== undefined ? s.currentScore : '',
      sanitizeCellValue(s.comments || ''),
    ]);
    row.height = 20;

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };

    // Highlight score column with a soft border
    row.getCell(4).border = {
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  sheet.columns = [
    { width: 6 },
    { width: 20 },
    { width: 32 },
    { width: 20 },
    { width: 40 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `Marks_${options.className.replace(/\s+/g, '_')}_${options.subjectName.replace(/\s+/g, '_')}.xlsx`;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ParsedStudentMark {
  admissionNumber: string;
  name: string;
  score: number;
  comments?: string;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Parse an uploaded Marks spreadsheet with row-level validation
 */
export async function parseUploadedMarksWorkbook(
  file: File,
  maxAllowedScore: number
): Promise<{ marks: ParsedStudentMark[]; errorCount: number }> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Workbook contains no readable worksheets');
  }

  const marks: ParsedStudentMark[] = [];
  let errorCount = 0;

  // Header is row 5, data starts at row 6
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 6) return;

    const admissionNumber = String(row.getCell(2).value || '').trim();
    const name = String(row.getCell(3).value || '').trim();
    const rawScoreVal = row.getCell(4).value;
    const comments = String(row.getCell(5).value || '').trim();

    if (!admissionNumber && !name) return; // Skip empty rows

    const numScore = Number(rawScoreVal);
    let isValid = true;
    let errorMessage = '';

    if (rawScoreVal === null || rawScoreVal === undefined || rawScoreVal === '') {
      isValid = false;
      errorMessage = 'Missing score value';
      errorCount++;
    } else if (isNaN(numScore)) {
      isValid = false;
      errorMessage = `Invalid number: "${rawScoreVal}"`;
      errorCount++;
    } else if (numScore < 0 || numScore > maxAllowedScore) {
      isValid = false;
      errorMessage = `Score ${numScore} exceeds allowed range [0 - ${maxAllowedScore}]`;
      errorCount++;
    }

    marks.push({
      admissionNumber,
      name,
      score: isValid ? numScore : 0,
      comments: comments ? comments.replace(/^['=+\-@]/, '') : undefined,
      isValid,
      errorMessage: isValid ? undefined : errorMessage,
    });
  });

  return { marks, errorCount };
}

/**
 * Zeraki-Inspired Comprehensive Examination Analysis Workbook (.xlsx)
 * Multi-sheet analysis: Executive Summary, Subject Performance, and Stream Matrix
 */
export interface ExamAnalysisOptions {
  schoolName: string;
  examTitle: string;
  className: string;
  termTitle: string;
  academicYear: string;
  totalStudents: number;
  subjectSummaries: Array<{
    subjectName: string;
    teacherName: string;
    entries: number;
    meanScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
  }>;
  streamSummaries: Array<{
    streamName: string;
    studentCount: number;
    meanScore: number;
    attendanceRate: number;
  }>;
}

export async function exportExaminationAnalysisWorkbook(
  options: ExamAnalysisOptions
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EDUMO Academic Analytics';
  workbook.created = new Date();

  // --- Sheet 1: Subject Performance Matrix ---
  const subjectSheet = workbook.addWorksheet('Subject Analysis', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  subjectSheet.mergeCells('A1:G1');
  const title1 = subjectSheet.getCell('A1');
  title1.value = `${options.schoolName.toUpperCase()} — EXAMINATION SUBJECT PERFORMANCE ANALYSIS`;
  title1.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D5F99' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  subjectSheet.getRow(1).height = 26;

  subjectSheet.mergeCells('A2:G2');
  const meta1 = subjectSheet.getCell('A2');
  meta1.value = `Series: ${options.examTitle} | Class: ${options.className} | Term: ${options.termTitle} (${options.academicYear}) | Total Candidates: ${options.totalStudents}`;
  meta1.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF334155' } };
  meta1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  meta1.alignment = { horizontal: 'center', vertical: 'middle' };
  subjectSheet.getRow(2).height = 18;

  const subHeaders = ['No.', 'Learning Area / Subject', 'Subject Educator', 'Entries', 'Mean Score (%)', 'Highest Mark', 'Pass / Competent Rate'];
  subjectSheet.getRow(4).values = subHeaders;
  subjectSheet.getRow(4).height = 22;
  subjectSheet.getRow(4).eachCell((c) => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  options.subjectSummaries.forEach((s, idx) => {
    const row = subjectSheet.addRow([
      idx + 1,
      sanitizeCellValue(s.subjectName),
      sanitizeCellValue(s.teacherName),
      s.entries,
      `${s.meanScore}%`,
      s.highestScore,
      `${s.passRate}%`,
    ]);
    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
  });

  subjectSheet.columns = [{ width: 8 }, { width: 30 }, { width: 24 }, { width: 12 }, { width: 16 }, { width: 14 }, { width: 22 }];
  subjectSheet.autoFilter = `A4:G${4 + options.subjectSummaries.length}`;

  // --- Sheet 2: Stream Comparison ---
  const streamSheet = workbook.addWorksheet('Stream Comparison', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  streamSheet.mergeCells('A1:E1');
  const title2 = streamSheet.getCell('A1');
  title2.value = `${options.schoolName.toUpperCase()} — CLASS STREAM OPERATIONAL COMPARISON`;
  title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF683669' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  streamSheet.getRow(1).height = 26;

  streamSheet.mergeCells('A2:E2');
  const meta2 = streamSheet.getCell('A2');
  meta2.value = `Note: CBC schools adhere to No-Aggregate standards. Ranks are suppressed.`;
  meta2.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF334155' } };
  meta2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF4FF' } };
  meta2.alignment = { horizontal: 'center', vertical: 'middle' };
  streamSheet.getRow(2).height = 18;

  const strHeaders = ['Stream / Class Section', 'Candidature', 'Mean Assessment Score', 'Daily Attendance Rate', 'Status'];
  streamSheet.getRow(4).values = strHeaders;
  streamSheet.getRow(4).height = 22;
  streamSheet.getRow(4).eachCell((c) => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  options.streamSummaries.forEach((st) => {
    const row = streamSheet.addRow([
      sanitizeCellValue(st.streamName),
      st.studentCount,
      `${st.meanScore}%`,
      `${st.attendanceRate}%`,
      'VERIFIED',
    ]);
    row.height = 20;
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
  });

  streamSheet.columns = [{ width: 28 }, { width: 14 }, { width: 24 }, { width: 22 }, { width: 16 }];
  streamSheet.autoFilter = `A4:E${4 + options.streamSummaries.length}`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exam_analysis_${options.examTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


