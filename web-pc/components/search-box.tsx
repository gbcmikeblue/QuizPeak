'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { authFetch, getToken } from '@/lib/auth';
import { API_BASE } from '@/lib/api';

interface SuggestItem {
  text: string;
  type: 'QUIZ' | 'CONTEST' | 'ARTICLE' | 'HOT';
}
interface HistoryItem {
  id: string;
  keyword: string;
}

const TYPE_LABEL: Record<string, string> = { QUIZ: '题库', CONTEST: '竞赛', ARTICLE: '文章', HOT: '热词' };

export function SearchBox({ placeholder = '搜索题库、竞赛、文章…' }: { placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [suggest, setSuggest] = useState<SuggestItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    if (!getToken()) {
      setHistory([]);
      return;
    }
    try {
      setHistory(await authFetch<HistoryItem[]>('/search/history'));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j) => setSuggest(Array.isArray(j?.data) ? j.data : []))
        .catch(() => setSuggest([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(keyword: string) {
    const word = keyword.trim();
    if (!word) return;
    if (getToken()) void authFetch('/search/history', { method: 'POST', body: JSON.stringify({ keyword: word }) }).catch(() => undefined);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(word)}`);
  }

  async function removeHistory(id: string) {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    await authFetch(`/search/history/${id}`, { method: 'DELETE' }).catch(() => undefined);
  }

  async function clearHistory() {
    setHistory([]);
    await authFetch('/search/history', { method: 'DELETE' }).catch(() => undefined);
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-[520px]">
      <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 shadow-sm focus-within:border-brand">
        <Search size={16} className="shrink-0 text-[#98A2B3]" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#98A2B3]"
          placeholder={placeholder}
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go(q);
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        {q ? (
          <button type="button" onClick={() => setQ('')} className="shrink-0 text-[#98A2B3] hover:text-[#475467]">
            <X size={15} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[52px] z-30 overflow-hidden rounded-xl border border-black/5 bg-white shadow-xl">
          {q ? (
            suggest.length > 0 ? (
              suggest.map((s) => (
                <button
                  key={`${s.type}-${s.text}`}
                  type="button"
                  onClick={() => go(s.text)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-black/[0.03]"
                >
                  <span className="truncate">{s.text}</span>
                  <span className="shrink-0 rounded bg-[#F2F4F7] px-1.5 py-0.5 text-[11px] text-[#667085]">
                    {TYPE_LABEL[s.type] ?? s.type}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-center text-xs text-[#98A2B3]">没有匹配建议，回车直接搜索</p>
            )
          ) : (
            <>
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-[11px] font-medium text-[#98A2B3]">搜索历史</span>
                {history.length > 0 ? (
                  <button type="button" className="text-[11px] text-[#98A2B3] hover:text-red-500" onClick={clearHistory}>
                    清空
                  </button>
                ) : null}
              </div>
              {history.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[#98A2B3]">暂无搜索历史，试试搜「算法」</p>
              ) : (
                <div className="mt-1 pb-2">
                  {history.map((h) => (
                    <div key={h.id} className="group flex items-center gap-2 px-4 py-2 hover:bg-black/[0.03]">
                      <button type="button" className="min-w-0 flex-1 truncate text-left text-sm" onClick={() => go(h.keyword)}>
                        {h.keyword}
                      </button>
                      <button
                        type="button"
                        className="shrink-0 text-[#D0D5DD] opacity-0 transition group-hover:opacity-100 hover:text-red-500"
                        onClick={() => removeHistory(h.id)}
                        title="从历史中删除"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
