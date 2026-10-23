'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, CircleDashed, Coins, RefreshCw, Trophy, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Health {
  status: string;
  db: string;
  time: string;
}

interface DashboardStats {
  users: number;
  todayUsers: number;
  attempts: number;
  todayAttempts: number;
  pointsToday: number;
  contests: number;
  quizzes: number;
  pendingSettle: number;
}

const DONE = [
  '认证：验证码 / 密码双登录、注册、找回密码、Token 刷新、封禁拦截',
  '答题：题库列表 / 详情（10 关）/ 解锁扣积分 / 单题 120s / 判分 / 交卷 / 逐题解析',
  '答题增强：Hint（首次免费后扣积分）、Skip（每场 3 次）、断点续答、关卡按正确率解锁',
  '竞赛：列表 / 详情 / 报名 / 作答 / 榜单；结束后统一结算发奖（幂等 + 每 5 分钟自动扫描）',
  '积分：签到 / 看广告 / 点赞 / 活动 / 新人礼 / 邀请奖励，流水幂等 + 余额快照',
  '排行榜：总榜（XP）/ 月榜（本月积分）+ 行内点赞 + 我的排名',
  '个人中心：答题与竞赛记录、收藏、徽章（惰性判定）、资料与改密、头像选择',
  '内容：文章列表 / 详情 / 后台发布下线；About / Contact / 隐私政策',
  '服务：客服工单全链路、站内通知（铃铛未读 + 列表页）、分享',
  '搜索：全局搜索 + 输入联想 + 历史云端同步 + 用户软删除（后台仍可见）',
  '安全：手机号默认脱敏，查看完整号需二次确认并写入「操作审计」',
  '后台：题库（关卡生成 / 题目 CRUD / Banner 上传 / Excel 模板·导入·导出）',
  '后台：竞赛管理（选题 / 奖励 / 关闭 / 结算）、用户管理（调积分 / 封禁）',
  '后台：积分流水、积分任务（9 项数值 + 活动编辑与二次确认）、内容管理',
  '后台：头像库（emoji 增改删 + 引用保护）、徽章阈值、站点与规则、管理员改密',
  '后台：二级菜单、设置页拆分为三个子页、仪表盘真实统计、搜索记录、短信记录',
  '小游戏：Wordling 三变体 + Hexling（16 字母拼词，词典校验）',
  '工程：卡片规范统一、导航高亮、404 / 500、开发构建提速（dev/watch/verify/clean）',
];

const TODO = [
  '上线准备（进行中）：环境变量清单、Docker / Nginx / HTTPS、备份、日志与告警',
  'H5 与小程序（uni-app，共用 packages/shared 与语言包）',
  '后台管理员多角色与权限矩阵',
  '通知实时推送（SSE）、图片孤儿文件清理、接口限流',
  '数据报表：留存 / 答题分布 / 积分发放趋势导出',
];

export default function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<DashboardStats>('/admin/dashboard')
      .then(setStats)
      .catch(() => undefined);
    apiFetch<Health>('/health')
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">仪表盘</h1>
        <p className="mt-1 text-sm text-[#667085]">
          用户端主链路（登录 → 答题 → 竞赛 → 积分 → 榜单 → 个人中心 → 工单通知）与后台运营模块均已打通，剩余为增强项。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: '今日新增用户', value: stats?.todayUsers, hint: `累计 ${stats?.users ?? 0} 位用户`, icon: Users },
          { label: '今日答题次数', value: stats?.todayAttempts, hint: `累计 ${stats?.attempts ?? 0} 次交卷`, icon: Trophy },
          { label: '今日发放积分', value: stats?.pointsToday, hint: '含签到/广告/点赞/活动/答题', icon: Coins },
          { label: '待结算竞赛', value: stats?.pendingSettle, hint: `共 ${stats?.contests ?? 0} 场竞赛`, icon: RefreshCw },
        ].map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#667085]">{label}</span>
              <Icon size={16} className="text-brand" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value ?? '—'}</p>
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
