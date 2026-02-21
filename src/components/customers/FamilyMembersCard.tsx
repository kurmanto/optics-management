"use client";

import { useState, useTransition } from "react";
import { Users, Link2, Plus, User } from "lucide-react";
import { findFamilyMatches, createFamilyAndLink, addToFamily } from "@/lib/actions/customers";
import { formatPhone } from "@/lib/utils/formatters";

type FamilyMember = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

type Props = {
  customerId: string;
  customerPhone: string | null;
  customerAddress: string | null;
  familyName: string | null;
  familyMembers: FamilyMember[];
  familyId: string | null;
};

export function FamilyMembersCard({ customerId, customerPhone, customerAddress, familyName, familyMembers, familyId }: Props) {
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<Array<{ id: string; firstName: string; lastName: string; phone: string | null; familyId: string | null }>>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([customerId]);
  const [error, setError] = useState("");

  const otherMembers = familyMembers.filter((m) => m.id !== customerId);

  function handleFindMatches() {
    startTransition(async () => {
      const matches = await findFamilyMatches(customerPhone, customerAddress, customerId);
      setSuggestions(matches);
    });
  }

  function handleCreateFamily() {
    if (!newFamilyName) return;
    startTransition(async () => {
      const result = await createFamilyAndLink(newFamilyName, selectedIds);
      if ("error" in result) {
        setError(result.error);
      } else {
        setShowCreateForm(false);
        setNewFamilyName("");
      }
    });
  }

  function handleAddToFamily(memberId: string) {
    if (!familyId) return;
    startTransition(async () => {
      await addToFamily(familyId, memberId);
      setSuggestions((prev) => prev.filter((s) => s.id !== memberId));
    });
  }

  return (
    <div className="space-y-4">
      {/* Current family members */}
      {familyName && (
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-gray-700">{familyName} Family</span>
        </div>
      )}

      {otherMembers.length > 0 ? (
        <div className="space-y-2">
          {otherMembers.map((member) => (
            <a
              key={member.id}
              href={`/customers/${member.id}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {member.firstName[0]}{member.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                {member.phone && <p className="text-xs text-gray-400">{formatPhone(member.phone)}</p>}
              </div>
              <Link2 className="w-3.5 h-3.5 text-gray-300" />
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-2">No family members linked.</p>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Possible Matches</p>
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-amber-100 bg-amber-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{s.firstName} {s.lastName}</p>
                {s.phone && <p className="text-xs text-gray-400">{formatPhone(s.phone)}</p>}
              </div>
              {familyId ? (
                <button
                  onClick={() => handleAddToFamily(s.id)}
                  disabled={pending}
                  className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
                >
                  Add to Family
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedIds((prev) => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]);
                  }}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                    selectedIds.includes(s.id)
                      ? "border-primary text-primary bg-primary/5"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {selectedIds.includes(s.id) ? "Selected" : "Select"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create family form */}
      {showCreateForm && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">Create Family Group</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            value={newFamilyName}
            onChange={(e) => setNewFamilyName(e.target.value)}
            placeholder="Family name (e.g. The Smiths)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-gray-500">{selectedIds.length} customer(s) selected</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFamily}
              disabled={pending || !newFamilyName || selectedIds.length < 2}
              className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {pending ? "Creating..." : "Create Group"}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleFindMatches}
          disabled={pending}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium disabled:opacity-50"
        >
          <User className="w-3.5 h-3.5" />
          {pending ? "Searching..." : "Find Family Matches"}
        </button>

        {!familyId && suggestions.length > 0 && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:underline font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Family Group
          </button>
        )}
      </div>
    </div>
  );
}
