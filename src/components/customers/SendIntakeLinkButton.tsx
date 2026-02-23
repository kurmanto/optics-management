"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { SendIntakeLinkModal } from "./SendIntakeLinkModal";

interface Props {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  baseUrl: string;
}

export function SendIntakeLinkButton({ customerId, customerName, customerEmail, baseUrl }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
      >
        <Mail className="w-3.5 h-3.5" />
        Send Intake Forms
      </button>

      {open && (
        <SendIntakeLinkModal
          customerId={customerId}
          customerName={customerName}
          customerEmail={customerEmail}
          baseUrl={baseUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
