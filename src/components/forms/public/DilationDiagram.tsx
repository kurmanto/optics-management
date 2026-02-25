export function DilationDiagram() {
  return (
    <div className="flex items-center gap-6 justify-center py-3">
      {/* Undilated */}
      <div className="text-center">
        <svg viewBox="0 0 60 60" className="w-14 h-14 mx-auto" aria-hidden="true">
          <circle cx="30" cy="30" r="28" fill="white" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="30" cy="30" r="22" fill="#e0f2fe" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="8" fill="#1e293b" />
          <circle cx="26" cy="27" r="2" fill="white" opacity="0.6" />
        </svg>
        <p className="text-xs text-gray-500 mt-1 font-medium">Undilated</p>
      </div>

      {/* Arrow */}
      <svg viewBox="0 0 24 12" className="w-8 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="0" y1="6" x2="20" y2="6" />
        <polyline points="16,2 20,6 16,10" />
      </svg>

      {/* Dilated */}
      <div className="text-center">
        <svg viewBox="0 0 60 60" className="w-14 h-14 mx-auto" aria-hidden="true">
          <circle cx="30" cy="30" r="28" fill="white" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="30" cy="30" r="22" fill="#e0f2fe" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="16" fill="#1e293b" />
          <circle cx="24" cy="25" r="3" fill="white" opacity="0.5" />
        </svg>
        <p className="text-xs text-gray-500 mt-1 font-medium">Dilated</p>
      </div>
    </div>
  );
}
