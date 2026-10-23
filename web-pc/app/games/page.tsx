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

export default function GamesPage() {
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
      router.replace('/login?redirect=%2Fgames');
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
    <main className="container-page py-10">
      <p className="text-xs font-medium tracking-wide text-brand">MINI GAMES</p>
      <h1 className="mt-1 text-2xl font-bold">小游戏</h1>
      <p className="mt-1 text-sm text-[#667085]">每天一局，猜中得积分；另一款 Hexling 正在开发</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setVariant(v.key)}
            className={`rounded-lg border px-3 py-2 text-left text-[13px] transition ${
              variant === v.key ? 'border-brand bg-brand-soft text-brand' : 'border-black/10 text-[#475467] hover:bg-black/[0.03]'
            }`}
          >
            <span className="block font-medium">{v.label}</span>
            <span className="text-[11px] text-[#98A2B3]">{v.desc}</span>
          </button>
        ))}
        <span className="ml-auto self-center rounded-lg bg-[#F2F4F7] px-3 py-2 text-[12px] text-[#98A2B3]">Hexling 开发中</span>
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

            <p className="mt-4 text-center text-[11px] leading-5 text-[#98A2B3]">
              绿色 = 位置正确，黄色 = 字母存在但位置错，灰色 = 不含该字母
            </p>
          </>
        )}
      </section>

      <HexlingCard />
    </main>
  );
}

interface HexState {
  letters: string[];
  durationSec: number;
  minLength: number;
  rewardThreshold: number;
  played: boolean;
  words: Array<{ word: string; score: number }>;
  score: number;
  reward: number;
}

function HexlingCard() {
  const [state, setState] = useState<HexState | null>(null);
  const [word, setWord] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await authFetch<HexState>('/games/hexling'));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    if (getToken()) void load();
  }, [load]);

  function addWord() {
    const w = word.trim().toLowerCase();
    if (w.length < 4) {
      setMessage('单词至少 4 个字母');
      return;
    }
    if (pending.includes(w)) {
      setMessage('这个单词已经加过了');
      return;
    }
    setPending([...pending, w]);
    setWord('');
    setMessage('');
  }

  async function submit() {
    if (!state || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await authFetch<{ score: number; reward: number; accepted: unknown[]; rejected: Array<{ word: string; reason: string }> }>(
        '/games/hexling/submit',
        { method: 'POST', body: JSON.stringify({ words: pending }) },
      );
      setMessage(
        `提交完成：得分 ${res.score}` +
          (res.reward > 0 ? `，获得 ${res.reward} 积分` : '') +
          (res.rejected.length ? `；${res.rejected.length} 个未通过` : ''),
      );
      setPending([]);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mx-auto mt-5 max-w-[520px]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Hexling</span>
        <span className="text-xs text-[#98A2B3]">16 字母 · 每日一局</span>
      </div>

      {!state ? (
        <p className="py-8 text-center text-sm text-[#667085]">加载中…</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {state.letters.map((ch: string, i: number) => (
              <span
                key={`${ch}-${i}`}
                className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-base font-bold uppercase text-[#0B3B27]"
              >
                {ch}
              </span>
            ))}
          </div>

          {state.played ? (
            <>
              <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-center text-sm text-[#0B3B27]">
                今日已提交：得分 {state.score}，拼出 {state.words.length} 个单词
                {state.reward > 0 ? `，获得 ${state.reward} 积分` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {state.words.map((w) => (
                  <span key={w.word} className="rounded-md bg-[#F2F4F7] px-2 py-1 text-[12px] text-[#475467]">
                    {w.word} <span className="text-[#98A2B3]">+{w.score}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 flex gap-2">
                <input
                  className="input flex-1 uppercase tracking-widest"
                  placeholder="输入 4 个字母以上的单词"
                  maxLength={20}
                  value={word}
                  onChange={(e) => setWord(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addWord();
                  }}
                />
                <button type="button" className="btn-ghost h-10 px-4 text-[13px]" onClick={addWord}>
                  加入
                </button>
              </div>

              {pending.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pending.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setPending(pending.filter((x) => x !== w))}
                      className="rounded-md bg-[#F2F4F7] px-2 py-1 text-[12px] text-[#475467]"
                      title="点击移除"
                    >
                      {w} ✕
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className="btn-primary mt-4 h-10 w-full text-[13px]"
                onClick={submit}
                disabled={busy || pending.length === 0}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                提交本局（{pending.length} 个）
              </button>
            </>
          )}

          {message ? <p className="mt-3 text-center text-xs text-[#667085]">{message}</p> : null}

          <p className="mt-4 text-center text-[11px] leading-5 text-[#98A2B3]">
            单词需在英文词典中；4 字母 +1、5 字母 +2、6 字母 +3、7 字母 +5、8 字母以上 +8，得分满{' '}
            {state.rewardThreshold} 发放积分奖励
          </p>
        </>
      )}
    </section>
  );
}
