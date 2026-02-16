import { Bell } from "lucide-react";

type Props = {
  title?: string;
};

export function Header({ title }: Props) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {title ? (
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      ) : (
        <div />
      )}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
