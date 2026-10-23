import Link from 'next/link';
import { notFound } from 'next/navigation';
import { API_BASE } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface Article {
  title: string;
  summary: string | null;
  content: string;
  tags: string[];
  views: number;
  readMinutes: number;
  publishedAt: string | null;
  category: { name: string } | null;
}

async function fetchArticle(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(`${API_BASE}/articles/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).data as Article;
  } catch {
    return null;
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) notFound();

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-[720px]">
        <Link href="/articles" className="text-sm text-[#667085] hover:text-brand">
          ← 返回文章
        </Link>

        <p className="mt-6 text-[11px] font-medium uppercase tracking-wider text-brand">
          {article.category?.name ?? article.tags[0] ?? 'BLOG'}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-9">{article.title}</h1>
        <p className="mt-2 text-xs text-[#98A2B3]">
          {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('zh-CN') : '—'} ·{' '}
          {article.readMinutes} 分钟阅读 · {article.views} 次浏览
        </p>

        <article className="mt-6 whitespace-pre-wrap text-[15px] leading-8 text-[#344054]">{article.content}</article>

        {article.tags.length ? (
          <div className="mt-8 flex flex-wrap gap-2 border-t border-black/5 pt-5">
            {article.tags.map((t) => (
              <span key={t} className="chip">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
