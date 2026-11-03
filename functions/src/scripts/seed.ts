// ============================================================
// EDUMO — Emulator & Demo Data Seeder
// Seeds country packs, demo organization, school, classes,
// students, staff, and initial configurations into Firestore.
// ============================================================
import { db } from '../config/firebase';
import { COUNTRY_PACKS } from '@edumo/shared';
import { FieldValue } from 'firebase-admin/firestore';

export async function seedDatabase() {
  console.log('--- Starting EDUMO Firestore Seeder ---');

  // 1. Seed Country Packs
  console.log('Seeding Country Packs into /countryPacks ...');
  for (const [code, pack] of Object.entries(COUNTRY_PACKS)) {
    await db.collection('countryPacks').doc(code).set({
      ...pack,
      updatedAt: new Date().toISOString(),
      _seededAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`  ✓ CountryPack [${code}]: ${pack.name} (VERIFY WITH OFFICIAL SOURCE: ${pack._verifyWithOfficialSource})`);
  }

  // 2. Seed Demo Organization
  const orgId = 'demo-org-edumo';
  const schoolId = 'main-campus';
  console.log(`Seeding Demo Organization [/organizations/${orgId}] ...`);

  await db.collection('organizations').doc(orgId).set({
    name: 'Edumo Demonstration Academy',
    slug: 'edumo-demo',
    type: 'group',
    country: 'KE',
    countryPackId: 'KE',
    branding: {
      primaryColor: '#1d5f99',
      secondaryColor: '#683669',
      motto: 'Knowledge, Character and Excellence',
    },
    plan: 'enterprise',
    maxStudents: 5000,
    maxBranches: 10,
    verified: true,
    status: 'active',
    settings: {
      defaultLanguage: 'en',
      timezone: 'Africa/Nairobi',
      dateFormat: 'DD/MM/YYYY',
      smsCredits: 1000,
      features: {
        offlineSync: true,
        realExcelReports: true,
        cbcAssessment: true,
        parentPortal: true,
      },
    },
    ownerId: 'demo-owner-uid',
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'system-seeder',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system-seeder',
  }, { merge: true });

  // 3. Seed Demo School (Branch)
  console.log(`Seeding Demo Branch [/organizations/${orgId}/schools/${schoolId}] ...`);
  const schoolRef = db.collection('organizations').doc(orgId).collection('schools').doc(schoolId);
  await schoolRef.set({
    name: 'Edumo Nairobi Main Campus',
    code: 'MAIN',
    type: 'combined',
    country: 'KE',
    countryPackId: 'KE',
    address: {
      line1: 'Kilimani Road, Gate 4',
      city: 'Nairobi',
      county: 'Nairobi County',
      postalCode: '00100',
      country: 'KE',
    },
    contacts: {
      phone: '+254711000001',
      email: 'info@edumo.demo.ac.ke',
      website: 'edumo.demo.ac.ke',
    },
    curriculumType: 'CBC',
    gradingMode: 'cbc_no_aggregate',
    gradingConfig: {
      scale: [
        { label: 'Exceeding Expectations', min: 75, max: 100 },
        { label: 'Meeting Expectations', min: 50, max: 74 },
        { label: 'Approaching Expectations', min: 25, max: 49 },
        { label: 'Below Expectations', min: 0, max: 24 },
      ],
    },
    settings: {
      emailDomain: 'edumo.demo.ac.ke',
    },
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'system-seeder',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'system-seeder',
  }, { merge: true });

  // 4. Seed Demo Academic Year and Term
  const yearId = '2026';
  const termId = 'term-1';
  console.log(`Seeding Academic Calendar for ${yearId} / ${termId} ...`);
  await schoolRef.collection('academicYears').doc(yearId).set({
    year: 2026,
    name: 'Academic Year 2026',
    startDate: '2026-01-05',
    endDate: '2026-11-27',
    status: 'active',
  }, { merge: true });

  await schoolRef.collection('academicYears').doc(yearId).collection('terms').doc(termId).set({
    number: 1,
    name: 'Term 1, 2026',
    startDate: '2026-01-05',
    endDate: '2026-04-10',
    status: 'active',
  }, { merge: true });

  // 5. Seed Demo Classes
  console.log('Seeding Classes & Streams ...');
  const demoClasses = [
    { id: 'class-g1', name: 'Grade 1', level: 'G1', order: 1 },
    { id: 'class-g2', name: 'Grade 2', level: 'G2', order: 2 },
    { id: 'class-jss7', name: 'Junior Secondary Grade 7', level: 'JSS7', order: 7 },
  ];

  for (const cls of demoClasses) {
    const classRef = schoolRef.collection('classes').doc(cls.id);
    await classRef.set({
      name: cls.name,
      level: cls.level,
      order: cls.order,
      academicYearId: yearId,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Seed Streams
    await classRef.collection('streams').doc('stream-east').set({
      name: 'East',
      capacity: 35,
    }, { merge: true });
    await classRef.collection('streams').doc('stream-west').set({
      name: 'West',
      capacity: 35,
    }, { merge: true });
  }

  // 6. Seed Demo Students
  console.log('Seeding Demo Students ...');
  const students = [
    { id: 'std-001', adm: '26/0001', first: 'Amina', last: 'Kariuki', gender: 'female', classId: 'class-g1', streamId: 'stream-east' },
    { id: 'std-002', adm: '26/0002', first: 'Brian', last: 'Ochieng', gender: 'male', classId: 'class-g1', streamId: 'stream-west' },
    { id: 'std-003', adm: '26/0003', first: 'Chantal', last: 'Mutoni', gender: 'female', classId: 'class-jss7', streamId: 'stream-east' },
  ];

  for (const s of students) {
    await schoolRef.collection('students').doc(s.id).set({
      admissionNumber: s.adm,
      firstName: s.first,
      lastName: s.last,
      gender: s.gender,
      currentClassId: s.classId,
      currentStreamId: s.streamId,
      boardingStatus: 'day',
      status: 'active',
      dateOfBirth: '2019-03-15',
      enrollmentDate: '2026-01-06',
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'system-seeder',
    }, { merge: true });
  }

  // 7. Seed Demo Staff
  console.log('Seeding Demo Staff ...');
  const staffMembers = [
    { id: 'staff-001', staffId: 'T/26/0001', first: 'Peter', last: 'Kamau', role: 'teacher', dept: 'Sciences' },
    { id: 'staff-002', staffId: 'A/26/0001', first: 'Sarah', last: 'Nduta', role: 'principal', dept: 'Administration' },
    { id: 'staff-003', staffId: 'B/26/0001', first: 'David', last: 'Mwangi', role: 'bursar', dept: 'Finance' },
  ];

  for (const st of staffMembers) {
    await schoolRef.collection('staff').doc(st.id).set({
      staffId: st.staffId,
      firstName: st.first,
      lastName: st.last,
      role: st.role,
      department: st.dept,
      status: 'active',
      contractType: 'permanent',
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'system-seeder',
    }, { merge: true });
  }

  console.log('--- EDUMO Seeding Completed Successfully ---');
}

// Allow direct CLI execution
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
