import Image from "next/image";

interface StyleRoundCardProps {
  label: string;
  description: string;
  image: string;
  selected: boolean;
  onClick: () => void;
}

export function StyleRoundCard({ label, description, image, selected, onClick }: StyleRoundCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-2xl border-2 p-4 flex flex-col items-center gap-3 transition-all active:scale-[0.97] ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="h-24 w-24 relative">
        <Image
          src={image}
          alt={label}
          fill
          className="object-contain"
        />
      </div>
      <div className="text-center">
        <p className={`text-sm font-semibold ${selected ? "text-primary" : "text-gray-900"}`}>
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}
