'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, CircleDashed, Coins, RefreshCw, Trophy, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

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
  '权限：后台四角色（超级管理员 / 运营 / 客服 / 只读）+ 路由级权限矩阵，服务端 Guard 与前端菜单双重校验',
  '部署：Dockerfile ×3 + Nginx 反代 + docker-compose + 备份 / 健康检查脚本 + 上线手册',
];

const TODO = [
  'H5（uni-app，web-h5）主链路开发中：首页 / 题库 / 答题 / 排行榜 / 我的；小程序为同一套代码的编译目标',
  '上线收尾：域名 / 证书 / HTTPS 实配、真实密钥、监控告警、备份恢复演练',
  '第三方接入：阿里云短信（当前 console 打印验证码）、对象存储 OSS（当前落本机磁盘）',
  '通知实时推送（SSE）、图片孤儿文件清理、接口限流',
  '数据报表：留存 / 答题分布 / 积分发放趋势导出',
];

export default function DashboardPage() {
  const { tt, date } = useI18n();
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
        <h1 className="text-xl font-semibold">{tt('仪表盘')}</h1>
        <p className="mt-1 text-sm text-[#667085]">
          {tt(
            'PC 端主链路（登录 → 答题 → 竞赛 → 积分 → 榜单 → 个人中心 → 工单通知）与后台运营模块均已打通；H5 端（uni-app）开发中。',
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: '今日新增用户',
            value: stats?.todayUsers,
            hint: tt('累计 {n} 位用户', { n: stats?.users ?? 0 }),
            icon: Users,
          },
          {
            label: '今日答题次数',
            value: stats?.todayAttempts,
            hint: tt('累计 {n} 次交卷', { n: stats?.attempts ?? 0 }),
            icon: Trophy,
          },
          {
            label: '今日发放积分',
            value: stats?.pointsToday,
            hint: tt('含签到/广告/点赞/活动/答题'),
            icon: Coins,
          },
          {
            label: '待结算竞赛',
            value: stats?.pendingSettle,
            hint: tt('共 {n} 场竞赛', { n: stats?.contests ?? 0 }),
            icon: RefreshCw,
          },
        ].map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#667085]">{tt(label)}</span>
              <Icon size={16} className="text-brand" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{value ?? '—'}</p>
            <p className="mt-1 text-xs text-[#98A2B3]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-[15px] font-semibold">{tt('服务状态')}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#667085]">API</span>
              <span className={health ? 'text-brand' : 'text-[#98A2B3]'}>
                {health ? health.status : error ? tt('不可用') : tt('检测中…')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">{tt('数据库')}</span>
              <span className={health?.db === 'up' ? 'text-brand' : 'text-[#98A2B3]'}>
                {health ? health.db : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">{tt('检测时间')}</span>
              <span className="text-[#475467]">{health ? date(health.time, true) : '—'}</span>
            </div>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
        </div>

        <div className="card">
          <h2 className="text-[15px] font-semibold">{tt('下一步')}</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#475467]">
            {TODO.slice(0, 4).map((t) => (
              <li key={t} className="flex gap-2">
                <CircleDashed size={15} className="mt-0.5 shrink-0 text-[#98A2B3]" />
                {tt(t)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-[15px] font-semibold">{tt('已完成')}</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#475467]">
            {DONE.map((t) => (
              <li key={t} className="flex gap-2">
                <CircleCheck size={15} className="mt-0.5 shrink-0 text-brand" />
                {tt(t)}
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="text-[15px] font-semibold">{tt('待开发')}</h2>
          <ul className="mt-3 space-y-2 text-sm text-[#475467]">
            {TODO.map((t) => (
              <li key={t} className="flex gap-2">
                <CircleDashed size={15} className="mt-0.5 shrink-0 text-[#98A2B3]" />
                {tt(t)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
