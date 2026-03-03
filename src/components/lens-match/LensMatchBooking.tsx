"use client";

import { useState } from "react";
import { bookLensMatchAppointment, getAvailableSlotsPublic } from "@/lib/actions/lens-match";
import { TimeSlotPicker } from "@/components/client/booking/TimeSlotPicker";
import { CheckCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface LensMatchBookingProps {
  quoteId: string;
  bookingType: "CONSULTATION" | "EYE_EXAM";
  members: Member[];
  onBack: () => void;
}

export function LensMatchBooking({ quoteId, bookingType, members, onBack }: LensMatchBookingProps) {
  const [step, setStep] = useState(members.length > 1 ? 0 : 1);
  const [selectedMember, setSelectedMember] = useState(members.length === 1 ? members[0].id : "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const label = bookingType === "CONSULTATION" ? "Lens Consultation" : "Eye Exam";
  const duration = bookingType === "CONSULTATION" ? "15 min" : "30 min";

  async function handleDateChange(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedSlot("");
    setLoadingSlots(true);
    const result = await getAvailableSlotsPublic(dateStr);
    setSlots(result);
    setLoadingSlots(false);
  }

  async function handleConfirm() {
    setIsPending(true);
    setError("");

    const result = await bookLensMatchAppointment({
      quoteId,
      customerId: selectedMember,
      type: bookingType,
      scheduledAt: selectedSlot,
    });

    if ("error" in result && result.error) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    setSuccess(true);
    setIsPending(false);
  }

  const selectedMemberData = members.find((m) => m.id === selectedMember);

  if (success) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Appointment Booked!</h3>
        <p className="text-sm text-gray-500">
          We&apos;ll see {selectedMemberData?.firstName} for their {label.toLowerCase()}.
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
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <span className="text-xs text-gray-400">{label} &middot; {duration}</span>
      </div>

      {/* Step 0: Select member (multi-member only) */}
      {step === 0 && members.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Who is this for?</h3>
          <div className="space-y-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMember(m.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                  selectedMember === m.id
                    ? "border-primary bg-primary/5 font-medium"
                    : "border-gray-100 hover:border-gray-200"
                )}
              >
                {m.firstName} {m.lastName}
              </button>
            ))}
          </div>
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

      {/* Step 1: Date/time picker */}
      {step === 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Pick a date and time</h3>
          <TimeSlotPicker
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            slots={slots}
            selectedSlot={selectedSlot}
            onSlotSelect={(s) => setSelectedSlot(s)}
            loading={loadingSlots}
          />
          <button
            type="button"
            disabled={!selectedSlot}
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Review <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" /> Change time
          </button>
          <h3 className="text-sm font-semibold text-gray-900">Confirm Booking</h3>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Patient</span>
              <span className="font-medium text-gray-900">
                {selectedMemberData?.firstName} {selectedMemberData?.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900">{label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-medium text-gray-900">
                {new Date(selectedSlot).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-medium text-gray-900">
                {new Date(selectedSlot).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="font-medium text-gray-900">{duration}</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Booking...
              </span>
            ) : (
              "Confirm Booking"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
