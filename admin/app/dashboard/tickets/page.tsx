import { Placeholder } from '@/components/placeholder';

export default function Page() {
  return (
    <Placeholder
      title="客服工单"
      desc="用户工单受理、回复与状态流转。"
      bullets={[
        '列表：工单号（#TKT-000001）、用户、主题、优先级、状态、受理客服、创建时间',
        '详情：对话流、附件预览、内部备注（用户不可见）、状态切换、快捷回复模板',
        '状态：待处理 → 处理中 → 已关闭；回复后站内通知用户',
      ]}
    />
  );
}
