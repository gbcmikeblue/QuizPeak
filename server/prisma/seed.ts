/* 初始化数据：管理员、分类、积分规则、示例活动、示例 Quiz（10 关） */
import { PrismaClient, Difficulty, QuestionType, QuizStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: '网络安全', nameEn: 'Cybersecurity', icon: '🛡️' },
  { name: '常识', nameEn: 'General Knowledge', icon: '🌍' },
  { name: '科学', nameEn: 'Science', icon: '🔬' },
  { name: '历史', nameEn: 'History', icon: '🏛️' },
  { name: '地理', nameEn: 'Geography', icon: '🗺️' },
  { name: '数学', nameEn: 'Mathematics', icon: '➗' },
  { name: '文学', nameEn: 'Literature', icon: '📖' },
  { name: '体育', nameEn: 'Sports', icon: '⚽' },
  { name: '影视', nameEn: 'Movies', icon: '🎬' },
  { name: '编程', nameEn: 'Programming', icon: '💻' },
];

const SITE_CONFIG: Array<{ key: string; value: unknown; remark: string }> = [
  { key: 'rule.question_duration_sec', value: 120, remark: '单题答题时长（秒）' },
  { key: 'rule.level_unlock_percent', value: 90, remark: '关卡解锁所需正确率' },
  { key: 'rule.questions_per_level', value: 8, remark: '每关题数' },
  { key: 'rule.hint_free_per_attempt', value: 1, remark: '每场免费提示次数' },
  { key: 'rule.hint_point_cost', value: 10, remark: '提示消耗积分' },
  { key: 'rule.skip_per_attempt', value: 3, remark: '每场跳过次数' },
  { key: 'points.checkin_base', value: 10, remark: '每日签到基础积分' },
  { key: 'points.checkin_streak_step', value: 2, remark: '连续签到每日递增积分' },
  { key: 'points.checkin_streak_max_bonus', value: 20, remark: '连续签到递增封顶' },
  { key: 'points.ad_reward', value: 10, remark: '看广告单次积分' },
  { key: 'points.ad_daily_limit', value: 5, remark: '看广告每日次数' },
  { key: 'points.like_reward', value: 5, remark: '点赞单次积分' },
  { key: 'points.like_daily_limit', value: 5, remark: '点赞每日次数' },
  { key: 'points.register_bonus', value: 100, remark: '新用户注册赠送积分' },
  { key: 'points.invite_reward', value: 100, remark: '邀请好友奖励积分' },
  { key: 'site.name', value: '知巅', remark: '站点名称' },
  { key: 'site.name_en', value: 'QuizPeak', remark: '站点英文名' },
  { key: 'site.contact_phone', value: '', remark: '客服电话' },
  { key: 'site.contact_email', value: '', remark: '客服邮箱' },
];

async function main() {
  // 1. 管理员
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    create: { username: 'admin', passwordHash, name: '超级管理员', role: 'SUPER_ADMIN' },
    update: {},
  });
  console.log('[seed] admin ready: admin / Admin@123456');

  // 2. 分类
  for (const [index, c] of CATEGORIES.entries()) {
    const exists = await prisma.category.findFirst({ where: { nameEn: c.nameEn, type: 'QUIZ' } });
    if (!exists) {
      await prisma.category.create({
        data: { name: c.name, nameEn: c.nameEn, icon: c.icon, type: 'QUIZ', sort: index },
      });
    }
  }

  // 3. 示例活动（活动送积分）
  const activityExists = await prisma.activity.findFirst({ where: { title: '新赛季冲榜活动' } });
  if (!activityExists) {
    await prisma.activity.create({
      data: {
        title: '新赛季冲榜活动',
        titleEn: 'New Season Boost',
        desc: '活动期间完成任意一场答题，即可领取 50 积分。',
        points: 50,
        startAt: new Date(Date.now() - 86400000),
        endAt: new Date(Date.now() + 30 * 86400000),
      },
    });
  }

  // 4. 站点配置
  for (const item of SITE_CONFIG) {
    await prisma.siteConfig.upsert({
      where: { key: item.key },
      create: { key: item.key, value: item.value as object, remark: item.remark },
      update: { remark: item.remark },
    });
  }

  // 5. 示例 Quiz（10 关，每关 8 题，题库按关卡生成）
  const category = await prisma.category.findFirst({ where: { nameEn: 'Programming', type: 'QUIZ' } });
  const quizSlug = 'algorithms';
  let quiz = await prisma.quiz.findUnique({ where: { slug: quizSlug } });
  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        title: '算法基础',
        titleEn: 'Algorithms',
        slug: quizSlug,
        description:
          '考察排序、查找与复杂度分析等算法基础知识。每题需在 120 秒内作答，答对 90% 以上可解锁下一关。',
        categoryId: category?.id,
        difficulty: Difficulty.INTERMEDIATE,
        durationSec: 8 * 120,
        questionCount: 8,
        levelsCount: 10,
        unlockThreshold: 90,
        enrollFee: 600,
        status: QuizStatus.PUBLISHED,
      },
    });
    console.log(`[seed] quiz created: ${quiz.title}`);
  }

  const template = [
    {
      stem: 'CPU 被称为计算机的大脑。',
      type: QuestionType.TRUE_FALSE,
      options: [
        { key: '1', text: '正确' },
        { key: '2', text: '错误' },
      ],
      answer: ['1'],
      analysis: 'CPU 负责执行指令与运算，被称为计算机的大脑。',
    },
    {
      stem: '下列哪些排序算法在最坏情况下时间复杂度为 O(n log n)？',
      type: QuestionType.MULTI,
      options: [
        { key: '1', text: '归并排序' },
        { key: '2', text: '快速排序' },
        { key: '3', text: '堆排序' },
        { key: '4', text: '冒泡排序' },
      ],
      answer: ['1', '3'],
      analysis: '归并与堆排序最坏情况均为 O(n log n)，快排最坏为 O(n²)。',
    },
    {
      stem: '二分查找要求数据必须是有序的。',
      type: QuestionType.TRUE_FALSE,
      options: [
        { key: '1', text: '正确' },
        { key: '2', text: '错误' },
      ],
      answer: ['1'],
      analysis: '二分查找依赖有序性来缩小查找区间。',
    },
  ];

  let totalQuestions = 0;
  for (let levelNo = 1; levelNo <= 10; levelNo += 1) {
    const level = await prisma.quizLevel.upsert({
      where: { quizId_levelNo: { quizId: quiz.id, levelNo } },
      create: { quizId: quiz.id, levelNo, questionCount: 8, passThreshold: 90 },
      update: {},
    });

    const existing = await prisma.question.count({ where: { levelId: level.id } });
    if (existing === 0) {
      for (let i = 0; i < 8; i += 1) {
        const tpl = template[i % template.length];
        await prisma.question.create({
          data: {
            quizId: quiz.id,
            levelId: level.id,
            type: tpl.type,
            stem: `第 ${levelNo} 关 · ${tpl.stem}`,
            options: tpl.options,
            answer: tpl.answer,
            analysis: tpl.analysis,
            score: 10,
            sort: i,
          },
        });
        totalQuestions += 1;
      }
    }
  }
  console.log(`[seed] questions created: ${totalQuestions}`);

  // 6. 示例竞赛（进行中，8 题，前三名奖励积分 + XP）
  const contestTitle = 'Web 开发挑战赛';
  const contestExists = await prisma.contest.findFirst({ where: { title: contestTitle } });
  if (!contestExists) {
    const level1 = await prisma.quizLevel.findUnique({
      where: { quizId_levelNo: { quizId: quiz.id, levelNo: 1 } },
    });
    const contestQuestions = level1
      ? await prisma.question.findMany({ where: { levelId: level1.id }, orderBy: { sort: 'asc' }, take: 8 })
      : [];

    const now = new Date();
    await prisma.contest.create({
      data: {
        title: contestTitle,
        cover: null,
        description:
          '限时竞赛：8 道题、每题 120 秒，按得分排名，得分相同按用时更短者优先。报名消耗 50 积分，前三名分别获得 1000 / 500 / 100 积分与 XP 奖励。',
        categoryId: category?.id,
        questionCount: contestQuestions.length,
        durationSec: contestQuestions.length * 120,
        startAt: new Date(now.getTime() - 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        capacity: 500,
        entryFee: 50,
        prizePool: 1600,
        status: 'RUNNING',
        prizes: {
          create: [
            { rank: 1, points: 1000, xp: 10000 },
            { rank: 2, points: 500, xp: 5000 },
            { rank: 3, points: 100, xp: 1000 },
          ],
        },
        questions: {
          create: contestQuestions.map((q, i) => ({ questionId: q.id, sort: i })),
        },
      },
    });
    console.log(`[seed] contest created: ${contestTitle} (${contestQuestions.length} 题)`);
  }

  // 7. 示例文章
  const articles = [
    {
      title: '如何在 10 关里稳定拿到 90% 正确率',
      slug: 'how-to-score-90',
      summary: '拆解题库的关卡设计，给出可执行的答题策略。',
      content:
        '一、先看题目类型\n判断与单选题占多数，先把题干里的关键词圈出来，避免被长句干扰。\n\n二、控制节奏\n每题 120 秒，建议 40 秒内做出选择，把时间留给不确定的题。\n\n三、错题复盘\n交卷后一定看解析，错题集中在同一知识点时，说明该知识点需要重新过一遍。',
      tags: ['答题技巧', 'Strategy'],
      readMinutes: 3,
    },
    {
      title: '积分怎么赚：签到、看广告与点赞',
      slug: 'how-to-earn-points',
      summary: '三条稳定的积分来源，以及每天的上限。',
      content:
        '每日签到：+10 积分起，连续签到每天多 +2，封顶 +20 递增。\n\n看广告：每次 +10 积分，每天 5 次。\n\n给上榜选手点赞：每次 +5 积分，每天 5 次，同一位选手每天只能点一次。\n\n活动奖励：运营会不定期开放，记得在「赚积分」页看一眼。',
      tags: ['积分', 'Guide'],
      readMinutes: 2,
    },
  ];

  for (const a of articles) {
    const exists = await prisma.article.findUnique({ where: { slug: a.slug } });
    if (!exists) {
      await prisma.article.create({
        data: { ...a, status: 'PUBLISHED', publishedAt: new Date(), views: 0 },
      });
    }
  }
  console.log(`[seed] articles ready: ${articles.length}`);

  // 8. 徽章定义
  const BADGES = [
    { code: 'FIRST_QUIZ', name: '初次登顶', nameEn: 'First Climb', desc: '完成一场答题', icon: '🎯', condition: 'QUIZ_COUNT', threshold: 1, sort: 1 },
    { code: 'QUIZ_10', name: '十战成名', nameEn: 'Ten Battles', desc: '累计完成 10 场答题', icon: '⚔️', condition: 'QUIZ_COUNT', threshold: 10, sort: 2 },
    { code: 'PERFECT', name: '满分答题', nameEn: 'Perfect Run', desc: '任意一关拿到 100% 正确率', icon: '💯', condition: 'PERFECT_COUNT', threshold: 1, sort: 3 },
    { code: 'STREAK_7', name: '七日不断', nameEn: 'Seven-Day Streak', desc: '连续签到 7 天', icon: '🔥', condition: 'STREAK_DAYS', threshold: 7, sort: 4 },
    { code: 'POINTS_1000', name: '积分千点', nameEn: 'Thousand Points', desc: '累计获得 1000 积分', icon: '💎', condition: 'POINTS_EARNED', threshold: 1000, sort: 5 },
    { code: 'CONTEST_TOP3', name: '竞赛前三', nameEn: 'Contest Podium', desc: '在任意竞赛中进入前三名', icon: '🏆', condition: 'CONTEST_TOP3', threshold: 1, sort: 6 },
  ];
  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { code: b.code }, create: b, update: { desc: b.desc, threshold: b.threshold } });
  }
  console.log(`[seed] badges ready: ${BADGES.length}`);

  console.log('[seed] done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
