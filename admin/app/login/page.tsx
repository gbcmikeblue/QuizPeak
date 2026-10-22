'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { adminLogin, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(username.trim(), password);
      setToken(data.tokens.accessToken, data.admin);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      <section className="flex w-full flex-col justify-between bg-white px-8 py-10 lg:w-[46%] lg:px-16">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F5C518] text-base font-black text-white">
            知
          </span>
          <span className="text-xl font-bold tracking-tight">知巅</span>
          <span className="text-xs font-medium text-[#98A2B3]">QuizPeak</span>
          <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
            管理后台
          </span>
        </div>

        <form className="mx-auto w-full max-w-[360px]" onSubmit={onSubmit}>
          <h1 className="text-2xl font-bold">登录后台</h1>
          <p className="mt-1 text-sm text-[#667085]">请使用管理员账号登录</p>

          <div className="mt-8">
            <label className="label" htmlFor="username">
              账号
            </label>
            <input
              id="username"
              className="input"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入账号"
            />
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="password">
              密码
            </label>
            <div className="relative">
              <input
                id="password"
                className="input pr-10"
                type={showPwd ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
                aria-label="切换密码可见"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>
          ) : null}

          <button type="submit" className="btn-primary mt-6 w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            登录
          </button>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-[#98A2B3]">
            <ShieldCheck size={14} /> 初始账号 admin / Admin@123456，首次登录后请立即修改密码
          </p>
        </form>

        <p className="text-xs text-[#98A2B3]">© 2026 知巅 QuizPeak. All rights reserved.</p>
      </section>

      <section className="hidden flex-1 items-center justify-center bg-brand-soft p-10 lg:flex">
        <div className="max-w-[420px] text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-white text-4xl shadow-sm">
            🏆
          </div>
          <h2 className="mt-6 text-xl font-bold text-[#0B3B27]">一站式运营后台</h2>
          <p className="mt-2 text-sm leading-6 text-[#4A6B5C]">
            题库与关卡、竞赛与结算、积分任务与榜单运营、工单与内容运营，全部集中在这里。
          </p>
        </div>
      </section>
    </main>
  );
}
