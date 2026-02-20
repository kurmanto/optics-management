"use client";

import { useRef } from "react";
import { TEMPLATE_VARIABLES } from "@/lib/campaigns/template-variables";

interface Props {
  value: string;
  onChange: (value: string) => void;
  variables?: typeof TEMPLATE_VARIABLES;
}

export function TemplateEditor({ value, onChange, variables = TEMPLATE_VARIABLES }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(key: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const insertion = `{{${key}}}`;
    const newValue = before + insertion + after;
    onChange(newValue);

    // Restore cursor position after insertion
    requestAnimationFrame(() => {
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
      textarea.focus();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 pb-2">
        {variables.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(v.key)}
            title={v.label}
            className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors font-mono"
          >
            {`{{${v.key}}}`}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
        placeholder="Enter message body... use {{firstName}} to insert variables"
      />
    </div>
  );
}
