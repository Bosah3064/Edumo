# EDUMO Phase 0 Architecture — Approval Draft

## Purpose

This document completes Phase 0 from the EDUMO product specification: repository and runtime structure, the tenant data model, Firestore and Storage authorization, callable-function boundaries, custom claims, country-pack schema, composite indexes, emulator strategy, assumptions, and Phase 1 entry criteria.

Phase 0 is a design gate. It does not authorize implementation of application modules beyond the approved MVP foundation.

## Current implementation audit

### Existing foundation

- React 18, TypeScript, Vite, Tailwind CSS, React Router, PWA/Workbox shell.
- Firebase Authentication, Firestore, Storage, Functions, and offline Firestore persistence.
- Existing organizations, schools/branches, students, staff, attendance, classes, announcements, settings, assignments, and Excel-import UI.
- Shared organization, school, student, staff, country-pack, finance, and permission types.
- Custom-claims middleware for organization, school, role, and permission checks.
- Callables for organization creation, branches, invites, role assignment, guardian links, and assignment submission.
- Tenant-scoped branding, grading-scale UI, school-local colors, logo, motto, profiles, sidebar localization, admission IDs, and role-aware staff IDs.
- Security rules and emulator rule-test scaffolding; the emulator suite and project scripts are configured.

### Prototype work that must not be treated as production complete

1. Assignment creation is partly client-written. Answer keys, submissions, result release, review permission, attempts, and class audience must be enforced by callables and rules.
2. Assignment submission accepts tenant IDs and trusts the caller's role/claims; Phase 0 must derive tenant identity server-side and verify class membership.
3. Assignment and Storage paths have incomplete authorization coverage.
4. Student enrollment writes directly from the client; admission counters and medical records need callable boundaries and field-level validation.
5. Staff invitation generation is partly implemented across Firestore, callable, and UI layers, but the callable's actual request schema does not yet represent every new field.
6. The announcements implementation is not yet a complete persistent delivery pipeline.
7. Class/subject operations and grading settings need tenant-neutral schemas and server validation.
8. Attendance and marks lack a complete offline queue, conflict-resolution versioning, and teacher task state.
9. The available rule tests are not yet confirmed to pass under an emulator in CI.
10. App Check, email/phone verification, MFA, exports/imports, signing, audit-log runtime integration, rate limits, scheduled cleanup, and observability need completion.

## Approved architecture assumptions

1. One authenticated Firebase project environment represents one environment, not one school.
2. Tenant isolation begins at `/organizations/{orgId}`. Branch isolation begins at `/organizations/{orgId}/schools/{schoolId}`.
3. Global `/users/{uid}`, `/guardianLinks`, `/invites`, and `/countryPacks/{code}` are infrastructure records, but they must be limited to the minimum fields and explicitly matched where tenant-specific reads occur.
4. Custom claims contain only identifiers, role mappings, permission codes, guardian state, and permissions version. They must never contain branding, academic records, family data, phone numbers, or secrets.
5. Sensitive writes and all cross-document operations must use Cloud Functions. Direct client writes are limited to explicitly approved low-risk records.
6. Country rules are data, never compile-time source branches.
7. Grading records retain an explicit country code, country-pack version, grading mode, original score/band, and direction metadata.
8. CBC KJSEA-style views are no-aggregate unless an authorized school explicitly overrides a genuinely supported classic mode. These defaults are not official guidance.
9. Timed assignments must validate time, attempts, audience, and release policy on the server.
10. Until an item is officially sourced, its official names and boundaries remain editable defaults marked `VERIFY WITH OFFICIAL SOURCE`.

## Repository layout

```text
/shared/src/types/       shared contracts only
/functions/src/callable/ sensitive callable operations
/functions/src/triggers/ auth and data triggers
/functions/src/middleware/ auth, authorization, rate limits
/functions/src/schemas/   Zod contracts
/functions/src/jobs/      import/export/report/background jobs
/functions/src/excel/     Excel parsing, validation, generation
/functions/src/security/  secret and App Check helpers
/functions/src/utils/     audit, errors, idempotency, formula neutralization
/functions/tests/rules/   Firestore emulator tests
/functions/tests/unit/    function, country-pack, grading, and import tests
/web/src/               authenticated React application
/docs/                  architecture and phase documents
storage.rules
firestore.rules
firestore.indexes.json
firebase.json
```

Recommended environment separation:

- Development: local emulator plus a dedicated Firebase development project.
- Staging: dedicated project with production-like rules and App Check configuration.
- Production: dedicated project. No production credentials in source control.

## Core tenant model

### Organization

Path: `/organizations/{orgId}`

- identity and verification
- plan and limits
- owner
- organization country and country-pack default
- organization settings
- organization branding
- status
- immutable `createdAt`, `createdBy`, `ownerId`
- soft-delete fields

### School/branch

Path: `/organizations/{orgId}/schools/{schoolId}`

- school profile and legal identity
- country and country-pack override
- curriculum and grading configuration
- branding override
- academic calendar
- school codes and branch merge state
- status
- immutable creation metadata

### Campus/section

Path: `/organizations/{orgId}/schools/{schoolId}/campuses/{campusId}`

Optional operating section, location, administration, and status.

## Full tenant collections

```text
organizations/{orgId}
  schools/{schoolId}
    campuses/{campusId}
    academicYears/{yearId}/terms/{termId}
    students/{studentId}
      medical/{recordId}              restricted
      specialNeeds/{planId}           restricted
      documents/{documentId}
      transferHistory/{transferId}
    guardians/{guardianId}
    staff/{staffId}
      documents/{documentId}
      leave/{leaveId}
    classes/{classId}/streams/{streamId}
    subjects/{subjectId}
    classSubjects/{classSubjectId}
    timetables/{timetableId}/entries/{entryId}
    attendance/{recordId}
    assessments/{assessmentId}/marks/{markId}
    reportCards/{reportCardId}
    gradingConfigs/{configId}
    feeStructures/{feeStructureId}
    invoices/{invoiceId}/lines/{lineId}
    payments/{paymentId}
    expenses/{expenseId}
    payroll/{payrollId}
    announcements/{announcementId}
      deliveries/{deliveryId}
    messages/{conversationId}/messages/{messageId}
    events/{eventId}/rsvps/{rsvpId}
    admissions/{applicationId}
      documents/{documentId}
      notes/{noteId}
    behaviour/{recordId}
    health/{visitId}                  restricted
    welfare/{recordId}                restricted
    transport/{routeId}/students/{studentId}
    library/{itemId}
    inventory/{itemId}
    hostel/{hostelId}/rooms/{roomId}/occupancy/{recordId}
    visitors/{visitorId}
    clubs/{clubId}/members/{memberId}
    leave/{leaveId}
    summaries/{summaryId}
    importJobs/{jobId}/rows/{rowId}
    exportJobs/{jobId}
    reportTemplates/{templateId}
    assignments/{assignmentId}
      submissions/{submissionId}
      private/{documentId}            answer key/marking metadata only
    auditAccess/{recordId}
    consentRecords/{recordId}
    deletionRequests/{requestId}
```

Global records:

```text
/users/{uid}
guardianLinks/{linkId}
/invites/{inviteId}
/countryPacks/{countryPackCode}/versions/{version}
/auditLogs/{logId}
/platform/{documentId}
```

## Shared document metadata

Every tenant-owned mutable document should include:

```text
orgId                 immutable
schoolId              immutable where applicable
createdAt             server timestamp
createdBy             function or verified UID
updatedAt             server timestamp
updatedBy             verified UID
version               positive integer
recordVersion?        optimistic concurrency token when required
softDeleted           false/true
deletedAt             server timestamp only
deletedBy             verified UID only
```

Rules should enforce these fields rather than trusting the client. Field allowlists are preferred over sparse catch-all writes.

## Identity and IDs

### Student admission ID

Current format `YY/0001` is retained unless a school-specific format is configured. Sequencing is organization/branch/year scoped and must execute in a callable transaction, never in a naive client transaction.

The ID is immutable after enrollment. Changing it requires a sensitive rename/correction callable and an audit entry.

### Staff/teacher ID

Role prefixes are data/configuration and not hard-coded academic meaning:

- Student: `S`
- Teacher: `T`
- Support staff: `W`
- Administrator: `A`
- Parent: `P`

Sequence scope and format are school-configurable. The current prototype year-and-role sequence is a default. Final format must be recorded in school settings before activation.

## Country-pack schema

```text
CountryPack
  code: KE | UG | TZ | RW | custom
  version
  status
  curricula[]
    id
    name
    levels[]
    subjects[]
  gradingSystems[]
    id
    mode
    aggregationMode
    bands[]
      code
      min
      max
      points?
      direction
      officialSourceStatus
    comparisonDirection
  calendar
    termsPerYear
    termLabels[]
  currency
    code
    minorUnit
  paymentProviders[]
    adapterId
    capabilities[]
  reportTemplates[]
    templateId
    version
  governmentExports[]
    adapterId
    implementationStatus
  languages[]
  legalDefaults
    dataRetentionDays?
    guardianConsentRequired?
  verificationDefaults[]
```

No known grading result in code may be described as an official national rule without a versioned source. All seeded values must include `officialSourceStatus: 'verify'` or an equivalent status.

Cross-border transfers store the source country pack and original grades. Grade calculations never reinterpret old results into the current branch pack automatically.

## Composite indexes and query rules

Existing student, attendance, assessment, mark, invoice, announcement, report-card, audit, guardian-link, invite, job, summary, fee, and staff indexes are a starting point, not complete coverage.

Phase 1 index additions should include:

- students: school, status, class, stream, lastName
- attendance: class, stream, type, date
- staff: school, role, status, lastName
- announcements: school, audience, status, scheduleAt, createdAt
- assignments: class audience, status, startsAt, expiresAt
- assignment submissions: assignment, student, submittedAt, releasedAt
- import/export jobs: status, requestedAt, requestedBy
- guardianLinks: guardian UID, school, verified
- audit: tenant, category, actor, timestamp

Rules:

- No unbounded collection reads.
- List queries must use pagination and page limits.
- Dashboard cards read summaries, not source collections.
- Collection groups are avoided where tenant paths already provide isolation.

## Custom claims strategy

Claims version must increase on every role or permission change. Required claim fields:

```text
platformAdmin?: boolean
orgId?: string
orgRole?: 'orgOwner'
schoolIds?: string[]
schoolRoles?: Record<schoolId, SchoolRole>
permissions?: PermissionCode[]
isGuardian?: boolean
pv?: number
```

Claims are updated only by callables and must trigger token refresh after changes. Client code must never write claims, memberships, roles, or permission grants.

Fine-grained permissions should be resolved in this order:

1. Explicit platform admin only for platform operations.
2. Organization owner for organization-wide administration.
3. School role and fine-grained permission intersection.
4. Resource-specific checks such as student membership, class assignment, or guardian verification.

## Firestore authorization design

Rules must remain deny-by-default. Proposed categories:

### Organization and school

- Organization read for member/owner/platform admin.
- Organization and branch writes through callables only.
- Branch merge, verification, status changes, and organization settings are function-only.

### User profiles and memberships

- `/users/{uid}` self-read/self-write for profile fields; no membership or role writes from clients.
- Guardian links function-only.
- Invites no client read/write; acceptance callable only.

### Student and staff records

- Staff and student list/profile reads require school membership and relevant permission.
- Writes use createStudent/createStaff or an equivalent validated callable.
- Admission numbers and identity fields are immutable after creation except through a corrective callable.
- Medical and welfare records require explicit permissions, independent of generic student access.

### Academic records

- Teachers may enter only assigned classes and subjects unless granted a broader permission.
- Publishing, result visibility, grade-scale changes, and report-card generation are sensitive functions.
- Marks retain original values and source country/pack metadata.
- Offline merge requires `version`, operation ID, and audit records.

### Finance and operations

- Payments, refunds, invoices, reconciliations, and balances use functions.
- No client can fabricate server totals or payment status.

### Communication

- Announcement creation and channel delivery use callables.
- Student/parent reads are limited to audience membership or verified guardian linkage.
- Delivery records are function-readable; providers never receive global credentials.

### Assignment private records

- Public assignment metadata contains no correct answers or private key.
- `_private` and answer-key records are never client-readable.
- Teachers/administrators may create assignments only through the createAssignment callable.
- Students submit only through submitAssignment.
- Submission documents are readable only by the student and authorized teacher/admin roles.
- Private answer review requires the assignment's server-release state plus reviewAllowed.

## Storage authorization design

Storage paths should be tenant-scoped and partner the Firestore tenant path:

```text
/{orgId}/{schoolId}/students/{studentId}/photos/{file}
/{orgId}/{schoolId}/students/{studentId}/documents/{file}
/{orgId}/{schoolId}/staff/{staffId}/photos/{file}
/{orgId}/{schoolId}/imports/{jobId}/{file}
/{orgId}/{schoolId}/exports/{jobId}/{file}
/{orgId}/{schoolId}/reports/{reportId}/{file}
/{orgId}/{schoolId}/announcements/{announcementId}/{file}
/{orgId}/{schoolId}/assignments/{assignmentId}/{file}
/{orgId}/{schoolId}/branding/{file}
```

Rules must validate MIME type, declared extension, size, auth, school access, role, and short-lived need-to-read. Export/report/private answer files remain non-client-readable and use 15-minute signed URLs only.

Assignment uploads should split public attachments from private answer sheets. Private answer sheets must not be publicly downloadable by assignment document URL.

## Sensitive callable inventory

### Phase 0 foundations

- `createOrganization`
- `updateOrganization`
- `addBranch`
- `mergeBranch`
- `createInvite`
- `acceptInvite`
- `revokeInvite`
- `assignRole`
- `removeRole`
- `createStudent`
- `updateStudent`
- `transferStudent`
- `softDeactivateStudent`
- `createStaff`
- `updateStaff`
- `linkGuardian`
- `verifyGuardianLink`
- `createAssignment`
- `submitAssignment`
- `releaseAssignmentResults`
- `markAttendance`

### Later callable families

- Excel import preview, commit, retry, and rollback
- Excel export and report jobs
- assessment, mark, publish, and report-card operations
- fee/payment/refund reconciliation
- announcement delivery
- data-export/deletion requests
- platform tenant actions

Every callable must:

1. Verify authentication and token version.
2. Validate all data with a strict Zod schema.
3. Derive the organization and school from claims or server-controlled user membership.
4. Reject client-supplied privilege fields, claims, tenant IDs, totals, and immutable metadata.
5. Use transactions/batches where atomicity matters.
6. Write structured audit records.
7. Apply rate limits where abuse-sensitive.
8. Use stable operation IDs for retry-safe writes.
9. Return only necessary public data.

## Assignment server contract

Assignment creation returns a public assignment ID, while the private key is stored separately and function-only.

Public fields:

```text
orgId, schoolId
title, description, classIds, streamIds
attachmentRefs
startsAt, expiresAt
questionCount, totalMarks, maxAttempts
resultReleaseMode
reviewAllowed
status, teacherUid
createdAt, createdBy
```

Private fields:

```text
questions[].id
questions[].type
questions[].options
questions[].correctAnswer
questions[].points
questions[].required
questions[].manualMarkingRequired
```

Submission fields:

```text
studentUid
assignmentId
answers
attempt
score
manualScore
total
status
submittedAt
releasedAt
reviewedAt
operationId
```

Submission behavior:

- Validate current time against startsAt/expiryTime.
- Verify role is student and membership of assigned classes/streams.
- Enforce max attempts.
- Prevent answer changes after a final attempt is submitted.
- Auto-mark only objective question types.
- Store private/manual marking separately until a teacher release action.
- Apply resultReleaseMode: immediate, expiry, or manual.
- Return review data only when `reviewAllowed` and result-release requirements are satisfied.
- Never expose private answer records in assignment list snapshots.

## Audit model

Audit documents are function-only. Minimum fields:

```text
orgId, schoolId
actorUid, actorRole
action, category, targetType, targetId
before?, after?
requestId, operationId
ipHash, userAgent?
timestamp
riskLevel?
```

Mandatory categories:

- role and permission changes
- student and staff identity changes
- mark and result changes
- result publication
- guardianship verification
- imports and exports
- payments and refunds
- sensitive record access
- soft deletes and data deletion/export
- admin sign-in and platform operations

## Offline model

Firestore persistence is retained for current data. For attendance and marks, Phase 1 should use:

- stable operation IDs
- local pending queue
- server timestamp plus client device time
- versioned write documents
- idempotent callable operations
- last-writer conflict protection for records that are editable only by the school server
- audit of offline-origin operations
- explicit synchronization and conflict status in the UI

Background sync and Workbox update behavior remain shell-level until offline modules are formally implemented.

## Testing and quality gate

### Emulator rules tests

Mandatory scenarios:

- unauthenticated denies organization, school, student, medical, assignment, and submission reads/writes
- organization A cannot read organization B
- branch A cannot read branch B
- owner can access configured organization branches
- principal can manage approved branch records
- teacher cannot read unassigned classes
- teacher cannot write another teacher's marks
- student cannot read private assignment answers
- student can submit only own submission
- guardian reads only verified linked learners
- guardian cannot read unlinked siblings or other families
- client cannot write custom claims, memberships, roles, private keys, or audit logs
- platform-admin access is isolated to platform functions
- assigned-storage paths enforce tenant, size, and MIME restrictions

### Function unit tests

- Zod rejection cases
- tenant mismatch cases
- claims and permission failures
- counter/idempotency behavior
- assignment timing and attempt limits
- private answer isolation
- marking policies and answer-review rules
- formula neutralization
- duplicate detection
- country-pack grading boundaries with `VERIFY WITH OFFICIAL SOURCE` fixtures

### End-to-end flows

- registration and first school branch
- invitation and acceptance
- student enrollment and generated admission ID
- staff invitation and role-aware ID
- guardian link and verification
- assignment creation, schedule, submission, marking, result release, and review
- offline attendance and marks entry with sync

### Accessibility and build gates

- Build all workspaces
- Run strict lint/typecheck scripts
- WCAG AA automated checks and keyboard review
- Mobile interaction review at low data/network conditions
- No secrets, Firebase Admin credentials, or production endpoints in source

## Phase 1 entry criteria

Phase 1 implementation must begin only after approval of this Phase 0 document.

Before any production tenant code:

1. Replace prototype direct writes for admission, identity, student, staff, and assignment creation with callables.
2. Add assignment, private-key, submission, and counter rules.
3. Complete Storage assignment/import/branding paths.
4. Define and seed the first `countryPack` with explicit official-source verification flags.
5. Add emulator rule tests and execute them locally.
6. Add a local/emulator test data seed and clean reset script.
7. Separate dev, staging, and production Firebase projects.
8. Enable App Check in a staged rollout and document emulator behavior.
9. Add exports/imports only through server-derived tenant and role context.
10. Establish audit log generation for all sensitive operations.

## Open decisions requiring approval

The following decisions need no implementation guesswork because official data or school policy is required:

1. Admission number scope and format: organization-wide or branch-specific.
2. Staff/teacher ID scope: organization-wide, role-wide, or branch-wide.
3. Student role ID format: retain `YY/0001`, or adopt a data-configured prefix while preserving uniqueness.
4. Maximum assignment attempts and default result-release mode.
5. Whether teacher manual answers review results require marking completion before public review.
6. Which official grading bands and boundaries are permitted to seed by country.
7. SMS, push, WhatsApp provider and credit-policy adapters.
8. Data retention periods and privacy deletion behavior by country.
9. App Check provider and staged enforcement dates.
10. School verification requirements and whether organization creation is public or invite-controlled in production.

Items described as official in this document require verification before they can be presented as authoritative.
