import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mint Vision Optique — Forms",
};

export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-white"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Mint Vision Optique</div>
            <div className="text-xs text-gray-500">Secure Patient Forms</div>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      <footer className="max-w-2xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
        This form is encrypted and secure. Your information is protected under PIPEDA.
      </footer>
    </div>
  );
}
