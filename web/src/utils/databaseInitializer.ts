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

  // 3. Exam Series Table — Left clean, no fake assessments
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

const MOCK_BOOK_TITLES = new Set([
  'things fall apart',
  'the river and the source',
  'integrated science for cbc grade 7',
  'kidagaa kimemwozea',
  "a doll's house",
]);

const MOCK_HOSTEL_NAMES = new Set([
  'kilimanjaro house',
  'serengeti house',
  'ruwenzori house',
  'aberdare wing',
]);

const MOCK_ASSIGNMENT_SUBSTRINGS = [
  'plant cell model',
  'photosynthesis cycle',
  'practical financial budgeting',
  'kenyan folktales & narrative performance',
  'drainage & climate of eastern africa',
  'athari za teknolojia kwa vijana leo',
  'kitchen garden journal',
];

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
 * Checks if a book record is from the demonstration seed
 */
export function isSampleBook(book: { id?: string; title?: string }): boolean {
  if (book.id && (book.id.startsWith('bk-') || book.id === 'bk-1' || book.id === 'bk-2' || book.id === 'bk-3' || book.id === 'bk-4' || book.id === 'bk-5')) {
    return true;
  }
  const t = (book.title || '').trim().toLowerCase();
  return MOCK_BOOK_TITLES.has(t);
}

/**
 * Checks if a dormitory record is from the demonstration seed
 */
export function isSampleHostel(hostel: { id?: string; name?: string }): boolean {
  if (hostel.id && (hostel.id.startsWith('drm-') || hostel.id === 'drm-1' || hostel.id === 'drm-2' || hostel.id === 'drm-3' || hostel.id === 'drm-4')) {
    return true;
  }
  const n = (hostel.name || '').trim().toLowerCase();
  return MOCK_HOSTEL_NAMES.has(n);
}

/**
 * Checks if an assignment is from the demonstration seed
 */
export function isSampleAssignment(assignment: { id?: string; title?: string; teacherName?: string }): boolean {
  const t = (assignment.title || '').toLowerCase();
  const tn = (assignment.teacherName || '').toLowerCase();
  if (tn.includes('kevin mutua') || tn.includes('david kibet') || tn.includes('sharon chebet') || tn.includes('beatrice odhiambo')) {
    return true;
  }
  return MOCK_ASSIGNMENT_SUBSTRINGS.some((sub) => t.includes(sub));
}

/**
 * Purges all demonstration / mock data from a school's isolated Firestore database:
 * Deletes mock students (2026/0001 - 2026/0017, Emmanuel Kiprono, Zawadi Achieng, Faith Muthoni, etc.),
 * mock staff (Geoffrey Wanjala, David Kibet, etc.), mock invoices, mock attendance, mock notices,
 * mock library books (Things Fall Apart, etc.), mock hostels (Kilimanjaro House, etc.), and mock assignments.
 */
export async function purgeMockSchoolData(
  db: Firestore,
  orgId: string,
  schoolId: string
): Promise<{
  studentsPurged: number;
  staffPurged: number;
  invoicesPurged: number;
  booksPurged: number;
  hostelsPurged: number;
  assignmentsPurged: number;
  totalPurged: number;
}> {
  const schoolBase = `organizations/${orgId}/schools/${schoolId}`;
  let studentsPurged = 0;
  let staffPurged = 0;
  let invoicesPurged = 0;
  let booksPurged = 0;
  let hostelsPurged = 0;
  let assignmentsPurged = 0;

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
      if (isSampleAssignment(data)) {
        await deleteDoc(d.ref);
        assignmentsPurged++;
      }
    }
  } catch (err) {
    console.warn('Error purging mock assignments:', err);
  }

  // 7. Purge Mock Library Books & Loans
  try {
    const libSnap = await getDocs(collection(db, schoolBase, 'library_books'));
    for (const d of libSnap.docs) {
      const data = d.data();
      if (isSampleBook({ id: d.id, ...data })) {
        await deleteDoc(d.ref);
        booksPurged++;
      }
    }

    const loansSnap = await getDocs(collection(db, schoolBase, 'library_loans'));
    for (const d of loansSnap.docs) {
      const data = d.data();
      const adm = data.admissionNo || '';
      const name = (data.studentName || '').toLowerCase();
      if (MOCK_ADMISSION_NUMBERS.has(adm) || MOCK_STUDENT_NAMES.has(name) || (data.bookId && data.bookId.startsWith('bk-'))) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error purging mock library books and loans:', err);
  }

  // 8. Purge Mock Hostels & Allocations
  try {
    const hostelSnap = await getDocs(collection(db, schoolBase, 'hostels'));
    for (const d of hostelSnap.docs) {
      const data = d.data();
      if (isSampleHostel({ id: d.id, ...data })) {
        await deleteDoc(d.ref);
        hostelsPurged++;
      }
    }

    // Remove allocations attached to mock dorms or mock students
    for (const collName of ['hostel_allocations', 'allocations']) {
      try {
        const allocSnap = await getDocs(collection(db, schoolBase, collName));
        for (const d of allocSnap.docs) {
          const data = d.data();
          const adm = data.admissionNo || '';
          const name = (data.studentName || '').toLowerCase();
          if (
            (data.dormId && data.dormId.startsWith('drm-')) ||
            MOCK_ADMISSION_NUMBERS.has(adm) ||
            MOCK_STUDENT_NAMES.has(name)
          ) {
            await deleteDoc(d.ref);
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Error purging mock hostels:', err);
  }

  // 9. Purge Mock Quizzes & Learning Resources
  try {
    const quizSnap = await getDocs(collection(db, schoolBase, 'quizzes'));
    for (const d of quizSnap.docs) {
      if (d.id.startsWith('qz-') || d.id.includes('demo') || d.id.includes('sample')) {
        await deleteDoc(d.ref);
      }
    }
    const resSnap = await getDocs(collection(db, schoolBase, 'learning_resources'));
    for (const d of resSnap.docs) {
      if (d.id.startsWith('res-') || d.id.includes('demo') || d.id.includes('sample')) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error purging mock quizzes & resources:', err);
  }

  // 10. Purge Mock Timetable Slots
  try {
    const timeSnap = await getDocs(collection(db, schoolBase, 'timetables'));
    for (const d of timeSnap.docs) {
      const teacher = (d.data().teacherName || '').toLowerCase();
      if (MOCK_STAFF_NAMES.has(teacher)) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.warn('Error purging mock timetable slots:', err);
  }

  return {
    studentsPurged,
    staffPurged,
    invoicesPurged,
    booksPurged,
    hostelsPurged,
    assignmentsPurged,
    totalPurged: studentsPurged + staffPurged + invoicesPurged + booksPurged + hostelsPurged + assignmentsPurged,
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

/**
 * Wipes all library books and loans for this school
 */
export async function wipeAllSchoolBooks(
  db: Firestore,
  orgId: string,
  schoolId: string
): Promise<{ deletedCount: number }> {
  const schoolBase = `organizations/${orgId}/schools/${schoolId}`;
  let count = 0;
  const snap = await getDocs(collection(db, schoolBase, 'library_books'));
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
  }
  const loanSnap = await getDocs(collection(db, schoolBase, 'library_loans'));
  for (const d of loanSnap.docs) {
    await deleteDoc(d.ref);
  }
  return { deletedCount: count };
}

/**
 * Wipes all hostels and allocations for this school
 */
export async function wipeAllSchoolHostels(
  db: Firestore,
  orgId: string,
  schoolId: string
): Promise<{ deletedCount: number }> {
  const schoolBase = `organizations/${orgId}/schools/${schoolId}`;
  let count = 0;
  const snap = await getDocs(collection(db, schoolBase, 'hostels'));
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
  }
  const allocSnap = await getDocs(collection(db, schoolBase, 'allocations'));
  for (const d of allocSnap.docs) {
    await deleteDoc(d.ref);
  }
  return { deletedCount: count };
}

/**
 * Wipes all assignments for this school
 */
export async function wipeAllSchoolAssignments(
  db: Firestore,
  orgId: string,
  schoolId: string
): Promise<{ deletedCount: number }> {
  const schoolBase = `organizations/${orgId}/schools/${schoolId}`;
  let count = 0;
  const snap = await getDocs(collection(db, schoolBase, 'assignments'));
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
  }
  return { deletedCount: count };
}
