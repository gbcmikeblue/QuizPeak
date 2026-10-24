'use client';

import { Clock, Star, Trophy, Users } from 'lucide-react';
import type { ContestCard as ContestCardData } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { CardShell } from './card-shell';

const STATUS: Record<string, { text: string; cls: string }> = {
  RUNNING: { text: '进行中', cls: 'bg-brand-soft text-brand' },
  UPCOMING: { text: '未开始', cls: 'bg-[#FFF7E6] text-[#B7791F]' },
  ENDED: { text: '已结束', cls: 'bg-[#F2F4F7] text-[#667085]' },
};

export function ContestCard({ contest }: { contest: ContestCardData }) {
  const { tt, date } = useI18n();
  const status = STATUS[contest.effectiveStatus] ?? STATUS.UPCOMING;

  return (
    <CardShell
      href={`/contests/${contest.id}`}
      actionLabel={tt('查看详情')}
      cover={{ src: contest.cover, alt: contest.title, fallback: '🏆' }}
      topLeft={
        <span className={`rounded-full px-2.5 py-1 text-[11px] ${status.cls}`}>{tt(status.text)}</span>
      }
      topRight={
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] text-[#344054]">
          {contest.category?.name ?? tt('综合')}
        </span>
      }
      bottomLeft={
        <>
          <span className="flex items-center gap-1 rounded bg-black/35 px-1.5 py-0.5">
            <Clock size={11} /> {tt('{n} 分钟', { n: Math.round(contest.durationSec / 60) })}
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
          {date(contest.startAt)} {tt('至')} {date(contest.endAt)} ·{' '}
          {tt('{n} 题', { n: contest.questionCount })}
        </span>
      }
      footerLeft={
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Trophy size={12} className="text-[#F5A623]" /> {tt('奖池 {n}', { n: contest.prizePool })}
          </span>
          <span className="text-[#D0D5DD]">|</span>
          <span className="flex items-center gap-1">
            <Star size={12} className="text-[#F5A623]" />
            {contest.entryFee > 0 ? tt('{n} 积分', { n: contest.entryFee }) : tt('免费')}
          </span>
        </span>
      }
    />
  );
}
