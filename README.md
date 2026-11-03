# EDUMO — Multi-Tenant School Management PWA

> Next-generation school management for East African schools and academy groups.
> Built on Firebase, React, and TypeScript.

## Overview

Edumo is a SaaS school management platform designed for schools across East Africa (Kenya, Uganda, Tanzania, Rwanda). It supports:

- **Multi-tenant isolation** — each organization is fully isolated
- **Multi-branch/campus** — academy groups manage branches from a single dashboard
- **Country packs** — curriculum, grading, calendar, and payment defaults per country
- **Offline-first** — attendance and marks work without internet via PWA + Firestore persistence
- **Mobile-first** — optimised for teachers and parents on low-end Android devices
- **i18n** — English, Swahili, French, Kinyarwanda (Luganda planned)

## Architecture

```
Edumo/
├── shared/          # Shared TypeScript types, constants, country packs
├── functions/       # Firebase Cloud Functions (2nd gen, TypeScript, Zod)
├── web/             # React + Vite + Tailwind PWA frontend
├── firestore.rules  # Deny-by-default Firestore security rules
├── storage.rules    # Tenant-scoped storage rules
└── firebase.json    # Firebase project configuration
```

**Monorepo** managed via npm workspaces. Three packages:
- `@edumo/shared` — types, enums, country pack data, role permissions
- `@edumo/functions` — Cloud Functions callables, triggers, schemas, middleware
- `@edumo/web` — React SPA with TanStack Query, react-hook-form, i18n

## Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 9.x
- **Java** ≥ 11 (required for Firebase Emulators)
- **Firebase CLI** (`npm install -g firebase-tools`)
- A Firebase project (default: `edumo-72c67`)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build shared types (must build before functions)
npm run build --workspace=shared

# 3. Build everything
npm run build

# 4. Start Firebase Emulators with persistent data
npm run emulators

# 5. In another terminal, start the dev server
npm run dev
```

The app will be at `http://localhost:5173` and emulator UI at `http://localhost:4000`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server for the web app |
| `npm run build` | Build shared → functions → web |
| `npm run typecheck` | Type-check all three packages |
| `npm run lint` | Lint all packages |
| `npm run test:rules` | Run Firestore security rules tests (requires emulator) |
| `npm run test:functions` | Run Cloud Functions unit tests |
| `npm run test` | Run all tests |
| `npm run seed` | Seed the emulator with demo data |
| `npm run emulators` | Start Firebase Emulators with data persistence |
| `npm run emulators:clean` | Start emulators without importing saved data |

## Firebase Emulators

The project uses these emulator ports:

| Service | Port |
|---------|------|
| Auth | 9099 |
| Firestore | 8080 |
| Functions | 5001 |
| Storage | 9199 |
| Hosting | 5000 |
| Emulator UI | 4000 |

### Running Rules Tests

Rules tests require the Firestore emulator. Use:

```bash
npx firebase emulators:exec --only firestore "npm run test:rules"
```

### Seeding Demo Data

```bash
npx firebase emulators:exec --only firestore "npm run seed"
```

This seeds:
- 5 country packs (KE, UG, TZ, RW, GENERIC)
- 1 demo organization with 1 main campus
- Academic calendar for 2026, Term 1
- Classes and streams
- Demo students and staff

## Cloud Functions (Callables)

All sensitive operations go through server-validated callable functions:

| Function | File | Description |
|----------|------|-------------|
| `createOrganization` | organization.ts | Create org + first school with claims |
| `updateOrganization` | organization.ts | Update org settings/branding |
| `addBranch` | organization.ts | Add a school branch to an org |
| `mergeBranch` | organization.ts | Merge source branch into target |
| `createInvite` | invite.ts | Generate invite code for a role |
| `acceptInvite` | invite.ts | Accept invite and gain role/claims |
| `revokeInvite` | invite.ts | Cancel a pending invite |
| `assignRole` | role.ts | Assign/change user's school role |
| `removeRole` | role.ts | Remove user's role for a school |
| `linkGuardian` | guardian.ts | Create guardian-student link |
| `verifyGuardianLink` | guardian.ts | Admin verifies guardian identity |
| `createStudent` | student.ts | Server-validated student creation |
| `updateStudent` | student.ts | Server-validated student updates |
| `transferStudent` | student.ts | Cross-branch/org student transfer |
| `softDeactivateStudent` | student.ts | Soft-delete with retention |
| `createStaff` | staff.ts | Server-validated staff creation |
| `updateStaff` | staff.ts | Server-validated staff updates |
| `markAttendance` | attendance.ts | Server-validated attendance marking |
| `createAssignment` | assignment.ts | Create assignment with private data |
| `submitAssignment` | assignment.ts | Student assignment submission |
| `releaseAssignmentResults` | assignment.ts | Release results to students |
| `bulkImport` | import.ts | Secure Excel bulk import |
| `rollbackImport` | import.ts | Rollback last import batch |

## Security Model

### Non-Negotiable Rules

1. **Deny-by-default** — every Firestore/Storage collection explicitly allowed
2. **Custom claims only via Cloud Functions** — clients can never set roles
3. **Tenant isolation** — orgId/schoolId in path must match JWT claims
4. **Role-based access** — permissions enforced at both rules and function level
5. **Immutable fields** — createdAt, createdBy, admissionNumber, orgId cannot be changed
6. **Audit logging** — role changes, grade changes, imports/exports, payments

### Firestore Rules Coverage

The rules cover 40+ collections and subcollections including:
- Organizations, schools, academic years, terms
- Students (with medical, specialNeeds, documents subcollections)
- Staff (with documents subcollection)
- Classes, streams, subjects
- Attendance, assessments, marks, report cards
- Fee structures, invoices, payments, expenses
- Announcements, assignments, messages, events
- Behaviour, health, welfare (restricted)
- Transport, library, inventory, hostel
- Timetables, admissions, leave, visitors, clubs
- Payroll, consentRecords, deletionRequests, auditAccess
- Campuses, gradingConfigs, reportTemplates
- Users, guardianLinks, invites, countryPacks, auditLogs, platform

### Running Security Audit

```bash
# Run all 52+ security rules tests
npx firebase emulators:exec --only firestore "npm run test:rules"
```

## Country Packs

Country packs are **data, not code**. Each pack includes curriculum levels, grading scales, academic calendar defaults, currency, and locale settings.

| Pack | Country | Curriculum | Grading |
|------|---------|------------|---------|
| KE | Kenya | CBC + 8-4-4 | 8-level competency / classic marks |
| UG | Uganda | UNEB | D1–F9 nine-band |
| TZ | Tanzania | NECTA | Division I–IV |
| RW | Rwanda | Rwanda CBC | A–E scale |
| GENERIC | International | Custom | Percentage / letter grades |

> ⚠️ All default values are marked `VERIFY WITH OFFICIAL SOURCE`. Schools can override everything.

## i18n

Supported languages:
- 🇬🇧 English (`en.json`) — default
- 🇰🇪🇹🇿 Swahili (`sw.json`)
- 🇷🇼🇨🇩 French (`fr.json`)
- 🇷🇼 Kinyarwanda (`rw.json`)

Language is auto-detected from browser settings and stored in localStorage.

## Deployment

```bash
# Build everything first
npm run build

# Deploy to Firebase (functions + hosting + rules)
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# Deploy only rules
firebase deploy --only firestore:rules,storage:rules
```

## Security Checklist (Pre-Production)

- [ ] Enable App Check with reCAPTCHA Enterprise
- [ ] Enable `enforceAppCheck: true` on all callable functions
- [ ] Set up separate Firebase projects for dev/staging/production
- [ ] Configure budget alerts on Firebase
- [ ] Review all `VERIFY WITH OFFICIAL SOURCE` values with ministry data
- [ ] Enable email/phone verification requirements
- [ ] Configure 2FA for admin roles
- [ ] Set up Cloud Monitoring alerts and uptime checks
- [ ] Review CSP headers in firebase.json
- [ ] Run penetration testing (Phase 6)

## Project Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ Complete | Architecture, data model, rules, functions, country packs |
| 1 | 🔜 Next | Foundation MVP — onboarding, records, attendance, announcements |
| 2 | Planned | Academics — grading engine, marks, report cards, timetable |
| 3 | Planned | Finance — fees, payments, M-Pesa, reconciliation |
| 4 | Planned | Operations — admissions, messaging, transport, pastoral |
| 5 | Planned | Extended — library, boarding, platform console, BigQuery |
| 6 | Planned | Hardening — pen testing, accessibility, privacy policy |

## License

Private. All rights reserved.

