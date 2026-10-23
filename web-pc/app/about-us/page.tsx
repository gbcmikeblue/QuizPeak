import Link from 'next/link';
import { BookOpen, Coins, Trophy, Users } from 'lucide-react';
import { BRAND } from '@quizpeak/shared';
import { API_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Stats {
  quizzes: number;
  questions: number;
  players: number;
}

async function fetchStats(): Promise<Stats> {
  try {
    const [quizzes, board] = await Promise.all([
      fetch(`${API_BASE}/quizzes?page=1&pageSize=1`, { cache: 'no-store' }).then((r) => r.json()),
      fetch(`${API_BASE}/leaderboard?period=all&page=1&pageSize=1`, { cache: 'no-store' }).then((r) => r.json()),
    ]);
    const quizTotal = quizzes?.data?.total ?? 0;
    const detail = quizzes?.data?.list?.[0];
    return {
      quizzes: quizTotal,
      questions: detail?.questionTotal ?? 0,
      players: board?.data?.total ?? 0,
    };
  } catch {
    return { quizzes: 0, questions: 0, players: 0 };
  }
}

export default async function AboutPage() {
  const stats = await fetchStats();

  return (
    <main>
      <section className="bg-brand-soft/60 py-16">
        <div className="container-page grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-brand">ABOUT US</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">
              {BRAND.sloganZh}
            </h1>
            <p className="mt-4 max-w-[520px] text-sm leading-7 text-[#4A6B5C]">
              {BRAND.nameZh}（{BRAND.nameEn}）是一个以知识为核心的答题闯关平台。
              我们把题库拆成关卡，用积分记录每一次进步：答对题目、每日签到、给上榜选手点赞，
              都会变成看得见的积分。积分只用于站内答题与竞赛，不能兑换任何货币。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/quizzes" className="btn-primary h-10 px-5 text-[13px]">
                开始答题
              </Link>
              <Link href="/leaderboard" className="btn-outline h-10 px-5 text-[13px]">
                查看积分榜
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BookOpen, label: '题库', value: stats.quizzes },
              { icon: Users, label: '上榜选手', value: stats.players },
              { icon: Trophy, label: '闯关模式', value: '10 关' },
              { icon: Coins, label: '积分获取', value: '4 种' },
            ].map((item) => (
              <div key={item.label} className="rounded-card bg-white p-5 shadow-sm">
                <item.icon size={18} className="text-brand" />
                <p className="mt-3 text-2xl font-bold">{item.value}</p>
                <p className="mt-1 text-xs text-[#667085]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="text-xl font-bold">我们怎么玩</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              step: '01',
              title: '闯关答题',
              desc: '每个题库 10 关，每关 8 题、单题 120 秒。上一关正确率达到 90%，解锁下一关。',
            },
            {
              step: '02',
              title: '赚取积分',
              desc: '每日签到、看广告、给上榜选手点赞、参加活动都能获得积分，不涉及任何充值。',
            },
            {
              step: '03',
              title: '登上榜单',
              desc: '答题累积 XP 与正确率，进入总榜与月榜；你的表现会被其他选手看到并点赞。',
            },
          ].map((item) => (
            <div key={item.step} className="card">
              <span className="text-xs font-semibold text-brand">{item.step}</span>
              <h3 className="mt-2 text-[15px] font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#667085]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-16">
        <div className="rounded-card bg-brand p-8 text-white">
          <h2 className="text-xl font-bold">关于积分，我们想说明白</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-2">
            <li>· 积分是站内学习凭证，只能用于解锁题库、报名竞赛等站内消费。</li>
            <li>· 积分不可购买、不可转让、不可提现，也无法兑换任何货币或实物。</li>
            <li>· 积分来源全部为行为激励：签到、活动、点赞、看广告。</li>
            <li>· 平台可依规调整积分规则，调整前会在站内公告说明。</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
