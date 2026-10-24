import type { Metadata } from 'next';
import { GamesTabs } from '@/components/games-tabs';
import { getI18n } from '@/lib/locale';

export async function generateMetadata(): Promise<Metadata> {
  const { tt } = await getI18n();
  return { title: `${tt('小游戏')} · QuizPeak` };
}

export default async function GamesLayout({ children }: { children: React.ReactNode }) {
  const { tt } = await getI18n();

  return (
    <main className="container-page py-10">
      <p className="text-xs font-medium tracking-wide text-brand">MINI GAMES</p>
      <h1 className="mt-1 text-2xl font-bold">{tt('小游戏')}</h1>
      <p className="mt-1 text-sm text-[#667085]">
        {tt('Wordling 每日猜词、Hexling 每日拼词，两种玩法都能获得积分，每日各一局。')}
      </p>

      <GamesTabs />

      {children}
    </main>
  );
}
