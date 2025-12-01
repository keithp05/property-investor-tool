import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminSidebar from './components/AdminSidebar';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  // Redirect if not logged in
  if (!session?.user) {
    redirect('/login');
  }

  // Check if user is super admin
  const userRole = (session.user as any).role;
  if (userRole !== 'SUPER_ADMIN') {
    redirect('/dashboard?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <AdminSidebar user={session.user} />
      
      {/* Main Content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
