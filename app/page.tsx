import HomePageClient from './HomePageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  return (
    <main className="overflow-x-hidden w-full relative max-w-[100vw]">
      <HomePageClient />
    </main>
  );
}
