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

