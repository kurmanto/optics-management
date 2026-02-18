type Props = {
  title?: string;
};

export function Header({ title }: Props) {
  if (!title) return null;
  return (
    <div className="px-6 pt-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    </div>
  );
}
