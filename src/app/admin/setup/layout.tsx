export default function AdminSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Setup page doesn't use the admin sidebar layout
  return <>{children}</>;
}
