# ai-vocab-tool

`ai-vocab-tool` 是一个个人 AI 查词工具：输入单词、短语、表达或句子后，模型返回结构化词条，前端再渲染成更像词典页的排版。它同时保留 JSON 视图，方便修改、导出和复用。

## 最新进展

- v0.9.21 优化历史摘要与结果高亮：历史列表显示核心释义、词性和方向；结果里的例句/译文会高亮当前词条或义标；清空查询输入会同步清空结果，宽表格在手机上继续横向滚动。
- v0.9.20 补齐追问 Markdown 表格：支持 GitHub 风格表头/分隔行/数据行，列数多时会按列数撑开并横向滚动，避免手机上被压扁。
- v0.9.19 完善追问 Markdown 渲染：支持 `>` 引用块、fenced code block、分隔线、链接、删除线和下划线粗体/斜体，减少列表/标题/段落误判。
- v0.9.18 加固手机端同步 token 获取：同源 `/api/sync` 兜底会优先读取 Supabase 本地 session token，避免 `getSession()` 刷新会话时再次触发 `Load failed`。
- v0.9.17 增加手机端同步兜底代理：直连 Supabase REST 遇到 `TypeError: Load failed` / `Failed to fetch` 时，会自动改走本站同源 `/api/sync`。
- v0.9.16 修复登录后云同步卡住：同步读写锁和界面忙碌状态拆开，登录提示不会再挡住首次同步；同步失败会给出 `study_store`、RLS、登录会话或网络方向的排查提示。
- v0.9.15 优化多词性词条：义项先按词性分组、组内重新编号，词条 JSON 的 `basicPartOfSpeech` 可用 `n/v/...` 记录多个主要词性。
- v0.9.14 重做收藏历史金色特效：补齐金色主题变量，收藏卡片改为金色描边、流光和细星芒背景，按钮也有更明确的发光状态。
- v0.9.13 修复 API 配置保存覆盖问题：新增和编辑的配置不再被旧版顶层字段洗回“默认配置”，并会清理完全重复的默认配置项。
- v0.9.12 修复首页布局默认状态：启动时会写入默认布局并高亮当前按钮，云端恢复后也会重新规范化布局值。
- v0.9.11 加固 API 配置保存流程：保存成功/失败都用 toast 反馈，本地保存成功会立即关闭弹窗，云同步放到后台处理。
- v0.9.10 优化收藏历史的金色高亮质感，并修复历史筛选多选时菜单自动关闭的问题。
- v0.9.9 修复 API 配置弹窗保存按钮无反应的问题，并把 API Key 字段从浏览器密码管理提示中隔离出来。
- v0.9.8 清理 API 配置组交互：外层只负责选择配置，新增和编辑进入弹窗填写名称、URL、Key 和 Model；历史筛选改为自制多选菜单，默认状态用短横显示。
- v0.9.7 重做自定义 API 配置组入口：当前配置用卡片展示，切换配置改成自制菜单，新增、保存、删除和恢复默认拆成明确按钮。
- v0.9.6 收紧历史记录页的筛选和排序工具条，筛选改为紧凑下拉；收藏记录去掉大星背景，只保留轻量高亮和按钮状态。
- v0.9.5 修复了重复触发同一条 toast 时进度条和关闭计时不重置的问题；查询加载态现在只保留一条直线进度，并优化了等待卡片的视觉层次。
- v0.9.4 精简了设置页，移除环境变量状态卡，把 API 配置组集中为新增、保存修改、删除当前和下拉菜单中的恢复默认。

## 命名

`ai-vocab-tool` 直接说明项目用途：AI + vocab + tool，就是一个 AI 词汇查询工具。名字不追求文艺感，优先清楚、好搜、好部署。

## 功能

- 首页：进入主界面、点击左上角品牌图标或首页按钮时会自动聚焦输入框；输入条支持回车快速查询；查询中会显示请求阶段和当前接口来源。
- 结果：支持排版视图和分区 JSON 视图；多词性词条会先按词性分组展示义项，每个词性组内单独编号，义项、核心义、搭配和易混词都有更清晰的层级；例句、译文和语意会高亮当前词条或对应义标，方便对照。
- 追问：可针对当前词条继续向 AI 提问，回答会排版在结果下方并保存到对应历史记录；回答支持常见 Markdown 版式，包括标题、列表、引用块、代码块、表格、分隔线、链接、删除线和行内强调。
- 历史记录：自动保存查询结果，整条记录可点击查看详情，支持排版 / JSON / 编辑保存，也支持收藏、搜索、多选筛选和排序；列表会显示核心释义、词性、方向和语言摘要，语言、方向、词性、语体会归一化后用于筛选，全部视图中收藏条目会有醒目的卡片高亮。
- 设置：可保存多组 API URL、API Key、Model 配置并切换当前使用项；新增和编辑配置会在弹窗里完成，也可尝试查询模型列表；同时可切换主题和首页布局，支持恢复默认。
- 登录：复用 `study-kanban` 的 Supabase 登录/离线模式风格；登录后无感同步历史、收藏、API 设置、主题、布局和运行日志。
- 通知：右上角 toast 支持自动消失和手动关闭，按状态展示不同图标、光条和进度动效。

## AI 配置

可以在网页设置里保存一组或多组 API 配置：

```text
Name=OpenAI 主线路
API URL=https://api.openai.com/v1/chat/completions
API Key=你的 API Key
Model=gpt-4o-mini
```

查询和追问会使用当前选中的配置组。外层配置区只负责选择当前配置；新增和编辑会打开弹窗填写 `Name / API URL / API Key / Model`，模型列表查询会通过 `/api/models` 代理访问兼容 OpenAI 的 `/models` 接口。旧版本保存的单组 `API URL / API Key / Model` 会自动迁移为默认配置组。

也可以在 Vercel 环境变量里配置：

```text
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=你的 API Key
AI_MODEL=gpt-4o-mini
```

网页设置里的 API Key 会保存在浏览器 localStorage，并会随云同步保存到 Supabase。只适合个人自用或可信设备。多设备同步时，不同设备新增的 API 配置组会合并保留。

## 权限策略

如果把 `AI_API_KEY` 放在 Vercel 环境变量里，默认等于“使用服务端统一 API”。公开部署时不要让所有注册用户都共享这个 Key。

当前后端支持一个简单的管理员限制：

```text
ADMIN_EMAILS=你的登录邮箱@example.com
```

开启后，只有 `ADMIN_EMAILS` 里的 Supabase 登录账号可以使用 Vercel 环境变量里的 API。其他用户仍可登录保存历史，但调用模型时必须在设置页填写自己的 API URL / API Key。

如果以后要做多人产品，可以再升级为更完整的权限模型：

- 管理员：可使用服务端环境变量 API。
- 普通用户：只能使用自己的 API Key。
- 访客/离线模式：只能使用本地保存，不能调用服务端环境变量 API。
- 可选：增加额度、审计日志、禁用注册或邀请制。

## Supabase

当前前端已配置为和 `study-kanban` 同一个 Supabase 项目，并使用同一张 `study_store` 表。Supabase 项目 URL 是 `https://uoifrqehkfvpzqojaazh.supabase.co`，所以在后台应找这个项目里的 `public.study_store`，而不是找名为 `ai-vocab-tool` 的表或项目。SQL 在 [supabase.sql](/d:/Files/Projects/lexi-glass/supabase.sql)。

使用的 key：

- `ai_vocab_tool_history`
- `ai_vocab_tool_settings`（含多组 API 配置）
- `ai_vocab_tool_theme`
- `ai_vocab_tool_layout`
- `ai_vocab_tool_logs`

同步策略：

- 登录或恢复会话后自动合并本机和云端数据。
- 历史按词条合并，保留多次生成版本、追问和收藏状态。
- API 设置、主题和布局会同步到其它设备。
- 页面重新聚焦、从后台回到前台、以及登录状态下定时轮询时会静默拉取云端更新。
- 登录、手动上传/恢复、自动轮询和本地保存共用一个同步队列；界面显示“正在登录”不会占用同步读写锁。
- 同步默认由浏览器直连 Supabase REST；如果手机浏览器直连失败，会自动 fallback 到同源 Vercel API `/api/sync`，再由服务端读写 `study_store`。调用兜底 API 时会优先使用浏览器本地保存的 Supabase session token，减少手机端刷新会话造成的网络失败。

## 项目上下文

为了避免长对话被压缩后丢失项目进度，仓库里新增了 [PROJECT_CONTEXT.md](/d:/Files/Projects/lexi-glass/PROJECT_CONTEXT.md)。新对话接手时优先阅读这个文件，再看 README、CHANGELOG 和最近的 git log。

后续每次完成有意义的功能或修复时，需要同步更新：

- `README.md`：说明用户可见行为、设置或同步策略变化。
- `CHANGELOG.md`：记录版本和变更概要。
- `app.js` 里的 `APP_INFO` 和页面内更新记录。
- `PROJECT_CONTEXT.md`：记录重要决策、当前状态和下一步验证点。

## 文件

- [index.html](/d:/Files/Projects/lexi-glass/index.html)
- [styles.css](/d:/Files/Projects/lexi-glass/styles.css)
- [app.js](/d:/Files/Projects/lexi-glass/app.js)
- [api/analyze.js](/d:/Files/Projects/lexi-glass/api/analyze.js)
- [api/models.js](/d:/Files/Projects/lexi-glass/api/models.js)
- [api/sync.js](/d:/Files/Projects/lexi-glass/api/sync.js)
- [PROJECT_CONTEXT.md](/d:/Files/Projects/lexi-glass/PROJECT_CONTEXT.md)

## 更新记录

完整记录见 [CHANGELOG.md](/d:/Files/Projects/lexi-glass/CHANGELOG.md)。
