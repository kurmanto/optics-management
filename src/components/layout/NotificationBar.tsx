import { NotificationBell } from "./NotificationBell";

type Props = {
  userId: string;
};

export function NotificationBar({ userId }: Props) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-end flex-shrink-0">
      <NotificationBell userId={userId} />
    </header>
  );
}
