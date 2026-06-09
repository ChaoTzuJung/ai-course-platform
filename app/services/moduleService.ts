import { eq, max } from "drizzle-orm";
import { db } from "~/db";
import { modules } from "~/db/schema";

// ─── Module Service ───

export function getModuleById(id: number) {
  return db.select().from(modules).where(eq(modules.id, id)).get();
}

export function getModulesByCourse(courseId: number) {
  return db
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.position)
    .all();
}

export function nextModulePosition(courseId: number) {
  const row = db
    .select({ value: max(modules.position) })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .get();
  return (row?.value ?? -1) + 1;
}

export function createModule(courseId: number, title: string) {
  return db
    .insert(modules)
    .values({ courseId, title, position: nextModulePosition(courseId) })
    .returning()
    .get();
}

export function updateModule(id: number, title: string) {
  return db
    .update(modules)
    .set({ title })
    .where(eq(modules.id, id))
    .returning()
    .get();
}
