"use client";

import { useState, useActionState } from "react";
import { bookAppointment, getAvailableSlots } from "@/lib/actions/client-booking";
import { MemberSelector } from "./MemberSelector";
import { TimeSlotPicker } from "./TimeSlotPicker";
import { CheckCircle, ChevronLeft, ChevronRight, Eye, Glasses, Stethoscope, Wrench, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface BookingWizardProps {
  members: Member[];
}

const APPOINTMENT_TYPES = [
  {
    value: "EYE_EXAM",
    label: "Eye Exam",
    description: "Comprehensive vision & eye health check",
    duration: "30 min",
    icon: Eye,
  },
  {
    value: "CONTACT_LENS_FITTING",
    label: "Contact Lens Fitting",
    description: "Fitting, trial lenses & follow-up plan",
    duration: "30 min",
    icon: Sparkles,
  },
  {
    value: "FOLLOW_UP",
    label: "Follow-up",
    description: "Post-exam or post-fitting check-in",
    duration: "30 min",
    icon: Stethoscope,
  },
  {
    value: "GLASSES_PICKUP",
    label: "Glasses Pickup",
    description: "Pick up your completed order",
    duration: "15 min",
    icon: Glasses,
  },
  {
    value: "ADJUSTMENT",
    label: "Adjustment / Repair",
    description: "Frame adjustment, nose pad, or minor fix",
    duration: "15 min",
    icon: Wrench,
  },
  {
    value: "STYLING",
    label: "Styling Session",
    description: "Browse frames with a style consultant",
    duration: "30 min",
    icon: Sparkles,
  },
];

export function BookingWizard({ members }: BookingWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedMember, setSelectedMember] = useState(members.length === 1 ? members[0].id : "");
  const [selectedType, setSelectedType] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notes, setNotes] = useState("");

  const [state, action, isPending] = useActionState(bookAppointment, null);

  // Auto-advance if single member
  const effectiveStep = members.length === 1 && step === 0 ? 1 : step;

  async function handleDateChange(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedSlot("");
    setLoadingSlots(true);
    const result = await getAvailableSlots(dateStr, selectedType);
    setSlots(result);
    setLoadingSlots(false);
  }

  function handleTypeSelect(value: string) {
    setSelectedType(value);
    // Reset slots if date was already picked (type may affect duration)
    if (selectedDate) {
      setSelectedSlot("");
    }
    setStep(members.length === 1 ? 2 : 2);
  }

  const selectedMemberName = members.find((m) => m.id === selectedMember);
  const selectedTypeInfo = APPOINTMENT_TYPES.find((t) => t.value === selectedType);

  if (state?.success) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Appointment Booked!</h2>
        <p className="text-sm text-gray-500">
          We&apos;ll see {selectedMemberName?.firstName} for their{" "}
          {selectedTypeInfo?.label.toLowerCase()} at the scheduled time.
        </p>
        <Link
          href="/my"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {(members.length === 1 ? [1, 2, 3] : [0, 1, 2, 3]).map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= effectiveStep ? "bg-primary" : "bg-gray-200"
            )}
          />
        ))}
      </div>

      {/* Step 0: Select member (skipped for single-member families) */}
      {effectiveStep === 0 && members.length > 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Who is this appointment for?</h2>
          <MemberSelector
            members={members}
            selected={selectedMember}
            onSelect={(id) => setSelectedMember(id)}
          />
          <button
            type="button"
            disabled={!selectedMember}
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 1: Select type */}
      {effectiveStep === 1 && (
        <div className="space-y-4">
          {members.length > 1 && (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-900">What do you need?</h2>
          <div className="space-y-2">
            {APPOINTMENT_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeSelect(t.value)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border p-4 transition-colors text-left",
                    selectedType === t.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{t.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Clock className="h-3 w-3" />
                    {t.duration}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Select date/time */}
      {effectiveStep === 2 && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Pick a date and time</h2>
          <TimeSlotPicker
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            slots={slots}
            selectedSlot={selectedSlot}
            onSlotSelect={(s) => setSelectedSlot(s)}
            loading={loadingSlots}
          />

          {/* Optional notes */}
          {selectedSlot && (
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything we should know? e.g. running late, specific concerns..."
                rows={2}
                maxLength={500}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              />
            </div>
          )}

          <button
            type="button"
            disabled={!selectedSlot}
            onClick={() => setStep(3)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Review Booking <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {effectiveStep === 3 && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(2)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-lg font-semibold text-gray-900">Confirm Your Appointment</h2>

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Patient</span>
              <span className="font-medium text-gray-900">
                {selectedMemberName?.firstName} {selectedMemberName?.lastName}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900">{selectedTypeInfo?.label}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">
                {new Date(selectedSlot).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Time</span>
              <span className="font-medium text-gray-900">
                {new Date(selectedSlot).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Duration</span>
              <span className="font-medium text-gray-900">{selectedTypeInfo?.duration}</span>
            </div>
            {notes.trim() && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">Notes</span>
                <p className="text-sm text-gray-700 mt-0.5">{notes}</p>
              </div>
            )}
          </div>

          {state?.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {state.error}
            </div>
          )}

          <form action={action}>
            <input type="hidden" name="customerId" value={selectedMember} />
            <input type="hidden" name="type" value={selectedType} />
            <input type="hidden" name="scheduledAt" value={selectedSlot} />
            {notes.trim() && <input type="hidden" name="notes" value={notes} />}
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Booking..." : "Confirm Booking"}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400">
            Need to reschedule or have questions? Call us at (416) 555-0100
          </p>
        </div>
      )}
    </div>
  );
}
