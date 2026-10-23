'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, Trophy } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Row {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  capacity: number;
  entryFee: number;
  questionCount: number;
  questionTotal: number;
  enrolled: number;
  attempts: number;
  prizePool: number;
  prizeCount: number;
}

interface Detail {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  capacity: number;
  entryFee: number;
  questionCount: number;
  status: string;
  prizes: Array<{ rank: number; points: number; xp: number }>;
  questions: Array<{ id: string; stem: string }>;
}

interface Quiz {
  id: string;
  title: string;
  levelsCount: number;
}

const STATUS: Record<string, { text: string; cls: string }> = {
  UPCOMING: { text: '未开始', cls: 'bg-[#FFF7E6] text-[#B7791F]' },
  RUNNING: { text: '进行中', cls: 'bg-brand-soft text-brand' },
  ENDED: { text: '已结束', cls: 'bg-[#F2F4F7] text-[#667085]' },
};

function toLocal(dt: string) {
  return new Date(dt).toISOString().slice(0, 16);
}

const EMPTY = {
  title: '',
  description: '',
  startAt: '',
  endAt: '',
  capacity: 500,
  entryFee: 50,
  questionCount: 8,
  status: 'UPCOMING',
  prizes: [
    { rank: 1, points: 1000, xp: 10000 },
    { rank: 2, points: 500, xp: 5000 },
    { rank: 3, points: 100, xp: 1000 },
  ],
};

export default function ContestsPage() {
  const [data, setData] = useState<{ list: Row[]; total: number } | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [pick, setPick] = useState({ quizId: '', levelId: '', count: 8 });
  const [busy, setBusy] = useState('');
  const [board, setBoard] = useState<Array<{ rank: number; nickname: string; score: number; totalScore: number; timeSec: number }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await apiFetch<{ list: Row[]; total: number }>('/admin/contests?page=1&pageSize=20'));
      const q = await apiFetch<{ list: Quiz[] }>('/admin/quizzes?page=1&pageSize=50');
      setQuizzes(q.list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEdit(id: string) {
    setBusy(id);
    setError('');
    try {
      const d = await apiFetch<Detail>(`/admin/contests/${id}`);
      setEditing(id);
      setOpen(true);
      setForm({
        title: d.title,
        description: d.description ?? '',
        startAt: toLocal(d.startAt),
        endAt: toLocal(d.endAt),
        capacity: d.capacity,
        entryFee: d.entryFee,
        questionCount: d.questionCount,
        status: d.status,
        prizes: d.prizes.length ? d.prizes : EMPTY.prizes,
      });
      setBoard(await apiFetch(`/admin/contests/${id}/leaderboard`));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setBusy('');
    }
  }

  async function save() {
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        description: form.description || null,
      };
      if (editing) {
        await apiFetch(`/admin/contests/${editing}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice('已保存');
      } else {
        const res = await apiFetch<{ id: string }>('/admin/contests', { method: 'POST', body: JSON.stringify(payload) });
        setEditing(res.id);
        setNotice('已创建，接下来抽题');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy('');
    }
  }

  async function pickQuestions() {
    if (!editing) return;
    setBusy('pick');
    setError('');
    try {
      const res = await apiFetch<{ picked: number; available: number }>(`/admin/contests/${editing}/questions/pick`, {
        method: 'POST',
        body: JSON.stringify({ quizId: pick.quizId, levelId: pick.levelId || undefined, count: Number(pick.count) }),
      });
      setNotice(`已抽 ${res.picked} 道题（题库共 ${res.available} 道）`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '抽题失败');
    } finally {
      setBusy('');
    }
  }

  async function close(id: string) {
    setBusy(id);
    try {
      await apiFetch(`/admin/contests/${id}/close`, { method: 'POST', body: '{}' });
      setNotice('竞赛已关闭');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">竞赛管理</h1>
          <p className="mt-1 text-sm text-[#667085]">创建竞赛、配置奖品、从题库抽题</p>
        </div>
        <button
          type="button"
          className="btn-primary h-10"
          onClick={() => {
            const now = new Date();
            setEditing(null);
            setForm({
              ...EMPTY,
              startAt: toLocal(new Date(now.getTime() + 3600_000).toISOString()),
              endAt: toLocal(new Date(now.getTime() + 30 * 86400_000).toISOString()),
            });
            setBoard([]);
            setNotice('');
            setOpen(true);
          }}
        >
          <Plus size={15} /> 新建竞赛
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p> : null}

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>竞赛</th>
              <th>时间</th>
              <th>报名 / 名额</th>
              <th>题目</th>
              <th>报名费 / 奖池</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.list.length ? (
              data.list.map((row) => {
                const s = STATUS[row.status] ?? STATUS.UPCOMING;
                return (
                  <tr key={row.id}>
                    <td className="font-medium">{row.title}</td>
                    <td className="whitespace-nowrap text-xs text-[#667085]">
                      {new Date(row.startAt).toLocaleDateString('zh-CN')} → {new Date(row.endAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="text-sm">
                      {row.enrolled}/{row.capacity}
                    </td>
                    <td className={`text-sm ${row.questionTotal < row.questionCount ? 'text-amber-600' : ''}`}>
                      {row.questionTotal}/{row.questionCount}
                    </td>
                    <td className="text-sm">
                      {row.entryFee} / {row.prizePool}
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${s.cls}`}>{s.text}</span>
                    </td>
                    <td>
                      <div className="flex gap-3 text-sm">
                        <button type="button" className="text-brand" onClick={() => openEdit(row.id)} disabled={busy === row.id}>
                          编辑
                        </button>
                        {row.status !== 'ENDED' ? (
                          <button type="button" className="text-[#667085]" onClick={() => close(row.id)} disabled={busy === row.id}>
                            关闭
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-[#98A2B3]">
                  {loading ? '加载中…' : '暂无竞赛'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">{editing ? '编辑竞赛' : '新建竞赛'}</h2>
            <button
              type="button"
              className="btn-ghost h-9 px-3 text-[13px]"
              onClick={() => {
                setEditing(null);
                setForm({ ...EMPTY });
                setOpen(false);
                setBoard([]);
              }}
            >
              收起
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">标题 *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">说明</label>
              <textarea
                className="input min-h-[80px] py-2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label">开始时间 *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </div>
            <div>
              <label className="label">结束时间 *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </div>
            <div>
              <label className="label">名额</label>
              <input
                type="number"
                className="input"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">报名费（积分）</label>
              <input
                type="number"
                className="input"
                value={form.entryFee}
                onChange={(e) => setForm({ ...form, entryFee: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">题目数</label>
              <input
                type="number"
                className="input"
                value={form.questionCount}
                onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">状态</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="UPCOMING">未开始</option>
                <option value="RUNNING">进行中</option>
                <option value="ENDED">已结束</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">名次奖励</p>
            <div className="mt-2 space-y-2">
              {form.prizes.map((p, i) => (
                <div key={p.rank} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-[#667085]">第 {p.rank} 名</span>
                  <input
                    type="number"
                    className="input w-[120px]"
                    value={p.points}
                    onChange={(e) => {
                      const next = [...form.prizes];
                      next[i] = { ...p, points: Number(e.target.value) };
                      setForm({ ...form, prizes: next });
                    }}
                  />
                  <span className="text-xs text-[#98A2B3]">积分</span>
                  <input
                    type="number"
                    className="input w-[120px]"
                    value={p.xp}
                    onChange={(e) => {
                      const next = [...form.prizes];
                      next[i] = { ...p, xp: Number(e.target.value) };
                      setForm({ ...form, prizes: next });
                    }}
                  />
                  <span className="text-xs text-[#98A2B3]">XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn-primary h-10" onClick={save} disabled={busy === 'save'}>
              {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : null}
              {editing ? '保存' : '创建'}
            </button>
          </div>

          {editing ? (
            <div className="rounded-lg border border-black/5 p-3">
              <p className="text-sm font-medium">从题库抽题</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div>
                  <label className="label">题库</label>
                  <select className="input w-[220px]" value={pick.quizId} onChange={(e) => setPick({ ...pick, quizId: e.target.value })}>
                    <option value="">选择题库</option>
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">数量</label>
                  <input
                    type="number"
                    className="input w-[100px]"
                    value={pick.count}
                    onChange={(e) => setPick({ ...pick, count: Number(e.target.value) })}
                  />
                </div>
                <button type="button" className="btn-primary h-10" onClick={pickQuestions} disabled={busy === 'pick' || !pick.quizId}>
                  {busy === 'pick' ? <Loader2 size={15} className="animate-spin" /> : <Trophy size={15} />}
                  随机抽题
                </button>
              </div>
            </div>
          ) : null}

          {editing && board.length > 0 ? (
            <div>
              <p className="text-sm font-medium">实时排名</p>
              <div className="mt-2 divide-y divide-black/5 text-sm">
                {board.map((b) => (
                  <div key={b.rank} className="flex items-center justify-between py-1.5">
                    <span>
                      #{b.rank} {b.nickname}
                    </span>
                    <span className="text-[#667085]">
                      {b.score}/{b.totalScore} · {b.timeSec}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
