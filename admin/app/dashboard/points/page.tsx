import { Placeholder } from '@/components/placeholder';

export default function Page() {
  return (
    <Placeholder
      title="积分流水"
      desc="全站积分发放与消耗明细（不涉及任何货币充值或提现）。"
      bullets={[
        '字段：时间、用户、类型、变动值、变动后余额、业务来源（签到 / 活动 / 点赞 / 广告 / 答题 / 竞赛 / 后台调整）',
        '筛选：类型、时间范围、用户ID / 手机号；导出 CSV',
        '人工调整：填写变动值与理由，二次确认后入账，写审计日志',
        '风控：同一用户短时间大量获得积分时高亮提示（广告、点赞日限次由服务端强制）',
      ]}
    />
  );
}
