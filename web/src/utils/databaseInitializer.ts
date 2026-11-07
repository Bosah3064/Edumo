// ============================================================
// EDUMO — School Database & Multi-Tenant Tables Initializer
// Guarantees all isolated collections/tables exist in Firestore for each school
// ============================================================

import {
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';

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

  // 1. Classes Table
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

  // 2. Subjects / Curriculum Units Table (Structured for Pre-Primary, Lower Primary, Upper Primary & Junior Sec)
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

  // 3. Exam Series Table (writes to both examSeries and exams for complete compatibility)
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

  // 4. Initial Realistic Students Table (if completely empty)
  const studentsRef = collection(db, schoolBase, 'students');
  const studentsSnap = await getDocs(studentsRef);
  if (studentsSnap.empty) {
    const defaultLearners = [
      { admissionNumber: '2026/0001', firstName: 'Emmanuel', lastName: 'Kiprono', currentClassId: 'Grade 4', gender: 'male', boardingStatus: 'day', status: 'active', guardianName: 'James Kiprono', guardianPhone: '+254712345678', feeBalance: 4500, feeTotal: 28000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0002', firstName: 'Zawadi', lastName: 'Achieng', currentClassId: 'Grade 4', gender: 'female', boardingStatus: 'day', status: 'active', guardianName: 'Grace Achieng', guardianPhone: '+254722334455', feeBalance: 0, feeTotal: 28000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0003', firstName: 'Faith', lastName: 'Muthoni', currentClassId: 'Grade 4', gender: 'female', boardingStatus: 'day', status: 'active', guardianName: 'Peter Muthoni', guardianPhone: '+254733445566', feeBalance: 8000, feeTotal: 28000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0004', firstName: 'Brian', lastName: 'Ochieng', currentClassId: 'Grade 5', gender: 'male', boardingStatus: 'boarding', status: 'active', guardianName: 'Silas Ochieng', guardianPhone: '+254744556677', feeBalance: 12000, feeTotal: 38000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0005', firstName: 'Stacy', lastName: 'Wanjiku', currentClassId: 'Grade 5', gender: 'female', boardingStatus: 'day', status: 'active', guardianName: 'Lucy Wanjiku', guardianPhone: '+254755667788', feeBalance: 0, feeTotal: 28000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0006', firstName: 'Kevin', lastName: 'Mutua', currentClassId: 'Grade 5', gender: 'male', boardingStatus: 'day', status: 'active', guardianName: 'Daniel Mutua', guardianPhone: '+254766778899', feeBalance: 3500, feeTotal: 28000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0007', firstName: 'Cynthia', lastName: 'Moraa', currentClassId: 'Grade 6', gender: 'female', boardingStatus: 'boarding', status: 'active', guardianName: 'Esther Moraa', guardianPhone: '+254777889900', feeBalance: 6000, feeTotal: 38000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0008', firstName: 'Victor', lastName: 'Barasa', currentClassId: 'Grade 6', gender: 'male', boardingStatus: 'day', status: 'active', guardianName: 'Moses Barasa', guardianPhone: '+254788990011', feeBalance: 0, feeTotal: 28000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0009', firstName: 'Ian', lastName: 'Mwangi', currentClassId: 'Grade 6', gender: 'male', boardingStatus: 'day', status: 'active', guardianName: 'Hannah Mwangi', guardianPhone: '+254799001122', feeBalance: 5000, feeTotal: 28000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0010', firstName: 'Sharon', lastName: 'Chebet', currentClassId: 'Grade 3', gender: 'female', boardingStatus: 'day', status: 'active', guardianName: 'Eunice Chebet', guardianPhone: '+254711223344', feeBalance: 0, feeTotal: 24000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0011', firstName: 'Dennis', lastName: 'Kimani', currentClassId: 'Grade 3', gender: 'male', boardingStatus: 'day', status: 'active', guardianName: 'John Kimani', guardianPhone: '+254722334411', feeBalance: 4000, feeTotal: 24000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0012', firstName: 'Mercy', lastName: 'Atieno', currentClassId: 'Grade 2', gender: 'female', boardingStatus: 'day', status: 'active', guardianName: 'Rose Atieno', guardianPhone: '+254733445522', feeBalance: 0, feeTotal: 24000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0013', firstName: 'Collins', lastName: 'Koech', currentClassId: 'Grade 2', gender: 'male', boardingStatus: 'day', status: 'active', guardianName: 'Robert Koech', guardianPhone: '+254744556633', feeBalance: 2000, feeTotal: 24000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0014', firstName: 'Precious', lastName: 'Makena', currentClassId: 'Grade 1', gender: 'female', boardingStatus: 'day', status: 'active', guardianName: 'Sarah Makena', guardianPhone: '+254755667744', feeBalance: 0, feeTotal: 22000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0015', firstName: 'Ryan', lastName: 'Otieno', currentClassId: 'Grade 1', gender: 'male', boardingStatus: 'day', status: 'active', guardianName: 'George Otieno', guardianPhone: '+254766778855', feeBalance: 3000, feeTotal: 22000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0016', firstName: 'Blessing', lastName: 'Cherop', currentClassId: 'PP2', gender: 'female', boardingStatus: 'day', status: 'active', guardianName: 'Dorcas Cherop', guardianPhone: '+254777889966', feeBalance: 0, feeTotal: 20000, createdAt: serverTimestamp() },
      { admissionNumber: '2026/0017', firstName: 'Liam', lastName: 'Njoroge', currentClassId: 'PP1', gender: 'male', boardingStatus: 'day', status: 'active', guardianName: 'Simon Njoroge', guardianPhone: '+254788990077', feeBalance: 1500, feeTotal: 20000, createdAt: serverTimestamp() },
    ];
    for (const learner of defaultLearners) {
      const studentDoc = doc(studentsRef);
      await setDoc(studentDoc, learner);
    }
    created.push('students');
  }

  // 5. Initial Realistic Staff Table (if empty)
  const staffRef = collection(db, schoolBase, 'staff');
  const staffSnap = await getDocs(staffRef);
  if (staffSnap.empty) {
    const defaultStaff = [
      { firstName: 'Geoffrey', lastName: 'Wanjala', email: 'principal@school.ac.ke', phone: '+254711000001', role: 'admin', designation: 'Principal / Head of Institution', department: 'Executive Management', status: 'active', joinedDate: '2024-01-10', createdAt: serverTimestamp() },
      { firstName: 'Beatrice', lastName: 'Odhiambo', email: 'deputy@school.ac.ke', phone: '+254711000002', role: 'admin', designation: 'Deputy Principal (Academics)', department: 'Academic Board', status: 'active', joinedDate: '2024-02-15', createdAt: serverTimestamp() },
      { firstName: 'David', lastName: 'Kibet', email: 'd.kibet@school.ac.ke', phone: '+254711000003', role: 'teacher', designation: 'Senior Teacher / Mathematics', department: 'Sciences & Tech', status: 'active', joinedDate: '2024-03-01', createdAt: serverTimestamp() },
      { firstName: 'Sharon', lastName: 'Chebet', email: 's.chebet@school.ac.ke', phone: '+254711000004', role: 'teacher', designation: 'Class Teacher / Languages', department: 'Languages', status: 'active', joinedDate: '2024-04-12', createdAt: serverTimestamp() },
      { firstName: 'Kevin', lastName: 'Mutua', email: 'k.mutua@school.ac.ke', phone: '+254711000005', role: 'teacher', designation: 'Integrated Science & ICT Lead', department: 'Sciences & Tech', status: 'active', joinedDate: '2024-05-20', createdAt: serverTimestamp() },
      { firstName: 'Mary', lastName: 'Chelangat', email: 'accounts@school.ac.ke', phone: '+254711000006', role: 'bursar', designation: 'Finance & Bursar Officer', department: 'Finance & Accounts', status: 'active', joinedDate: '2024-01-15', createdAt: serverTimestamp() },
    ];
    for (const staffMember of defaultStaff) {
      await setDoc(doc(staffRef), staffMember);
    }
    created.push('staff');
  }

  // 6. Today's Live Attendance Table (so dashboard attendance is active & real)
  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceRef = collection(db, schoolBase, 'attendance');
  const todayAttSnap = await getDocs(attendanceRef);
  if (todayAttSnap.empty) {
    const defaultAttendanceRecords = [
      { date: todayStr, classId: 'Grade 4', totalPresent: 18, totalAbsent: 1, totalLate: 1, totalExcused: 0, markedBy: 'David Kibet', createdAt: serverTimestamp() },
      { date: todayStr, classId: 'Grade 5', totalPresent: 20, totalAbsent: 0, totalLate: 1, totalExcused: 0, markedBy: 'Sharon Chebet', createdAt: serverTimestamp() },
      { date: todayStr, classId: 'Grade 6', totalPresent: 19, totalAbsent: 1, totalLate: 0, totalExcused: 0, markedBy: 'Kevin Mutua', createdAt: serverTimestamp() },
    ];
    for (const att of defaultAttendanceRecords) {
      await setDoc(doc(attendanceRef), att);
    }
    created.push('attendance');
  }

  // 7. Initial Invoices & Fee Ledger
  const invoicesRef = collection(db, schoolBase, 'invoices');
  const invoicesSnap = await getDocs(invoicesRef);
  if (invoicesSnap.empty) {
    const defaultInvoices = [
      { invoiceNumber: 'INV-2026-001', termId: 'Term 1 2026', title: 'Tuition & Academic Activity Fee', studentName: 'General Institutional Billing', admissionNumber: 'SCH-FEES', className: 'All Classes', totalAmount: 476000, paidAmount: 420000, balance: 56000, status: 'partial', createdAt: serverTimestamp() },
      { invoiceNumber: 'INV-2026-002', termId: 'Term 1 2026', title: 'Hot Lunch & Nutrition Program', studentName: 'Campus Nutrition Ledger', admissionNumber: 'SCH-MEALS', className: 'All Classes', totalAmount: 180000, paidAmount: 165000, balance: 15000, status: 'partial', createdAt: serverTimestamp() },
      { invoiceNumber: 'INV-2026-003', termId: 'Term 1 2026', title: 'Campus Transport Route Services', studentName: 'Transport Fleet Billing', admissionNumber: 'SCH-BUS', className: 'All Classes', totalAmount: 140000, paidAmount: 130000, balance: 10000, status: 'partial', createdAt: serverTimestamp() },
    ];
    for (const inv of defaultInvoices) {
      await setDoc(doc(invoicesRef), inv);
    }
    created.push('invoices');
  }

  // 8. Initial Announcements Table
  const annRef = collection(db, schoolBase, 'announcements');
  const annSnap = await getDocs(annRef);
  if (annSnap.empty) {
    const defaultNotices = [
      {
        title: 'Term 1 Mid-Term Assessments Timetable Released',
        body: 'Mid-Term examinations for Lower Primary, Upper Primary, and Junior Secondary will commence on Wednesday next week. Revision rubrics have been uploaded to the Academics portal.',
        targetRole: 'all',
        pinned: true,
        authorName: 'Academic Board',
        createdAt: serverTimestamp(),
      },
      {
        title: 'Upcoming Parents-Teachers Consultative Conference (PTC)',
        body: 'All parents and guardians are cordially invited to our Term 1 Consultative Academic Review meeting on Saturday from 9:00 AM at the Main Pavilion.',
        targetRole: 'parents',
        pinned: false,
        authorName: 'Office of the Principal',
        createdAt: serverTimestamp(),
      },
      {
        title: 'Inter-School Athletics Championship & Cultural Gala',
        body: 'Congratulations to our junior athletics relay team for qualifying for the regional championships in Nairobi this coming Friday. Training continues daily after 4:00 PM.',
        targetRole: 'all',
        pinned: false,
        authorName: 'Games & Sports Master',
        createdAt: serverTimestamp(),
      },
    ];
    for (const notice of defaultNotices) {
      await setDoc(doc(annRef), notice);
    }
    created.push('announcements');
  }

  // 9. Initial Authentic Assignments Table
  const assignmentsRef = collection(db, schoolBase, 'assignments');
  const assignSnap = await getDocs(assignmentsRef);
  if (assignSnap.empty) {
    const defaultAssignments = [
      {
        title: 'CBC Junior Secondary: Plant Cell Model & Photosynthesis Cycle',
        subject: 'Integrated Science',
        className: 'Grade 7',
        description: 'Design and construct an accurate 3D plant cell model displaying chloroplasts, cell wall, and vacuoles using recycled materials. Include a 1-page summary of the light and dark reaction phases.',
        startsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 50,
        status: 'active',
        teacherName: 'Kevin Mutua',
        submittedCount: 38,
        totalLearners: 42,
        assessmentType: 'CBC Formative Project',
        createdAt: serverTimestamp(),
      },
      {
        title: 'Fractions, Decimals & Practical Financial Budgeting',
        subject: 'Mathematics',
        className: 'Grade 6',
        description: 'Calculate weekly family grocery shopping expenditure using percentage discounts and decimal multiplication. Complete Section B exercises 1 to 15 in the pupil coursebook.',
        startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 40,
        status: 'active',
        teacherName: 'David Kibet',
        submittedCount: 36,
        totalLearners: 40,
        assessmentType: 'Continuous Assessment',
        createdAt: serverTimestamp(),
      },
      {
        title: 'Oral Literature: Kenyan Folktales & Narrative Performance',
        subject: 'English & Literature',
        className: 'Grade 8',
        description: 'Transcribe a traditional folk narrative told in your community. Identify the trickster motif, moral lesson, and perform a 3-minute oral presentation in class.',
        startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 30,
        status: 'active',
        teacherName: 'Sharon Chebet',
        submittedCount: 29,
        totalLearners: 38,
        assessmentType: 'Oral & Performance Task',
        createdAt: serverTimestamp(),
      },
      {
        title: 'Physical Features, Drainage & Climate of Eastern Africa',
        subject: 'Social Studies',
        className: 'Grade 5',
        description: 'Draw an outline map of Eastern Africa showing the Great Rift Valley lakes (Lake Victoria, Turkana, Tanganyika) and label major climatic zones with a neat key.',
        startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 25,
        status: 'active',
        teacherName: 'Beatrice Odhiambo',
        submittedCount: 35,
        totalLearners: 38,
        assessmentType: 'Practical Mapwork',
        createdAt: serverTimestamp(),
      },
      {
        title: 'Insha ya Kubuni: Athari za Teknolojia kwa Vijana Leo',
        subject: 'Kiswahili',
        className: 'Grade 7',
        description: 'Andika insha ya kurasa mbili yenye mada "Umuhimu na Athari za Mitandao ya Kijamii kwa Maadili ya Wanafunzi". Zingatia tahajia, muundo, na msamiati teule.',
        startsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 40,
        status: 'active',
        teacherName: 'Sharon Chebet',
        submittedCount: 31,
        totalLearners: 42,
        assessmentType: 'Insha & Fasihi',
        createdAt: serverTimestamp(),
      },
      {
        title: 'Indigenous Crop Propagation & Kitchen Garden Journal',
        subject: 'Agriculture & Nutrition',
        className: 'Grade 4',
        description: 'Plant indigenous vegetable seeds (managu or terere) in a container garden. Record daily watering observations and seedling emergence over a 7-day period.',
        startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 30,
        status: 'active',
        teacherName: 'Kevin Mutua',
        submittedCount: 22,
        totalLearners: 39,
        assessmentType: 'CBC Field Practical',
        createdAt: serverTimestamp(),
      },
    ];
    for (const assign of defaultAssignments) {
      await setDoc(doc(assignmentsRef), assign);
    }
    created.push('assignments');
  }

  return { success: true, tablesCreated: created };
}

