"use client";

import type { Session } from "next-auth";
import { api } from "~/trpc/react";
import TodoItem from "./TodoItem";
import type { RouterOutput } from "./TodoItem";

// Keep LocalTodo type definition
export interface LocalTodo {
  id: string;
  text: string;
  completed: boolean;
}

// Keep AddLocalTodoFn type definition
export type AddLocalTodoFn = (text: string) => void;

// Update props type to receive local state and handlers
interface TodoListProps {
  session: Session | null;
  localTodos: LocalTodo[]; // Receive local todos as prop
  isLoadingLocal: boolean; // Receive loading status
  onUpdateLocal: (id: string, updates: Partial<Omit<LocalTodo, "id">>) => void;
  onDeleteLocal: (id: string) => void;
}

export default function TodoList({
  session,
  localTodos,
  isLoadingLocal,
  onUpdateLocal,
  onDeleteLocal,
}: TodoListProps) {
  // --- tRPC Query (for logged-in users) ---
  // This remains the same, only runs if session exists
  const {
    data: dbTodos,
    isLoading: isDbLoading,
    error: dbError,
  } = api.todo.getAll.useQuery(undefined, { enabled: !!session });

  // --- Render Logic ---
  if (session) {
    // --- Logged-in state ---
    if (isDbLoading) {
      return (
        <div className="mt-4 rounded bg-white/10 p-4 text-center text-gray-400">
          Loading todos...
        </div>
      );
    }
    if (dbError) {
      return (
        <div className="mt-4 rounded bg-red-900/50 p-4 text-center text-red-300">
          Error loading todos: {dbError.message}
        </div>
      );
    }
    if (!dbTodos || dbTodos.length === 0) {
      return (
        <div className="mt-4 rounded bg-white/10 p-4 text-center text-gray-400">
          No todos yet. Add one above!
        </div>
      );
    }
    return (
      <div className="mt-4 space-y-2 rounded bg-white/5 p-4">
        {dbTodos.map((todo: RouterOutput["todo"]["getAll"][number]) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            session={session}
            // No local handlers passed when logged in
          />
        ))}
      </div>
    );
  } else {
    // --- Logged-out state ---
    // Use props for local state
    if (isLoadingLocal) {
      return (
        <div className="mt-4 rounded bg-white/10 p-4 text-center text-gray-400">
          Loading local todos...
        </div>
      );
    }
    if (localTodos.length === 0) {
      return (
        <div className="mt-4 rounded bg-white/10 p-4 text-center text-gray-400">
          No todos yet. Add one above!
        </div>
      );
    }
    return (
      <div className="mt-4 space-y-2 rounded bg-white/5 p-4">
        {localTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            session={session}
            onUpdateLocal={onUpdateLocal} // Pass down handlers from props
            onDeleteLocal={onDeleteLocal}
          />
        ))}
      </div>
    );
  }
}
