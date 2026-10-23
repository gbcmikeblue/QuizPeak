'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { ImageUpload } from './image-upload';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface Category {
  id: string;
  name: string;
}

interface Level {
  id: string;
  levelNo: number;
  questionCount: number;
  passThreshold: number;
  questionTotal: number;
}

interface QuizDetail {
  id: string;
  title: string;
  titleEn: string | null;
  cover: string | null;
  description: string | null;
  categoryId: string | null;
  difficulty: string;
  status: string;
  enrollFee: number;
  levelsCount: number;
  questionCount: number;
  unlockThreshold: number;
  questionTotal: number;
  levels: Level[];
}

interface QuestionRow {
  id: string;
  levelNo: number | null;
  type: string;
  stem: string;
  options: Array<{ key: string; text: string }>;
  answer: string[];
  analysis: string | null;
  score: number;
  enabled: boolean;
}

const EMPTY_FORM = {
  title: '',
  titleEn: '',
  cover: '',
  description: '',
  categoryId: '',
  difficulty: 'BEGINNER',
  status: 'DRAFT',
  enrollFee: 0,
  levelsCount: 10,
  questionCount: 8,
  unlockThreshold: 90,
};

export function QuizEditor({ quizId }: { quizId?: string }) {
  const router = useRouter();
  const isNew = !quizId;
  const [tab, setTab] = useState<'basic' | 'levels' | 'questions'>('basic');
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [levelFilter, setLevelFilter] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [gen, setGen] = useState({ levels: 10, questionCount: 8, passThreshold: 90, overwrite: false });
  const [qForm, setQForm] = useState({
    levelId: '',
    type: 'SINGLE',
    stem: '',
    optionsText: '',
    answer: '',
    analysis: '',
    score: 10,
  });

  const loadQuestions = useCallback(
    async (levelId = '') => {
      if (!quizId) return;
      const q = new URLSearchParams({ page: '1', pageSize: '50' });
      if (levelId) q.set('levelId', levelId);
      const res = await apiFetch<{ list: QuestionRow[] }>(`/admin/quizzes/${quizId}/questions?${q}`);
      setQuestions(res.list);
    },
    [quizId],
  );

  useEffect(() => {
    apiFetch<Category[]>('/admin/categories').then(setCategories).catch(() => undefined);
    if (!quizId) return;
    apiFetch<QuizDetail>(`/admin/quizzes/${quizId}`)
      .then((data) => {
        setQuiz(data);
        setForm({
          title: data.title,
          titleEn: data.titleEn ?? '',
          cover: data.cover ?? '',
          description: data.description ?? '',
          categoryId: data.categoryId ?? '',
          difficulty: data.difficulty,
          status: data.status,
          enrollFee: data.enrollFee,
          levelsCount: data.levelsCount,
          questionCount: data.questionCount,
          unlockThreshold: data.unlockThreshold,
        });
        setGen({
          levels: data.levelsCount,
          questionCount: data.questionCount,
          passThreshold: data.unlockThreshold,
          overwrite: false,
        });
        setQForm((prev) => ({ ...prev, levelId: data.levels[0]?.id ?? '' }));
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
    void loadQuestions();
  }, [quizId, loadQuestions]);

  async function save() {
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const payload = {
        ...form,
        titleEn: form.titleEn || null,
        cover: form.cover || null,
        description: form.description || null,
        categoryId: form.categoryId || null,
      };
      if (isNew) {
        const res = await apiFetch<{ id: string }>('/admin/quizzes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        router.replace(`/dashboard/quizzes/${res.id}`);
        return;
      }
      await apiFetch(`/admin/quizzes/${quizId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setQuiz(await apiFetch<QuizDetail>(`/admin/quizzes/${quizId}`));
      setNotice('已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setBusy('');
    }
  }

  async function generateLevels() {
    if (!quizId) return;
    setBusy('gen');
    setError('');
    try {
      await apiFetch(`/admin/quizzes/${quizId}/levels/generate`, { method: 'POST', body: JSON.stringify(gen) });
      setQuiz(await apiFetch<QuizDetail>(`/admin/quizzes/${quizId}`));
      setNotice(`已生成 ${gen.levels} 个关卡`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setBusy('');
    }
  }

  async function addQuestion() {
    if (!quizId) return;
    setBusy('question');
    setError('');
    try {
      const lines = qForm.optionsText.split('\n').map((s) => s.trim()).filter(Boolean);
      await apiFetch(`/admin/quizzes/${quizId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          levelId: qForm.levelId || null,
          type: qForm.type,
          stem: qForm.stem,
          options: lines.map((text, i) => ({ key: LETTERS[i], text })),
          answer: qForm.answer.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
          analysis: qForm.analysis || null,
          score: Number(qForm.score) || 10,
        }),
      });
      setQForm({ ...qForm, stem: '', optionsText: '', answer: '', analysis: '' });
      await loadQuestions(levelFilter);
      setNotice('题目已添加');
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setBusy('');
    }
  }

  /** 把 base64 的 xlsx 触发浏览器下载 */
  function downloadBase64(filename: string, base64: string) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(
      new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadTemplate() {
    setError('');
    try {
      const res = await apiFetch<{ filename: string; base64: string }>('/admin/quizzes/import-template');
      downloadBase64(res.filename, res.base64);
    } catch (e) {
      setError(e instanceof Error ? e.message : '下载失败');
    }
  }

  async function exportExcel() {
    setBusy('export');
    setError('');
    try {
      const res = await apiFetch<{ filename: string; base64: string; count: number }>(`/admin/quizzes/${quizId}/export`);
      downloadBase64(res.filename, res.base64);
      setNotice(`已导出 ${res.count} 道题`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setBusy('');
    }
  }

  async function importExcel(file: File) {
    setBusy('import');
    setError('');
    setNotice('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsDataURL(file);
      });
      const res = await apiFetch<{
        created: number;
        failed: number;
        levelsCreated: number;
        errors: Array<{ row: number; message: string }>;
      }>(`/admin/quizzes/${quizId}/import`, { method: 'POST', body: JSON.stringify({ fileBase64: base64 }) });

      setNotice(
        `导入完成：新增 ${res.created} 道题` +
          (res.levelsCreated ? `，自动创建 ${res.levelsCreated} 个关卡` : '') +
          (res.failed ? `，${res.failed} 行失败` : ''),
      );
      if (res.errors.length) {
        setError(res.errors.map((x) => `第 ${x.row} 行：${x.message}`).join('；'));
      }
      await loadQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败');
    } finally {
      setBusy('');
    }
  }

  async function removeQuestion(id: string) {
    setBusy(id);
    try {
      await apiFetch(`/admin/questions/${id}`, { method: 'DELETE' });
      await loadQuestions(levelFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{isNew ? '新建题库' : form.title || '编辑题库'}</h1>
          <p className="mt-1 text-sm text-[#667085]">
            {isNew
              ? '先保存基本信息，再生成关卡与添加题目'
              : `共 ${quiz?.questionTotal ?? 0} 道题 · ${quiz?.levels.length ?? 0} 个关卡`}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost h-10" onClick={() => router.push('/dashboard/quizzes')}>
            返回列表
          </button>
          <button type="button" className="btn-primary h-10" onClick={save} disabled={busy === 'save'}>
            {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            保存
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{notice}</p> : null}

      <div className="flex gap-1 border-b border-black/5 text-sm">
        {(
          [
            { key: 'basic', label: '基本信息' },
            { key: 'levels', label: '关卡' },
            { key: 'questions', label: '题目' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? 'border-b-2 border-brand px-4 py-2.5 font-medium text-brand'
                : 'px-4 py-2.5 text-[#667085]'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'basic' ? (
        <div className="card grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">标题（中文）*</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">标题（英文）</label>
            <input className="input" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
          </div>
          <div>
            <label className="label">分类</label>
            <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">未分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">难度</label>
            <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              <option value="BEGINNER">入门</option>
              <option value="INTERMEDIATE">进阶</option>
              <option value="ADVANCED">高阶</option>
            </select>
          </div>
          <div>
            <label className="label">解锁消耗积分</label>
            <input
              type="number"
              className="input"
              value={form.enrollFee}
              onChange={(e) => setForm({ ...form, enrollFee: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">状态</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="DRAFT">草稿</option>
              <option value="PUBLISHED">上架</option>
              <option value="ARCHIVED">下架</option>
            </select>
          </div>
          <div>
            <label className="label">关卡数</label>
            <input
              type="number"
              className="input"
              value={form.levelsCount}
              onChange={(e) => setForm({ ...form, levelsCount: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">每关题数</label>
            <input
              type="number"
              className="input"
              value={form.questionCount}
              onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">解锁阈值（上一关正确率 %）</label>
            <input
              type="number"
              className="input"
              value={form.unlockThreshold}
              onChange={(e) => setForm({ ...form, unlockThreshold: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <ImageUpload value={form.cover} onChange={(url) => setForm({ ...form, cover: url })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">简介</label>
            <textarea
              className="input min-h-[110px] py-2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      {tab === 'levels' ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="card space-y-3">
            <h2 className="text-[15px] font-semibold">批量生成关卡</h2>
            <div>
              <label className="label">关卡数</label>
              <input type="number" className="input" value={gen.levels} onChange={(e) => setGen({ ...gen, levels: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">每关题数</label>
              <input
                type="number"
                className="input"
                value={gen.questionCount}
                onChange={(e) => setGen({ ...gen, questionCount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">通关阈值（%）</label>
              <input
                type="number"
                className="input"
                value={gen.passThreshold}
                onChange={(e) => setGen({ ...gen, passThreshold: Number(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#475467]">
              <input type="checkbox" checked={gen.overwrite} onChange={(e) => setGen({ ...gen, overwrite: e.target.checked })} />
              覆盖已有关卡的题数与阈值
            </label>
            <button type="button" className="btn-primary h-10 w-full" onClick={generateLevels} disabled={busy === 'gen' || isNew}>
              {busy === 'gen' ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
              生成
            </button>
            {isNew ? <p className="text-xs text-[#98A2B3]">先保存题库后才能生成关卡</p> : null}
          </div>

          <div className="card overflow-hidden p-0">
            <table className="table-base">
              <thead>
                <tr>
                  <th>关卡</th>
                  <th>配置题数</th>
                  <th>已有题目</th>
                  <th>通关阈值</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {quiz?.levels.length ? (
                  quiz.levels.map((l) => (
                    <tr key={l.id}>
                      <td className="font-medium">Level {l.levelNo}</td>
                      <td>{l.questionCount}</td>
                      <td className={l.questionTotal < l.questionCount ? 'text-amber-600' : ''}>{l.questionTotal}</td>
                      <td>{l.passThreshold}%</td>
                      <td>
                        <button
                          type="button"
                          className="text-sm text-brand"
                          onClick={() => {
                            setTab('questions');
                            setLevelFilter(l.id);
                            setQForm((prev) => ({ ...prev, levelId: l.id }));
                            void loadQuestions(l.id);
                          }}
                        >
                          管理题目
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-[#98A2B3]">
                      还没有关卡，左侧生成
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'questions' ? (
        <>
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Excel 批量导入 / 导出</h2>
              <p className="mt-1 text-[11px] text-[#98A2B3]">
                列：关卡号 / 题型 / 题干 / 选项A~D / 正确答案 / 解析 / 分值；关卡不存在会自动创建
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-ghost h-9 px-3 text-[12px]" onClick={downloadTemplate}>
                下载模板
              </button>
              <label className="btn-ghost h-9 cursor-pointer px-3 text-[12px]">
                导入 Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importExcel(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <button type="button" className="btn-ghost h-9 px-3 text-[12px]" onClick={exportExcel} disabled={busy === 'export'}>
                {busy === 'export' ? '导出中…' : '导出 Excel'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="card space-y-3">
            <h2 className="text-[15px] font-semibold">新增题目</h2>
            <div>
              <label className="label">所属关卡</label>
              <select className="input" value={qForm.levelId} onChange={(e) => setQForm({ ...qForm, levelId: e.target.value })}>
                <option value="">不指定关卡</option>
                {quiz?.levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    Level {l.levelNo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">题型</label>
              <select className="input" value={qForm.type} onChange={(e) => setQForm({ ...qForm, type: e.target.value })}>
                <option value="SINGLE">单选</option>
                <option value="MULTI">多选</option>
                <option value="TRUE_FALSE">判断</option>
                <option value="FILL">填空</option>
              </select>
            </div>
            <div>
              <label className="label">题干 *</label>
              <textarea className="input min-h-[80px] py-2" value={qForm.stem} onChange={(e) => setQForm({ ...qForm, stem: e.target.value })} />
            </div>
            <div>
              <label className="label">选项（每行一个，自动编号 A/B/C）</label>
              <textarea
                className="input min-h-[100px] py-2"
                placeholder={'正确\n错误'}
                value={qForm.optionsText}
                onChange={(e) => setQForm({ ...qForm, optionsText: e.target.value })}
              />
            </div>
            <div>
              <label className="label">正确答案（如 A 或 A,C）*</label>
              <input className="input" value={qForm.answer} onChange={(e) => setQForm({ ...qForm, answer: e.target.value })} />
            </div>
            <div>
              <label className="label">解析</label>
              <textarea className="input min-h-[60px] py-2" value={qForm.analysis} onChange={(e) => setQForm({ ...qForm, analysis: e.target.value })} />
            </div>
            <button type="button" className="btn-primary h-10 w-full" onClick={addQuestion} disabled={busy === 'question' || isNew}>
              {busy === 'question' ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              添加题目
            </button>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
              <span className="text-sm font-medium">题目列表（{questions.length}）</span>
              <select
                className="input h-9 w-[160px] text-[13px]"
                value={levelFilter}
                onChange={(e) => {
                  setLevelFilter(e.target.value);
                  void loadQuestions(e.target.value);
                }}
              >
                <option value="">全部关卡</option>
                {quiz?.levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    Level {l.levelNo}
                  </option>
                ))}
              </select>
            </div>
            <div className="max-h-[620px] divide-y divide-black/5 overflow-auto">
              {questions.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#98A2B3]">暂无题目</p>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm">
                        <span className="mr-2 rounded bg-brand-soft px-1.5 py-0.5 text-[11px] text-brand">
                          L{q.levelNo ?? '-'} · {q.type}
                        </span>
                        {q.stem}
                      </p>
                      <button
                        type="button"
                        className="shrink-0 text-[#98A2B3] hover:text-red-600"
                        onClick={() => removeQuestion(q.id)}
                        disabled={busy === q.id}
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[#667085]">
                      选项：{q.options.map((o) => `${o.key}.${o.text}`).join(' / ') || '无'}　答案：{q.answer.join(',')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
