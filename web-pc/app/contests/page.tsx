import Link from 'next/link';
import { CalendarDays, Clock, Coins, Trophy, Users } from 'lucide-react';
import { API_BASE, type ContestCard } from '@/lib/api';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, { text: string; cls: string }> = {
  RUNNING: { text: '进行中', cls: 'bg-brand-soft text-brand' },
  UPCOMING: { text: '未开始', cls: 'bg-[#FFF7E6] text-[#B7791F]' },
  ENDED: { text: '已结束', cls: 'bg-[#F2F4F7] text-[#667085]' },
};

async function fetchContests(): Promise<ContestCard[]> {
  try {
    const res = await fetch(`${API_BASE}/contests?page=1&pageSize=9`, { cache: 'no-store' });
    const json = await res.json();
    return json.data.list as ContestCard[];
  } catch {
    return [];
  }
}

export default async function ContestsPage() {
  const list = await fetchContests();

  return (
    <main className="container-page py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-brand">CONTESTS</p>
        <h1 className="text-2xl font-bold">竞赛</h1>
        <p className="text-sm text-[#667085]">限时答题，按得分与用时排名，前三名获得积分与 XP</p>
      </div>

      {list.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-brand-soft text-4xl">🏆</div>
          <p className="mt-5 text-lg font-semibold">暂无竞赛</p>
          <p className="mt-1 text-sm text-[#667085]">运营在后台创建后会显示在这里</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const s = STATUS[c.effectiveStatus] ?? STATUS.UPCOMING;
            const percent = Math.min(100, Math.round((c.enrolledCount / Math.max(c.capacity, 1)) * 100));
            return (
              <article key={c.id} className="card-quiz">
                <div className="relative h-[140px] bg-brand-soft">
                  {c.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover} alt={c.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-4xl">🏆</div>
                  )}
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] ${s.cls}`}>{s.text}</span>
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-[#344054]">
                    {c.category?.name ?? '综合'}
                  </span>
                  <div className="absolute bottom-3 left-3 flex gap-2 text-[11px] text-white">
                    <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
                      <Clock size={11} /> {Math.round(c.durationSec / 60)} 分钟
                    </span>
                    <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
                      <Users size={11} /> {c.enrolledCount}/{c.capacity}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="truncate text-[15px] font-semibold">{c.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085]">{c.description ?? '暂无介绍'}</p>

                  <div className="mt-3 flex items-center justify-between text-xs text-[#667085]">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} />
                      {new Date(c.startAt).toLocaleDateString('zh-CN')} - {new Date(c.endAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span className="w-[70px]">
                      <span className="block h-1 overflow-hidden rounded-full bg-black/10">
                        <span className="block h-full bg-brand" style={{ width: `${percent}%` }} />
                      </span>
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 text-xs">
                    <span className="flex items-center gap-1 text-[#667085]">
                      <Trophy size={12} className="text-[#F5A623]" /> 奖池 {c.prizePool}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-[#0B3B27]">
                      <Coins size={12} className="text-[#F5A623]" />
                      {c.entryFee > 0 ? `${c.entryFee} 积分` : '免费'}
                    </span>
                  </div>

                  <Link href={`/contests/${c.id}`} className="btn-primary mt-3 h-9 w-full text-[13px]">
                    查看详情
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
