import { Message, MessageChannel, MessageStatus, Customer } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import { Mail, MessageSquare } from "lucide-react";

const STATUS_STYLE: Record<MessageStatus, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
  BOUNCED: "bg-orange-100 text-orange-600",
};

type MessageWithCustomer = Message & {
  customer: Pick<Customer, "firstName" | "lastName">;
};

interface Props {
  messages: MessageWithCustomer[];
}

export function MessageLog({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-400">No messages sent yet.</div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recipient
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Channel
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Message
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Sent At
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {messages.map((m) => (
          <tr key={m.id} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
              {m.customer.firstName} {m.customer.lastName}
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                {m.channel === "SMS" ? (
                  <MessageSquare className="w-3.5 h-3.5" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                {m.channel}
              </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
              {m.subject && (
                <p className="font-medium text-gray-700 truncate">{m.subject}</p>
              )}
              <p className="truncate text-gray-500">{m.body}</p>
            </td>
            <td className="px-4 py-3">
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  STATUS_STYLE[m.status]
                )}
              >
                {m.status.charAt(0) + m.status.slice(1).toLowerCase()}
              </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-500">
              {m.sentAt ? formatDate(m.sentAt) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
