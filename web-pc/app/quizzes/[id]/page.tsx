'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Clock, Coins, Heart, HelpCircle, Lock, Users } from 'lucide-react';
import { API_BASE, type QuizDetail } from '@/lib/api';
import { authFetch, getToken } from '@/lib/auth';

interface LevelProgress {
  levelNo: number;
  questionCount: number;
  passThreshold: number;
  unlocked: boolean;
  best: { rate: number; score: number; totalScore: number; attemptId: string };
}

interface Progress {
  enrolled: boolean;
  expiresAt: string | null;
  levels: LevelProgress[];
}

const DIFFICULTY: Record<string, string> = {
  BEGINNER: '入门',
  INTERMEDIATE: '进阶',
  ADVANCED: '高阶',
};

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [favorited, setFavorited] = useState(false);

  async function toggleFavorite() {
    if (!getToken()) {
      router.push(`/login?redirect=${encodeURIComponent(`/quizzes/${id}`)}`);
      return;
    }
    try {
      const res = await authFetch<{ favorited: boolean }>('/me/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'QUIZ', targetId: id }),
      });
      setFavorited(res.favorited);
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  }

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/quizzes/${id}`)
      .then((r) => r.json())
      .then((json) => setQuiz(json.data))
      .catch(() => setError('题库加载失败'))
      .finally(() => setLoading(false));

    if (getToken()) {
      authFetch<Progress>(`/quizzes/${id}/progress`)
        .then(setProgress)
        .catch(() => undefined);
      authFetch<{ favorited: boolean }>(`/me/favorites/check?targetType=QUIZ&targetId=${id}`)
        .then((res) => setFavorited(res.favorited))
        .catch(() => undefined);
    }
  }, [id]);

  function requireLogin(action: () => void) {
    if (!getToken()) {
      router.push(`/login?redirect=${encodeURIComponent(`/quizzes/${id}`)}`);
      return;
    }
    action();
  }

  async function unlock() {
    setBusy(true);
    setError('');
    try {
      await authFetch(`/quizzes/${id}/enroll`, { method: 'POST', body: '{}' });
      setProgress(await authFetch<Progress>(`/quizzes/${id}/progress`));
    } catch (e) {
      setError(e instanceof Error ? e.message : '解锁失败');
    } finally {
      setBusy(false);
    }
  }

  function startLevel(levelNo: number) {
    requireLogin(() => router.push(`/quizzes/${id}/play?level=${levelNo}`));
  }

  if (loading) {
    return <div className="container-page py-16 text-sm text-[#667085]">加载中…</div>;
  }
  if (!quiz) {
    return <div className="container-page py-16 text-sm text-red-600">{error || '题库不存在'}</div>;
  }

  const locked = quiz.enrollFee > 0 && !progress?.enrolled;
  const levels = progress?.levels ?? [];

  return (
    <main className="container-page py-8">
      <Link href="/quizzes" className="text-sm text-[#667085] hover:text-brand">
        ← 返回题库
      </Link>

      <section className="mt-4 overflow-hidden rounded-card border border-black/5">
        <div className="relative h-[190px] bg-brand-soft">
          {quiz.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quiz.cover} alt={quiz.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-5xl">🧠</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute bottom-4 left-5 text-white">
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <Clock size={13} /> {Math.round(quiz.durationSec / 60)} 分钟
              </span>
              <span className="flex items-center gap-1">
                <HelpCircle size={13} /> {quiz.questionCount} 题 / 关
              </span>
              <span className="flex items-center gap-1">
                <Users size={13} /> {quiz.playerCount} 人
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5">{DIFFICULTY[quiz.difficulty]}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-6">
          <div className="card">
            <h2 className="text-[15px] font-semibold">题库介绍</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#475467]">
              {quiz.description || '暂无介绍'}
            </p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">关卡</h2>
              <span className="text-xs text-[#98A2B3]">
                上一关正确率达到 {quiz.unlockThreshold}% 解锁下一关
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: quiz.levelsCount }, (_, i) => i + 1).map((levelNo) => {
                const info = levels.find((l) => l.levelNo === levelNo);
                const unlocked = info ? info.unlocked : levelNo === 1;
                const best = info?.best;
                return (
                  <button
                    key={levelNo}
                    type="button"
                    disabled={!unlocked || locked}
                    onClick={() => startLevel(levelNo)}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                      unlocked && !locked
                        ? 'border-brand/30 bg-brand-soft/60 hover:border-brand hover:bg-brand-soft'
                        : 'cursor-not-allowed border-black/5 bg-[#F7F8F7] text-[#98A2B3]'
                    }`}
                  >
                    <span className="flex w-full items-center justify-between text-sm font-medium">
                      Level {levelNo}
                      {!unlocked ? <Lock size={13} /> : <ArrowRight size={13} className="text-brand" />}
                    </span>
                    <span className="text-[11px] text-[#667085]">
                      {best && best.rate > 0 ? `最好 ${best.rate}%` : `${info?.questionCount ?? quiz.questionCount} 题`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#667085]">分类</dt>
                <dd>{quiz.category?.name ?? '未分类'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#667085]">解锁消耗</dt>
                <dd className="flex items-center gap-1 font-medium">
                  {quiz.enrollFee > 0 ? (
                    <>
                      <Coins size={13} className="text-[#F5A623]" /> {quiz.enrollFee} 积分
                    </>
                  ) : (
                    <span className="text-brand">免费</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#667085]">关卡数</dt>
                <dd>{quiz.levelsCount}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={toggleFavorite}
              className={`mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-[13px] transition ${
                favorited ? 'border-brand bg-brand-soft text-brand' : 'border-black/10 text-[#475467] hover:bg-black/[0.03]'
              }`}
            >
              <Heart size={14} className={favorited ? 'fill-brand text-brand' : ''} />
              {favorited ? '已收藏' : '收藏题库'}
            </button>

            {locked ? (
              <button type="button" onClick={() => requireLogin(unlock)} disabled={busy} className="btn-primary mt-5 h-10 w-full">
                {busy ? '解锁中…' : `解锁（${quiz.enrollFee} 积分）`}
              </button>
            ) : (
              <button type="button" onClick={() => startLevel(1)} className="btn-primary mt-5 h-10 w-full">
                {progress?.enrolled ? '从第 1 关开始' : '开始答题'}
              </button>
            )}

            {progress?.enrolled ? (
              <p className="mt-2 text-center text-[11px] text-[#98A2B3]">
                已解锁，有效期至 {new Date(progress.expiresAt!).toLocaleDateString('zh-CN')}
              </p>
            ) : null}
            {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
          </div>

          <div className="rounded-card bg-brand-cream/60 p-4 text-xs leading-6 text-[#6B5B2E]">
            单题限时 120 秒，超时按答错处理；多选题需全部选对才得分。
          </div>
        </aside>
      </div>
    </main>
  );
}
