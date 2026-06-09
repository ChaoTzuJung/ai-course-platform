import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  layout("routes/layout.app.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("courses", "routes/courses.tsx"),
    route("courses/:slug", "routes/courses.$slug.tsx"),
    route(
      "courses/:slug/lessons/:lessonId",
      "routes/courses.$slug.lessons.$lessonId.tsx"
    ),
    route("instructor", "routes/instructor.tsx"),
    route("instructor/:courseId", "routes/instructor.$courseId.tsx"),
    route(
      "instructor/:courseId/lessons/:lessonId",
      "routes/instructor.$courseId.lessons.$lessonId.tsx"
    ),
    route(
      "instructor/:courseId/lessons/:lessonId/quiz",
      "routes/instructor.$courseId.lessons.$lessonId.quiz.tsx"
    ),
  ]),

  route("dev/login", "routes/dev.login.tsx"),
  route("sign-in/*", "routes/sign-in.tsx"),
  route("sign-up/*", "routes/sign-up.tsx"),

  route("api/logout", "routes/api.logout.ts"),
  route("api/tutor", "routes/api.tutor.ts"),
  route("api/quiz-generate", "routes/api.quiz-generate.ts"),
] satisfies RouteConfig;
