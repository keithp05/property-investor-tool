import { verifyAdminSession } from '@/lib/admin-session';
import AdminSidebar from './components/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyAdminSession();

  // No valid session - render children without sidebar
  // The login page will handle authentication
  if (!session) {
    return <>{children}</>;
  }

  // Valid session - show full admin layout with sidebar
  return (
    <div className="min-h-screen bg-gray-950 flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
