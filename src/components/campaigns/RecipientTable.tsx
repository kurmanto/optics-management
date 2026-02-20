import { CampaignRecipient, Customer, RecipientStatus } from "@prisma/client";
import Link from "next/link";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";

const STATUS_STYLE: Record<RecipientStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  OPTED_OUT: "bg-gray-100 text-gray-500",
  CONVERTED: "bg-primary/10 text-primary",
  BOUNCED: "bg-red-100 text-red-600",
};

type RecipientWithCustomer = CampaignRecipient & { customer: Pick<Customer, "id" | "firstName" | "lastName" | "phone" | "email"> };

interface Props {
  recipients: RecipientWithCustomer[];
}

export function RecipientTable({ recipients }: Props) {
  if (recipients.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">No recipients enrolled yet.</div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Customer
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Step
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Enrolled
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Last Message
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Converted
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {recipients.map((r) => (
          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3">
              <Link
                href={`/customers/${r.customer.id}`}
                className="font-medium text-gray-900 hover:text-primary transition-colors"
              >
                {r.customer.firstName} {r.customer.lastName}
              </Link>
              <p className="text-xs text-gray-400 mt-0.5">
                {r.customer.phone ?? r.customer.email ?? "—"}
              </p>
            </td>
            <td className="px-4 py-3">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  STATUS_STYLE[r.status]
                )}
              >
                {r.status.charAt(0) + r.status.slice(1).toLowerCase().replace(/_/g, " ")}
              </span>
            </td>
            <td className="px-4 py-3 text-right text-sm text-gray-600">{r.currentStep}</td>
            <td className="px-4 py-3 text-sm text-gray-500">
              {formatDate(r.enrolledAt)}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">
              {r.lastMessageAt ? formatDate(r.lastMessageAt) : "—"}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">
              {r.convertedAt ? formatDate(r.convertedAt) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
