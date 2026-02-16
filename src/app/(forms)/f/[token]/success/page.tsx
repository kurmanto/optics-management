export default function FormSuccessPage() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8 text-green-600"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">Form Submitted</h1>
        <p className="text-sm text-gray-500">
          Thank you! Your information has been received securely by Mint Vision Optique.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p>You may now close this tab.</p>
        <p className="mt-1 text-xs text-gray-400">
          If you have any questions, please contact us directly.
        </p>
      </div>
    </div>
  );
}
