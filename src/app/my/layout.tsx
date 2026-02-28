export const metadata = {
  title: "My Vision Portal — Mint Vision Optique",
  description: "Your family vision care dashboard",
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
