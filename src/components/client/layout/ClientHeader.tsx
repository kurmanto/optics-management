interface ClientHeaderProps {
  familyName: string;
}

export function ClientHeader({ familyName }: ClientHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-gray-400 uppercase">
            Mint Vision
          </p>
          <h1 className="text-lg font-semibold text-gray-900">
            {/family$/i.test(familyName.trim()) ? familyName : `${familyName} Family`}
          </h1>
        </div>
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {familyName.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
