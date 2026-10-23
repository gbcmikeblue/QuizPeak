'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2, Timer, Trophy, XCircle } from 'lucide-react';
import type { AnswerResult, ContestFinish, ContestPlay } from '@/lib/api';
import { authFetch } from '@/lib/auth';

function mmss(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

export default function ContestPlayPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ContestPlay | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ContestFinish | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch<ContestPlay>(`/contests/${id}/attempt`, { method: 'POST', body: '{}' });
      setData(res);
      const first = res.questions.findIndex((q) => !res.answered.some((a) => a.questionId === q.id));
      setIndex(first === -1 ? res.questions.length - 1 : first);
      setSecondsLeft(res.questionSeconds);
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法开始竞赛');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const question = data?.questions[index];
  const total = data?.questions.length ?? 0;
  const isLast = index === total - 1;

  const submit = useCallback(
    async (forceEmpty = false) => {
      if (!data || !question || busy) return;
      setBusy(true);
      try {
        const res = await authFetch<AnswerResult>(`/contest-attempts/${data.attemptId}/answer`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: question.id,
            answer: forceEmpty ? [] : selected,
            usedSec: Math.max(0, data.questionSeconds - secondsLeft),
          }),
        });
        setFeedback(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : '提交失败');
      } finally {
        setBusy(false);
      }
    },
    [busy, data, question, secondsLeft, selected],
  );

  useEffect(() => {
    if (!data || feedback || result) return;
    if (secondsLeft <= 0) {
      void submit(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [data, feedback, result, secondsLeft, submit]);

  async function next() {
    if (!data) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      setSelected([]);
      setFeedback(null);
      setSecondsLeft(data.questionSeconds);
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch<ContestFinish>(`/contest-attempts/${data.attemptId}/finish`, {
        method: 'POST',
        body: '{}',
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '交卷失败');
    } finally {
      setBusy(false);
    }
  }

  const answerText = useMemo(() => {
    if (!question || !feedback) return '';
    return feedback.correctAnswer.map((k) => question.options.find((o) => o.key === k)?.text ?? k).join('、');
  }, [feedback, question]);

  if (result) {
    return (
      <main className="container-page py-12">
        <div className="mx-auto max-w-[560px]">
          <div className="card text-center">
            <p className="text-sm text-[#667085]">交卷完成</p>
            <p className="mt-2 text-3xl font-bold text-brand">
              {result.score} / {result.totalScore}
            </p>
            <p className="mt-1 text-sm text-[#475467]">
              答对 {result.correctCount}/{result.total} · 用时 {mmss(result.totalTimeSec)}
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm text-[#0B3B27]">
              <Trophy size={14} className="text-[#F5A623]" /> 当前第 {result.rank} 名
            </p>
            {result.pendingSettlement ? (
              <p className="mt-2 text-xs leading-5 text-[#98A2B3]">
                竞赛结束后按最终榜单统一结算并发奖，名次可能随他人成绩变化
              </p>
            ) : result.pointsEarned > 0 ? (
              <p className="mt-2 text-sm text-brand">
                获得 {result.pointsEarned} 积分 · {result.xpEarned} XP
              </p>
            ) : (
              <p className="mt-2 text-xs text-[#98A2B3]">未进入奖励名次，下次再来</p>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <Link href={`/contests/${id}`} className="btn-primary h-10 px-5 text-[13px]">
                查看排行榜
              </Link>
              <Link href="/contests" className="btn-outline h-10 px-5 text-[13px]">
                返回竞赛列表
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data || !question) {
    return (
      <main className="container-page py-16 text-center text-sm">
        {error ? <span className="text-red-600">{error}</span> : <span className="text-[#667085]">准备中…</span>}
        {error ? (
          <div className="mt-4">
            <Link href={`/contests/${id}`} className="btn-outline h-9 px-4 text-[13px]">
              返回竞赛
            </Link>
          </div>
        ) : null}
      </main>
    );
  }

  const multi = question.type === 'MULTI';

  function toggle(key: string) {
    if (feedback) return;
    setSelected((prev) => (multi ? (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]) : [key]));
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-brand-soft/60 py-8">
      <div className="mx-auto w-full max-w-[720px] px-5">
        <div className="flex items-center justify-between text-sm text-[#4A6B5C]">
          <span>{data.contest.title}</span>
          <span className="rounded-full bg-white px-3 py-1 font-medium text-[#0B3B27]">
            第 {index + 1} / {total} 题
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full bg-brand transition-all" style={{ width: `${Math.round(((index + 1) / total) * 100)}%` }} />
        </div>

        <section className="card mt-4">
          <div className="flex items-start justify-between gap-4">
            <p className="whitespace-pre-wrap text-[15px] leading-7">{question.stem}</p>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                secondsLeft <= 10 ? 'bg-red-50 text-red-600' : 'bg-[#F2F5F3] text-[#475467]'
              }`}
            >
              <Timer size={13} /> {mmss(secondsLeft)}
            </span>
          </div>

          {multi ? <p className="mt-3 text-xs text-brand">本题可多选，需全部选对才得分</p> : null}

          <div className="mt-4 space-y-2.5">
            {question.options.map((option, i) => {
              const active = selected.includes(option.key);
              const correct = feedback?.correctAnswer.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggle(option.key)}
                  disabled={Boolean(feedback)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                    feedback && correct
                      ? 'border-brand bg-brand-soft'
                      : feedback && active
                        ? 'border-red-300 bg-red-50'
                        : active
                          ? 'border-brand bg-brand-soft'
                          : 'border-black/10 bg-white hover:border-brand/40'
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center border text-[11px] ${
                      multi ? 'rounded' : 'rounded-full'
                    } ${active || (feedback && correct) ? 'border-brand bg-brand text-white' : 'border-black/20 text-[#98A2B3]'}`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option.text}</span>
                </button>
              );
            })}
          </div>

          {feedback ? (
            <div
              className={`mt-4 rounded-lg p-3 text-sm ${
                feedback.isCorrect ? 'bg-brand-soft text-[#0B3B27]' : 'bg-red-50 text-red-700'
              }`}
            >
              <p className="flex items-center gap-1.5 font-medium">
                {feedback.isCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                {feedback.isCorrect ? '回答正确' : `回答错误，正确答案：${answerText}`}
              </p>
              {feedback.analysis ? <p className="mt-1.5 leading-6 text-[#475467]">解析：{feedback.analysis}</p> : null}
            </div>
          ) : null}

          {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

          <div className="mt-5 flex justify-end">
            {feedback ? (
              <button type="button" className="btn-primary h-10 px-5 text-[13px]" onClick={next} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                {isLast ? '交卷' : '下一题'}
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary h-10 px-5 text-[13px]"
                onClick={() => submit(false)}
                disabled={busy || selected.length === 0}
              >
                {busy ? '提交中…' : '提交答案'}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
