import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatPhone, formatDate, formatCurrency, formatRxValue } from "@/lib/utils/formatters";
import { ChevronLeft, Edit, Plus, FileText, PenLine, CheckCircle2, Clock } from "lucide-react";
import { OrderStatus, FormTemplateType } from "@prisma/client";

const FORM_TYPE_LABELS: Record<FormTemplateType, string> = {
  NEW_PATIENT: "New Patient Registration",
  HIPAA_CONSENT: "Privacy & Consent",
  FRAME_REPAIR_WAIVER: "Frame Repair Waiver",
  INSURANCE_VERIFICATION: "Insurance Verification",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  LAB_ORDERED: "Lab Ordered",
  LAB_RECEIVED: "Lab Received",
  READY: "Ready",
  PICKED_UP: "Picked Up",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  LAB_ORDERED: "bg-orange-100 text-orange-700",
  LAB_RECEIVED: "bg-yellow-100 text-yellow-700",
  READY: "bg-green-100 text-green-700",
  PICKED_UP: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id, isActive: true },
    include: {
      family: true,
      orders: {
        orderBy: { createdAt: "desc" },
        include: { lineItems: true },
      },
      prescriptions: {
        orderBy: { date: "desc" },
        where: { isActive: true },
      },
      insurancePolicies: {
        where: { isActive: true },
      },
      formSubmissions: {
        orderBy: { createdAt: "desc" },
        include: { template: true },
      },
    },
  });

  if (!customer) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h1>
              {customer.isOnboarded ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3" /> Onboarded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <Clock className="w-3 h-3" /> Not onboarded
                </span>
              )}
            </div>
            {customer.legacyCustomerId && (
              <p className="text-sm text-gray-400">ID: {customer.legacyCustomerId}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/orders/new?customerId=${customer.id}`}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 h-9 rounded-lg text-sm font-medium shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
          <Link
            href={`/customers/${id}/edit`}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Contact Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Contact</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-gray-900 font-medium mt-0.5">{formatPhone(customer.phone)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900 font-medium mt-0.5">{customer.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Date of Birth</dt>
                <dd className="text-gray-900 font-medium mt-0.5">
                  {formatDate(customer.dateOfBirth)}
                </dd>
              </div>
              {(customer.city || customer.province) && (
                <div>
                  <dt className="text-gray-500">Location</dt>
                  <dd className="text-gray-900 font-medium mt-0.5">
                    {[customer.city, customer.province].filter(Boolean).join(", ")}
                  </dd>
                </div>
              )}
              {customer.family && (
                <div>
                  <dt className="text-gray-500">Family</dt>
                  <dd className="text-gray-900 font-medium mt-0.5">{customer.family.name}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Insurance */}
          {customer.insurancePolicies.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Insurance</h2>
              <div className="space-y-2">
                {customer.insurancePolicies.map((policy) => (
                  <div key={policy.id} className="text-sm">
                    <p className="font-medium text-gray-900">{policy.providerName}</p>
                    {policy.policyNumber && (
                      <p className="text-gray-500 text-xs">Policy: {policy.policyNumber}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-5">
              <h2 className="font-semibold text-yellow-800 mb-2 text-sm">Notes</h2>
              <p className="text-sm text-yellow-700">{customer.notes}</p>
            </div>
          )}

          {/* Tags */}
          {customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Prescriptions + Orders */}
        <div className="lg:col-span-2 space-y-5">
          {/* Latest Prescription */}
          {customer.prescriptions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Latest Prescription</h2>
                <span className="text-xs text-gray-400">
                  {formatDate(customer.prescriptions[0].date)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase">
                      <th className="text-left pb-2">Eye</th>
                      <th className="text-center pb-2">Sph</th>
                      <th className="text-center pb-2">Cyl</th>
                      <th className="text-center pb-2">Axis</th>
                      <th className="text-center pb-2">Add</th>
                      <th className="text-center pb-2">PD</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 font-medium text-gray-700">OD (R)</td>
                      <td className="text-center py-1">{formatRxValue(customer.prescriptions[0].odSphere)}</td>
                      <td className="text-center py-1">{formatRxValue(customer.prescriptions[0].odCylinder)}</td>
                      <td className="text-center py-1">{customer.prescriptions[0].odAxis ?? "—"}</td>
                      <td className="text-center py-1">{formatRxValue(customer.prescriptions[0].odAdd)}</td>
                      <td className="text-center py-1">{customer.prescriptions[0].odPd ?? "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-medium text-gray-700">OS (L)</td>
                      <td className="text-center py-1">{formatRxValue(customer.prescriptions[0].osSphere)}</td>
                      <td className="text-center py-1">{formatRxValue(customer.prescriptions[0].osCylinder)}</td>
                      <td className="text-center py-1">{customer.prescriptions[0].osAxis ?? "—"}</td>
                      <td className="text-center py-1">{formatRxValue(customer.prescriptions[0].osAdd)}</td>
                      <td className="text-center py-1">{customer.prescriptions[0].osPd ?? "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Orders */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Orders ({customer.orders.length})
              </h2>
            </div>
            {customer.orders.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                No orders yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {customer.orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${STATUS_COLORS[order.status]}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(order.totalCustomer)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Forms & Documents */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Forms & Documents ({customer.formSubmissions.length})
              </h2>
              <Link
                href={`/forms?customerId=${customer.id}`}
                className="text-xs text-primary hover:underline font-medium"
              >
                Send form
              </Link>
            </div>

            {customer.formSubmissions.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                No forms on file.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {customer.formSubmissions.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/forms/${sub.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        sub.status === "COMPLETED" ? "bg-green-100" : "bg-gray-100"
                      }`}>
                        {sub.signatureText ? (
                          <PenLine className="w-4 h-4 text-green-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {FORM_TYPE_LABELS[sub.template.type]}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(sub.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {sub.signatureText && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <PenLine className="w-3 h-3" /> Signed
                        </span>
                      )}
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        sub.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : sub.status === "EXPIRED"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {sub.status === "COMPLETED" ? "Completed" : sub.status === "EXPIRED" ? "Expired" : "Pending"}
                      </span>
                      <span className="text-xs text-gray-400 group-hover:text-primary transition-colors">View →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
