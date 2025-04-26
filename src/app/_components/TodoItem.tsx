"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import type { Session } from "next-auth";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import type { LocalTodo } from "./TodoList";

export type RouterOutput = inferRouterOutputs<AppRouter>;
type DBTodo = RouterOutput["todo"]["getAll"][number];

interface TodoItemProps {
  todo: DBTodo | LocalTodo;
  session: Session | null;
  onUpdateLocal?: (id: string, updates: Partial<Omit<LocalTodo, "id">>) => void;
  onDeleteLocal?: (id: string) => void;
}

function isLocalTodo(todo: DBTodo | LocalTodo): todo is LocalTodo {
  return typeof todo.id === "string";
}

export default function TodoItem({
  todo,
  session,
  onUpdateLocal,
  onDeleteLocal,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const utils = api.useUtils();

  const updateDbTodo = api.todo.update.useMutation({
    onSuccess: () => {
      void utils.todo.getAll.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      console.error("Error updating todo:", error);
      alert("Failed to update todo.");
      setIsEditing(false);
      setEditText(todo.text);
    },
  });

  const deleteDbTodo = api.todo.delete.useMutation({
    onSuccess: () => {
      void utils.todo.getAll.invalidate();
    },
    onError: (error) => {
      console.error("Error deleting todo:", error);
      alert("Failed to delete todo.");
    },
  });

  const handleToggleComplete = () => {
    if (session && !isLocalTodo(todo)) {
      updateDbTodo.mutate({ id: todo.id, completed: !todo.completed });
    } else if (!session && isLocalTodo(todo) && onUpdateLocal) {
      onUpdateLocal(todo.id, { completed: !todo.completed });
    } else {
      console.warn("Cannot toggle completion: Invalid state.");
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${todo.text}"?`)) {
      if (session && !isLocalTodo(todo)) {
        deleteDbTodo.mutate({ id: todo.id });
      } else if (!session && isLocalTodo(todo) && onDeleteLocal) {
        onDeleteLocal(todo.id);
      } else {
        console.warn("Cannot delete: Invalid state.");
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== todo.text) {
      if (session && !isLocalTodo(todo)) {
        updateDbTodo.mutate({ id: todo.id, text: trimmedText });
      } else if (!session && isLocalTodo(todo) && onUpdateLocal) {
        onUpdateLocal(todo.id, { text: trimmedText });
        setIsEditing(false);
      } else {
        console.warn("Cannot save edit: Invalid state.");
        setIsEditing(false);
        setEditText(todo.text);
      }
    } else {
      setIsEditing(false);
      setEditText(todo.text);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(todo.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const isDbMutationPending = session
    ? updateDbTodo.isPending || deleteDbTodo.isPending
    : false;

  return (
    <div className="flex items-center gap-2 rounded bg-white/10 p-2 transition hover:bg-white/20">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggleComplete}
        id={`todo-${todo.id}`}
        className="form-checkbox h-5 w-5 cursor-pointer rounded border-gray-500 bg-gray-700 text-purple-600 focus:ring-purple-500"
        disabled={isDbMutationPending}
      />
      {isEditing ? (
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSaveEdit}
          autoFocus
          className="flex-grow rounded border border-gray-600 bg-gray-800 px-2 py-1 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
          disabled={session ? updateDbTodo.isPending : false}
        />
      ) : (
        <label
          htmlFor={`todo-${todo.id}`}
          className={`flex-grow cursor-pointer px-2 py-1 ${todo.completed ? "text-gray-500 line-through" : "text-white"}`}
          onDoubleClick={handleEdit}
        >
          {todo.text}
        </label>
      )}
      <div className="ml-auto flex items-center gap-2">
        {isEditing ? (
          <>
            <button
              onClick={handleSaveEdit}
              className="rounded bg-green-600 p-1 text-xs text-white transition hover:bg-green-700 disabled:opacity-50"
              disabled={
                (session ? updateDbTodo.isPending : false) || !editText.trim()
              }
              title="Save"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="rounded bg-gray-600 p-1 text-xs text-white transition hover:bg-gray-700 disabled:opacity-50"
              disabled={session ? updateDbTodo.isPending : false}
              title="Cancel"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleEdit}
              className="rounded bg-blue-600 p-1 text-xs text-white transition hover:bg-blue-700 disabled:opacity-50"
              disabled={isDbMutationPending}
              title="Edit"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="rounded bg-red-600 p-1 text-xs text-white transition hover:bg-red-700 disabled:opacity-50"
              disabled={isDbMutationPending}
              title="Delete"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
