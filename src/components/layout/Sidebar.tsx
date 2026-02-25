"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  Settings,
  LogOut,
  Eye,
  FileText,
  ChevronDown,
  Truck,
  ClipboardList,
  BarChart2,
  Receipt,
  BookOpen,
  ScanLine,
  Megaphone,
  CalendarDays,
  Shield,
  AlertTriangle,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { logout } from "@/lib/actions/auth";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    children: [
      { title: "All Customers", href: "/customers" },
      { title: "Scan Rx", href: "/scan-rx", icon: ScanLine },
    ],
  },
  {
    title: "Exams",
    href: "/exams",
    icon: Eye,
  },
  {
    title: "Appointments",
    href: "/appointments",
    icon: CalendarDays,
  },
  {
    title: "Forms",
    href: "/forms",
    icon: FileText,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: ClipboardList,
  },
  {
    title: "Orders",
    href: "/orders/board",
    icon: ShoppingBag,
    children: [
      { title: "Fulfillment Board", href: "/orders/board" },
      { title: "All Orders", href: "/orders" },
      { title: "Invoices", href: "/invoices" },
    ],
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: Package,
    children: [
      { title: "All Frames", href: "/inventory" },
      { title: "Vendors", href: "/inventory/vendors" },
      { title: "Purchase Orders", href: "/inventory/purchase-orders" },
      { title: "Received Frames", href: "/inventory/purchase-orders/received" },
      { title: "Analytics", href: "/inventory/analytics" },
    ],
  },
  {
    title: "Marketing",
    href: "/campaigns",
    icon: Megaphone,
    children: [
      { title: "Campaigns", href: "/campaigns" },
      { title: "Analytics", href: "/campaigns/analytics" },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

type NavChild = { title: string; href: string; icon?: React.ElementType };
type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: NavChild[];
};

type Props = {
  userName: string;
  userRole: string;
  taskCount?: number;
};

export function Sidebar({ userName, userRole, taskCount }: Props) {
  const pathname = usePathname();

  function isGroupActive(item: NavItem) {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    // Check if any child route matches first (handles groups like Orders where
    // parent href is /orders/board but children include /orders and /invoices)
    if (item.children?.some((c) => pathname.startsWith(c.href))) return true;
    return pathname.startsWith(item.href);
  }

  function isChildActive(child: NavChild) {
    // Exact match for top-level children like "All Frames" at /inventory or "All Customers" at /customers
    if (child.href === "/inventory") return pathname === "/inventory";
    if (child.href === "/orders") return pathname === "/orders";
    if (child.href === "/customers") return pathname === "/customers" || pathname.startsWith("/customers/");
    if (child.href === "/campaigns") return pathname === "/campaigns" || (pathname.startsWith("/campaigns/") && !pathname.startsWith("/campaigns/analytics"));
    return pathname.startsWith(child.href);
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-900 text-white">
      {/* Brand */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">Mint Vision</div>
            <div className="text-xs text-gray-400 leading-tight">Staff Portal</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
          {userRole === "ADMIN" && (
          <div>
            <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
              <Shield className="w-4 h-4" />
              Admin
            </div>
            <div className="mt-1 space-y-0.5">
              <Link
                href="/admin/audit"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname.startsWith("/admin/audit")
                    ? "bg-primary text-white font-medium"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <ScrollText className="w-4 h-4 flex-shrink-0" />
                Audit Log
              </Link>
              <Link
                href="/admin/breach"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname.startsWith("/admin/breach")
                    ? "bg-primary text-white font-medium"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Breach Reports
              </Link>
            </div>
          </div>
        )}
        {navItems.map((item) => {
          const isActive = isGroupActive(item);
          const Icon = item.icon;

          if (item.children) {
            return (
              <div key={item.href}>
                <Link
                  href={item.children[0].href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/20 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isActive && "rotate-180")} />
                </Link>
                {isActive && (
                  <div className="mt-1 ml-4 pl-4 border-l border-gray-700 space-y-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                            isChildActive(child)
                              ? "bg-primary text-white font-medium"
                              : "text-gray-400 hover:text-white hover:bg-gray-800"
                          )}
                        >
                          {ChildIcon && <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />}
                          {child.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{item.title}</span>
              {item.title === "Tasks" && taskCount !== undefined && taskCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {taskCount > 99 ? "99+" : taskCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
            {userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-xs text-gray-400 capitalize">{userRole.toLowerCase()}</div>
          </div>
        </div>
        <a
          href="/user-guide.html"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mb-1"
        >
          <BookOpen className="w-4 h-4" />
          User Guide
        </a>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
