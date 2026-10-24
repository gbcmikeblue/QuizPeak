import { API_BASE, type ContestCard as ContestCardData } from '@/lib/api';
import { ContestCard } from '@/components/contest-card';
import { getI18n } from '@/lib/locale';

export const dynamic = 'force-dynamic';

async function fetchContests(): Promise<ContestCardData[]> {
  try {
    const res = await fetch(`${API_BASE}/contests?page=1&pageSize=9`, { cache: 'no-store' });
    const json = await res.json();
    return json.data.list as ContestCardData[];
  } catch {
    return [];
  }
}

export default async function ContestsPage() {
  const [{ tt }, list] = await Promise.all([getI18n(), fetchContests()]);

  return (
    <main className="container-page py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-brand">CONTESTS</p>
        <h1 className="text-2xl font-bold">{tt('竞赛')}</h1>
        <p className="text-sm text-[#667085]">
          {tt('限时答题，按得分与用时排名，前三名获得积分与 XP')}
        </p>
      </div>

      {list.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-brand-soft text-4xl">🏆</div>
          <p className="mt-5 text-lg font-semibold">{tt('暂无竞赛')}</p>
          <p className="mt-1 text-sm text-[#667085]">{tt('运营在后台创建后会显示在这里')}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <ContestCard key={c.id} contest={c} />
          ))}
        </div>
      )}
    </main>
  );
}
