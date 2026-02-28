interface MemberHeaderProps {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
}

export function MemberHeader({ firstName, lastName, dateOfBirth }: MemberHeaderProps) {
  const age = dateOfBirth
    ? Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-lg font-bold text-primary">
          {firstName.charAt(0)}{lastName.charAt(0)}
        </span>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          {firstName} {lastName}
        </h1>
        {age !== null && (
          <p className="text-sm text-gray-500">{age} years old</p>
        )}
      </div>
    </div>
  );
}
