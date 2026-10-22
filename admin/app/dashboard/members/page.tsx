import { Placeholder } from '@/components/placeholder';

export default function Page() {
  return (
    <Placeholder
      title="用户管理"
      desc="用户查询、积分调整、封禁与行为追溯。"
      bullets={[
        '列表：昵称、手机号（脱敏）、等级、积分、XP、注册时间、状态',
        '详情：资料、积分流水、答题与竞赛记录、邀请关系、登录日志',
        '操作：封禁/解封、手动调积分（必填理由）、重置密码',
        '所有写操作记录 admin_log（操作人、时间、前后值、IP）',
      ]}
    />
  );
}
