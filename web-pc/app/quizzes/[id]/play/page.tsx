'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Lightbulb, SkipForward, Timer, XCircle } from 'lucide-react';

import type { AnswerResult, FinishResult, PlayData } from '@/lib/api';
import { authFetch } from '@/lib/auth';

function PlayInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const levelNo = Number(params.get('level') ?? 1);

  const [data, setData] = useState<PlayData | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [hintText, setHintText] = useState('');
  const [hintBusy, setHintBusy] = useState(false);

  async function useHint() {
    if (!data || !question || hintBusy) return;
    setHintBusy(true);
    setError('');
    try {
      const res = await authFetch<{ hint: string; free: boolean; cost: number }>(`/attempts/${data.attemptId}/hint`, {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id }),
      });
      setHintText(res.free ? res.hint : `${res.hint}（本次消耗 ${res.cost} 积分）`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取提示失败');
    } finally {
      setHintBusy(false);
    }
  }

  async function skipCurrent() {
    if (!data || !question) return;
    try {
      await authFetch(`/attempts/${data.attemptId}/skip`, {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id }),
      });
      setHintText('');
      await next();
    } catch (e) {
      setError(e instanceof Error ? e.message : '跳过失败');
    }
  }

  useEffect(() => {
    if (!id) return;
    authFetch<PlayData>(`/quizzes/${id}/levels/${levelNo}/attempt`, { method: 'POST', body: '{}' })
      .then((res) => {
        setData(res);
        const firstUnanswered = res.questions.findIndex(
          (q) => !res.answered.some((a) => a.questionId === q.id),
        );
        const startIndex = firstUnanswered === -1 ? res.questions.length - 1 : firstUnanswered;
        setIndex(startIndex);
        setSecondsLeft(res.questionSeconds);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '无法开始答题'));
  }, [id, levelNo]);

  const question = data?.questions[index];
  const total = data?.questions.length ?? 0;
  const isLast = index === total - 1;

  const submit = useCallback(
    async (skipAnswer = false) => {
      if (!data || !question || busy) return;
      setBusy(true);
      setError('');
      try {
        const usedSec = Math.max(0, data.questionSeconds - secondsLeft);
        const res = await authFetch<AnswerResult>(`/attempts/${data.attemptId}/answer`, {
          method: 'POST',
          body: JSON.stringify({
            questionId: question.id,
            answer: skipAnswer ? [] : selected,
            usedSec,
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

  // 单题倒计时，归零自动提交
  useEffect(() => {
    if (!data || feedback || finishing) return;
    if (secondsLeft <= 0) {
      void submit(true);
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [data, feedback, finishing, secondsLeft, submit]);

  async function next() {
    if (!data) return;
    if (isLast) {
      setFinishing(true);
      try {
        const result = await authFetch<FinishResult>(`/attempts/${data.attemptId}/finish`, {
          method: 'POST',
          body: '{}',
        });
        router.replace(`/quizzes/${id}/result?attemptId=${result.attemptId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : '交卷失败');
        setFinishing(false);
      }
      return;
    }
    setIndex((i) => i + 1);
    setSelected([]);
    setFeedback(null);
    setSecondsLeft(data.questionSeconds);
  }

  async function skip() {
    if (!data || !question) return;
    try {
      await authFetch(`/attempts/${data.attemptId}/skip`, {
        method: 'POST',
        body: JSON.stringify({ questionId: question.id }),
      });
      await next();
    } catch (e) {
      setError(e instanceof Error ? e.message : '跳过失败');
    }
  }

  const answerText = useMemo(() => {
    if (!question || !feedback) return '';
    return feedback.correctAnswer
      .map((key) => question.options.find((o) => o.key === key)?.text ?? key)
      .join('、');
  }, [feedback, question]);

  if (error && !data) {
    return (
      <main className="container-page py-16 text-center text-sm text-red-600">
        {error}
        <div className="mt-4">
          <button type="button" onClick={() => router.back()} className="btn-outline h-9 px-4 text-[13px]">
            返回
          </button>
        </div>
      </main>
    );
  }

  if (!data || !question) {
    return <div className="container-page py-16 text-sm text-[#667085]">准备中…</div>;
  }

  const progressPercent = Math.round(((index + 1) / total) * 100);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const multi = question.type === 'MULTI';

  function toggle(key: string) {
    if (feedback) return;
    setSelected((prev) => {
      if (!multi) return [key];
      return prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    });
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-brand-soft/60 py-8">
      <div className="mx-auto w-full max-w-[720px] px-5">
        <div className="flex items-center justify-between text-sm text-[#4A6B5C]">
          <span>第 {levelNo} 关 · {data.quiz.title}</span>
          <span className="rounded-full bg-white px-3 py-1 font-medium text-[#0B3B27]">
            第 {index + 1} / {total} 题
          </span>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progressPercent}%` }} />
        </div>

        <section className="card mt-4">
          <div className="flex items-start justify-between gap-4">
            <p className="whitespace-pre-wrap text-[15px] leading-7">{question.stem}</p>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                secondsLeft <= 10 ? 'bg-red-50 text-red-600' : 'bg-[#F2F5F3] text-[#475467]'
              }`}
            >
              <Timer size={13} /> {mm}:{ss}
            </span>
          </div>

          {multi ? <p className="mt-3 text-xs text-brand">本题可多选，需全部选对才得分</p> : null}

          <div className="mt-4 space-y-2.5">
            {question.options.map((option, i) => {
              const active = selected.includes(option.key);
              const isCorrectOption = feedback?.correctAnswer.includes(option.key);
              const showState = Boolean(feedback);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggle(option.key)}
                  disabled={Boolean(feedback)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                    showState && isCorrectOption
                      ? 'border-brand bg-brand-soft'
                      : showState && active
                        ? 'border-red-300 bg-red-50'
                        : active
                          ? 'border-brand bg-brand-soft'
                          : 'border-black/10 bg-white hover:border-brand/40'
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center border text-[11px] ${
                      multi ? 'rounded' : 'rounded-full'
                    } ${active || (showState && isCorrectOption) ? 'border-brand bg-brand text-white' : 'border-black/20 text-[#98A2B3]'}`}
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
                {feedback.isCorrect ? '回答正确' : '回答错误'}
                {!feedback.isCorrect ? <span className="ml-2 font-normal">正确答案：{answerText}</span> : null}
              </p>
              {feedback.analysis ? (
                <p className="mt-1.5 leading-6 text-[#475467]">解析：{feedback.analysis}</p>
              ) : null}
            </div>
          ) : null}

          {hintText ? (
            <div className="mt-3 rounded-lg bg-[#FFF7E6] px-3 py-2 text-sm leading-6 text-[#8A6A1F]">
              提示：{hintText}
            </div>
          ) : null}

          {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-2">
              {!feedback ? (
                <>
                  <button
                    type="button"
                    onClick={() => submit(false)}
                    disabled={busy || selected.length === 0}
                    className="btn-primary h-10 px-5 text-[13px]"
                  >
                    {busy ? '提交中…' : '提交答案'}
                  </button>
                  <button
                    type="button"
                    onClick={useHint}
                    disabled={hintBusy}
                    className="btn-outline h-10 px-3 text-[13px]"
                    title="每场首次免费，之后消耗积分"
                  >
                    <Lightbulb size={14} /> 提示
                  </button>
                  <button type="button" onClick={skipCurrent} className="btn-outline h-10 px-3 text-[13px]" title="跳过按答错计分">
                    <SkipForward size={14} /> 跳过
                  </button>
                  <button
                    type="button"
                    onClick={skip}
                    className="btn-outline h-10 px-3 text-[13px]"
                    title="跳过本题"
                  >
                    <SkipForward size={14} /> 跳过
                  </button>
                </>
              ) : (
                <button type="button" onClick={next} className="btn-primary h-10 px-5 text-[13px]" disabled={finishing}>
                  {finishing ? '结算中…' : isLast ? '查看结果' : '下一题'}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
            <span className="flex items-center gap-1 text-[11px] text-[#98A2B3]">
              <Lightbulb size={13} /> 每题限时 {data.questionSeconds} 秒，超时按答错
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="container-page py-16 text-sm text-[#667085]">加载中…</div>}>
      <PlayInner />
    </Suspense>
  );
}
