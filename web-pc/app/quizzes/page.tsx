import { QuizCard } from '@/components/quiz-card';
import { fetchQuizzes } from '@/lib/api';
import { getI18n } from '@/lib/locale';

export const dynamic = 'force-dynamic';

export default async function QuizListPage() {
  const [{ tt }, quizzes] = await Promise.all([getI18n(), fetchQuizzes({ page: '1', pageSize: '9' })]);

  return (
    <main className="container-page py-10">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-brand">TEST YOUR KNOWLEDGE</p>
        <h1 className="text-2xl font-bold">{tt('题库')}</h1>
        <p className="text-sm text-[#667085]">{tt('每个题库 10 关，答对 90% 解锁下一关。')}</p>
      </div>

      {quizzes.list.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-brand-soft text-4xl">📚</div>
          <p className="mt-5 text-lg font-semibold">{tt('暂无题库')}</p>
          <p className="mt-1 text-sm text-[#667085]">{tt('管理员在后台添加题目后会显示在这里。')}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.list.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </main>
  );
}
