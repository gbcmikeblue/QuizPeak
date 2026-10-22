'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, CircleDashed, Coins, RefreshCw, Trophy, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Health {
  status: string;
  db: string;
  time: string;
}

const METRICS = [
  { label: '今日新增用户', value: '—', hint: '待接入统计接口', icon: Users },
  { label: '今日答题次数', value: '—', hint: '待接入统计接口', icon: Trophy },
  { label: '今日发放积分', value: '—', hint: '待接入统计接口', icon: Coins },
  { label: '待回工单 / 待办', value: '—', hint: '待接入统计接口', icon: RefreshCw },
];

const DONE = [
  'monorepo 骨架（packages/shared、packages/i18n、server、admin）',
  'API 统一响应结构 / 全局异常 / 接口鉴权（用户 + 管理员）',
  '短信验证码登录、密码登录、注册、找回密码、Token 刷新',
  '用户资料（/me）、积分变动唯一入口（事务 + 流水 + 余额快照）',
  '积分体系：签到 / 看广告 / 点赞 / 活动发积分，注册新人礼',
  'Quiz 列表 / 详情（含关卡）/ 解锁消耗积分',
  'Prisma 数据模型：用户、分类、题库、关卡、竞赛、积分流水、签到、活动、内容、配置',
  '后台登录页 + 布局 + 仪表盘骨架',
];

const TODO = [
  '答题作答引擎（服务端计时、判分、交卷、Preview Answers）',
  '竞赛全链路（报名、作答、排行榜、结算发奖定时任务）',
  '题库管理后台（Quiz / 关卡 / 题目 / 批量导入）',
  '答题引擎（服务端计时、判分、交卷、答案回顾）',
  '排行榜（总榜 / 月榜）+ 上榜点赞 + 积分榜展示',
  '工单、通知、徽章、邀请、游戏、文章等剩余模块',
];

export default function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Health>('/health')
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">仪表盘</h1>
        <p className="mt-1 text-sm text-[#667085]">
          当前为 M1 骨架版本：登录、用户、题库、积分已打通，其余模块按里程碑推进。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#667085]">{label}</span>
              <Icon size={16} className="text-brand" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-[#98A2B3]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-[15px] font-semibold">服务状态</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#667085]">API</span>
              <span className={health ? 'text-brand' : 'text-[#98A2B3]'}>
                {health ? health.status : error ? '不可用' : '检测中…'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">数据库</span>
              <span className={health?.db === 'up' ? 'text-brand' : 'text-[#98A2B3]'}>
                {health ? health.db : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">检测时间</span>
              <span className="text-[#475467]">
                {health ? new Date(health.time).toLocaleString('zh-CN') : '—'}
              </span>
            </div>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
        </div>

        <div className="card">
          <h2 className="text-[15px] font-semibold">下一步</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#475467]">
            {TODO.slice(0, 4).map((t) => (
              <li key={t} className="flex gap-2">
                <CircleDashed size={15} className="mt-0.5 shrink-0 text-[#98A2B3]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-[15px] font-semibold">已完成</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#475467]">
            {DONE.map((t) => (
              <li key={t} className="flex gap-2">
                <CircleCheck size={15} className="mt-0.5 shrink-0 text-brand" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="text-[15px] font-semibold">待开发</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#475467]">
            {TODO.map((t) => (
              <li key={t} className="flex gap-2">
                <CircleDashed size={15} className="mt-0.5 shrink-0 text-[#98A2B3]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
