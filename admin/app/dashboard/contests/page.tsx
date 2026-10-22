import { Placeholder } from '@/components/placeholder';

export default function Page() {
  return (
    <Placeholder
      title="竞赛管理"
      desc="竞赛创建、选题、奖品配置、实时排名与结算发奖。"
      bullets={[
        '竞赛列表：开始/结束时间、报名数/容量（Spots）、报名费、奖池、状态',
        '创建/编辑：起止时间、报名截止、容量、参赛消耗积分、名次奖励（积分 + XP）',
        '选题：按分类随机抽题或手动选择，题数 × 120s 自动得到时长',
        '排名：实时/最终榜单，支持人工调整（写审计日志）与「立即结算」',
        '结算：定时任务发奖，失败重试 3 次并在后台标红',
      ]}
    />
  );
}
