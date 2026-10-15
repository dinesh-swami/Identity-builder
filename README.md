# Indeity — Goal Achiever & Personal Execution OS

> **PLAN → EXECUTE → MEASURE → REVIEW → ADJUST → REPEAT**

**Indeity** is a production-minded personal life tracking, goal achievement, and execution operating system designed to turn long-term aspirations into measurable daily execution with strict personal accountability.

---

## 1. Core Architecture & Philosophy

The system strictly enforces personal integrity:
- **Historical Accuracy**: Never silently modifies historical data to make past performance appear better. If a deadline was rescheduled or delayed, the original plan is preserved, and the delay is reported.
- **Rollup Progress**: Progress cascades deterministically through the hierarchy:
  $$\text{Daily Tasks} \longrightarrow \text{Weekly Milestones} \longrightarrow \text{Monthly Milestones} \longrightarrow \text{Long-Term Goals}$$
- **Separate Progress from Schedule Health**: A goal can be 60% complete but behind schedule if the timeline required 80% completion by today. We report actual progress, planned progress, progress gap, deadline delays, overdue counts, and forecast status.
- **Strict 5-Minute Focus Break Rule**: Exactly 1 emergency break of up to 5 minutes (300 seconds) is allowed per block. If exceeded, the block is invalidated and its progress resets to zero. Incomplete blocks never credit work toward the daily target.
- **Affirmation Streak Integrity**: An affirmation qualifies for a daily streak only if it satisfies both $\ge 50$ words AND $\ge 300$ trimmed characters. Max 1 streak credit per local calendar day (`Asia/Kolkata` default). Missed calendar days break the consecutive streak while preserving the longest streak record.

---

## 2. Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL hosted on **Neon**
- **ORM**: Prisma ORM with native migrations
- **Validation**: Zod (strict server-side schemas)
- **Auth**: Secure session cookies with JWT (`jose`) and password hashing (`bcryptjs`)
- **Testing**: Vitest automated unit test suite
- **Styling**: Vanilla CSS Modules with dark execution OS theme tokens

---

## 3. Database & Neon PostgreSQL Setup

### Step 1: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and configure your credentials:
```env
# Neon PostgreSQL Connection URL (pooled or direct)
DATABASE_URL="postgresql://user:password@ep-cool-project-123456.us-east-2.aws.neon.tech/indeity?sslmode=require"

# Direct URL for migrations
DIRECT_URL="postgresql://user:password@ep-cool-project-123456.us-east-2.aws.neon.tech/indeity?sslmode=require"

# Secret Key (32+ chars)
JWT_SECRET="indeity_personal_execution_os_secure_secret_key_2026_at_least_32_chars"

# App Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEFAULT_TIMEZONE="Asia/Kolkata"
```

### Step 2: Synchronize Database Schema with Neon
Run either:
```bash
# Push schema directly to Neon
npm run prisma:push

# OR apply the generated migration
npm run prisma:migrate
```

The initial migration is pre-generated in:
`prisma/migrations/20261015000000_init/migration.sql`

---

## 4. Running the Application

### Development Server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Automated Tests:
```bash
npm test
```

### Production Build:
```bash
npm run build
npm start
```

---

## 5. Main Application Features & Pages

1. **Dashboard (`/dashboard`)**:
   - Daily target hours vs actual completed focus hours.
   - Percentage of target completed, completed blocks count, reset blocks count.
   - Live banner for active focus timer or break state.
   - Goals overview with rollup progress and schedule forecast.
   - Today's tasks, overdue alerts, and recent focus work blocks.

2. **Long-Term Goals (`/goals`)**:
   - Define multi-month objectives with completion criteria.
   - View progress rollup and schedule health (progress gap, deadline delay, forecast).
   - Modal for creating and editing goals.

3. **Milestones & Planning (`/milestones`)**:
   - Break goals down into Monthly Milestones (30-day blocks) and Weekly Milestones.
   - Filter by Goal.
   - Rollup progress and linked task counts.

4. **Daily Tasks & Review (`/daily`)**:
   - Manage tasks for any calendar date.
   - Checkbox completion, priority badges, estimated vs actual minutes.
   - **Reschedule Incomplete Tasks**: Preserves original planned date, requires delay reason, and logs an immutable `PlanChangeEvent` audit trail.
   - **End-of-Day Execution Review**: Structured review modal (What completed? What failed? Reason? Carry forward? Rating 1-10).
   - **Sleep & Schedule Logger**: Target vs actual sleep/wake times and overnight duration calculation.

5. **Focus Timer (`/timer`)**:
   - Flexible block lengths: 1m, 25m, 50m, 90m, 120m, or custom positive duration.
   - Link session to a specific daily task or run independently.
   - **5-Minute Emergency Break Rule**: Exactly one break allowed. If resumed $\le 300\text{s}$, remaining work continues. If $> 300\text{s}$, block is reset to 0 credit.
   - **Focus Blocker Mode**: Immersive fullscreen distraction-free view.

6. **Affirmations & Streaks (`/affirmations`)**:
   - Daily affirmation editor with live word and character counters.
   - Strict validation ($\ge 50$ words AND $\ge 300$ characters).
   - Streak tracking: consecutive calendar days increase streak; missed days break streak while preserving all-time longest streak.

7. **Analytics & Reports (`/reports`)**:
   - **Daily Report**: Target vs actual hours, planned vs completed tasks, reviews, and sleep log.
   - **Weekly Trends Report**: 7-day bar chart of daily focus hours, average hours, and on-time task completion rate.
   - **Long-Term Goal Reports**: Detailed rollup progress, progress gaps, delay days, and milestone breakdowns.

8. **Settings (`/settings`)**:
   - Daily focused-work target (default: 8 hours).
   - Configured timezone (default: `Asia/Kolkata`).
   - Sleep schedule targets.
   - Neon connection instructions and operational commands.

---

## 6. Verification and Test Results

Automated unit tests verified with Vitest (`npm test`):
- `tests/unit/progress.test.ts`: Binary task completion model, cancelled tasks excluded from denominator, division-by-zero protection, hierarchical rollup.
- `tests/unit/focusTimer.test.ts`: Full block completion credit, 5-minute break rule within allowance, break exceeding 300s reset to 0 credit, abandoned session zero credit.
- `tests/unit/affirmation.test.ts`: Rejection of $< 50$ words, rejection of $< 300$ chars, valid affirmation passing both, same-day duplicate prevention, consecutive streak increment, broken streak reset.
- `tests/unit/scheduleHealth.test.ts`: Planned progress calculation, progress gap, deadline delays, overdue detection, on-time completion rates.

Production build verified with Next.js (`npm run build`):
- All 11 pages compiled with 0 errors and optimized bundle sizes.
