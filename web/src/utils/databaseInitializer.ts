// ============================================================
// EDUMO — School Database & Multi-Tenant Schema Initializer
// Guarantees clean structural schema without inserting mock or hardcoded student/user data
// ============================================================

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

/**
 * Initializes only structural curriculum schema (Classes and Subjects definitions)
 * if completely missing. NEVER inserts fake/mock learners, staff, attendance, or finance.
 */
export async function initializeSchoolTables(
  db: Firestore,
  orgId: string,
  schoolId: string,
  schoolName: string = 'Campus',
  curriculumType: string = 'CBC',
  country: string = 'KE'
): Promise<{ success: boolean; tablesCreated: string[] }> {
  const created: string[] = [];
  const schoolBase = `organizations/${orgId}/schools/${schoolId}`;

  // 1. Classes Schema
  const classesRef = collection(db, schoolBase, 'classes');
  const classesSnap = await getDocs(classesRef);
  if (classesSnap.empty) {
    const defaultClasses = [
      { id: 'pp1', name: 'PP1', level: 'Pre-Primary', capacity: 30, streams: ['East', 'West'] },
      { id: 'pp2', name: 'PP2', level: 'Pre-Primary', capacity: 30, streams: ['East', 'West'] },
      { id: 'grade-1', name: 'Grade 1', level: 'Lower Primary', capacity: 35, streams: ['East', 'West'] },
      { id: 'grade-2', name: 'Grade 2', level: 'Lower Primary', capacity: 35, streams: ['East', 'West'] },
      { id: 'grade-3', name: 'Grade 3', level: 'Lower Primary', capacity: 35, streams: ['East', 'West'] },
      { id: 'grade-4', name: 'Grade 4', level: 'Upper Primary', capacity: 40, streams: ['East', 'West'] },
      { id: 'grade-5', name: 'Grade 5', level: 'Upper Primary', capacity: 40, streams: ['East', 'West'] },
      { id: 'grade-6', name: 'Grade 6', level: 'Upper Primary', capacity: 40, streams: ['East', 'West'] },
      { id: 'grade-7', name: 'Grade 7', level: 'Junior Secondary', capacity: 45, streams: ['East', 'West'] },
      { id: 'grade-8', name: 'Grade 8', level: 'Junior Secondary', capacity: 45, streams: ['East', 'West'] },
    ];
    for (const c of defaultClasses) {
      await setDoc(doc(db, schoolBase, 'classes', c.id), {
        ...c,
        classTeacher: 'Unassigned',
        enrolled: 0,
        createdAt: serverTimestamp(),
      });
    }
    created.push('classes');
  }

  // 2. Subjects / Curriculum Units Schema (Structured for Pre-Primary, Lower Primary, Upper Primary & Junior Sec)
  const subjectsRef = collection(db, schoolBase, 'subjects');
  const subjectsSnap = await getDocs(subjectsRef);
  if (subjectsSnap.empty) {
    const defaultUnits = [
      // Pre-Primary (PP1, PP2)
      { id: 'math-pp', code: 'MATH-PP', name: 'Mathematical Activities', isMandatory: true, department: 'Pre-Primary Core', weeklyPeriods: 5, applicableClasses: ['PP1', 'PP2'] },
      { id: 'lang-pp', code: 'LANG-PP', name: 'Language Activities', isMandatory: true, department: 'Pre-Primary Core', weeklyPeriods: 5, applicableClasses: ['PP1', 'PP2'] },
      { id: 'env-pp', code: 'ENV-PP', name: 'Environmental Activities', isMandatory: true, department: 'Pre-Primary Core', weeklyPeriods: 4, applicableClasses: ['PP1', 'PP2'] },
      { id: 'psy-pp', code: 'PSY-PP', name: 'Psychomotor & Creative Activities', isMandatory: true, department: 'Pre-Primary Core', weeklyPeriods: 5, applicableClasses: ['PP1', 'PP2'] },
      { id: 'rel-pp', code: 'REL-PP', name: 'Religious Education Activities', isMandatory: false, department: 'Pre-Primary Elective', weeklyPeriods: 2, applicableClasses: ['PP1', 'PP2'] },

      // Lower Primary (Grade 1 - 3)
      { id: 'math-lp', code: 'MATH-LP', name: 'Mathematical Activities', isMandatory: true, department: 'Lower Primary Core', weeklyPeriods: 5, applicableClasses: ['Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'eng-lp', code: 'ENG-LP', name: 'English Language Activities', isMandatory: true, department: 'Lower Primary Core', weeklyPeriods: 5, applicableClasses: ['Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'kisw-lp', code: 'KISW-LP', name: 'Kiswahili Language Activities', isMandatory: true, department: 'Lower Primary Core', weeklyPeriods: 4, applicableClasses: ['Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'env-lp', code: 'ENV-LP', name: 'Environmental Activities', isMandatory: true, department: 'Lower Primary Core', weeklyPeriods: 4, applicableClasses: ['Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'hyg-lp', code: 'HYG-LP', name: 'Hygiene & Nutrition Activities', isMandatory: true, department: 'Lower Primary Core', weeklyPeriods: 3, applicableClasses: ['Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'creat-lp', code: 'CREAT-LP', name: 'Movement & Creative Activities', isMandatory: true, department: 'Lower Primary Core', weeklyPeriods: 4, applicableClasses: ['Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'cre-lp', code: 'CRE-LP', name: 'Christian Religious Education', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2, applicableClasses: ['Grade 1', 'Grade 2', 'Grade 3'] },
      { id: 'indig-lp', code: 'INDIG-LP', name: 'Indigenous Language Activities', isMandatory: false, department: 'Languages Elective', weeklyPeriods: 2, applicableClasses: ['Grade 1', 'Grade 2', 'Grade 3'] },

      // Upper Primary (Grade 4 - 6)
      { id: 'math-up', code: 'MATH-UP', name: 'Mathematics', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 5, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'eng-up', code: 'ENG-UP', name: 'English Language', isMandatory: true, department: 'Languages', weeklyPeriods: 5, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'kisw-up', code: 'KISW-UP', name: 'Kiswahili', isMandatory: true, department: 'Languages', weeklyPeriods: 4, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'sci-up', code: 'SCI-UP', name: 'Science & Technology', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'agri-up', code: 'AGRI-UP', name: 'Agriculture & Nutrition', isMandatory: true, department: 'Applied Sciences', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'sst-up', code: 'SST-UP', name: 'Social Studies', isMandatory: true, department: 'Humanities', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'arts-up', code: 'ARTS-UP', name: 'Creative Arts (Art, Craft & Music)', isMandatory: true, department: 'Creative Arts', weeklyPeriods: 3, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'phe-up', code: 'PHE-UP', name: 'Physical & Health Education', isMandatory: true, department: 'Physical Education', weeklyPeriods: 2, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'cre-up', code: 'CRE-UP', name: 'Christian Religious Education', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },
      { id: 'french-up', code: 'FREN-UP', name: 'French Language', isMandatory: false, department: 'Foreign Languages', weeklyPeriods: 2, applicableClasses: ['Grade 4', 'Grade 5', 'Grade 6'] },

      // Junior Secondary (Grade 7 - 9)
      { id: 'math-jss', code: 'MATH-JSS', name: 'Mathematics', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 5, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'eng-jss', code: 'ENG-JSS', name: 'English', isMandatory: true, department: 'Languages', weeklyPeriods: 5, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'kisw-jss', code: 'KISW-JSS', name: 'Kiswahili', isMandatory: true, department: 'Languages', weeklyPeriods: 4, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sci-jss', code: 'SCI-JSS', name: 'Integrated Science', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'hlth-jss', code: 'HLTH-JSS', name: 'Health Education', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 2, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'tech-jss', code: 'TECH-JSS', name: 'Pre-Technical Studies', isMandatory: true, department: 'Technical & Applied', weeklyPeriods: 4, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'sst-jss', code: 'SST-JSS', name: 'Social Studies', isMandatory: true, department: 'Humanities', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'agri-jss', code: 'AGRI-JSS', name: 'Agriculture & Nutrition', isMandatory: true, department: 'Applied Sciences', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'bus-jss', code: 'BUS-JSS', name: 'Business Studies', isMandatory: true, department: 'Commercial Studies', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'arts-jss', code: 'ARTS-JSS', name: 'Creative Arts & Sports', isMandatory: true, department: 'Creative Arts', weeklyPeriods: 3, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'comp-jss', code: 'COMP-JSS', name: 'Computer Science / ICT', isMandatory: false, department: 'ICT & Computing', weeklyPeriods: 2, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
      { id: 'cre-jss', code: 'CRE-JSS', name: 'Religious Studies (CRE / IRE)', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2, applicableClasses: ['Grade 7', 'Grade 8', 'Grade 9'] },
    ];
    for (const u of defaultUnits) {
      await setDoc(doc(db, schoolBase, 'subjects', u.id), {
        ...u,
        type: u.isMandatory ? 'core' : 'elective',
        teacherName: 'Assigned Instructor',
        createdAt: serverTimestamp(),
      });
    }
    created.push('subjects');
  }

  // 3. Exam Series Table (structural initial series)
  const examSeriesRef = collection(db, schoolBase, 'examSeries');
  const examSeriesSnap = await getDocs(examSeriesRef);
  if (examSeriesSnap.empty) {
    const defaultExams = [
      {
        id: 'series-opener-2026',
        name: '2026 Term 1 Opener Assessment',
        academicYearId: '2026',
        termId: 'term1',
        weightPercentage: 20,
        status: 'published',
        createdAt: serverTimestamp(),
      },
      {
        id: 'series-midterm-2026',
        name: '2026 Term 1 Mid-Term Examination',
        academicYearId: '2026',
        termId: 'term1',
        weightPercentage: 30,
        status: 'published',
        createdAt: serverTimestamp(),
      },
      {
        id: 'series-endyear-2026',
        name: '2026 End-of-Year Summative Examination & Promotion Exam',
        academicYearId: '2026',
        termId: 'term3',
        weightPercentage: 50,
        status: 'draft',
        isPromotionExam: true,
        createdAt: serverTimestamp(),
      },
    ];
    for (const ex of defaultExams) {
      await setDoc(doc(db, schoolBase, 'examSeries', ex.id), ex);
      await setDoc(doc(db, schoolBase, 'exams', ex.id), ex);
    }
    created.push('examSeries');
  }

  return { success: true, tablesCreated: created };
}

// Known mock admission numbers
const MOCK_ADMISSION_NUMBERS = new Set([
  '2026/0001', '2026/0002', '2026/0003', '2026/0004', '2026/0005',
  '2026/0006', '2026/0007', '2026/0008', '2026/0009', '2026/0010',
  '2026/0011', '2026/0012', '2026/0013', '2026/0014', '2026/0015',
  '2026/0016', '2026/0017',
]);

// Known mock student full names
const MOCK_STUDENT_NAMES = new Set([
  'emmanuel kiprono', 'zawadi achieng', 'faith muthoni', 'brian ochieng',
  'stacy wanjiku', 'kevin mutua', 'cynthia moraa', 'victor barasa',
  'ian mwangi', 'sharon chebet', 'dennis kimani', 'mercy atieno',
  'collins koech', 'precious makena', 'ryan otieno', 'blessing cherop',
  'liam njoroge',
]);

// Known mock staff emails & names
const MOCK_STAFF_EMAILS = new Set([
  'principal@school.ac.ke', 'deputy@school.ac.ke', 'd.kibet@school.ac.ke',
  's.chebet@school.ac.ke', 'k.mutua@school.ac.ke', 'accounts@school.ac.ke',
]);

const MOCK_STAFF_NAMES = new Set([
  'geoffrey wanjala', 'beatrice odhiambo', 'david kibet',
  'sharon chebet', 'kevin mutua', 'mary chelangat',
]);

const MOCK_INVOICE_NUMBERS = new Set([
  'inv-2026-001', 'inv-2026-002', 'inv-2026-003',
]);

/**
 * Checks if sample/mock learners are present in a list of students
 */
export function isSampleLearner(learner: { admissionNumber?: string; firstName?: string; lastName?: string }): boolean {
  if (learner.admissionNumber && MOCK_ADMISSION_NUMBERS.has(learner.admissionNumber)) {
    return true;
  }
  const fullName = `${learner.firstName || ''} ${learner.lastName || ''}`.trim().toLowerCase();
  if (MOCK_STUDENT_NAMES.has(fullName)) {
    return true;
  }
  return false;
}

/**
 * Purges all demonstration / mock data from a school's isolated Firestore database:
 * Deletes mock students (2026/0001 - 2026/0017, Emmanuel Kiprono, Zawadi Achieng, Faith Muthoni, etc.),
 * mock staff (Geoffrey Wanjala, David Kibet, etc.), mock invoices, mock attendance, and mock notices.
 */
export async function purgeMockSchoolData(
  db: Firestore,
  orgId: string,
  schoolId: string
): Promise<{ studentsPurged: number; staffPurged: number; invoicesPurged: number; totalPurged: number }> {
  const schoolBase = `organizations/${orgId}/schools/${schoolId}`;
  let studentsPurged = 0;
  let staffPurged = 0;
  let invoicesPurged = 0;

  // 1. Purge Mock Students
  try {
    const studentsSnap = await getDocs(collection(db, schoolBase, 'students'));
    for (const d of studentsSnap.docs) {
      const data = d.data();
      if (isSampleLearner(data)) {
        await deleteDoc(d.ref);
        studentsPurged++;
      }
    }
  } catch (err) {
    console.warn('Error purging mock students:', err);
  }

  // 2. Purge Mock Staff
  try {
    const staffSnap = await getDocs(collection(db, schoolBase, 'staff'));
    for (const d of staffSnap.docs) {
      const data = d.data();
      const email = (data.email || '').toLowerCase();
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim().toLowerCase();
      if (MOCK_STAFF_EMAILS.has(email) || MOCK_STAFF_NAMES.has(fullName)) {
        await deleteDoc(d.ref);
        staffPurged++;
      }
    }
  } catch (err) {
    console.warn('Error purging mock staff:', err);
  }

  // 3. Purge Mock Invoices
  try {
    const invoicesSnap = await getDocs(collection(db, schoolBase, 'invoices'));
    for (const d of invoicesSnap.docs) {
      const data = d.data();
      const invNum = (data.invoiceNumber || '').toLowerCase();
      const adm = (data.admissionNumber || '').toUpperCase();
      if (MOCK_INVOICE_NUMBERS.has(invNum) || adm.startsWith('SCH-')) {
        await deleteDoc(d.ref);
        invoicesPurged++;
      }
    }
  } catch (err) {
    console.warn('Error purging mock invoices:', err);
  }

  // 4. Purge Mock Attendance
  try {
    const attSnap = await getDocs(collection(db, schoolBase, 'attendance'));
    for (const d of attSnap.docs) {
      const data = d.data();
      const markedBy = (data.markedBy || '').toLowerCase();
      if (markedBy.includes('kibet') || markedBy.includes('chebet') || markedBy.includes('mutua')) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error purging mock attendance:', err);
  }

  // 5. Purge Mock Announcements
  try {
    const annSnap = await getDocs(collection(db, schoolBase, 'announcements'));
    for (const d of annSnap.docs) {
      const data = d.data();
      const title = (data.title || '').toLowerCase();
      if (
        title.includes('term 1 mid-term assessments timetable released') ||
        title.includes('upcoming parents-teachers consultative') ||
        title.includes('inter-school athletics championship')
      ) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error purging mock announcements:', err);
  }

  // 6. Purge Mock Assignments
  try {
    const assignSnap = await getDocs(collection(db, schoolBase, 'assignments'));
    for (const d of assignSnap.docs) {
      const data = d.data();
      const teacher = (data.teacherName || '').toLowerCase();
      if (teacher.includes('kevin mutua') || teacher.includes('david kibet') || teacher.includes('sharon chebet') || teacher.includes('beatrice odhiambo')) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error purging mock assignments:', err);
  }

  // 7. Purge Mock Library Books
  try {
    const libSnap = await getDocs(collection(db, schoolBase, 'library_books'));
    for (const d of libSnap.docs) {
      if (d.id.startsWith('bk-')) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error purging mock library books:', err);
  }

  // 8. Purge Mock Hostels
  try {
    const hostelSnap = await getDocs(collection(db, schoolBase, 'hostels'));
    for (const d of hostelSnap.docs) {
      if (d.id.startsWith('drm-')) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error purging mock hostels:', err);
  }

  return {
    studentsPurged,
    staffPurged,
    invoicesPurged,
    totalPurged: studentsPurged + staffPurged + invoicesPurged,
  };
}

/**
 * Wipes all learners from the current school's students collection,
 * giving an absolute clean slate for real school data enrollment.
 */
export async function wipeAllSchoolStudents(
  db: Firestore,
  orgId: string,
  schoolId: string
): Promise<{ deletedCount: number }> {
  const schoolBase = `organizations/${orgId}/schools/${schoolId}`;
  let count = 0;
  const snap = await getDocs(collection(db, schoolBase, 'students'));
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
  }
  return { deletedCount: count };
}
