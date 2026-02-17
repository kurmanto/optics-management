"use client";

import React, { useState } from "react";
import type { LineItemReceivable, POFormState } from "@/lib/actions/purchase-orders";

type InventoryItemInfo = {
  id: string;
  brand: string;
  model: string;
  sku: string | null;
};

type LineItemInfo = {
  id: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  conditionNotes: string | null;
  inventoryItem: InventoryItemInfo;
};

type POInfo = {
  id: string;
  status: string;
  lineItems: LineItemInfo[];
};

type Props = {
  po: POInfo;
  action: (poId: string, receivables: LineItemReceivable[]) => Promise<POFormState>;
};

type ReceivableState = {
  quantityReceived: number;
  conditionNotes: string;
};

export default function ReceivingWorkflow({ po, action }: Props) {
  const initialState: Record<string, ReceivableState> = {};
  for (const li of po.lineItems) {
    initialState[li.id] = { quantityReceived: 0, conditionNotes: "" };
  }

  const [receivables, setReceivables] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null as POFormState | null);

  function getRemaining(li: LineItemInfo) {
    return Math.max(0, li.quantityOrdered - li.quantityReceived);
  }

  function handleQtyChange(lineItemId: string, value: string) {
    const li = po.lineItems.find((l) => l.id === lineItemId);
    if (!li) return;
    const max = getRemaining(li);
    const parsed = Math.min(Math.max(0, parseInt(value) || 0), max);
    setReceivables((prev: any) => ({ ...prev, [lineItemId]: { ...prev[lineItemId], quantityReceived: parsed } }));
  }

  function handleNotesChange(lineItemId: string, value: string) {
    setReceivables((prev: any) => ({ ...prev, [lineItemId]: { ...prev[lineItemId], conditionNotes: value } }));
  }

  function handleMarkAll() {
    const next: Record<string, ReceivableState> = {};
    for (const li of po.lineItems) {
      next[li.id] = { quantityReceived: getRemaining(li), conditionNotes: (receivables as any)[li.id]?.conditionNotes ?? "" };
    }
    setReceivables(next);
  }

  const hasAnything = Object.values(receivables as any).some((r: any) => r.quantityReceived > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    if (!hasAnything) {
      setResult({ error: "Enter at least one quantity to receive." });
      return;
    }
    const payload: LineItemReceivable[] = Object.entries(receivables as any)
      .filter(([, r]: any) => r.quantityReceived > 0)
      .map(([lineItemId, r]: any) => ({
        lineItemId,
        quantityReceived: r.quantityReceived,
        conditionNotes: r.conditionNotes || undefined,
      }));
    setSubmitting(true);
    try {
      const res = await action(po.id, payload);
      setResult(res ?? {});
      if (!res?.error) {
        const reset: Record<string, ReceivableState> = {};
        for (const li of po.lineItems) {
          reset[li.id] = { quantityReceived: 0, conditionNotes: "" };
        }
        setReceivables(reset);
      }
    } catch {
      setResult({ error: "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  }

  const allPending = po.lineItems.every((li) => getRemaining(li) === 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Receive Items</h3>
        <button type="button" onClick={handleMarkAll} disabled={allPending}
          className="text-xs text-primary hover:underline disabled:text-gray-400 disabled:cursor-not-allowed">
          Mark All as Received
        </button>
      </div>

      {(result as any)?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {(result as any).error}
        </div>
      )}
      {result && !(result as any).error && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          Items received successfully. Stock and ledger have been updated.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-200">
              <th className="pb-2 pr-4">Frame</th>
              <th className="pb-2 pr-4 text-center">Ordered</th>
              <th className="pb-2 pr-4 text-center">Already Received</th>
              <th className="pb-2 pr-4 text-center">Remaining</th>
              <th className="pb-2 pr-4 text-center">Receive Now</th>
              <th className="pb-2">Condition Notes</th>
            </tr>
          </thead>
          <tbody>
            {po.lineItems.map((li) => {
              const remaining = getRemaining(li);
              const isFullyReceived = remaining === 0;
              return (
                <tr key={li.id} className={"border-b border-gray-50 " + (isFullyReceived ? "opacity-50" : "")}>
                  <td className="py-2.5 pr-4">
                    <p className="font-medium text-gray-800">{li.inventoryItem.brand} {li.inventoryItem.model}</p>
                    {li.inventoryItem.sku && (<p className="text-xs text-gray-400">{li.inventoryItem.sku}</p>)}
                  </td>
                  <td className="py-2.5 pr-4 text-center text-gray-700">{li.quantityOrdered}</td>
                  <td className="py-2.5 pr-4 text-center text-gray-700">{li.quantityReceived}</td>
                  <td className="py-2.5 pr-4 text-center">
                    <span className={remaining === 0 ? "font-semibold text-green-600" : "font-semibold text-amber-600"}>
                      {remaining === 0 ? "Done" : remaining}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <input type="number" min={0} max={remaining}
                      value={(receivables as any)[li.id]?.quantityReceived ?? 0}
                      onChange={(e) => handleQtyChange(li.id, e.target.value)}
                      disabled={isFullyReceived}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed mx-auto block"
                    />
                  </td>
                  <td className="py-2.5">
                    <input type="text" placeholder="e.g. slight scuff..."
                      value={(receivables as any)[li.id]?.conditionNotes ?? ""}
                      onChange={(e) => handleNotesChange(li.id, e.target.value)}
                      disabled={isFullyReceived}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={submitting || !hasAnything}
          className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? "Saving..." : "Confirm Receipt"}
        </button>
      </div>
    </form>
  );
}
