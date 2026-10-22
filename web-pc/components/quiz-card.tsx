import Link from 'next/link';
import { Clock, Heart, HelpCircle, Star, Users } from 'lucide-react';
import type { QuizCard as QuizCardData } from '@/lib/api';

const DIFFICULTY: Record<string, { label: string; className: string }> = {
  BEGINNER: { label: '入门', className: 'bg-[#E7F5EC] text-[#2E9E5B]' },
  INTERMEDIATE: { label: '进阶', className: 'bg-[#E8F0FE] text-[#2F6FE0]' },
  ADVANCED: { label: '高阶', className: 'bg-[#FDECEC] text-[#E5484D]' },
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QuizCard({ quiz }: { quiz: QuizCardData }) {
  const difficulty = DIFFICULTY[quiz.difficulty] ?? DIFFICULTY.BEGINNER;

  return (
    <article className="card-quiz">
      <div className="relative h-[150px] bg-brand-soft">
        {quiz.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={quiz.cover} alt={quiz.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-3xl">
            <span aria-hidden>🧠</span>
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium ${difficulty.className}`}
        >
          {difficulty.label}
        </span>
        {quiz.category ? (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-[#344054]">
            {quiz.category.name}
          </span>
        ) : null}
        <button className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white text-[#98A2B3] shadow-sm">
          <Heart size={15} />
        </button>
        <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[11px] text-white">
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Clock size={11} /> {formatDuration(quiz.durationSec)}
          </span>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <HelpCircle size={11} /> {quiz.questionCount} 题
          </span>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Users size={11} /> {quiz.playerCount}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="truncate text-[15px] font-semibold">{quiz.title}</h3>
        <p className="mt-1 text-xs text-[#667085]">
          {quiz.levelsCount} 个关卡 · 每关 {quiz.questionCount} 题
        </p>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-[#667085]">解锁消耗</span>
          {quiz.enrollFee > 0 ? (
            <span className="flex items-center gap-1 font-medium text-[#0B3B27]">
              <Star size={13} className="text-[#F5A623]" /> {quiz.enrollFee} 积分
            </span>
          ) : (
            <span className="font-medium text-brand">免费</span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Link href={`/quizzes/${quiz.id}`} className="btn-primary h-9 flex-1 text-[13px]">
            开始答题
          </Link>
          <Link href={`/quizzes/${quiz.id}`} className="btn-outline h-9 flex-1 text-[13px]">
            查看详情
          </Link>
        </div>
      </div>
    </article>
  );
}
