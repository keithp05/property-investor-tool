import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import AdminSidebar from './components/AdminSidebar';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

async function verifyAdminSession() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin_session')?.value;

    if (!sessionToken) {
      return null;
    }

    const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
    
    if (payload.type !== 'admin_session' || !payload.mfaVerified) {
      return null;
    }

    return {
      mfaVerified: true,
    };
  } catch {
    return null;
  }
}

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
