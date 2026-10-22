# 知巅 QuizPeak

答题闯关 + 竞赛上榜 + 站内积分的在线答题平台。四端同源：PC Web、H5、微信小程序、运营后台。

- **经济模型：纯站内积分**（签到 / 看广告 / 给上榜选手点赞 / 活动获取），无充值、无支付、无提现。
- 需求文档：[`doc/README.md`](./doc/README.md) ｜ 积分与品牌规范：[`doc/07-积分体系与品牌规范.md`](./doc/07-积分体系与品牌规范.md)
- 技术方案：[`doc/05-技术选型与架构方案.md`](./doc/05-技术选型与架构方案.md)

## 目录

```
admin/       运营后台（Next.js 15 + Tailwind）
web-pc/      PC 用户端（Next.js 15，SSR）
web-h5/      H5（uni-app，待建）
miniprogram/ 小程序（uni-app 编译目标，待建）
server/      API（NestJS + Prisma + PostgreSQL）
packages/
  shared/    品牌常量、枚举、类型、zod 校验（前后端共用）
  i18n/      语言包（zh-CN / en）
doc/         需求与方案文档
data/        需求截图
```

## 本地启动

前置：Node.js ≥ 20、PostgreSQL 16（或用 `docker compose up -d postgres redis`）。

```bash
# 1. 安装依赖（首次）
npm install

# 2. 构建共享包（admin / server / web-pc 依赖其产物）
npm run build:shared

# 3. 配置环境变量
copy server\.env.example server\.env     # 修改 DATABASE_URL

# 4. 建库 + 初始化数据
npm run db:migrate -w @quizpeak/server -- --name init
npm run db:seed

# 5. 启动
npm run dev:server              # http://localhost:8080/api
npm run dev:admin               # http://localhost:3001  （admin / Admin@123456）
npm run dev -w @quizpeak/web-pc # http://localhost:3000
```

## 当前进度

| 模块 | 状态 |
| --- | --- |
| monorepo + 共享包 + i18n | ✅ |
| 服务端骨架（统一响应、异常、zod 校验、双端鉴权） | ✅ |
| 认证（短信验证码 / 密码 / 注册 / 找回 / 刷新） | ✅ |
| 积分体系（签到 / 看广告 / 点赞 / 活动 / 新人礼 / 流水） | ✅ 已端到端验证 |
| 题库（列表 / 详情 / 关卡 / 解锁消耗积分） | ✅ 读接口 |
| 答题引擎（作答、判分、交卷、答案回顾） | ⏳ 下一步 |
| 排行榜（总榜 / 月榜 / 上榜点赞） | ⏳ |
| 题库管理后台 | ⏳ |
| H5 / 小程序（uni-app） | ⏳ 待建 |

## 积分规则（默认值，后台可改）

| 任务 | 积分 | 频次 |
| --- | --- | --- |
| 每日签到 | +10，连续每日 +2，递增封顶 +20 | 每日 1 次 |
| 看广告 | +10 | 每日 5 次 |
| 给上榜选手点赞 | +5（被赞者人气 +1） | 每日 5 次，同一人每日 1 次 |
| 活动奖励 | 按活动配置 | 每活动 1 次 |
| 新人礼 | +100 | 1 次 |
| 邀请好友 | +100（被邀请人通过首个关卡后） | 每邀请 1 人 1 次 |

## 常用命令

```bash
npm run typecheck          # 类型检查
npm run build:server       # 编译 API
npm run build:admin        # 构建后台
npm run db:generate        # prisma generate
npm run db:migrate         # prisma migrate dev
npm run db:seed            # 初始化数据
```

## 默认账号

- 后台：`admin` / `Admin@123456`（首次登录后请修改）
- 短信验证码在开发环境打印在 server 日志中（`[SMS:LOGIN] 手机号 -> 验证码`）
