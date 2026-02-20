"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import {
  Bell,
  FileText,
  ShoppingBag,
  Package,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils/cn";

type NotificationType =
  | "FORM_COMPLETED"
  | "INTAKE_COMPLETED"
  | "ORDER_READY"
  | "ORDER_CANCELLED"
  | "ORDER_LAB_RECEIVED"
  | "PO_RECEIVED"
  | "LOW_STOCK"
  | "CAMPAIGN_COMPLETED"
  | "CAMPAIGN_ERROR";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case "FORM_COMPLETED":
    case "INTAKE_COMPLETED":
      return <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />;
    case "ORDER_READY":
    case "ORDER_CANCELLED":
    case "ORDER_LAB_RECEIVED":
      return <ShoppingBag className="w-4 h-4 text-green-500 flex-shrink-0" />;
    case "PO_RECEIVED":
      return <Package className="w-4 h-4 text-purple-500 flex-shrink-0" />;
    case "LOW_STOCK":
      return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  }
}

type Props = {
  userId: string;
};

export function NotificationBell({ userId: _userId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await getMyNotifications();
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch {
      // Silent fail — polling must never crash the page
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  async function handleItemClick(item: NotificationItem) {
    if (!item.isRead) {
      await markNotificationRead(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  const badgeCount = Math.min(unreadCount, 99);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-50 outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                No notifications in the last 7 days
              </div>
            ) : null}
            {items.length > 0 && (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                    !item.isRead && "bg-blue-50/40"
                  )}
                >
                  {/* Unread dot */}
                  <div className="mt-1 flex-shrink-0 w-2 h-2">
                    {!item.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>

                  {/* Type icon */}
                  <div className="mt-0.5">{typeIcon(item.type)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {item.body}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
