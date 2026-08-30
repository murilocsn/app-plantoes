# FinancPlantões

A web application for healthcare professionals to organize shifts, work locations, payments, expenses, and personal financial routines in one place, with per-user isolation and secure access.

> Status: active MVP under continuous refinement. The current focus is stability, security, and a simple daily workflow that remains easy to use.

## Product vision

FinancPlantões is designed to go beyond a schedule tool. The goal is to combine shift management with personal financial tracking and, over time, shared-expense workflows inspired by collaboration-oriented apps.

The product is informed by practical patterns from tools such as:

- Plantãozinho: fast shift creation, payment tracking, recurring patterns, and a clear overview of upcoming work.
- Splitwise: shared balances, participant tracking, expense management, and a simple way to understand shared responsibilities.

The intention is not to copy either product directly, but to adapt the best parts of their usability to the specific needs of healthcare professionals.

## Current state

The active application is being organized around the modern structure under the workspace apps folder. The repository still contains older static files in the project root as part of the migration from a legacy web app to the current modular setup.

The project already includes:

- Supabase Auth
- user-level isolation with PostgreSQL + RLS
- shift calendar
- shift creation, update, and deletion
- work locations
- recurring patterns
- duration and value calculations
- financial indicators
- reports and export flows
- PWA support and notification infrastructure
- shared space features in progress
- personal and shared financial tracking in progress

## Core product features

### Shifts

- date, time, duration, location, and value
- day and night shifts
- recurring schedules
- monthly calendar view
- editing and deletion
- tracking of received and outstanding amounts

### Locations

Each user can create, update, and delete their own work locations.

The next version of this flow is expected to also include payment rules per location so that receivables and follow-up can be managed more intelligently.

### Payments

Accepted payment methods should remain flexible, including:

- bank transfer
- PIX
- cash
- other user-defined methods

The system should record payment details without forcing the user to rely on a specific provider.

### Recurrences

When deleting a recurring pattern, the user should be clearly asked to choose between:

1. this occurrence only
2. this and following occurrences
3. the entire series
4. cancel

This rule is part of the product behavior and should be preserved in future refactors.

### Shared spaces

The idea behind Spaces is to support contexts such as a residence, clinic, trip, event, or other shared group.

Planned evolution includes:

- space creation
- participant invites
- per-user permissions
- shared expenses
- balance and responsibility views
- separation between personal and shared data

Privacy should remain straightforward: a user can only see their own personal data and shared data from spaces they participate in.

## Current architecture

The project is transitioning from a static web application to a modular structure. The real active application is now centered around the workspace packages and app folders, while the root still contains legacy files from the earlier implementation.

```text
FinancPlantões
├── apps/
│   ├── api/                    # Express API and backend logic
│   └── web/                   # React frontend
├── packages/
│   └── shared/                # shared schemas, types, and utilities
├── database/
│   └── migrations/
├── docs/
├── public assets and legacy files
├── README.md
├── package.json
├── tsconfig.base.json
└── .env.example
```

### Critical authentication rule

The browser should use a single Supabase client instance for the application. Creating multiple clients using the same storage key can lead to undefined behavior and authentication issues.

The active frontend code should manage session state consistently through a single provider and shared client instance.

### Service worker

The service worker should not serve stale copies of dynamic files. HTML, JavaScript, and CSS should be fetched from the network when needed, while static assets can be cached selectively.

This matters because it prevents older versions of the application from continuing to run after a deployment or code change.

## Security

Supabase Auth identifies the user, while PostgreSQL applies Row Level Security.

```text
User
  ↓
Supabase Auth
  ↓
Single frontend session
  ↓
Supabase PostgreSQL
  ↓
RLS: auth.uid() = user_id
```

The public anon/publishable key may be used in the frontend. The service role or any private key must never be exposed in browser code.

## Database

The project uses, among others, tables for:

- locations
- shifts
- settings
- push subscriptions
- recurrence structures
- financial and shared-space data

The locations table uses id as its primary key. The frontend should generate identifiers when needed, while the database may provide a default value to avoid missing records.

## UX and product principles

The product should prioritize:

1. Speed: creating a shift should be faster than editing a spreadsheet.
2. Financial clarity: the user should understand what is due, what has been received, and what remains pending.
3. Calendar as the working center: the agenda must be visual, readable, and stable.
4. Obvious actions: buttons like “+ Shift”, “+ Location”, and “+ Space” should be immediate and predictable.
5. Low friction: avoid unnecessary screens and confirmations.
6. Privacy: personal data must never leak across users.
7. Explicit collaboration: shared data should make participation and permissions visible.
8. Mobile-first workflow: healthcare professionals often work while moving between shifts or facilities.
9. Stability before new features: a new feature should not be considered ready if it causes regressions in login, calendar flow, or user data integrity.

## Roadmap

### P0 — Recovery and stability

- [x] Supabase Auth
- [x] user-level RLS
- [x] single Supabase client in the main flow
- [x] removal of aggressive dynamic cache behavior
- [ ] validate login and logout in a clean browser session
- [ ] validate absence of duplicate GoTrue client instances
- [ ] validate session recovery without infinite reload loops
- [ ] validate calendar stability
- [ ] validate CRUD for locations
- [ ] validate CRUD for shifts
- [ ] validate spaces
- [ ] validate isolation between two accounts

### P1 — Core experience

- [ ] fast and responsive calendar
- [ ] quick shift creation flow
- [ ] simple location editing
- [ ] location-based payment rules
- [ ] received vs pending overview
- [ ] filters by period and location
- [ ] recurrence handling with granular deletion rules
- [ ] mobile and PWA improvements

### P2 — Finance and collaboration

- [ ] structured receivables
- [ ] recurring expenses
- [ ] spaces with invites and permissions
- [ ] shared expenses
- [ ] balances by space
- [ ] payment tracking for cash, PIX, transfer, and other methods
- [ ] simplified balance sharing between participants
- [ ] richer financial reporting

### P3 — Product maturity

- [ ] usage and stability metrics
- [ ] simple onboarding flow
- [ ] clear separation between free and premium features
- [ ] reliable backup and sync strategy
- [ ] useful notifications
- [ ] automated regression tests for critical flows
- [ ] error monitoring
- [ ] monetization strategy before scaling features

## Local development

Because the project uses modern frontend and API tooling, it is recommended to run the project through the workspace scripts.

```bash
npm install
npm run typecheck
npm run dev
```

Or run each application separately:

```bash
npm run dev:api
npm run dev:web
```

Then open the frontend in the browser, usually at:

```text
http://localhost:5173
```

## Regression checklist

Before considering a change ready to merge:

- [ ] open the app without reloading the page repeatedly
- [ ] session persists correctly
- [ ] login works
- [ ] logout works
- [ ] no duplicate GoTrue client warnings appear in console
- [ ] calendar renders once and remains responsive
- [ ] add, edit, and remove a location
- [ ] add, edit, and remove a shift
- [ ] recurrence rules are preserved correctly
- [ ] create and manage spaces
- [ ] data remains isolated by user
- [ ] verify behavior on desktop and mobile
- [ ] verify cache and service worker behavior after frontend changes

## Product references

- [Plantãozinho](https://plantaozinho.com/)
- [Splitwise](https://www.splitwise.com/)

Essas referências são usadas somente para benchmarking de experiência, organização de fluxos e ideias de produto. O objetivo é desenvolver uma identidade própria para o FinancPlantões.

## Licença

Projeto proprietário em desenvolvimento. Definir a licença de distribuição antes de qualquer publicação como software open source.
