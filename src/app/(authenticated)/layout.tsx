import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppNav } from '@/components/layout/app-nav';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppNav userName={user.user_metadata?.name || user.email || ''} />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-6xl p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
