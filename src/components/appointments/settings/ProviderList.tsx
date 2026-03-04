"use client";

import { useState, useTransition } from "react";
import {
  createProvider,
  updateProvider,
  toggleProvider,
} from "@/lib/actions/appointment-settings";

type Provider = {
  id: string;
  name: string;
  title: string;
  isOD: boolean;
  isActive: boolean;
  availability: unknown[];
};

type Props = { providers: Provider[] };

export function ProviderList({ providers }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    setError(null);
    const data = {
      name: formData.get("name") as string,
      title: formData.get("title") as string,
      isOD: formData.get("isOD") === "on",
    };

    startTransition(async () => {
      const result = await createProvider(data);
      if ("error" in result) {
        setError(result.error);
      } else {
        setShowForm(false);
      }
    });
  }

  function handleUpdate(formData: FormData) {
    setError(null);
    const data = {
      id: editingId!,
      name: formData.get("name") as string,
      title: formData.get("title") as string,
      isOD: formData.get("isOD") === "on",
    };

    startTransition(async () => {
      const result = await updateProvider(data);
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleProvider(id, !isActive);
    });
  }

  const editing = editingId ? providers.find((p) => p.id === editingId) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Providers</h2>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setEditingId(null); setError(null); }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showForm ? "Cancel" : "+ Add Provider"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {(showForm || editingId) && (
        <form
          action={editingId ? handleUpdate : handleCreate}
          className="border border-gray-200 rounded-lg p-4 mb-4 space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                name="name"
                defaultValue={editing?.name ?? ""}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input
                name="title"
                defaultValue={editing?.title ?? "Optician"}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              name="isOD"
              type="checkbox"
              defaultChecked={editing?.isOD ?? false}
            />
            Is an OD (Optometrist)
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : editingId ? "Update" : "Create"}
          </button>
        </form>
      )}

      <div className="divide-y">
        {providers.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
              {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {p.name}
                {!p.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
              </p>
              <p className="text-xs text-gray-500">
                {p.title}{p.isOD && " · OD"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setEditingId(p.id); setShowForm(false); setError(null); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleToggle(p.id, p.isActive)}
              disabled={isPending}
              className={`text-xs ${p.isActive ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}`}
            >
              {p.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
        {providers.length === 0 && (
          <p className="text-sm text-gray-400 py-3">No providers configured yet.</p>
        )}
      </div>
    </div>
  );
}
