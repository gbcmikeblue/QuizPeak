import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MessageSquareText, Phone } from 'lucide-react';
import { BRAND } from '@quizpeak/shared';
import { getI18n } from '@/lib/locale';

export async function generateMetadata(): Promise<Metadata> {
  const { tt } = await getI18n();
  return { title: `${tt('联系我们')} · ${BRAND.nameZh}` };
}

const FAQ = [
  {
    q: '积分可以提现或购买吗？',
    a: '不可以。积分是站内学习凭证，只能用于解锁题库与报名竞赛，不能购买、转让或兑换任何货币。',
  },
  {
    q: '关卡为什么打不开？',
    a: '关卡按顺序解锁：上一关正确率达到 90% 才会开放下一关。可以在题库详情页查看每关的最好成绩。',
  },
  {
    q: '签到中断了会怎样？',
    a: '连续签到天数会从 1 重新计算，已获得的积分不会回收。连续签到越久，单日获得的积分越多（有上限）。',
  },
  {
    q: '手机号换了怎么办？',
    a: '请通过工单提交原手机号与可用的新手机号，客服核实后会协助变更。',
  },
];

export default async function ContactPage() {
  const { tt } = await getI18n();

  return (
    <main className="container-page py-12">
      <div className="max-w-[760px]">
        <p className="text-xs font-medium tracking-wide text-brand">CONTACT US</p>
        <h1 className="mt-2 text-3xl font-bold">{tt('联系我们')}</h1>
        <p className="mt-3 text-sm leading-7 text-[#667085]">
          {tt(
            '使用中遇到问题，优先通过站内工单反馈（可上传截图、能追踪处理进度）。紧急问题可用下面的方式联系。',
          )}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Mail, label: '邮箱', value: BRAND.email },
            { icon: Phone, label: '客服电话', value: '工作日 10:00 - 19:00' },
            { icon: Clock, label: '响应时间', value: '工单 24 小时内' },
          ].map((item) => (
            <div key={item.label} className="card">
              <item.icon size={18} className="text-brand" />
              <p className="mt-3 text-xs text-[#667085]">{tt(item.label)}</p>
              <p className="mt-1 break-words text-sm font-medium">{tt(item.value)}</p>
            </div>
          ))}
        </div>

        <div className="card mt-6">
          <div className="flex items-center gap-2">
            <MessageSquareText size={18} className="text-brand" />
            <h2 className="text-[15px] font-semibold">{tt('提交工单')}</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {tt(
              '登录后可在「客服工单」中新建工单，选择问题类型（账号 / 答题 / 积分 / 竞赛 / 其他），并附上截图与设备信息，处理进度可随时查看。',
            )}
          </p>
          <Link href="/login?redirect=%2Fsupport" className="btn-primary mt-4 h-10 px-5 text-[13px]">
            {tt('去提交工单')}
          </Link>
        </div>

        <h2 className="mt-10 text-xl font-bold">{tt('常见问题')}</h2>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-lg border border-black/5 bg-white p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                {tt(item.q)}
                <span className="text-[#98A2B3] transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-3 text-sm leading-7 text-[#667085]">{tt(item.a)}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-xs leading-6 text-[#98A2B3]">
          {tt(
            '商务合作、内容授权请发送邮件至 {email}，标题注明「合作」。我们不在站内提供任何形式的现金兑换服务。',
            { email: BRAND.email },
          )}
        </p>
      </div>
    </main>
  );
}
