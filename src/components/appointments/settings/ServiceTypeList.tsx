"use client";

import { useState, useTransition } from "react";
import {
  createServiceType,
  updateServiceType,
  toggleServiceType,
} from "@/lib/actions/appointment-settings";

type ServiceType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration: number;
  bufferAfter: number;
  color: string;
  bgColor: string;
  requiresOD: boolean;
  isPublicBookable: boolean;
  sortOrder: number;
  isActive: boolean;
};

type Props = { serviceTypes: ServiceType[] };

export function ServiceTypeList({ serviceTypes }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    setError(null);
    const data = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      description: (formData.get("description") as string) || undefined,
      duration: Number(formData.get("duration")),
      bufferAfter: Number(formData.get("bufferAfter")),
      color: formData.get("color") as string,
      bgColor: formData.get("bgColor") as string,
      requiresOD: formData.get("requiresOD") === "on",
      isPublicBookable: formData.get("isPublicBookable") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0),
    };

    startTransition(async () => {
      const result = await createServiceType(data);
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
      slug: formData.get("slug") as string,
      description: (formData.get("description") as string) || undefined,
      duration: Number(formData.get("duration")),
      bufferAfter: Number(formData.get("bufferAfter")),
      color: formData.get("color") as string,
      bgColor: formData.get("bgColor") as string,
      requiresOD: formData.get("requiresOD") === "on",
      isPublicBookable: formData.get("isPublicBookable") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0),
    };

    startTransition(async () => {
      const result = await updateServiceType(data);
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleServiceType(id, !isActive);
    });
  }

  const editingSt = editingId ? serviceTypes.find((s) => s.id === editingId) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Service Types</h2>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); setEditingId(null); setError(null); }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showForm ? "Cancel" : "+ Add Service Type"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

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
                defaultValue={editingSt?.name ?? ""}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
              <input
                name="slug"
                defaultValue={editingSt?.slug ?? ""}
                required
                pattern="^[a-z0-9-]+$"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              name="description"
              defaultValue={editingSt?.description ?? ""}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
              <input
                name="duration"
                type="number"
                min={5}
                max={240}
                defaultValue={editingSt?.duration ?? 30}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buffer (min)</label>
              <input
                name="bufferAfter"
                type="number"
                min={0}
                max={60}
                defaultValue={editingSt?.bufferAfter ?? 15}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <input
                name="color"
                type="color"
                defaultValue={editingSt?.color ?? "#3B82F6"}
                className="w-full h-[38px] border rounded-lg px-1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bg Color</label>
              <input
                name="bgColor"
                type="color"
                defaultValue={editingSt?.bgColor ?? "#EFF6FF"}
                className="w-full h-[38px] border rounded-lg px-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
              <input
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={editingSt?.sortOrder ?? 0}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 pt-5">
              <input
                name="requiresOD"
                type="checkbox"
                defaultChecked={editingSt?.requiresOD ?? false}
              />
              Requires OD
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 pt-5">
              <input
                name="isPublicBookable"
                type="checkbox"
                defaultChecked={editingSt?.isPublicBookable ?? true}
              />
              Public Bookable
            </label>
          </div>

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
        {serviceTypes.map((st) => (
          <div key={st.id} className="flex items-center gap-3 py-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: st.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {st.name}
                {!st.isActive && (
                  <span className="ml-2 text-xs text-gray-400">(inactive)</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {st.duration} min · {st.bufferAfter} min buffer
                {st.requiresOD && " · OD required"}
                {st.isPublicBookable && " · Public"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setEditingId(st.id); setShowForm(false); setError(null); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleToggle(st.id, st.isActive)}
              disabled={isPending}
              className={`text-xs ${st.isActive ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}`}
            >
              {st.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
