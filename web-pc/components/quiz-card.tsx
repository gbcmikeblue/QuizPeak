import { Clock, HelpCircle, Star, Users } from 'lucide-react';
import type { QuizCard as QuizCardData } from '@/lib/api';
import { CardShell } from './card-shell';

const DIFFICULTY: Record<string, { text: string; cls: string }> = {
  BEGINNER: { text: '入门', cls: 'bg-white/90 text-[#2E9E5B]' },
  INTERMEDIATE: { text: '进阶', cls: 'bg-white/90 text-[#2F6FE0]' },
  ADVANCED: { text: '高阶', cls: 'bg-white/90 text-[#E5484D]' },
};

export function QuizCard({ quiz }: { quiz: QuizCardData }) {
  const difficulty = DIFFICULTY[quiz.difficulty] ?? DIFFICULTY.BEGINNER;

  return (
    <CardShell
      href={`/quizzes/${quiz.id}`}
      actionLabel="开始答题"
      cover={{ src: quiz.cover, alt: quiz.title, fallback: '🧠' }}
      topLeft={<span className={`rounded-full px-2.5 py-1 text-[11px] ${difficulty.cls}`}>{difficulty.text}</span>}
      topRight={
        quiz.category ? (
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-[#344054]">{quiz.category.name}</span>
        ) : null
      }
      bottomLeft={
        <>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Clock size={11} /> {Math.round(quiz.durationSec / 60)} 分钟
          </span>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <HelpCircle size={11} /> {quiz.levelsCount} 关
          </span>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Users size={11} /> {quiz.playerCount}
          </span>
        </>
      }
      title={quiz.title}
      description={quiz.titleEn ? `${quiz.titleEn} · ${quiz.questionCount} 题/关` : `共 ${quiz.levelsCount} 关，每关 ${quiz.questionCount} 题`}
      meta={
        <span>
          {quiz.levelsCount} 关 · 每关 {quiz.questionCount} 题 · {quiz.playerCount} 人参与
        </span>
      }
      footerLeft={
        quiz.enrollFee > 0 ? (
          <span className="flex items-center gap-1">
            <Star size={12} className="text-[#F5A623]" /> 解锁 {quiz.enrollFee} 积分
          </span>
        ) : (
          <span className="text-brand">免费解锁</span>
        )
      }
    />
  );
}
