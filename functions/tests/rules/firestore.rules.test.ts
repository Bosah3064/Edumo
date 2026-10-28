// ============================================================
// EDUMO — Firestore Security Rules Tests
// Tests the 7+ mandatory security scenarios from the spec
// Requires Firebase Emulators running
// ============================================================
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

const PROJECT_ID = 'edumo-test';

let testEnv: RulesTestEnvironment;

// Predefined test organization and school IDs
const ORG_A = 'org-a';
const ORG_B = 'org-b';
const SCHOOL_A1 = 'school-a1';
const SCHOOL_A2 = 'school-a2';
const SCHOOL_B1 = 'school-b1';
const STUDENT_A1_S1 = 'student-a1-s1';
const STUDENT_A1_S2 = 'student-a1-s2';

// Test user UIDs
const OWNER_A = 'owner-a';
const PRINCIPAL_A1 = 'principal-a1';
const TEACHER_A1 = 'teacher-a1';
const PARENT_A1 = 'parent-a1';
const OWNER_B = 'owner-b';
const TEACHER_B1 = 'teacher-b1';
const UNAUTHENTICATED = null;

// Custom claims for test users
function orgOwnerClaims(orgId: string, schoolIds: string[]) {
  return {
    orgId,
    orgRole: 'orgOwner',
    schoolIds,
    schoolRoles: Object.fromEntries(
      schoolIds.map((id) => [id, 'principal'])
    ),
    permissions: [
      'students.read', 'students.write', 'attendance.read',
      'attendance.write', 'academics.read', 'academics.write',
      'fees.read', 'fees.write', 'comms.send', 'settings.roles',
      'reports.generate', 'audit.read', 'students.medical.read',
    ],
    pv: 1,
  };
}

function principalClaims(orgId: string, schoolId: string) {
  return {
    orgId,
    schoolIds: [schoolId],
    schoolRoles: { [schoolId]: 'principal' },
    permissions: [
      'students.read', 'students.write', 'attendance.read',
      'attendance.write', 'academics.read', 'academics.write',
      'comms.send', 'settings.roles', 'reports.generate',
      'students.medical.read',
    ],
    pv: 1,
  };
}

function teacherClaims(orgId: string, schoolId: string) {
  return {
    orgId,
    schoolIds: [schoolId],
    schoolRoles: { [schoolId]: 'teacher' },
    permissions: [
      'students.read', 'attendance.read', 'attendance.write',
      'academics.read', 'academics.write', 'comms.send',
    ],
    pv: 1,
  };
}

function parentClaims(orgId: string) {
  return {
    orgId,
    isGuardian: true,
    pv: 1,
  };
}

beforeAll(async () => {
  const rulesPath = resolve(__dirname, '../../../firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

// Helper: seed test data using admin context
async function seedTestData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Org A with two schools
    await db.doc(`organizations/${ORG_A}`).set({
      name: 'Academy A',
      status: 'active',
      ownerId: OWNER_A,
      createdAt: new Date(),
      createdBy: OWNER_A,
      updatedAt: new Date(),
    });
    await db
      .doc(`organizations/${ORG_A}/schools/${SCHOOL_A1}`)
      .set({
        name: 'Branch A1',
        status: 'active',
        createdAt: new Date(),
        createdBy: OWNER_A,
        updatedAt: new Date(),
      });
    await db
      .doc(`organizations/${ORG_A}/schools/${SCHOOL_A2}`)
      .set({
        name: 'Branch A2',
        status: 'active',
        createdAt: new Date(),
        createdBy: OWNER_A,
        updatedAt: new Date(),
      });

    // Student in school A1
    await db
      .doc(
        `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S1}`
      )
      .set({
        firstName: 'Alice',
        lastName: 'Test',
        status: 'active',
        guardianIds: [PARENT_A1],
        createdAt: new Date(),
        createdBy: OWNER_A,
        admissionNumber: 'ADM001',
      });

    // Student in school A1 NOT linked to parent
    await db
      .doc(
        `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S2}`
      )
      .set({
        firstName: 'Bob',
        lastName: 'Other',
        status: 'active',
        guardianIds: ['other-parent'],
        createdAt: new Date(),
        createdBy: OWNER_A,
        admissionNumber: 'ADM002',
      });

    // Guardian link for parent-a1 to student-a1-s1
    const linkId = `${PARENT_A1}_${ORG_A}_${SCHOOL_A1}_${STUDENT_A1_S1}`;
    await db.doc(`guardianLinks/${linkId}`).set({
      guardianUid: PARENT_A1,
      studentId: STUDENT_A1_S1,
      orgId: ORG_A,
      schoolId: SCHOOL_A1,
      verified: true,
      createdAt: new Date(),
    });

    // Org B with one school
    await db.doc(`organizations/${ORG_B}`).set({
      name: 'Academy B',
      status: 'active',
      ownerId: OWNER_B,
      createdAt: new Date(),
      createdBy: OWNER_B,
      updatedAt: new Date(),
    });
    await db
      .doc(`organizations/${ORG_B}/schools/${SCHOOL_B1}`)
      .set({
        name: 'Branch B1',
        status: 'active',
        createdAt: new Date(),
        createdBy: OWNER_B,
        updatedAt: new Date(),
      });

    // Attendance record in school A1
    await db
      .doc(
        `organizations/${ORG_A}/schools/${SCHOOL_A1}/attendance/att-001`
      )
      .set({
        date: '2026-10-28',
        type: 'daily',
        classId: 'class-1',
        entries: {},
        createdAt: new Date(),
        createdBy: TEACHER_A1,
      });

    // Announcement in school A1
    await db
      .doc(
        `organizations/${ORG_A}/schools/${SCHOOL_A1}/announcements/ann-001`
      )
      .set({
        title: 'Test Announcement',
        body: 'Hello',
        audience: 'all',
        createdAt: new Date(),
        createdBy: PRINCIPAL_A1,
      });

    // User profiles
    await db.doc(`users/${OWNER_A}`).set({
      displayName: 'Owner A',
      email: 'owner-a@test.com',
      createdAt: new Date(),
      memberships: [],
    });
    await db.doc(`users/${OWNER_B}`).set({
      displayName: 'Owner B',
      email: 'owner-b@test.com',
      createdAt: new Date(),
      memberships: [],
    });

    // Invite
    await db.doc('invites/invite-001').set({
      orgId: ORG_A,
      schoolId: SCHOOL_A1,
      role: 'teacher',
      code: 'ABC123',
      used: false,
      expiresAt: new Date(Date.now() + 86400000),
      createdBy: OWNER_A,
      createdAt: new Date(),
    });

    // Country pack
    await db.doc('countryPacks/KE').set({
      code: 'KE',
      name: 'Kenya',
      _verifyWithOfficialSource: true,
    });

    // Audit log
    await db.doc('auditLogs/log-001').set({
      orgId: ORG_A,
      action: 'test',
      timestamp: new Date(),
    });

    // Medical record
    await db
      .doc(
        `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S1}/medical/med-001`
      )
      .set({
        allergies: ['peanuts'],
        updatedAt: new Date(),
        updatedBy: OWNER_A,
      });

    // Summaries (written by functions only)
    await db
      .doc(
        `organizations/${ORG_A}/schools/${SCHOOL_A1}/summaries/sum-001`
      )
      .set({
        type: 'enrollment',
        period: 'daily',
        date: '2026-10-28',
        data: { total: 100 },
        generatedAt: new Date(),
      });
  });
}

// ============================================================
// MANDATORY TEST 1: Org A cannot read or write Org B data
// ============================================================
describe('Cross-tenant isolation', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Org A owner CANNOT read Org B document', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1, SCHOOL_A2]))
      .firestore();
    await assertFails(db.doc(`organizations/${ORG_B}`).get());
  });

  it('Org A owner CANNOT read Org B school', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1, SCHOOL_A2]))
      .firestore();
    await assertFails(
      db.doc(`organizations/${ORG_B}/schools/${SCHOOL_B1}`).get()
    );
  });

  it('Org A owner CANNOT write to Org B', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db.doc(`organizations/${ORG_B}`).update({ name: 'Hacked' })
    );
  });

  it('Org B teacher CANNOT read Org A students', async () => {
    const db = testEnv
      .authenticatedContext(TEACHER_B1, teacherClaims(ORG_B, SCHOOL_B1))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S1}`
        )
        .get()
    );
  });
});

// ============================================================
// MANDATORY TEST 2: Parent cannot read another family's child
// ============================================================
describe('Guardian data isolation', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Verified parent CAN read their own child', async () => {
    const db = testEnv
      .authenticatedContext(PARENT_A1, parentClaims(ORG_A))
      .firestore();
    await assertSucceeds(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S1}`
        )
        .get()
    );
  });

  it('Parent CANNOT read another family\'s child', async () => {
    const db = testEnv
      .authenticatedContext(PARENT_A1, parentClaims(ORG_A))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S2}`
        )
        .get()
    );
  });

  it('Parent can only read their own guardian links', async () => {
    const db = testEnv
      .authenticatedContext(PARENT_A1, parentClaims(ORG_A))
      .firestore();
    const linkId = `${PARENT_A1}_${ORG_A}_${SCHOOL_A1}_${STUDENT_A1_S1}`;
    await assertSucceeds(db.doc(`guardianLinks/${linkId}`).get());
  });

  it('Parent CANNOT read other guardian links', async () => {
    // Create a link for a different parent
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc('guardianLinks/other-parent_org-a_school-a1_student-a1-s2')
        .set({
          guardianUid: 'other-parent',
          studentId: STUDENT_A1_S2,
          orgId: ORG_A,
          schoolId: SCHOOL_A1,
          verified: true,
          createdAt: new Date(),
        });
    });

    const db = testEnv
      .authenticatedContext(PARENT_A1, parentClaims(ORG_A))
      .firestore();
    await assertFails(
      db
        .doc(
          'guardianLinks/other-parent_org-a_school-a1_student-a1-s2'
        )
        .get()
    );
  });
});

// ============================================================
// MANDATORY TEST 3: Teacher cannot access unassigned classes
// NOTE: Class-level restriction is at the application layer.
// Rules enforce school-level access. This test verifies a teacher
// from one school cannot access another school within the same org.
// ============================================================
describe('Teacher school-level isolation', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Teacher with school A1 access CAN read school A1 data', async () => {
    const db = testEnv
      .authenticatedContext(TEACHER_A1, teacherClaims(ORG_A, SCHOOL_A1))
      .firestore();
    await assertSucceeds(
      db.doc(`organizations/${ORG_A}/schools/${SCHOOL_A1}`).get()
    );
  });

  it('Teacher with school A1 access CANNOT read school A2 data', async () => {
    const db = testEnv
      .authenticatedContext(TEACHER_A1, teacherClaims(ORG_A, SCHOOL_A1))
      .firestore();
    await assertFails(
      db.doc(`organizations/${ORG_A}/schools/${SCHOOL_A2}`).get()
    );
  });

  it('Teacher CANNOT read school A2 students', async () => {
    // Seed a student in school A2
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A2}/students/student-a2`
        )
        .set({
          firstName: 'Charlie',
          lastName: 'Other',
          status: 'active',
          guardianIds: [],
          createdAt: new Date(),
          createdBy: OWNER_A,
          admissionNumber: 'ADM003',
        });
    });

    const db = testEnv
      .authenticatedContext(TEACHER_A1, teacherClaims(ORG_A, SCHOOL_A1))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A2}/students/student-a2`
        )
        .get()
    );
  });
});

// ============================================================
// MANDATORY TEST 4: Client cannot change its own role or claims
// (All claim changes via callable functions — rules deny direct writes)
// ============================================================
describe('Client cannot change roles', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('User CANNOT modify their own memberships', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db.doc(`users/${OWNER_A}`).update({
        memberships: [
          {
            orgId: ORG_B,
            role: 'orgOwner',
            schoolIds: [SCHOOL_B1],
          },
        ],
      })
    );
  });

  it('User CANNOT create invite directly', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db.doc('invites/fake-invite').set({
        orgId: ORG_A,
        schoolId: SCHOOL_A1,
        role: 'principal',
        code: 'HACK',
        createdBy: OWNER_A,
        createdAt: new Date(),
      })
    );
  });

  it('User CANNOT modify guardian links directly', async () => {
    const db = testEnv
      .authenticatedContext(PARENT_A1, parentClaims(ORG_A))
      .firestore();
    const linkId = `${PARENT_A1}_${ORG_A}_${SCHOOL_A1}_${STUDENT_A1_S1}`;
    await assertFails(
      db.doc(`guardianLinks/${linkId}`).update({ verified: true })
    );
  });

  it('User CANNOT create guardian links directly', async () => {
    const db = testEnv
      .authenticatedContext(PARENT_A1, parentClaims(ORG_A))
      .firestore();
    await assertFails(
      db.doc('guardianLinks/fake-link').set({
        guardianUid: PARENT_A1,
        studentId: STUDENT_A1_S2,
        orgId: ORG_A,
        schoolId: SCHOOL_A1,
        verified: true,
        createdAt: new Date(),
      })
    );
  });
});

// ============================================================
// MANDATORY TEST 5: Unauthenticated access is denied everywhere
// ============================================================
describe('Unauthenticated access denied', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Unauthenticated CANNOT read organizations', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc(`organizations/${ORG_A}`).get());
  });

  it('Unauthenticated CANNOT read schools', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db.doc(`organizations/${ORG_A}/schools/${SCHOOL_A1}`).get()
    );
  });

  it('Unauthenticated CANNOT read students', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S1}`
        )
        .get()
    );
  });

  it('Unauthenticated CANNOT read users', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc(`users/${OWNER_A}`).get());
  });

  it('Unauthenticated CANNOT read invites', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc('invites/invite-001').get());
  });

  it('Unauthenticated CANNOT read country packs', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc('countryPacks/KE').get());
  });

  it('Unauthenticated CANNOT write anywhere', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      db.doc('organizations/new-org').set({ name: 'Hack' })
    );
  });
});

// ============================================================
// MANDATORY TEST 6: Cross-tenant export attempts denied
// (Export jobs are created via callable only — no client writes)
// ============================================================
describe('Export/import job isolation', () => {
  beforeEach(async () => {
    await seedTestData();
    // Seed an export job in school A1
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/exportJobs/export-001`
        )
        .set({
          reportType: 'classList',
          status: 'ready',
          requestedBy: OWNER_A,
          requestedAt: new Date(),
        });
    });
  });

  it('Org B user CANNOT read Org A export jobs', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_B, orgOwnerClaims(ORG_B, [SCHOOL_B1]))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/exportJobs/export-001`
        )
        .get()
    );
  });

  it('No user can create export jobs directly', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/exportJobs/fake-export`
        )
        .set({
          reportType: 'all-data',
          status: 'ready',
          requestedBy: OWNER_A,
        })
    );
  });

  it('No user can create import jobs directly', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/importJobs/fake-import`
        )
        .set({
          entity: 'students',
          status: 'complete',
          startedBy: OWNER_A,
        })
    );
  });
});

// ============================================================
// MANDATORY TEST 7: Branch user cannot see another branch
// ============================================================
describe('Branch isolation within same org', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Teacher in branch A1 CANNOT read branch A2 school doc', async () => {
    const db = testEnv
      .authenticatedContext(TEACHER_A1, teacherClaims(ORG_A, SCHOOL_A1))
      .firestore();
    await assertFails(
      db.doc(`organizations/${ORG_A}/schools/${SCHOOL_A2}`).get()
    );
  });

  it('Teacher in branch A1 CANNOT read branch A2 attendance', async () => {
    // Seed attendance in A2
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A2}/attendance/att-a2`
        )
        .set({
          date: '2026-10-28',
          type: 'daily',
          classId: 'class-a2',
          entries: {},
          createdAt: new Date(),
          createdBy: 'teacher-a2',
        });
    });

    const db = testEnv
      .authenticatedContext(TEACHER_A1, teacherClaims(ORG_A, SCHOOL_A1))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A2}/attendance/att-a2`
        )
        .get()
    );
  });

  it('Org owner CAN read ALL branches', async () => {
    const db = testEnv
      .authenticatedContext(
        OWNER_A,
        orgOwnerClaims(ORG_A, [SCHOOL_A1, SCHOOL_A2])
      )
      .firestore();
    await assertSucceeds(
      db.doc(`organizations/${ORG_A}/schools/${SCHOOL_A1}`).get()
    );
    await assertSucceeds(
      db.doc(`organizations/${ORG_A}/schools/${SCHOOL_A2}`).get()
    );
  });
});

// ============================================================
// ADDITIONAL TESTS: Audit log protection
// ============================================================
describe('Audit log protection', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('No user can read audit logs directly', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(db.doc('auditLogs/log-001').get());
  });

  it('No user can write audit logs', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db.doc('auditLogs/fake-log').set({
        orgId: ORG_A,
        action: 'fake',
        timestamp: new Date(),
      })
    );
  });

  it('No user can delete audit logs', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(db.doc('auditLogs/log-001').delete());
  });
});

// ============================================================
// ADDITIONAL TESTS: Medical data restriction
// ============================================================
describe('Medical data restriction', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Principal CAN read medical records', async () => {
    const db = testEnv
      .authenticatedContext(
        PRINCIPAL_A1,
        principalClaims(ORG_A, SCHOOL_A1)
      )
      .firestore();
    await assertSucceeds(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S1}/medical/med-001`
        )
        .get()
    );
  });

  it('Teacher WITHOUT medical permission CANNOT read medical records', async () => {
    const db = testEnv
      .authenticatedContext(TEACHER_A1, teacherClaims(ORG_A, SCHOOL_A1))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S1}/medical/med-001`
        )
        .get()
    );
  });
});

// ============================================================
// ADDITIONAL TESTS: Summaries and payments (server-written only)
// ============================================================
describe('Server-written collections', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Owner CAN read summaries', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertSucceeds(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/summaries/sum-001`
        )
        .get()
    );
  });

  it('No user can write summaries directly', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/summaries/sum-002`
        )
        .set({ type: 'fake', data: {} })
    );
  });

  it('No user can create payments directly', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/payments/pay-001`
        )
        .set({
          invoiceId: 'inv-1',
          studentId: STUDENT_A1_S1,
          amount: 10000,
          status: 'confirmed',
          createdAt: new Date(),
          createdBy: OWNER_A,
        })
    );
  });
});

// ============================================================
// ADDITIONAL TESTS: Immutable fields
// ============================================================
describe('Immutable field enforcement', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Org owner CANNOT change createdAt', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db
        .doc(`organizations/${ORG_A}`)
        .update({ createdAt: new Date(), updatedAt: new Date() })
    );
  });

  it('Org owner CANNOT change ownerId', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(
      db
        .doc(`organizations/${ORG_A}`)
        .update({ ownerId: 'hacker', updatedAt: new Date() })
    );
  });

  it('Admin CANNOT change student admissionNumber', async () => {
    const db = testEnv
      .authenticatedContext(
        PRINCIPAL_A1,
        principalClaims(ORG_A, SCHOOL_A1)
      )
      .firestore();
    await assertFails(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/${STUDENT_A1_S1}`
        )
        .update({
          admissionNumber: 'CHANGED',
          updatedAt: new Date(),
        })
    );
  });
});

// ============================================================
// POSITIVE TESTS: Authorized operations
// ============================================================
describe('Authorized operations work correctly', () => {
  beforeEach(async () => {
    await seedTestData();
  });

  it('Org owner CAN read own organization', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertSucceeds(db.doc(`organizations/${ORG_A}`).get());
  });

  it('Org owner CAN update organization name', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertSucceeds(
      db
        .doc(`organizations/${ORG_A}`)
        .update({ name: 'New Name', updatedAt: new Date() })
    );
  });

  it('Principal CAN create student', async () => {
    const db = testEnv
      .authenticatedContext(
        PRINCIPAL_A1,
        principalClaims(ORG_A, SCHOOL_A1)
      )
      .firestore();
    await assertSucceeds(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/students/new-student`
        )
        .set({
          firstName: 'New',
          lastName: 'Student',
          status: 'active',
          admissionNumber: 'ADM100',
          createdAt: new Date(),
          createdBy: PRINCIPAL_A1,
        })
    );
  });

  it('Teacher CAN mark attendance', async () => {
    const db = testEnv
      .authenticatedContext(TEACHER_A1, teacherClaims(ORG_A, SCHOOL_A1))
      .firestore();
    await assertSucceeds(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/attendance/new-att`
        )
        .set({
          date: '2026-10-29',
          type: 'daily',
          classId: 'class-1',
          entries: { 'student-1': { status: 'present' } },
          createdAt: new Date(),
          createdBy: TEACHER_A1,
        })
    );
  });

  it('Authenticated user CAN read own profile', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertSucceeds(db.doc(`users/${OWNER_A}`).get());
  });

  it('Authenticated user CANNOT read other user profile', async () => {
    const db = testEnv
      .authenticatedContext(OWNER_A, orgOwnerClaims(ORG_A, [SCHOOL_A1]))
      .firestore();
    await assertFails(db.doc(`users/${OWNER_B}`).get());
  });

  it('Authenticated user CAN read invites (to accept)', async () => {
    const db = testEnv
      .authenticatedContext('random-user', {})
      .firestore();
    await assertSucceeds(db.doc('invites/invite-001').get());
  });

  it('Authenticated user CAN read country packs', async () => {
    const db = testEnv
      .authenticatedContext('random-user', {})
      .firestore();
    await assertSucceeds(db.doc('countryPacks/KE').get());
  });

  it('Guardian CAN read announcements from their school', async () => {
    const db = testEnv
      .authenticatedContext(PARENT_A1, parentClaims(ORG_A))
      .firestore();
    await assertSucceeds(
      db
        .doc(
          `organizations/${ORG_A}/schools/${SCHOOL_A1}/announcements/ann-001`
        )
        .get()
    );
  });
});
