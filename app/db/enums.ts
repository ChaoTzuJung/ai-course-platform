// Plain enums with no Drizzle/ORM imports, so client components can use them
// (e.g. in JSX comparisons) without pulling the database layer into the bundle.

export enum UserRole {
  Student = "student",
  Instructor = "instructor",
  Admin = "admin",
}

export enum CourseStatus {
  Draft = "draft",
  Published = "published",
  Archived = "archived",
}

export enum LessonProgressStatus {
  NotStarted = "not_started",
  InProgress = "in_progress",
  Completed = "completed",
}

export enum QuestionType {
  MultipleChoice = "multiple_choice",
  TrueFalse = "true_false",
}

export enum ChatRole {
  User = "user",
  Assistant = "assistant",
}
