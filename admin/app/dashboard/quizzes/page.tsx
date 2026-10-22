import { Placeholder } from '@/components/placeholder';

export default function Page() {
  return (
    <Placeholder
      title="题库管理"
      desc="Quiz、关卡题目与批量导入，是内容侧的核心工作台。"
      bullets={[
        'Quiz 列表：标题、分类、难度、题数、关卡数、报名费、参与人数、状态（草稿/上架/下架）',
        'Quiz 编辑：封面直传、中英标题、富文本简介、时长=题数×120s 自动计算、解锁阈值',
        '关卡管理：10 关批量生成、每关题数、通关阈值、拖拽排序',
        '题目管理：单选/多选/判断/填空，选项答案解析，Excel 模板批量导入 + 校验报告',
      ]}
    />
  );
}
