"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { api } from "~/trpc/react";
import type { AddLocalTodoFn } from "./TodoList";

interface AddTodoFormProps {
  session: Session | null;
  onAddLocal?: AddLocalTodoFn;
}

export default function AddTodoForm({ session, onAddLocal }: AddTodoFormProps) {
  const [text, setText] = useState("");
  const utils = api.useUtils();

  const createDbTodo = api.todo.create.useMutation({
    onSuccess: () => {
      void utils.todo.getAll.invalidate();
      setText("");
    },
    onError: (error) => {
      console.error("Error creating todo:", error);
      alert("Failed to create todo. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText) {
      if (session) {
        createDbTodo.mutate({ text: trimmedText });
      } else if (onAddLocal) {
        onAddLocal(trimmedText);
        setText("");
      } else {
        console.warn(
          "Cannot add todo: No session and no local handler provided.",
        );
      }
    }
  };

  const isLoading = session ? createDbTodo.isPending : false;

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new todo..."
        className="flex-grow rounded border border-gray-600 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
        disabled={isLoading}
      />
      <button
        type="submit"
        className="rounded bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading || !text.trim()}
      >
        {isLoading ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
