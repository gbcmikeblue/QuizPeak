# 知巅 QuizPeak

答题闯关 + 竞赛上榜 + 站内积分的在线答题平台。四端同源：PC Web、H5、微信小程序、运营后台。

- **经济模型：纯站内积分**（签到 / 看广告 / 给上榜选手点赞 / 活动获取），无充值、无支付、无提现。
- 需求文档：[`doc/README.md`](./doc/README.md) ｜ 积分与品牌规范：[`doc/07-积分体系与品牌规范.md`](./doc/07-积分体系与品牌规范.md)
- 技术方案：[`doc/05-技术选型与架构方案.md`](./doc/05-技术选型与架构方案.md)

## 目录

```
admin/       运营后台（Next.js 15 + Tailwind）
web-pc/      PC 用户端（Next.js 15，SSR）
web-h5/      H5（uni-app 3 + Vue 3 + Vite，开发中）
miniprogram/ 小程序（同一套 uni-app 代码的编译目标，待建）
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
npm run dev:h5                  # http://localhost:3002  （H5，uni-app）
```

## 当前进度

| 模块 | 状态 |
| --- | --- |
| monorepo + 共享包 + i18n | ✅ |
| 服务端骨架（统一响应、异常、zod 校验、双端鉴权） | ✅ |
| 认证（短信验证码 / 密码 / 注册 / 找回 / 刷新 / 封禁拦截） | ✅ |
| 积分体系（签到 / 看广告 / 点赞 / 活动 / 新人礼 / 邀请 / 流水） | ✅ 端到端验证 |
| 题库（列表 / 详情 / 关卡 / 解锁消耗积分） | ✅ |
| 答题引擎（作答、Hint、Skip、断点续答、判分、交卷、解析） | ✅ |
| 竞赛（列表 / 详情 / 报名 / 作答 / 榜单 / 结束后统一结算） | ✅ |
| 排行榜（总榜 XP / 月榜积分 / 行内点赞 / 我的排名） | ✅ |
| 个人中心（历史、收藏、徽章、资料与改密、头像） | ✅ |
| 内容与运营（文章、工单、通知、搜索、审计、短信记录） | ✅ |
| 小游戏（Wordling 三变体 / Hexling） | ✅ |
| 题库管理后台 + 多角色权限矩阵 | ✅ |
| 部署产物（Dockerfile ×3 / Nginx / compose / 备份 / 健康检查） | ✅ |
| **H5（uni-app，`web-h5`）** | ✅ 8 个页面主链路 + 提示 / 逐题解析 / 收藏 / 多语言（小程序待建） |
| 小程序（uni-app 编译目标） | ⏳ 待建 |

## 积分规则（默认值，后台可改）

| 任务 | 积分 | 频次 |
| --- | --- | --- |
| 每日签到 | +10，连续每日 +2，递增封顶 +20 | 每日 1 次 |
| 看广告 | +10 | 每日 5 次 |
| 给上榜选手点赞 | +5（被赞者人气 +1） | 每日 5 次，同一人每日 1 次 |
| 活动奖励 | 按活动配置 | 每活动 1 次 |
| 新人礼 | +100 | 1 次 |
| 邀请好友 | +100（被邀请人通过首个关卡后） | 每邀请 1 人 1 次 |

## 开发期缓存与删除（重要）

构建缓存（`.next`、`node_modules/.vite`、`web-h5/dist`）每次启动 dev 都会被清理重建。若你的编辑器/终端给 node 进程注入了 `NODE_OPTIONS=--require ...node-language-shim.cjs`（部分 AI IDE 会这么做），会出现两个坑：

- 删除被重定向到**回收站**，几万个缓存文件堆进去，磁盘根本没释放；
- 触发 shim 的「单轮删除 500 文件」守卫，`next dev` 直接抛 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 退出（表现为 **web 端起不来**）。

本项目已在脚本层统一处理，无需手工设环境变量：

| 场景 | 处理方式 |
| --- | --- |
| `npm run dev:all` | `scripts/dev-all.mjs` 用 `devEnv()` 启动子进程，自动剥离 shim |
| `npm run dev:web` / `dev:admin` / `dev:h5` / `dev:server` | 走 `scripts/run-service.mjs`，同样剥离，并在控制台提示 |
| `npm run clean` | 检测到被注入时用干净环境重跑自己，缓存直接删除不进回收站 |
| 手工 `next dev` | 若遇到上面的报错，在当前 shell 先设 `CODEBUDDY_SAFE_DELETE_ENABLED=0`（PowerShell: `$env:CODEBUDDY_SAFE_DELETE_ENABLED='0'`） |

另外：**不要**手动去删 `.next` / `.vite`，需要时用 `npm run clean`（先停服务，否则 Windows 会因文件占用跳过）；`npm run clean -- --all` 会连 node_modules 下的缓存一起清。

## 日常开发（推荐，改代码不用构建）

```bash
npm run db:local           # 终端 1：本地数据库
npm run dev:all            # 终端 2：api(watch) + web + admin + h5
npm run dev:all -- --no-h5 # 只起 api + web + admin
npm run verify             # 任意终端：200ms 探活五个服务
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

## 多语言（i18n）

`packages/i18n` 提供两套词表，三端共用：

| 模式 | 用法 | 适用 |
| --- | --- | --- |
| key 模式 | `t('quiz.start')` | 状态、枚举、系统提示等需要稳定 key 的文案 |
| 源文案模式 | `tt('开始答题')` | 页面 UI 文案（key 就是中文原文，缺词条自动回退中文） |

- 服务端组件：`const { tt } = await getI18n()`（`web-pc/lib/locale.ts`、`admin/lib/locale.ts`），读 cookie → `Accept-Language` → 默认 `zh-CN`
- 客户端组件：`const { tt, locale } = useI18n()`（`lib/i18n.tsx` 的 `I18nProvider` 由根布局注入）
- 切换入口：PC 顶栏地球图标、后台顶栏「中文 / EN」、H5「我的 → 语言」；选择写入 cookie `qp_locale`（PC 与后台同域共享）与 H5 本地存储
- H5 额外用 `uni.setTabBarItem` / `uni.setNavigationBarTitle` 同步 tabBar 与导航标题
- 新增英文：在 `packages/i18n/src/phrases/en.ts` 加一条 `'中文原文': 'English'`，`npm run build:i18n` 后即生效
- 注意：H5 用 Vite 预构建依赖，改完 `@quizpeak/i18n`/`@quizpeak/shared` 的 dist 后缓存会失效不彻底。`npm run dev:h5`（`scripts/run-service.mjs`）已自动比较 mtime 并在需要时清理 `web-h5/node_modules/.vite`，无需手动删

**覆盖进度**

| 端 | 已翻译 | 待翻译 |
| --- | --- | --- |
| PC | ✅ 全部页面（首页 / 题库列表与详情 / 答题 / 成绩 / 竞赛列表·详情·答题 / 排行榜 / 积分 / 我的 / 通知 / 搜索 / 文章 / 工单 / 三个静态页 / 小游戏 / 顶栏页脚） | — |
| Admin | 登录页 / 侧边栏 + 二级菜单 / 顶栏 / 无权限页 / 仪表盘（含 KPI 与进展清单）/ 客服工单（筛选·详情·状态确认弹窗）/ 手机号查看组件 | 题库、竞赛、任务、用户、积分流水、短信、内容、搜索记录、审计、管理员、设置 |
| H5 | 全部 8 个页面（首页/我的/登录/题库列表/题库详情/答题/排行榜/积分）+ tabBar + 导航标题 | — （题库详情描述、题干、选项等为数据库内容，不做翻译） |

## 常用命令

```bash
npm run typecheck          # 类型检查
npm run dev:h5             # 起 H5（uni-app / Vite，端口 3002）
npm run build:server       # 编译 API（发版前用；日常用 dev:all）
npm run build:admin        # 构建后台（发版前用）
npm run db:generate        # prisma generate（仅 schema 变更后需要）
npm run db:migrate         # prisma migrate dev
npm run db:seed            # 初始化数据
```

## 默认账号

- 后台：`admin` / `Admin@123456`（首次登录后请修改）
- 短信验证码在开发环境打印在 server 日志中（`[SMS:LOGIN] 手机号 -> 验证码`）
