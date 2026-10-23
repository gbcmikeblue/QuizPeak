import { Clock, Star, Trophy, Users } from 'lucide-react';
import type { ContestCard as ContestCardData } from '@/lib/api';
import { CardShell } from './card-shell';

const STATUS: Record<string, { text: string; cls: string }> = {
  RUNNING: { text: '进行中', cls: 'bg-brand-soft text-brand' },
  UPCOMING: { text: '未开始', cls: 'bg-[#FFF7E6] text-[#B7791F]' },
  ENDED: { text: '已结束', cls: 'bg-[#F2F4F7] text-[#667085]' },
};

export function ContestCard({ contest }: { contest: ContestCardData }) {
  const status = STATUS[contest.effectiveStatus] ?? STATUS.UPCOMING;

  return (
    <CardShell
      href={`/contests/${contest.id}`}
      actionLabel="查看详情"
      cover={{ src: contest.cover, alt: contest.title, fallback: '🏆' }}
      topLeft={<span className={`rounded-full px-2.5 py-1 text-[11px] ${status.cls}`}>{status.text}</span>}
      topRight={
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-[#344054]">
          {contest.category?.name ?? '综合'}
        </span>
      }
      bottomLeft={
        <>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Clock size={11} /> {Math.round(contest.durationSec / 60)} 分钟
          </span>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Users size={11} /> {contest.enrolledCount}/{contest.capacity}
          </span>
        </>
      }
      title={contest.title}
      description={contest.description}
      meta={
        <span>
          {new Date(contest.startAt).toLocaleDateString('zh-CN')} 至{' '}
          {new Date(contest.endAt).toLocaleDateString('zh-CN')} · {contest.questionCount} 题
        </span>
      }
      footerLeft={
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Trophy size={12} className="text-[#F5A623]" /> 奖池 {contest.prizePool}
          </span>
          <span className="text-[#D0D5DD]">|</span>
          <span className="flex items-center gap-1">
            <Star size={12} className="text-[#F5A623]" />
            {contest.entryFee > 0 ? `${contest.entryFee} 积分` : '免费'}
          </span>
        </span>
      }
    />
  );
}
