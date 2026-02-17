import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatPhone, formatDate, formatCurrency, formatRxValue } from "@/lib/utils/formatters";
import { ChevronLeft, Edit, Plus, FileText, PenLine, CheckCircle2, Clock, AlertTriangle, TrendingUp, Shield, Calendar } from "lucide-react";
import { OrderStatus, FormTemplateType } from "@prisma/client";
import {
  computeCustomerType,
  computeLTV,
  computeOutstandingBalance,
  computeInsuranceEligibility,
  isUnder21,
  hasExamOnlyHistory,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_COLORS,
  HEAR_ABOUT_US_LABELS,
} from "@/lib/utils/customer";
import { MedicalHistoryForm } from "@/components/customers/MedicalHistoryForm";
import { StoreCreditManager } from "@/components/customers/StoreCreditManager";
import { ExternalPrescriptionUpload } from "@/components/customers/ExternalPrescriptionUpload";

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
  VERIFIED: "Verified",
  READY: "Ready",
  PICKED_UP: "Picked Up",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  LAB_ORDERED: "bg-orange-100 text-orange-700",
  LAB_RECEIVED: "bg-yellow-100 text-yellow-700",
  VERIFIED: "bg-indigo-100 text-indigo-700",
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
      medicalHistory: true,
      storeCredits: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  // Computed signals
  const orderSummaries = customer.orders.map((o) => ({
    status: o.status,
    type: o.type,
    totalReal: o.totalReal,
    balanceReal: o.balanceReal,
    createdAt: o.createdAt,
    pickedUpAt: o.pickedUpAt,
  }));

  const customerType = computeCustomerType(orderSummaries, customer.createdAt);
  const ltv = computeLTV(orderSummaries);
  const outstandingBalance = computeOutstandingBalance(orderSummaries);
  const under21 = isUnder21(customer.dateOfBirth);
  const examOnly = hasExamOnlyHistory(orderSummaries);
  const latestRx = customer.prescriptions[0] ?? null;

  // Insurance eligibility (first active policy with lastClaimDate)
  const policyWithClaim = customer.insurancePolicies.find((p) => p.lastClaimDate);
  const eligibility = policyWithClaim
    ? computeInsuranceEligibility(policyWithClaim)
    : null;

  // Order stats
  const pickedUpOrders = customer.orders.filter((o) => o.status === "PICKED_UP");
  const avgOrderValue = pickedUpOrders.length > 0 ? ltv / pickedUpOrders.length : 0;
  const firstPurchase = pickedUpOrders.length > 0
    ? pickedUpOrders.reduce((min, o) => (o.pickedUpAt ?? o.createdAt) < min ? (o.pickedUpAt ?? o.createdAt) : min, pickedUpOrders[0].pickedUpAt ?? pickedUpOrders[0].createdAt)
    : null;
  const lastPurchase = pickedUpOrders.length > 0
    ? pickedUpOrders.reduce((max, o) => (o.pickedUpAt ?? o.createdAt) > max ? (o.pickedUpAt ?? o.createdAt) : max, new Date(0))
    : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${CUSTOMER_TYPE_COLORS[customerType]}`}>
                {CUSTOMER_TYPE_LABELS[customerType]}
              </span>
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

      {/* Alert Banners */}
      {(examOnly || (under21 && latestRx) || outstandingBalance > 0 || eligibility?.isEligibleSoon) && (
        <div className="space-y-2">
          {examOnly && ltv < 100 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-red-700 font-medium">Exam-only customer</span>
              <span className="text-red-600">— no optical purchases on record. Opportunity to convert.</span>
            </div>
          )}
          {under21 && latestRx && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-amber-700 font-medium">PD may be outdated</span>
              <span className="text-amber-600">— patient is under 21, PD changes frequently.</span>
            </div>
          )}
          {outstandingBalance > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-red-700 font-medium">Outstanding balance: {formatCurrency(outstandingBalance)}</span>
              <span className="text-red-600">— payment pending on active orders.</span>
            </div>
          )}
          {eligibility?.isEligibleSoon && eligibility.daysUntil !== null && (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm">
              <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-green-700 font-medium">
                Insurance eligible {eligibility.daysUntil <= 0 ? "now" : `in ${eligibility.daysUntil} days`}
              </span>
              <span className="text-green-600">— ready to use benefits.</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left column ── */}
        <div className="space-y-4">
          {/* Contact Info */}
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
                  {under21 && <span className="ml-1.5 text-xs text-amber-600 font-medium">Under 21</span>}
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
              {(customer as any).occupation && (
                <div>
                  <dt className="text-gray-500">Occupation</dt>
                  <dd className="text-gray-900 font-medium mt-0.5">{(customer as any).occupation}</dd>
                </div>
              )}
              {(customer as any).hearAboutUs && (
                <div>
                  <dt className="text-gray-500">Source</dt>
                  <dd className="text-gray-900 font-medium mt-0.5">
                    {HEAR_ABOUT_US_LABELS[(customer as any).hearAboutUs] || (customer as any).hearAboutUs}
                    {(customer as any).referredByName && (
                      <span className="text-gray-500 font-normal"> · by {(customer as any).referredByName}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Insurance */}
          {customer.insurancePolicies.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                Insurance
              </h2>
              <div className="space-y-4">
                {customer.insurancePolicies.map((policy) => {
                  const elig = computeInsuranceEligibility(policy);
                  return (
                    <div key={policy.id} className="text-sm space-y-1.5">
                      <p className="font-medium text-gray-900">{policy.providerName}</p>
                      {policy.policyNumber && (
                        <p className="text-gray-500 text-xs">Policy: {policy.policyNumber}</p>
                      )}
                      {policy.lastClaimDate && (
                        <p className="text-gray-500 text-xs">
                          Last claim: {formatDate(policy.lastClaimDate)}
                        </p>
                      )}
                      {elig.nextDate && (
                        <div className={`text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${
                          elig.isEligibleSoon ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                        }`}>
                          <Calendar className="w-3 h-3" />
                          Next eligible: {formatDate(elig.nextDate)}
                          {elig.daysUntil !== null && (
                            <span className="font-medium">
                              {elig.daysUntil <= 0 ? " (now!)" : ` (${elig.daysUntil}d)`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Store Credits */}
          <StoreCreditManager
            customerId={customer.id}
            credits={customer.storeCredits.map((c) => ({
              ...c,
              expiresAt: c.expiresAt,
            }))}
          />

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

        {/* ── Right column (2/3 wide) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Lifecycle & Journey */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Lifecycle & Journey</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(ltv)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Lifetime Value</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgOrderValue)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Avg Order</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{pickedUpOrders.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Completed Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{customer.orders.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Orders</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">First contact:</span>{" "}
                <span className="font-medium">{formatDate(customer.createdAt)}</span>
              </div>
              {firstPurchase && (
                <div>
                  <span className="text-gray-500">First purchase:</span>{" "}
                  <span className="font-medium">{formatDate(firstPurchase)}</span>
                </div>
              )}
              {lastPurchase && lastPurchase.getTime() > 0 && (
                <div>
                  <span className="text-gray-500">Last purchase:</span>{" "}
                  <span className="font-medium">{formatDate(lastPurchase)}</span>
                </div>
              )}
              {outstandingBalance > 0 && (
                <div>
                  <span className="text-gray-500">Outstanding:</span>{" "}
                  <span className="font-semibold text-red-600">{formatCurrency(outstandingBalance)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Prescriptions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <h2 className="font-semibold text-gray-900">Prescriptions</h2>

            {/* Internal (Our) Prescriptions */}
            {customer.prescriptions.filter((rx) => (rx as any).source !== "EXTERNAL").length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Our Prescriptions</span>
                </div>
                {customer.prescriptions
                  .filter((rx) => (rx as any).source !== "EXTERNAL")
                  .slice(0, 1)
                  .map((rx) => (
                    <div key={rx.id}>
                      <p className="text-xs text-gray-400 mb-2">{formatDate(rx.date)}{rx.doctorName && ` — Dr. ${rx.doctorName}`}</p>
                      <RxTable rx={rx} />
                    </div>
                  ))}
              </div>
            )}

            {/* External Prescriptions */}
            {customer.prescriptions.filter((rx) => (rx as any).source === "EXTERNAL").length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">External Prescriptions</span>
                </div>
                {customer.prescriptions
                  .filter((rx) => (rx as any).source === "EXTERNAL")
                  .slice(0, 2)
                  .map((rx) => (
                    <div key={rx.id} className="mb-3">
                      <p className="text-xs text-gray-400 mb-2">
                        {formatDate(rx.date)}
                        {(rx as any).externalDoctor && ` — Dr. ${(rx as any).externalDoctor}`}
                      </p>
                      <RxTable rx={rx} />
                    </div>
                  ))}
              </div>
            )}

            {/* Add External Prescription */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-primary font-medium hover:underline list-none flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add External Prescription
              </summary>
              <div className="mt-3 border-t border-gray-100 pt-4">
                <ExternalPrescriptionUpload customerId={customer.id} onSaved={undefined} />
              </div>
            </details>
          </div>

          {/* Medical History */}
          <MedicalHistoryForm
            customerId={customer.id}
            initialData={customer.medicalHistory}
          />

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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                        {order.type === "EXAM_ONLY" && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Exam only</span>
                        )}
                      </div>
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

function RxTable({ rx }: { rx: {
  odSphere: number | null; odCylinder: number | null; odAxis: number | null;
  odAdd: number | null; odPd: number | null;
  osSphere: number | null; osCylinder: number | null; osAxis: number | null;
  osAdd: number | null; osPd: number | null;
  pdBinocular: number | null;
  [key: string]: unknown;
} }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase">
            <th className="text-left pb-1.5">Eye</th>
            <th className="text-center pb-1.5">Sph</th>
            <th className="text-center pb-1.5">Cyl</th>
            <th className="text-center pb-1.5">Axis</th>
            <th className="text-center pb-1.5">Add</th>
            <th className="text-center pb-1.5">PD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 font-medium text-gray-700">OD (R)</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.odSphere)}</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.odCylinder)}</td>
            <td className="text-center py-1 font-mono">{rx.odAxis ?? "—"}</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.odAdd)}</td>
            <td className="text-center py-1 font-mono">{rx.odPd ?? "—"}</td>
          </tr>
          <tr>
            <td className="py-1 font-medium text-gray-700">OS (L)</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.osSphere)}</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.osCylinder)}</td>
            <td className="text-center py-1 font-mono">{rx.osAxis ?? "—"}</td>
            <td className="text-center py-1 font-mono">{formatRxValue(rx.osAdd)}</td>
            <td className="text-center py-1 font-mono">{rx.osPd ?? "—"}</td>
          </tr>
        </tbody>
      </table>
      {rx.pdBinocular && (
        <p className="mt-1 text-xs text-gray-500">
          Binocular PD: <span className="font-medium text-gray-900">{rx.pdBinocular}</span>
        </p>
      )}
    </div>
  );
}
