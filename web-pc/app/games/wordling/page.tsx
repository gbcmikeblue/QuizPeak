'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authFetch, getToken } from '@/lib/auth';

interface State {
  variant: string;
  label: string;
  length: number;
  maxGuesses: number;
  guesses: string[]; // "a:correct" 形式
  finished: boolean;
  won: boolean;
  reward: number;
}

interface GuessRes {
  states: Array<'correct' | 'present' | 'absent'>;
  correct: boolean;
  attemptsLeft: number;
  finished: boolean;
  answer?: string;
  reward: number;
}

const VARIANTS = [
  { key: 'min', label: 'Wordling Min', desc: '3 字母 · 6 次' },
  { key: 'normal', label: 'Wordling', desc: '5 字母 · 6 次' },
  { key: 'max', label: 'Wordling Max', desc: '7 字母 · 7 次' },
];

const COLOR: Record<string, string> = {
  correct: 'bg-brand text-white border-brand',
  present: 'bg-[#F5C518] text-[#3D3200] border-[#F5C518]',
  absent: 'bg-[#E4E7EC] text-[#667085] border-[#E4E7EC]',
};

export default function WordlingPage() {
  const router = useRouter();
  const [variant, setVariant] = useState('normal');
  const [state, setState] = useState<State | null>(null);
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (v: string) => {
    try {
      setState(await authFetch<State>(`/games/wordling/${v}`));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?redirect=%2Fgames%2Fwordling');
      return;
    }
    void load(variant);
  }, [load, router, variant]);

  async function submit() {
    if (!state || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await authFetch<GuessRes>(`/games/wordling/${variant}/guess`, {
        method: 'POST',
        body: JSON.stringify({ guess }),
      });
      setGuess('');
      if (res.finished) {
        setMessage(
          res.correct
            ? `猜中！答案 ${res.answer}，获得 ${res.reward} 积分`
            : `机会用完，答案是 ${res.answer}`,
        );
      } else if (res.correct) {
        setMessage('猜中！');
      }
      await load(variant);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  }

  const rows = state?.guesses ?? [];

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setVariant(v.key)}
            className={`rounded-lg border px-3 py-2 text-left text-[13px] transition ${
              variant === v.key
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-black/10 text-[#475467] hover:bg-black/[0.03]'
            }`}
          >
            <span className="block font-medium">{v.label}</span>
            <span className="text-[11px] text-[#98A2B3]">{v.desc}</span>
          </button>
        ))}
      </div>

      <section className="card mx-auto mt-5 max-w-[520px]">
        {!state ? (
          <p className="py-10 text-center text-sm text-[#667085]">加载中…</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{state.label}</span>
              <span className="text-xs text-[#98A2B3]">
                已用 {rows.length}/{state.maxGuesses} 次
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {Array.from({ length: state.maxGuesses }).map((_, rowIndex) => {
                const row = rows[rowIndex];
                return (
                  <div key={rowIndex} className="flex justify-center gap-2">
                    {Array.from({ length: state.length }).map((__, colIndex) => {
                      const cell = row?.[colIndex];
                      const [letter, st] = cell ? cell.split(':') : ['', ''];
                      return (
                        <div
                          key={colIndex}
                          className={`grid h-11 w-11 place-items-center rounded-lg border text-lg font-bold uppercase ${
                            st ? COLOR[st] : 'border-black/10 bg-white text-[#1A1A1A]'
                          }`}
                        >
                          {letter}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {state.finished ? (
              <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-center text-sm text-[#0B3B27]">
                {state.won ? `今天的答案你猜中了，+${state.reward} 积分` : '今天的这一局已结束，明天再来'}
              </p>
            ) : (
              <div className="mt-4 flex gap-2">
                <input
                  className="input flex-1 text-center text-base font-bold uppercase tracking-[0.3em]"
                  maxLength={state.length}
                  placeholder={'输入 ' + state.length + ' 个字母'}
                  value={guess}
                  onChange={(e) => setGuess(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submit();
                  }}
                />
                <button
                  type="button"
                  className="btn-primary h-10 px-5 text-[13px]"
                  onClick={submit}
                  disabled={busy || guess.length !== state.length}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                  提交
                </button>
              </div>
            )}

            {message ? <p className="mt-3 text-center text-xs text-[#667085]">{message}</p> : null}

            <div className="mt-4 rounded-lg bg-[#FAFBFA] p-3 text-[11px] leading-5 text-[#667085]">
              <p className="mb-1 text-[12px] font-medium text-[#344054]">玩法说明</p>
              <p>· 输入规定长度的英文单词后提交，同一局可猜 6 次（Wordling Max 为 7 次）。</p>
              <p>
                · 色块反馈：<span className="font-medium text-brand">绿色</span> = 字母与位置都对；
                <span className="font-medium text-[#B7791F]">黄色</span> = 字母在答案里但位置错；
                <span className="font-medium text-[#667085]">灰色</span> = 答案里没有这个字母。
              </p>
              <p>· 每日一局，同一变体当天结束后不可重玩；猜中即得积分，次日 0 点刷新。</p>
            </div>
          </>
        )}
      </section>
    </>
  );
}
