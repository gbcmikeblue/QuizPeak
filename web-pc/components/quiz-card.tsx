'use client';

import { Clock, HelpCircle, Star, Users } from 'lucide-react';
import type { QuizCard as QuizCardData } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { CardShell } from './card-shell';

const DIFFICULTY: Record<string, { text: string; cls: string }> = {
  BEGINNER: { text: '入门', cls: 'bg-white/90 text-[#2E9E5B]' },
  INTERMEDIATE: { text: '进阶', cls: 'bg-white/90 text-[#2F6FE0]' },
  ADVANCED: { text: '高阶', cls: 'bg-white/90 text-[#E5484D]' },
};

export function QuizCard({ quiz }: { quiz: QuizCardData }) {
  const { tt } = useI18n();
  const difficulty = DIFFICULTY[quiz.difficulty] ?? DIFFICULTY.BEGINNER;

  return (
    <CardShell
      href={`/quizzes/${quiz.id}`}
      actionLabel={tt('开始答题')}
      cover={{ src: quiz.cover, alt: quiz.title, fallback: '🧠' }}
      topLeft={
        <span className={`rounded-full px-2.5 py-1 text-[11px] ${difficulty.cls}`}>
          {tt(difficulty.text)}
        </span>
      }
      topRight={
        quiz.category ? (
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-[#344054]">
            {quiz.category.name}
          </span>
        ) : null
      }
      bottomLeft={
        <>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Clock size={11} /> {tt('{n} 分钟', { n: Math.round(quiz.durationSec / 60) })}
          </span>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <HelpCircle size={11} /> {tt('{n} 关', { n: quiz.levelsCount })}
          </span>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Users size={11} /> {quiz.playerCount}
          </span>
        </>
      }
      title={quiz.title}
      description={
        quiz.titleEn
          ? `${quiz.titleEn} · ${quiz.questionCount} ${tt('题')}`
          : tt('{levels} 关 · 每关 {q} 题 · {players} 人参与', {
              levels: quiz.levelsCount,
              q: quiz.questionCount,
              players: quiz.playerCount,
            })
      }
      meta={
        <span>
          {tt('{levels} 关 · 每关 {q} 题 · {players} 人参与', {
            levels: quiz.levelsCount,
            q: quiz.questionCount,
            players: quiz.playerCount,
          })}
        </span>
      }
      footerLeft={
        quiz.enrollFee > 0 ? (
          <span className="flex items-center gap-1">
            <Star size={12} className="text-[#F5A623]" /> {tt('解锁 {n} 积分', { n: quiz.enrollFee })}
          </span>
        ) : (
          <span className="text-brand">{tt('免费解锁')}</span>
        )
      }
    />
  );
}
