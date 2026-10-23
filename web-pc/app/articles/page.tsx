import Link from 'next/link';
import { API_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  tags: string[];
  readMinutes: number;
  views: number;
  publishedAt: string | null;
  category: { name: string } | null;
}

async function fetchArticles(): Promise<Article[]> {
  try {
    const res = await fetch(`${API_BASE}/articles?page=1`, { cache: 'no-store' });
    return (await res.json()).data.list as Article[];
  } catch {
    return [];
  }
}

export default async function ArticlesPage() {
  const list = await fetchArticles();

  return (
    <main className="container-page py-10">
      <p className="text-xs font-medium tracking-wide text-brand">STORIES, INSIGHTS &amp; UPDATES</p>
      <h1 className="mt-1 text-2xl font-bold">文章</h1>
      <p className="mt-1 text-sm text-[#667085]">答题技巧、积分攻略与平台动态</p>

      {list.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#98A2B3]">暂无文章</p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {list.map((a) => (
            <Link key={a.id} href={`/articles/${a.slug}`} className="card-quiz block p-5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand">
                {(a.category?.name ?? a.tags[0] ?? 'BLOG').toString()}
              </p>
              <h2 className="mt-2 text-[17px] font-semibold leading-6">{a.title}</h2>
              {a.summary ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#667085]">{a.summary}</p> : null}
              <p className="mt-3 text-xs text-[#98A2B3]">
                {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('zh-CN') : '—'} · {a.readMinutes} 分钟阅读 ·{' '}
                {a.views} 次浏览
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
