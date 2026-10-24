'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, CircleSlash, Timer, XCircle } from 'lucide-react';
import type { ReviewData } from '@/lib/api';
import { authFetch } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

function ResultInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const attemptId = params.get('attemptId');
  const { tt } = useI18n();

  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) {
      setError(tt('缺少作答记录'));
      return;
    }
    authFetch<ReviewData>(`/attempts/${attemptId}/review`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : tt('加载失败')));
  }, [attemptId, tt]);

  if (error) return <main className="container-page py-16 text-sm text-red-600">{error}</main>;
  if (!data) {
    return <main className="container-page py-16 text-sm text-[#667085]">{tt('加载中…')}</main>;
  }

  const { attempt, items } = data;
  const rate =
    attempt.totalScore > 0 ? Math.round((attempt.score / attempt.totalScore) * 1000) / 10 : 0;

  return (
    <main className="container-page py-8">
      <div className="mx-auto w-full max-w-[760px]">
        <section className="card text-center">
          <p className="text-sm text-[#667085]">{tt('本关成绩')}</p>
          <p className="mt-2 text-4xl font-bold text-brand">{rate}%</p>
          <p className="mt-2 text-sm text-[#475467]">
            {rate >= 90
              ? tt('太棒了，可以挑战下一关')
              : rate >= 60
                ? tt('不错，再练一次会更稳')
                : tt('正确率还不够，建议回顾解析再战')}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-brand-soft py-3">
              <p className="flex items-center justify-center gap-1 text-[#0B3B27]">
                <CheckCircle2 size={14} /> {attempt.correctCount}
              </p>
              <p className="mt-1 text-[11px] text-[#4A6B5C]">{tt('答对')}</p>
            </div>
            <div className="rounded-lg bg-red-50 py-3">
              <p className="flex items-center justify-center gap-1 text-red-600">
                <XCircle size={14} /> {attempt.wrongCount}
              </p>
              <p className="mt-1 text-[11px] text-red-500">{tt('答错')}</p>
            </div>
            <div className="rounded-lg bg-brand-cream/70 py-3">
              <p className="flex items-center justify-center gap-1 text-[#8A6A1F]">
                <Timer size={14} /> {Math.floor(attempt.durationSec / 60)}:
                {String(attempt.durationSec % 60).padStart(2, '0')}
              </p>
              <p className="mt-1 text-[11px] text-[#8A6A1F]">{tt('用时')}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-[13px]">
            <Link href={`/quizzes/${id}`} className="btn-outline h-10 px-4">
              ← {tt('返回题库列表')}
            </Link>
            <Link href={`/quizzes/${id}`} className="btn-primary h-10 px-4">
              {tt('再练一次')}
            </Link>
          </div>
        </section>

        <section className="card mt-5">
          <h2 className="text-[15px] font-semibold">{tt('逐题解析')}</h2>
          <div className="mt-4 space-y-4">
            {items.map((item) => {
              const correctText = item.correctAnswer
                .map((k) => item.options.find((o) => o.key === k)?.text ?? k)
                .join('、');
              const userText = item.userAnswer.length
                ? item.userAnswer.map((k) => item.options.find((o) => o.key === k)?.text ?? k).join('、')
                : tt('未作答');
              return (
                <div key={item.questionId} className="rounded-lg border border-black/5 p-3">
                  <p className="flex items-start gap-2 text-sm font-medium">
                    {item.isCorrect ? (
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand" />
                    ) : item.skipped ? (
                      <CircleSlash size={15} className="mt-0.5 shrink-0 text-[#98A2B3]" />
                    ) : (
                      <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                    )}
                    <span>
                      {item.index}. {item.stem}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-[#667085]">
                    {tt('你的答案：')}
                    <span className={item.isCorrect ? 'text-brand' : 'text-red-600'}>{userText}</span>
                    {!item.isCorrect ? (
                      <span className="ml-3">
                        {tt('正确答案：')}
                        {correctText}
                      </span>
                    ) : null}
                  </p>
                  {item.analysis ? (
                    <p className="mt-1.5 rounded bg-[#F7F8F7] px-2 py-1.5 text-xs leading-6 text-[#475467]">
                      {tt('解析：')}
                      {item.analysis}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ResultPage() {
  const { tt } = useI18n();
  return (
    <Suspense
      fallback={<div className="container-page py-16 text-sm text-[#667085]">{tt('加载中…')}</div>}
    >
      <ResultInner />
    </Suspense>
  );
}
