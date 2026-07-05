export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO(auth): once auth is built, redirect already-authenticated users to "/".
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-6">
      {children}
    </div>
  );
}
