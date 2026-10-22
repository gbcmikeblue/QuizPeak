import { Placeholder } from '@/components/placeholder';

export default function Page() {
  return (
    <Placeholder
      title="系统设置"
      desc="业务规则、支付参数与权限管理（对应 site_config 表）。"
      bullets={[
        '答题规则：单题时长、关卡解锁阈值、每关题数、Hint 免费次数与单价、Skip 次数',
        '积分规则：签到 / 广告 / 点赞 / 活动的积分与次数、新人礼、邀请奖励',
        '支付参数：微信商户号/证书、支付宝 APPID/密钥、回调地址',
        '角色权限：超管 / 运营 / 客服 / 财务 / 内容，权限点到按钮',
        '操作日志：按管理员、模块、时间检索',
      ]}
    />
  );
}
