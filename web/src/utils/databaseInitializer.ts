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

  // 2. Subjects / Curriculum Units Table
  const subjectsRef = collection(db, schoolBase, 'subjects');
  const subjectsSnap = await getDocs(subjectsRef);
  if (subjectsSnap.empty) {
    const defaultUnits = [
      { id: 'math-101', code: 'MATH-101', name: 'Mathematics', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 5 },
      { id: 'eng-102', code: 'ENG-102', name: 'English Language & Literacy', isMandatory: true, department: 'Languages', weeklyPeriods: 5 },
      { id: 'kisw-103', code: 'KISW-103', name: 'Kiswahili & Fasihi', isMandatory: true, department: 'Languages', weeklyPeriods: 4 },
      { id: 'sci-201', code: 'SCI-201', name: 'Integrated Science', isMandatory: true, department: 'Sciences & Tech', weeklyPeriods: 4 },
      { id: 'sst-202', code: 'SST-202', name: 'Social Studies & Citizenship', isMandatory: true, department: 'Humanities', weeklyPeriods: 3 },
      { id: 'agri-301', code: 'AGRI-301', name: 'Agriculture & Nutrition', isMandatory: true, department: 'Applied Sciences', weeklyPeriods: 3 },
      { id: 'arts-302', code: 'ARTS-302', name: 'Creative Arts & Sports', isMandatory: true, department: 'Creative Arts', weeklyPeriods: 3 },
      { id: 'cre-104', code: 'CRE-104', name: 'Christian Religious Education', isMandatory: false, department: 'Religious Studies', weeklyPeriods: 2 },
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

  // 4. Initial Sample Students Table (if completely empty)
  const studentsRef = collection(db, schoolBase, 'students');
  const studentsSnap = await getDocs(studentsRef);
  if (studentsSnap.empty) {
    const defaultLearners = [
      {
        admissionNumber: '2026/0001',
        firstName: 'Emmanuel',
        lastName: 'Kiprono',
        currentClassId: 'Grade 4',
        gender: 'male',
        boardingStatus: 'day',
        status: 'active',
        guardianName: 'James Kiprono',
        guardianPhone: '+254712345678',
        feeBalance: 4500,
        feeTotal: 25000,
        createdAt: serverTimestamp(),
      },
      {
        admissionNumber: '2026/0002',
        firstName: 'Zawadi',
        lastName: 'Achieng',
        currentClassId: 'Grade 4',
        gender: 'female',
        boardingStatus: 'day',
        status: 'active',
        guardianName: 'Grace Achieng',
        guardianPhone: '+254722334455',
        feeBalance: 0,
        feeTotal: 25000,
        createdAt: serverTimestamp(),
      },
      {
        admissionNumber: '2026/0003',
        firstName: 'Faith',
        lastName: 'Muthoni',
        currentClassId: 'Grade 4',
        gender: 'female',
        boardingStatus: 'day',
        status: 'active',
        guardianName: 'Peter Muthoni',
        guardianPhone: '+254733445566',
        feeBalance: 12000,
        feeTotal: 25000,
        createdAt: serverTimestamp(),
      },
    ];
    for (const learner of defaultLearners) {
      const studentDoc = doc(studentsRef);
      await setDoc(studentDoc, learner);
    }
    created.push('students');
  }

  // 5. Initial Announcements Table
  const annRef = collection(db, schoolBase, 'announcements');
  const annSnap = await getDocs(annRef);
  if (annSnap.empty) {
    await setDoc(doc(annRef), {
      title: `Welcome to ${schoolName} Academic Portal`,
      body: `Welcome to the active academic session. School records, curriculum units, exam series, and attendance are online.`,
      targetRole: 'all',
      createdAt: serverTimestamp(),
    });
    created.push('announcements');
  }

  return { success: true, tablesCreated: created };
}

