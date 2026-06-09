# Course Star-Ratings — Feature Spec

**Status:** Draft for review
**Last updated:** 2026-06-10
**Owner:** Alan
**Relates to:** `docs/spec.md` (extends §4 Feature List, §7 Data Model)

---

## 1. Problem & Motivation

The platform lets students browse and enroll in courses, but there is **no feedback signal** on course quality. A prospective learner browsing the catalog has nothing to distinguish a strong course from a weak one, and instructors get no lightweight quality signal from their learners.

This feature adds a **star-only rating system**: enrolled students rate a course from 1 to 5 stars, and the **average rating + number of ratings** is shown everywhere courses appear. It is intentionally minimal — a single tap of feedback, no written reviews to moderate.

**Intended outcome:** learners can gauge course quality at a glance from the catalog and course page, and the signal is trustworthy because only people who enrolled can rate.

---

## 2. Goals

1. Let an enrolled student give a course a **1–5 star rating** with no written text.
2. Show the **average rating and the number of ratings** wherever courses are visible — the course list page and the course detail page.
3. Allow a student to **change** their rating; the latest value replaces the old one.
4. Keep the signal honest: **one rating per student per course**, and **only enrolled students** can rate.
5. Match the conventions and quality bar of the existing codebase (service layer, file-based routes, Drizzle schema, shadcn/Tailwind).

### Non-Goals (v1)

- **Written reviews / comments** — star rating only.
- Review moderation, flagging, or reporting.
- Per-rating analytics, rating distribution histograms, or trends over time.
- Rating anything other than a whole course (e.g. per-lesson ratings).
- Notifying instructors of new ratings.
- Weighting, recency decay, or "verified completion" gating beyond enrollment.

---

## 3. User Roles & Permissions

| Role | Can rate? | Can see averages? |
|------|-----------|-------------------|
| **Student (enrolled in the course)** | Yes — submit and update their own rating. | Yes. |
| **Student (not enrolled)** | No — sees a read-only average, no rating control. | Yes. |
| **Instructor** | Sees averages on their courses. Rating their own course is an open question (§10). | Yes. |
| **Admin** | Sees averages. | Yes. |

Ratings are **gated on enrollment**: the rating control is only shown to enrolled students, and the submit action re-checks enrollment server-side and rejects (403) any rating attempt from a non-enrolled user.

---

## 4. Feature Behavior

### 4.1 Submit / update a rating (enrolled student)
- On the course detail page, an enrolled student sees an interactive 5-star control.
- Tapping a star (1–5) submits that rating for the course.
- If the student has rated before, the control is pre-filled with their current rating, and submitting **overwrites** it. There is never more than one rating per student per course.

### 4.2 Display average (everyone)
- Wherever a course is shown, its rating is displayed as **average + count**, e.g. `★ 4.5 (12)`.
- The average is computed over all ratings for that course.
- A course with no ratings shows the **"No ratings yet"** empty state (see §7).

---

## 5. Primary User Flows

### 5.1 Enrolled student rates a course
1. Student opens a course they're enrolled in (`/courses/:slug`).
2. In the sidebar, alongside the average, they see an interactive star control.
3. They tap 4 stars → the rating is saved → the displayed average updates to include their rating.
4. Later they return and tap 5 stars → their rating is updated (not duplicated) → the average reflects the change.

### 5.2 Browsing the catalog
1. Any signed-in user opens `/courses`.
2. Each course card shows `★ avg (count)`, or "No ratings yet" for unrated courses.
3. The user can compare courses at a glance before opening one.

### 5.3 Non-enrolled student
1. A student who has not enrolled opens a course page.
2. They see the read-only average and count, but **no** rating control.
3. To rate, they must enroll first.

---

## 6. Data Model (conceptual)

Extends §7 of `docs/spec.md` with one new entity:

| Entity | Key fields | Notes |
|--------|-----------|-------|
| **CourseRating** | id, userId, courseId, rating, createdAt, updatedAt | `rating` is an integer 1–5. **Unique per (user, course)** — re-rating updates the existing row and bumps `updatedAt`. Mirrors the `Enrollment` uniqueness pattern. |

- `userId` references User; `courseId` references Course.
- No written-text field by design.
- The average and count are **derived** (aggregated at read time), not stored on the Course.

---

## 7. Display Rules

- **Format:** average to one decimal place plus parenthesized count — `★ 4.5 (12)`.
- **Empty state:** when a course has zero ratings, show dimmed stars with the label **"No ratings yet"** (no "0.0", no "(0)").
- **Rounding:** the displayed star glyphs round the average to the nearest half-star for the visual; the numeric average shows one decimal. (Half-star rendering vs. nearest-whole is an open question — see §10.)
- **Two modes of the rating display:**
  - **Read-only mode** — used on the course list cards and for non-enrolled viewers on the detail page. Shows average + count only.
  - **Interactive mode** — used on the detail page for enrolled students. Shows tappable stars pre-filled with the student's current rating, submitting on selection.

---

## 8. Surfaces

| Surface | Route | What's shown |
|---------|-------|--------------|
| **Course list page** | `/courses` | Read-only `★ avg (count)` (or "No ratings yet") on each course card. |
| **Course detail page** | `/courses/:slug` | Read-only average + count for everyone; plus the interactive star control in the sidebar for enrolled students. |

Both surfaces read the rating data in their existing loaders. The list page should aggregate ratings for all visible courses in a single batched query (one query for the page, not one per course) to avoid an N+1.

---

## 9. Success Criteria

The feature is complete when:

1. An enrolled student can submit a 1–5 star rating on a course page and see the average update.
2. Re-rating updates the student's existing rating — the count does not increase and no duplicate is created.
3. A non-enrolled student sees the read-only average but no control, and a forged submit is rejected (403).
4. The course list page shows `★ avg (count)` per card, and unrated courses show "No ratings yet".
5. The course detail page shows the same average + count, consistent with the list page.
6. Type-checks clean; a unit test covers the rating service (insert, update-on-re-rate, average + count, and the zero-ratings case).

---

## 10. Open Questions / Assumptions

- **Half-star rendering:** show half-filled stars for averages like 4.5, or round to the nearest whole star for the glyphs while keeping the precise number in text? Assumption: half-star glyphs.
- **Instructor rating own course:** should an instructor be allowed to rate a course they own? Assumption: no special-casing in v1 — gated purely on enrollment.
- **Unenroll behavior:** if a student unenrolls, does their rating persist? Assumption: the rating persists (it reflects a real past experience).
- **Future extension:** this is deliberately star-only; written reviews, sorting the catalog by rating, and rating-distribution breakdowns are natural follow-ups but out of scope for v1.
