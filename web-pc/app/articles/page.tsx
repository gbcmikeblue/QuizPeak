import { API_BASE } from '@/lib/api';
import { CardShell } from '@/components/card-shell';
import { getI18n } from '@/lib/locale';

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
  const [{ tt, date }, list] = await Promise.all([getI18n(), fetchArticles()]);

  return (
    <main className="container-page py-10">
      <p className="text-xs font-medium tracking-wide text-brand">STORIES, INSIGHTS &amp; UPDATES</p>
      <h1 className="mt-1 text-2xl font-bold">{tt('文章')}</h1>
      <p className="mt-1 text-sm text-[#667085]">{tt('答题技巧、积分攻略与平台动态')}</p>

      {list.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#98A2B3]">{tt('暂无文章')}</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <CardShell
              key={a.id}
              href={`/articles/${a.slug}`}
              actionLabel={tt('阅读全文')}
              cover={{ src: null, alt: a.title, fallback: '📄' }}
              topRight={
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-[#344054]">
                  {a.category?.name ?? tt('文章')}
                </span>
              }
              eyebrow={
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand">
                  {a.tags[0] ?? 'BLOG'}
                </p>
              }
              title={a.title}
              description={a.summary}
              meta={
                <span>
                  {a.publishedAt ? date(a.publishedAt) : '—'} · {tt('{n} 分钟', { n: a.readMinutes })} ·{' '}
                  {tt('{n} 次浏览', { n: a.views })}
                </span>
              }
              footerLeft={<span>{tt('{n} 分钟阅读', { n: a.readMinutes })}</span>}
            />
          ))}
        </div>
      )}
    </main>
  );
}
