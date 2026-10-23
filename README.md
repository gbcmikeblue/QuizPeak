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

前置只有 Node.js ≥ 20。数据库三选一：

| 方式 | 命令 | 适用 |
| --- | --- | --- |
| **A. 内置嵌入式 PostgreSQL（默认，无需任何容器）** | `npm run db:local` | 本机没装 Docker / Podman / PostgreSQL |
| B. Podman / Docker | `podman compose up -d postgres redis` 或 `docker compose up -d postgres redis` | 已装容器运行时 |
| C. 自建 PostgreSQL | 自行建库并把连接串写入 `server/.env` | 有现成数据库服务 |

方式 A 会把数据放在 `.dev/pgdata`（已 gitignore），首次运行自动下载 PostgreSQL 二进制（约 50MB，仅一次），端口 `5433`：

```bash
# 终端 1：起数据库，保持前台运行，Ctrl+C 停止
npm run db:local
# 输出：DATABASE_URL=postgresql://quizpeak:quizpeak@localhost:5433/quizpeak?schema=public
```

```bash
# 终端 2
npm install
npm run build:shared
copy server\.env.example server\.env     # DATABASE_URL 填上面那行
npm run db:migrate -w @quizpeak/server   # 首次建表
npm run db:seed                          # 管理员 / 分类 / 积分规则 / 示例题库

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

## 日常开发（推荐，改代码不用构建）

```bash
npm run db:local           # 终端 1：本地数据库
npm run dev:all            # 终端 2：api(watch) + web(dev) + admin(dev)
npm run verify             # 任意终端：200ms 探活四个服务
npm run clean              # 需要时清理 .next / dist / .cache（直接删除，不进回收站）
```

**长期挂服务（无窗口）**：用 PM2 跑构建产物，详见 `doc/11-本地运行与进程管理.md`

```bash
npx pm2 start ecosystem.config.cjs   # 后台启动 api / web / admin
npx pm2 list                         # 状态
npx pm2 logs api                     # 日志（已自动轮转：10MB / 保留 7 份 / 压缩）
npx pm2 restart api                  # 改了后端并 build 后重启
```

- 前端改完 **HMR 秒级生效**，服务端改完 **watch 自动重启**，都不需要 `build`
- 生产构建只在发版前执行：`npm run build -w @quizpeak/server && npm run build -w @quizpeak/admin && npm run build -w @quizpeak/web-pc`
- 实测：旧方式（每次 build + 重启 + 固定等待）约 65s，新方式约 3s
- 详细说明与踩坑清单见 `doc/05-技术选型与架构方案.md` 第 10.1 节

## 常用命令

```bash
npm run typecheck          # 类型检查
npm run build:server       # 编译 API（发版前用；日常用 dev:all）
npm run build:admin        # 构建后台（发版前用）
npm run db:generate        # prisma generate（仅 schema 变更后需要）
npm run db:migrate         # prisma migrate dev
npm run db:seed            # 初始化数据
```

## 默认账号

- 后台：`admin` / `Admin@123456`（首次登录后请修改）
- 短信验证码在开发环境打印在 server 日志中（`[SMS:LOGIN] 手机号 -> 验证码`）
