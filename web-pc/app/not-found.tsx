import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-6xl font-black tracking-tight text-brand/20">404</p>
      <h1 className="mt-4 text-xl font-bold">页面不存在</h1>
      <p className="mt-2 max-w-[420px] text-sm leading-6 text-[#667085]">
        链接可能已失效，或者题目/竞赛已被下架。你可以从下面这些入口继续：
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-primary h-10 px-5 text-[13px]">
          返回首页
        </Link>
        <Link href="/quizzes" className="btn-outline h-10 px-5 text-[13px]">
          去答题
        </Link>
        <Link href="/leaderboard" className="btn-outline h-10 px-5 text-[13px]">
          看排行榜
        </Link>
      </div>
    </main>
  );
}
