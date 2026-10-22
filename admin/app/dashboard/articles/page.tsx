import { Placeholder } from '@/components/placeholder';

export default function Page() {
  return (
    <Placeholder
      title="内容管理"
      desc="文章、Banner、FAQ、法律页与站点文案。"
      bullets={[
        '文章：封面、中英标题、摘要、富文本（含白名单过滤）、分类与多标签、SEO 字段、草稿/发布',
        '站点内容：首页 Banner、About 卖点与 FAQ、用户评价、隐私政策/法律信息',
        '页脚与联系方式：电话、邮箱、地址、社交链接（前后台同一份配置）',
      ]}
    />
  );
}
