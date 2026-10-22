import Link from 'next/link';
import { ArrowRight, Search, Sparkles, Trophy } from 'lucide-react';
import { QuizCard } from '@/components/quiz-card';
import { fetchQuizzes } from '@/lib/api';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: '1', label: '网络安全' },
  { key: '2', label: '常识' },
  { key: '3', label: '科学' },
  { key: '4', label: '历史' },
  { key: '5', label: '地理' },
  { key: '6', label: '数学' },
  { key: '7', label: '文学' },
  { key: '8', label: '体育' },
  { key: '9', label: '影视' },
  { key: '10', label: '编程' },
];

export default async function HomePage() {
  const quizzes = await fetchQuizzes({ page: '1', pageSize: '9' });

  return (
    <main>
      <section className="border-b border-black/5 bg-brand-soft">
        <div className="container-page grid gap-8 py-12 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand">
              <Sparkles size={13} /> 每日签到、看广告、点赞都能攒积分
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight md:text-[42px]">
              加入终极答题挑战
              <br />
              用知识赢取奖励
            </h1>
            <p className="mt-3 max-w-[460px] text-sm leading-6 text-[#4A6B5C]">
              分类题库、闯关模式、限时竞赛与实时排行榜。答对越多，积分与经验越高，还能登上积分榜。
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/quizzes" className="btn-primary h-11 px-6 text-sm">
                开始答题 <ArrowRight size={15} />
              </Link>
              <Link href="/contests" className="btn-outline h-11 bg-white px-6 text-sm">
                查看竞赛
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-[#98A2B3]">下一场竞赛</p>
            <p className="mt-2 text-lg font-semibold">即将开始</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { v: '--', l: '天' },
                { v: '--', l: '小时' },
                { v: '--', l: '分钟' },
              ].map((it) => (
                <div key={it.l} className="rounded-lg bg-brand-soft py-2">
                  <p className="text-lg font-semibold text-[#0B3B27]">{it.v}</p>
                  <p className="text-[11px] text-[#4A6B5C]">{it.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-[#667085]">
              <Trophy size={14} className="text-[#F5A623]" /> 名次奖励 1000 积分 · 参赛消耗 50 积分
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">题库</h2>
          <div className="flex h-10 w-full items-center gap-2 rounded-lg border border-black/10 px-3 md:w-[320px]">
            <Search size={15} className="text-[#98A2B3]" />
            <input
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-[#98A2B3]"
              placeholder="搜索题目、分类关键词…"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c, i) => (
            <span key={c.label} className={i === 0 ? 'chip chip-active' : 'chip'}>
              {c.label}
            </span>
          ))}
        </div>

        {quizzes.list.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-brand-soft text-4xl">
              📚
            </div>
            <p className="mt-5 text-lg font-semibold">暂无题目</p>
            <p className="mt-1 text-sm text-[#667085]">
              题库为空或接口未启动，请先运行 server 并执行种子数据。
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.list.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
