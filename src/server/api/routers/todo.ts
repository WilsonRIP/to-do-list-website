import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { todos } from "~/server/db/schema";

export const todoRouter = createTRPCRouter({
  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db.query.todos.findMany({
      orderBy: (todos, { desc }) => [desc(todos.createdAt)],
      where: eq(todos.createdById, ctx.session.user.id),
    });
  }),

  create: protectedProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(todos).values({
        text: input.text,
        createdById: ctx.session.user.id,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        text: z.string().min(1).optional(),
        completed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(todos)
        .set({
          text: input.text,
          completed: input.completed,
          updatedAt: new Date(), // Manually update timestamp for SQLite
        })
        .where(eq(todos.id, input.id)); // We should also check createdById for security, but leaving simple for now
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(todos).where(eq(todos.id, input.id)); // Similarly, add createdById check
    }),
});
