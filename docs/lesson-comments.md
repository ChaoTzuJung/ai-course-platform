# Lesson Comments + Instructor Moderation — Feature Spec

**Status:** Draft for review
**Last updated:** 2026-06-10
**Owner:** Alan
**Relates to:** `docs/spec.md` (extends §4 Feature List, §7 Data Model)

---

## 1. Problem & Motivation

A lesson today offers an AI tutor and an optional quiz, but learners have **no way to talk to each other** — they can't ask a public question, share a tip, or flag a confusing passage where the next learner will see it. And instructors have no lever to keep that discussion useful.

This feature adds a **flat comment thread per lesson**: enrolled students (and the instructor) post short comments, and the course's instructor moderates by **soft-deleting** off-topic or inappropriate comments. It is deliberately minimal — no threading, no rich text, no edit history — so it adds discussion value without becoming a forum to maintain.

**Intended outcome:** each lesson gains a lightweight discussion that helps learners help each other, while the instructor can remove bad comments without losing the underlying data.

---

## 2. Design Decisions

The agreed decisions that drive this spec:

| Decision | Choice |
|----------|--------|
| **Structure** | Flat — simple chronological list, no threading. |
| **Editing** | No editing — comments are immutable once posted. |
| **Deletion** | Soft delete — sets a `deletedAt` timestamp; the row stays in the DB for audit. |
| **Deleted-comment UX** | Show a placeholder — `"[Comment removed]"` in the list. |
| **Visibility** | Enrolled only — enrolled students, the course instructor, and admins see comments. |
| **Who can post** | Enrolled students + course instructor + admins. |
| **Who can delete** | Author + course instructor + admins. |
| **Sort order** | Oldest first — reads like a natural conversation. |
| **Character limit** | 500 characters. |
| **Placement** | Below all lesson content — after the quiz / mark-complete control. |

---

## 3. User Roles & Permissions

| Role | Post | See | Delete |
|------|------|-----|--------|
| **Student (enrolled)** | Yes | All comments (deleted ones show as a placeholder). | Soft-delete **own** only. |
| **Student (not enrolled)** | — | No — the lesson view is enrollment-gated; they're redirected. | — |
| **Instructor (course owner)** | Yes | All comments. | Soft-delete **any** comment on their lessons. |
| **Admin** | Yes | All comments. | Soft-delete **any** comment. |

- **Deletion is soft and unified:** author, course instructor, and admins can delete; deleting sets `deletedAt` and the row remains for audit. There is one removal mechanism (no separate "hide").
- Posting requires being the course instructor/admin or an **enrolled** student. The lesson view is enrollment-gated, and is widened so the course instructor/admin can open it to read and moderate even when not enrolled.

---

## 4. Feature Behavior

### 4.1 Post a comment (enrolled student, instructor, or admin)
- Below the lesson content, a comment box accepts up to **500 characters** of plain text.
- On submit, the comment is appended to the **bottom** of the list (oldest first), attributed to the author's name.

### 4.2 Delete a comment (author, instructor, or admin)
- A **Delete** control appears on comments the viewer is allowed to remove (their own, or — for instructor/admin — any).
- Deleting is **soft**: it records `deletedAt`; the row stays in the database.
- In the list, a deleted comment is replaced by a **`[Comment removed]`** placeholder (author name and body are no longer shown).

---

## 5. Primary User Flows

### 5.1 Student asks a question
1. Enrolled student opens a lesson, reads the content.
2. Scrolls to the Discussion section below the content/quiz.
3. Posts "Why does step 3 use a unique index?" → it appears at the bottom of the list.
4. Another enrolled student (or the instructor) opens the lesson and replies by posting their own comment.

### 5.2 Instructor moderates
1. Instructor opens a lesson in their course (allowed even if not enrolled).
2. Sees an off-topic comment → clicks **Delete** → the comment is soft-deleted and now renders as `[Comment removed]` for everyone.
3. The underlying row remains in the database for audit.

### 5.3 Student removes their own comment
1. Student changes their mind about a comment they posted.
2. Clicks **Delete** on their comment → it becomes `[Comment removed]` in the list.

---

## 6. Data Model (conceptual)

Extends §7 of `docs/spec.md` with one new entity:

| Entity | Key fields | Notes |
|--------|-----------|-------|
| **LessonComment** | id, lessonId, userId, body, deletedAt, createdAt | `body` is plain text, ≤ 500 chars. `deletedAt` is null until soft-deleted. **Flat** — no `parentId`. **No `updatedAt`** (immutable). Soft-deleted rows are retained for audit. |

- `lessonId` references Lesson; `userId` references User.
- Comments are ordered by `createdAt` **ascending** (oldest first).
- The author's display name and role are read by joining User at query time (not denormalized).

---

## 7. Display Rules

- **Sort:** oldest first (chronological).
- **Length limit:** 500 characters, enforced client-side (textarea `maxLength`) and server-side (rejected with a 400 if exceeded).
- **Deleted comments:** rendered as a muted `[Comment removed]` placeholder in their original position — shown to everyone (students and moderators alike). Author name and body are not displayed.
- **Attribution:** each live comment shows the author's name and an "Instructor" badge when the author is an instructor.
- **Empty state:** "No comments yet."
- **Placement:** the Discussion section renders **below all lesson content** — after the lesson text/video, the quiz, and the mark-complete control. (The lesson page has no prev/next navigation today.)

---

## 8. Surfaces

| Surface | Route | What's shown |
|---------|-------|--------------|
| **Lesson view** | `/courses/:slug/lessons/:lessonId` | The Discussion section below all content: a post box and the comment list with a Delete control on comments the viewer may remove. |

Access note: the lesson view is currently enrollment-gated. It is widened so the course instructor/admin can open it to read and moderate; the post box is available to enrolled students, the course instructor, and admins.

---

## 9. Success Criteria

The feature is complete when:

1. An enrolled student (or the instructor/admin) can post a comment (≤ 500 chars); it appears at the bottom of the lesson's list, oldest-first.
2. An author can soft-delete their own comment; it becomes `[Comment removed]`.
3. The course instructor (even when not enrolled) can open the lesson and soft-delete any comment; it becomes `[Comment removed]` for everyone, and the row remains in the DB.
4. A student cannot delete another student's comment — no control is shown, and a forged delete request is rejected (403).
5. A non-enrolled, non-owner user is still redirected away from the lesson page.
6. Type-checks clean; unit tests cover the comment service (body validation, delete-permission logic for author vs instructor/admin vs other, and placeholder rendering for deleted rows).

---

## 10. Open Questions / Assumptions

- **Restore (un-delete):** assumption — soft-delete is one-way in the UI for v1 (data retained for audit only); a restore control is a possible later addition.
- **Deleted lesson / unenroll:** assumption — comments persist if the author unenrolls; comments are removed if the lesson is deleted (FK cleanup, deferred to implementation).
- **Rate limiting / spam:** out of scope for v1; revisit if abuse appears.
- **Future extensions:** one-level replies, a sort toggle (newest-first), and instructor pinning are natural follow-ups but explicitly out of scope here.
