# AI Course Platform — Product Requirements Document

**Status:** Draft for review
**Last updated:** 2026-06-09
**Owner:** Alan

---

## 1. Problem & Motivation

Online course platforms are good at *delivering* content but weak at *teaching*. A learner who gets stuck on a lesson has no one to ask — they must leave the platform, search elsewhere, and lose context. On the other side, instructors spend disproportionate time on low-value authoring chores like writing quiz questions, which slows down course creation.

This product addresses both gaps with AI woven into the core loop:

- **For learners:** an AI tutor that answers questions *about the specific lesson they're reading*, grounded in that lesson's content — so help is in-context and never requires leaving the page.
- **For instructors:** AI-assisted quiz authoring that turns a lesson's content into draft questions in seconds, which the instructor then reviews and edits before publishing.

**Intended outcome:** a working, self-hostable two-sided course platform where AI demonstrably reduces learner friction and instructor authoring effort — runnable end-to-end with zero external API keys (so it can be demoed immediately) and upgradeable to real AI providers via a single environment variable.

---

## 2. Goals

1. Deliver a complete two-sided course platform: instructors author, learners consume.
2. Ship two AI features that are genuinely useful, not gimmicks: in-context tutor chat and quiz generation.
3. Be **vendor-neutral** for AI — swap between Claude, OpenAI, or a stub with no code change.
4. Run locally with **zero configuration** (no AI keys, no auth provider) so anyone can try the full flow immediately.
5. Match the conventions and quality bar of the reference project (`cohort-004-project`).

### Non-Goals (v1)

- Payments / paid courses / pricing tiers.
- Certificates, gamification, badges, streaks.
- Discussion forums, peer-to-peer messaging, cohorts.
- Mobile native apps.
- Multi-tenant / organization accounts.
- Video hosting (we embed external video URLs only).
- Fine-grained admin analytics dashboards.

---

## 3. User Roles

| Role | Who | Can do |
|------|-----|--------|
| **Student** | Default for any signed-in user | Browse & enroll in published courses, view lessons, use the AI tutor, take quizzes, track personal progress. |
| **Instructor** | Course creators | Everything a student can, plus: create/edit courses, modules, lessons; generate & edit quizzes; publish/unpublish/archive their own courses. |
| **Admin** | Operators | Everything, plus oversight across all courses and users (lightweight in v1: view all, change roles). |

Roles are stored on the user record. Instructor actions are authorized per-resource (an instructor manages only their own courses).

---

## 4. Feature List

### 4.1 Course catalog & enrollment (learner)
- Public landing page with a grid of **published** courses.
- Course browse/list page.
- Course detail page: title, description, image, module/lesson outline, **Enroll** button.
- Enrollment is free and immediate; a learner can enroll in many courses.

### 4.2 Lesson experience (learner)
- Lesson view renders Markdown content + an optional embedded video.
- Progress controls: mark a lesson **in progress** / **completed**.
- **AI Tutor chat panel** docked in the lesson view (see §6.1).
- If the lesson has a quiz, an entry point to take it.

### 4.3 Progress tracking (learner)
- Per-lesson status: not started / in progress / completed.
- A **dashboard** showing the learner's enrolled courses and percentage completion each.

### 4.4 Quizzes (learner)
- Take a quiz attached to a lesson: multiple-choice and true/false questions.
- Submit answers, get a score, see which were correct.
- Attempts are recorded (a learner may retake).

### 4.5 Course authoring (instructor)
- Create a course (title, slug, description, image URL); starts as **draft**.
- Add/reorder **modules**; add/reorder **lessons** (Markdown content + optional video URL).
- Publish (makes it visible to learners), unpublish, archive.
- Instructor home listing their courses with status.

### 4.6 AI quiz authoring (instructor)
- In a lesson's quiz editor, **"Generate with AI"** produces draft questions from the lesson content (see §6.2).
- Generated questions are **drafts** — the instructor edits, removes, reorders, and only then **saves**. Nothing is auto-published.

---

## 5. Primary User Flows

### 5.1 Learner: enroll → learn → get help → quiz
1. Land on home → browse published courses → open a course.
2. Click **Enroll**.
3. Open a lesson → read content / watch video.
4. Stuck → ask the **AI Tutor** a question in the side panel → get a streamed answer grounded in this lesson.
5. Mark the lesson **completed** → progress updates on the dashboard.
6. Take the lesson quiz → submit → see score.

### 5.2 Instructor: author → generate quiz → publish
1. Go to instructor area → **Create course** (draft).
2. Add modules and lessons (Markdown + optional video).
3. Open a lesson's **quiz editor** → **Generate with AI** → review/edit draft questions → **Save**.
4. **Publish** the course → it appears in the public catalog.

### 5.3 First-run (no configuration)
1. Clone, install, migrate, seed.
2. Run the app — no AI keys, no auth provider configured.
3. **Dev-login** as a seeded instructor or student.
4. The entire flow works: tutor chat streams a deterministic stubbed reply; quiz generation returns deterministic placeholder questions. This proves the product end-to-end before any external setup.

---

## 6. AI Behavior

The AI layer is **vendor-agnostic**, built on the Vercel AI SDK. Provider is selected by environment (see §8). All AI calls are simple request→response/stream operations — no autonomous agent loops.

### 6.1 AI Tutor Chat
- **Trigger:** learner sends a message in the lesson's tutor panel.
- **Grounding:** the request is constrained to the current lesson — the system prompt includes the lesson title, its parent course/module, and the lesson's Markdown content. The tutor is instructed to help the learner understand *this lesson*, to stay on-topic, and to say so when a question falls outside the lesson scope.
- **Behavior:** streamed responses (token-by-token) for responsiveness. Chat history per (learner, lesson) is persisted so the conversation survives reloads.
- **Stub mode:** returns a deterministic, streamed canned reply that references the lesson title, so the UX is fully exercisable without a provider.

### 6.2 AI Quiz Generation
- **Trigger:** instructor clicks "Generate with AI" in a lesson's quiz editor.
- **Input:** the lesson's content + a requested question count.
- **Output:** a **structured** set of questions validated against a Zod schema — each question has a type (`multiple_choice` | `true_false`), a prompt, options, and the correct answer. Structured output guarantees the editor can render the result without parsing failures.
- **Behavior:** output is presented as editable drafts; the instructor must explicitly save. Never auto-saved or auto-published.
- **Stub mode:** returns deterministic placeholder questions derived from the content so the authoring flow is exercisable without a provider.

---

## 7. Data Model (conceptual)

| Entity | Key fields | Notes |
|--------|-----------|-------|
| **User** | id, clerkId?, email, name, avatarUrl, role | `clerkId` null for seeded/dev users; mirror row created on first Clerk sign-in. |
| **Course** | id, slug, title, description, imageUrl, instructorId, status | status: draft / published / archived. |
| **Module** | id, courseId, title, order | Ordered within a course. |
| **Lesson** | id, moduleId, title, slug, content (Markdown), videoUrl?, order | Ordered within a module. |
| **Enrollment** | id, userId, courseId, enrolledAt | Unique per (user, course). |
| **LessonProgress** | id, userId, lessonId, status, completedAt? | status: not_started / in_progress / completed. |
| **Quiz** | id, lessonId, title | One quiz per lesson. |
| **QuizQuestion** | id, quizId, type, prompt, options, correctAnswer, order | type: multiple_choice / true_false. |
| **QuizAttempt** | id, userId, quizId, score, answers, submittedAt | Retakes allowed. |
| **ChatMessage** | id, userId, lessonId, role, content, createdAt | Persisted tutor-chat history per learner+lesson. |

---

## 8. Configuration Modes (env-driven)

The product is designed to run at three escalating levels of configuration. **Each level requires zero code changes — only environment variables.**

### AI provider
| `AI_PROVIDER` | Requires | Behavior |
|---------------|----------|----------|
| `stub` (default when no key) | nothing | Deterministic canned tutor replies + placeholder quiz questions. Full UX, no cost. |
| `openai` | `OPENAI_API_KEY` | Real AI via OpenAI models. |
| `anthropic` | `ANTHROPIC_API_KEY` | Real AI via Claude models (preferred for quality). |

If `AI_PROVIDER` is unset, the app auto-detects: Anthropic key → Anthropic, else OpenAI key → OpenAI, else stub.

### Authentication
| Mode | Requires | Behavior |
|------|----------|----------|
| **Dev-login** (default) | nothing | Pick a seeded user (student/instructor/admin) to sign in. For local dev and demos. |
| **Clerk** | `CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | Real email/password (and Clerk social) login; an app user mirror row is created on first sign-in. Dev-login is disabled. |

---

## 9. Success Criteria

The build is successful when:

1. **Zero-config run:** with no AI or Clerk keys, a user can dev-login, and complete both full flows (§5.1 instructor authoring incl. stub quiz generation; §5.2 learner enroll→lesson→stub tutor chat→progress→quiz).
2. **Real AI swap:** setting `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) and the provider env makes tutor chat stream a genuinely lesson-grounded answer and quiz generation produce real, schema-valid questions — with no code change.
3. **Real auth swap:** setting Clerk keys replaces dev-login with real Clerk auth and creates the user mirror row on first sign-in.
4. **Quality bar:** type-checks clean; unit tests for quiz scoring and progress logic pass; conventions match the reference project (service layer, file-based routes, Drizzle schema, shadcn/Tailwind).

---

## 10. Open Questions / Assumptions

- **Models:** when on Claude, default to `claude-opus-4-8`; when on OpenAI, a current general model (e.g. `gpt-4.1`). Configurable later.
- **Video:** external embeds only (e.g. YouTube URLs); no upload pipeline in v1.
- **Admin depth:** v1 admin is intentionally thin (view-all + role change); richer moderation/analytics deferred.
- **Persistence:** SQLite file (matches reference); fine for single-node/demo, revisit for multi-node deploy.
