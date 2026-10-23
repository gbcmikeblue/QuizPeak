import { BRAND } from '@quizpeak/shared';

export const metadata = {
  title: `隐私政策 · ${BRAND.nameZh}`,
};

const SECTIONS = [
  {
    title: '一、我们收集哪些信息',
    items: [
      '账号信息：手机号（用于登录与找回）、昵称、头像、可选的姓名与地址。',
      '答题数据：作答记录、得分、用时、关卡进度、竞赛名次。',
      '积分数据：积分余额、积分流水（签到、活动、点赞、看广告、答题奖励、解锁消费）。',
      '设备与日志：IP、设备类型、浏览器标识、访问时间，用于安全风控与故障排查。',
    ],
  },
  {
    title: '二、如何使用这些信息',
    items: [
      '提供核心功能：登录、答题判分、关卡解锁、竞赛排名、积分结算。',
      '安全与风控：识别异常答题（切屏、脚本）、防刷积分（广告与点赞的每日次数限制）。',
      '服务改进：以聚合方式统计题库难度、关卡通过率，用于优化题目质量。',
      '通知：仅在必要时发送与账号、竞赛、积分相关的站内通知。',
    ],
  },
  {
    title: '三、关于积分（重要）',
    items: [
      '积分是站内学习凭证，不具备货币属性，不能购买、转让、提现，也不能兑换任何货币或实物。',
      '积分仅通过行为获得：每日签到、参加活动、给上榜选手点赞、观看广告。',
      '平台不提供任何充值、支付、提现功能，因此不会收集你的银行卡、支付账户等金融信息。',
      '平台可依规调整积分规则，调整前会在站内公告说明，已获得的积分不追溯回收。',
    ],
  },
  {
    title: '四、信息共享与披露',
    items: [
      '除法律法规要求或你明确授权外，我们不会向第三方提供你的个人信息。',
      '排行榜会公开展示你的昵称、头像、等级、XP 与正确率，不展示手机号等敏感信息。',
      '接入的广告 SDK 可能收集设备标识用于广告投放，具体以该 SDK 的隐私说明为准。',
    ],
  },
  {
    title: '五、存储与安全',
    items: [
      '数据存储于中国境内服务器，传输过程使用 HTTPS 加密。',
      '密码使用不可逆哈希存储；后台账号与用户账号体系相互隔离。',
      '手机号在后台展示时做脱敏处理（如 138****8888）。',
    ],
  },
  {
    title: '六、你的权利',
    items: [
      '你可以随时查看与修改昵称、头像等资料，并可在「个人中心 - 设置」修改密码。',
      '你可以申请注销账号；注销后账号数据将按法规要求保留必要期限后删除。',
      '你可以通过工单申请导出或删除个人数据，我们会在 15 个工作日内处理。',
    ],
  },
  {
    title: '七、未成年人',
    items: [
      '未满 14 周岁的用户应在监护人同意下使用本服务。',
      '由于积分不可兑换货币，平台不涉及未成年人消费风险；仍建议监护人关注使用时长。',
    ],
  },
  {
    title: '八、政策更新与联系方式',
    items: [
      '本政策更新时会在站内公告，重大变更会通过站内通知告知。',
      `如有疑问，可发送邮件至 ${BRAND.email}，或在站内提交客服工单。`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="container-page py-12">
      <div className="mx-auto max-w-[760px]">
        <p className="text-xs font-medium tracking-wide text-brand">PRIVACY POLICY</p>
        <h1 className="mt-2 text-3xl font-bold">隐私政策</h1>
        <p className="mt-3 text-sm text-[#98A2B3]">最近更新：2026-10-23</p>

        <p className="mt-6 text-sm leading-7 text-[#475467]">
          {BRAND.nameZh}（{BRAND.nameEn}，以下称「我们」）尊重并保护你的个人信息。
          本政策说明我们在你使用答题、竞赛与积分功能时收集哪些信息、如何使用与保护这些信息。
        </p>

        <div className="mt-8 space-y-7">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-[15px] font-semibold text-[#0B3B27]">{section.title}</h2>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[#475467]">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[10px] h-1 w-1 shrink-0 rounded-full bg-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-lg bg-brand-soft/60 p-4 text-xs leading-6 text-[#4A6B5C]">
          说明：本文为产品上线用的政策模板，正式发布前需由法务结合主体信息、实际接入的第三方 SDK
          与备案情况审阅定稿。
        </p>
      </div>
    </main>
  );
}
