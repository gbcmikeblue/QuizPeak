'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { BRAND } from '@quizpeak/shared';
import { API_BASE } from '@/lib/api';
import { setToken } from '@/lib/auth';

type Mode = 'sms' | 'password';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/';

  const [mode, setMode] = useState<Mode>('sms');
  const [phone, setPhone] = useState('13800001111');
  const [code, setCode] = useState('');
  const [account, setAccount] = useState('13800001111');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [tip, setTip] = useState('');

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as
      | { code: number; message: string; data: T }
      | null;
    if (!res.ok || !json) throw new Error(json?.message ?? `请求失败（${res.status}）`);
    if (json.code !== 0) throw new Error(json.message);
    return json.data;
  }

  async function sendCode() {
    setError('');
    setSending(true);
    try {
      const res = await post<{ ttl: number; devCode?: string }>('/auth/sms-code', {
        phone,
        scene: 'LOGIN',
      });
      setSeconds(60);
      if (res.devCode) {
        setCode(res.devCode);
        setTip(`开发环境验证码：${res.devCode}（已自动填入，也可在后台「短信记录」查看）`);
      } else {
        setTip('验证码已发送，请查收短信');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data =
        mode === 'sms'
          ? await post<{ tokens: { accessToken: string } }>('/auth/login/sms', { phone, code })
          : await post<{ tokens: { accessToken: string } }>('/auth/login/password', { account, password });
      setToken(data.tokens.accessToken);
      router.replace(redirect);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)]">
      <section className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-[380px]">
          <h1 className="text-2xl font-bold">登录 {BRAND.nameZh}</h1>
          <p className="mt-1 text-sm text-[#667085]">答题闯关，登顶积分榜</p>

          <div className="mt-6 flex rounded-lg bg-[#F2F5F3] p-1 text-sm">
            {(
              [
                { key: 'sms', label: '验证码登录' },
                { key: 'password', label: '密码登录' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setMode(tab.key);
                  setError('');
                }}
                className={
                  mode === tab.key
                    ? 'flex-1 rounded-md bg-white py-2 font-medium text-brand shadow-sm'
                    : 'flex-1 rounded-md py-2 text-[#667085]'
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'sms' ? (
              <>
                <div>
                  <label className="label" htmlFor="phone">
                    手机号
                  </label>
                  <input
                    id="phone"
                    className="input"
                    value={phone}
                    inputMode="numeric"
                    onChange={(e) => setPhone(e.target.value.trim())}
                    placeholder="请输入手机号"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="code">
                    验证码
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="code"
                      className="input flex-1"
                      value={code}
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(e) => setCode(e.target.value.trim())}
                      placeholder="6 位验证码"
                    />
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={seconds > 0 || sending || !/^1[3-9]\d{9}$/.test(phone)}
                      className="btn-outline h-10 w-[112px] shrink-0 text-[13px]"
                    >
                      {sending ? '发送中' : seconds > 0 ? `${seconds}s` : '获取验证码'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label" htmlFor="account">
                    手机号 / 用户名
                  </label>
                  <input
                    id="account"
                    className="input"
                    value={account}
                    onChange={(e) => setAccount(e.target.value.trim())}
                    placeholder="请输入手机号或用户名"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="password">
                    密码
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      className="input pr-10"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
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
              </>
            )}

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>
            ) : null}
            {tip && !error ? <p className="text-xs text-[#667085]">{tip}</p> : null}

            <button type="submit" className="btn-primary h-11 w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              登录 / 注册
            </button>

            <p className="text-center text-xs text-[#98A2B3]">
              未注册的手机号验证通过后自动创建账号，赠送 100 积分
            </p>
          </form>

          <p className="mt-6 text-sm text-[#667085]">
            还没有账号？
            <Link href="/login" className="ml-1 font-medium text-brand">
              直接验证码登录即可
            </Link>
          </p>
        </div>
      </section>

      <section className="hidden items-center justify-center bg-brand-soft p-10 lg:flex lg:w-1/2">
        <div className="max-w-[420px] text-center">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-white text-4xl shadow-sm">
            🏆
          </div>
          <h2 className="mt-6 text-xl font-bold text-[#0B3B27]">{BRAND.sloganZh}</h2>
          <p className="mt-2 text-sm leading-6 text-[#4A6B5C]">
            每日签到、看广告、给上榜选手点赞都能获得积分；积分用于解锁题库与参加竞赛。
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-page py-16 text-sm text-[#667085]">加载中…</div>}>
      <LoginInner />
    </Suspense>
  );
}
