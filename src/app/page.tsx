"use client"; // Make page a client component to manage state

import { useState, useEffect } from "react"; // Import hooks
import Link from "next/link";
import type { Session } from "next-auth"; // Import Session
import { useSession } from "next-auth/react"; // Use client session hook

// tRPC client-side hook for API calls when logged in
import { api } from "~/trpc/react";

import AddTodoForm from "./_components/AddTodoForm";
import TodoList from "./_components/TodoList";
import type { LocalTodo } from "./_components/TodoList"; // Import LocalTodo type

// -- Copied Local Storage Logic --
const LOCAL_STORAGE_KEY = "localTodos";

const loadLocalTodos = (): LocalTodo[] => {
  // Ensure this runs only on the client
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    const parsed = stored ? JSON.parse(stored) : [];
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is LocalTodo =>
          typeof item === "object" &&
          item !== null &&
          typeof item.id === "string" &&
          typeof item.text === "string" &&
          typeof item.completed === "boolean",
      );
    }
    return [];
  } catch (e) {
    console.error("Failed to parse local todos:", e);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return [];
  }
};

const saveLocalTodos = (todos: LocalTodo[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error("Failed to save local todos:", e);
  }
};
// -- End Local Storage Logic --

export default function Home() {
  // Use client hook for session
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";

  // Local state management (only relevant when session is null)
  const [localTodos, setLocalTodos] = useState<LocalTodo[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(true); // Tracks initial local load

  // Load local todos on mount if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      setLocalTodos(loadLocalTodos());
      setIsLocalLoading(false);
    } else if (status === "authenticated") {
      // Clear local todos if user logs in / is logged in
      setLocalTodos([]);
      // Consider if we need to clear localStorage here too,
      // maybe only on successful sign-in?
      setIsLocalLoading(false); // No longer loading local state
    }
    // If status is 'loading', we wait.
  }, [status]);

  // Save local todos whenever they change (and user is logged out)
  useEffect(() => {
    if (status === "unauthenticated") {
      saveLocalTodos(localTodos);
    }
  }, [localTodos, status]);

  // --- Local Handlers (passed down) ---
  const handleAddLocalTodo = (text: string) => {
    const newTodo: LocalTodo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
    };
    setLocalTodos((prev) => [newTodo, ...prev]);
  };

  const handleUpdateLocalTodo = (
    id: string,
    updates: Partial<Omit<LocalTodo, "id">>,
  ) => {
    setLocalTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, ...updates } : todo)),
    );
  };

  const handleDeleteLocalTodo = (id: string) => {
    setLocalTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  // HydrateClient is for Server Components passing data to Client Components.
  // Since this page is now a Client Component, we don't need it wrapping the main content.
  // We might need TRPCProvider higher up in the layout if not already there.
  // Assuming TRPCProvider is set up in layout.tsx or similar.
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] pt-24 text-white">
      <div className="container flex flex-col items-center justify-start gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          My <span className="text-[hsl(280,100%,70%)]">To-Do</span> List
        </h1>

        <div className="flex flex-col items-center gap-4">
          <div className="mb-4 text-center">
            {isLoadingSession ? (
              <span>Loading...</span>
            ) : session ? (
              <span>Logged in as {session.user?.name}</span>
            ) : (
              <span>Sign in to sync your todos across devices.</span>
            )}
          </div>
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            {isLoadingSession ? "..." : session ? "Sign out" : "Sign in"}
          </Link>
        </div>

        {/* Todo section - Render based on session loading status */}
        <div className="w-full max-w-xl">
          {isLoadingSession ? (
            <div className="mt-4 rounded bg-white/10 p-4 text-center text-gray-400">
              Checking session...
            </div>
          ) : (
            <>
              <AddTodoForm
                session={session}
                onAddLocal={handleAddLocalTodo} // Pass add handler
              />
              <TodoList
                session={session}
                localTodos={localTodos} // Pass local state
                isLoadingLocal={isLocalLoading} // Pass loading status
                onUpdateLocal={handleUpdateLocalTodo} // Pass handlers
                onDeleteLocal={handleDeleteLocalTodo}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
