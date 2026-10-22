import { Placeholder } from '@/components/placeholder';

export default function Page() {
  return (
    <Placeholder
      title="积分任务"
      desc="配置积分获取方式：签到、活动、点赞、广告。所有数值即时生效，无需发版。"
      bullets={[
        '每日签到：基础积分、连续签到每日递增、递增封顶',
        '看广告：单次积分、每日次数（对接激励视频广告后校验回调）',
        '给上榜选手点赞：单次积分、每日次数、同一选手每日一次',
        '活动送积分：活动标题（中英）、积分、起止时间、启用开关、领取记录',
        '新人礼与邀请奖励：注册赠送积分、被邀请人通过首个关卡后奖励邀请人',
      ]}
    />
  );
}
