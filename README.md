# ai-vocab-tool

`ai-vocab-tool` 是一个个人 AI 查词工具：输入单词、短语、表达或句子后，模型返回结构化词条，前端再渲染成更像词典页的排版。它同时保留 JSON 视图，方便修改、导出和复用。

## 最新进展
- v0.9.53 修复非空查询无反应并优化历史时间：修复重复排队去重调用不存在函数导致查询入口静默失败的问题；历史时间可默认显示创建、修改或全部，详情顶部可切换；历史页支持创建日期和修改日期筛选；历史详情滚动时保留压缩吸顶信息条，API 配置弹窗有草稿时点击遮罩不会误关。
- v0.9.52 优化 Prompt 工作区并修复重复排队：模型 Prompt 专区新增“输入 → 前端请求 → System Prompt → 模型 JSON → 校验渲染”的实现路径，编辑器改为更宽的工作台；重复点击正在查询或已排队的相同请求不会继续堆队列；`~` / `～` 占位搭配可拆出有效片段用于例句高亮。
- v0.9.51 新增模型 Prompt 专区：设置页可查看默认查询 prompt、复制、保存自定义覆盖版或恢复默认；自定义 prompt 会随 settings 云端同步，留空则继续使用内置默认规则。
- v0.9.50 补回译文对应高亮但避免杂项污染：例句只高亮查询词本身和实际词形，译文只高亮对应义项/搭配的译法，并通过 `exampleHighlights` / `translationHighlights` 兼容多语言词形和译文变化。
- v0.9.49 重做左右布局：左右布局改为宽屏工作台，左侧用于长输入和单个侧重点，右侧保留结果阅读空间，输入框可拖拽调整，查询按钮移到输入控制区底部。
- v0.9.48 收窄结果高亮并固定首页查询区：高亮只使用当前查询词本身及常见英文词形，只出现在例句和译文行；首页标题和查询区滚动时保持置顶并压缩高度，点击输入区会回到顶部并聚焦。
- v0.9.47 优化结果高亮：英文会按常见词形变化包住完整单词，避免 `transpire` / `transpired` 这类词形只高亮半截。
- v0.9.46 为 Cloudflare 版增加 IPv4 relay 兜底：模型供应商如果拦截 Cloudflare IPv6 出口，会自动转发到 `AI_IPV4_RELAY_BASE_URL` 指向的 IPv4 relay；浏览器仍然只需要访问 Cloudflare。
- v0.9.45 新增 Cloudflare Pages 双部署支持：`functions/api/*` 复用现有 API handler，`npm run build:pages` 只输出公开静态资源到 `dist`，Cloudflare 版继续使用同一套 Supabase 数据库和同源 `/api/*`。
- v0.9.44 修复流式查询时的排队输入：查询进行中清空主输入不再取消当前查询或清空队列，队列下一条开始时会同步回输入框，忙碌时遇到已有历史也会直接排队。
- v0.9.43 回退主查询频繁重启动画：主查询流式预览不再给整块内容添加上浮动画，追问生成中也只保留光标和 pending 状态，避免内容频繁刷新时抖动。
- v0.9.42 压缩移动端历史页：高级筛选默认折叠，排序变为横向条，历史条目按钮置底，列表分批渲染以减少大量记录时的滚动卡顿；主查询和追问流式内容增加柔和入场动效。

- v0.9.41 主查询改为真实流式生成：`/api/analyze` 会转发模型 SSE delta，首页边收 JSON 边更新可解析的词条块，最终再校验保存。
- v0.9.40 修复移动端追问表格溢出：表格只在自身容器内横向滚动，普通正文更小，单元格里的 `<br>` 会正常换行。
- v0.9.39 重做主查询生成反馈：搜索后先出现结构骨架和估算百分比，真实结果返回后按块接管并逐字显示，JSON 页也会逐段打字。
- v0.9.38 升级主查询分块打字机：主查询结果按词条头、义项、搭配等结构块逐块出现。
- v0.9.37 收敛 API 配置菜单并加入主结果打字机：设置页外层不再堆按钮，主查询结果也会逐字揭示。
- v0.9.36 新增 API 配置连接测试：设置页可直接测试当前配置是否可用，并显示耗时或明确失败原因。
- v0.9.35 新增追问流式输出：追问回答会边生成边显示，最终仍保存到对应历史记录并随云端同步。
- v0.9.34 优化移动端 Markdown 表格：追问回答里的多列表格在手机上会横向滚动并保持列宽，不再被压得过扁。
- v0.9.33 新增标签管理面板：设置页可查看所有 Tag 的使用数量，并支持筛选、重命名和批量移除。
- v0.9.32 新增查询自动重试：网络失败、超时、429 或 5xx 会自动重试一次，并在结果区显示重试原因。
- v0.9.31 新增查询队列：查询进行中可以继续提交新词，队列支持上移、下移、插队和移除，并会自动执行下一条。
- v0.9.30 新增字体风格偏好：设置页可在系统默认、无衬线、衬线和等宽之间切换，并随云端同步。
- v0.9.29 补齐站点图标：新增与侧边栏品牌一致的 SVG favicon，并补充 `theme-color` 与 manifest。
- v0.9.28 新增单词/词组类型层：结果和历史会显示“单词 / 词组”，历史筛选新增类型多选，可视化编辑也能修改 `meta.entryType`。
- v0.9.27 新增词条可视化编辑：历史详情里可以用表单直接改词条头、义项和固定搭配，也能新增或删除义项/搭配；移动端追问表格会按列数调整宽度，避免多列表格过扁或过宽。
- v0.9.26 新增备注 Markdown 工具条：历史详情里的 Note 可以一键插入加粗、列表、引用、代码和表格模板。
- v0.9.25 新增历史标签筛选：历史筛选区加入 Tag 多选，列表里的标签也可以直接点击筛选。
- v0.9.24 新增历史标签与备注：历史详情编辑页可维护 Tag 和个人 Note，列表、预览和搜索都会使用这些整理信息。
- v0.9.23 新增相关历史词条跳转：结果页会根据已有历史显示单词/词组之间的相关入口，例如 `odds` 和 `odds are that` 可以互相打开详情。
- v0.9.22 新增字段标签显示偏好：设置页可在中文、缩写、双语之间切换，历史筛选、历史摘要和结果页词性/方向/语体会统一跟随。
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

- 首页：进入主界面、点击左上角品牌图标或首页按钮时会自动聚焦输入框；输入条支持回车快速查询；查询中会显示请求阶段和当前接口来源；查询忙碌时继续提交会进入队列，可调整顺序或插队；网络失败、超时、429 或 5xx 会自动重试一次。
- 结果：支持排版视图和分区 JSON 视图；会区分单词和词组/表达并写入 `meta.entryType`；主查询会使用流式接口边接收模型 JSON 边显示原始 JSON，并从已经生成的文本中实时提取词条头、义项、搭配、语感和易混块更新排版预览；模型结束后仍会执行完整 JSON 校验和必要修复，历史保存只使用最终校验后的结构化结果；核心义会单独突出显示，类型、词性和方向作为同一行辅助信息；多词性词条会先按词性分组展示义项，每个词性组内单独编号，义项、搭配和易混词都有更清晰的层级；例句会高亮当前查询词本身和实际词形，译文会高亮对应义项或搭配的译法，语意说明不再高亮以保持克制；语言、方向、词性和语体会遵循设置里的字段标签显示偏好。
- 追问：可针对当前词条继续向 AI 提问，回答会优先边生成边显示，完成后保存到对应历史记录；回答支持常见 Markdown 版式，包括标题、列表、引用块、代码块、表格、分隔线、链接、删除线和行内强调；多列表格在手机上会保持可读列宽并只在表格容器内横向滚动，普通正文在窄屏下会收紧字号和行高，表格单元格里的 `<br>` 会渲染为真正换行。
- 历史记录：自动保存查询结果，整条记录可点击查看详情，支持排版 / 可视化编辑 / JSON / 编辑保存，也支持收藏、搜索、多选筛选、创建日期/修改日期范围筛选和排序；列表会显示核心释义、单词/词组类型、词性、方向、语言摘要、自定义标签和按偏好选择的创建/修改时间，未真正编辑的记录不会显示“已编辑”；历史详情可维护 Tag 和个人 Note，Note 支持现有 Markdown 渲染并提供常用格式快捷按钮；设置页可汇总管理 Tag，支持筛选、重命名和批量移除；结果页会提示与当前词条互相包含的历史记录，方便在单词和词组之间跳转。
- 设置：可保存多组 API URL、API Key、Model 配置并切换当前使用项；外层只显示当前配置和下拉入口，新增、选择、编辑和删除收在配置菜单中，配置菜单会作为顶层浮层显示并避开移动端底部导航；新增和编辑配置会在弹窗里完成，也可查询模型列表和测试当前填写内容，有草稿时点击遮罩不会误关；模型 Prompt 专区可查看“输入、前端请求、System Prompt、模型 JSON、校验渲染”的实现路径，支持查看默认查询规则、复制、保存自定义覆盖版或恢复默认；同时可切换主题、首页布局、字段标签显示方式、字体风格和历史时间显示方式，支持恢复默认。顶部布局适合快速查词；左右布局是宽屏工作台，左侧保留可拖拽长输入和单个侧重点，右侧用于持续阅读结果。
- 登录：复用 `study-kanban` 的 Supabase 登录/离线模式风格；登录后无感同步历史、收藏、API 设置、主题、布局和运行日志。
- 通知：右上角 toast 支持自动消失和手动关闭，按状态展示不同图标、光条和进度动效。
- 站点图标：浏览器标签页、manifest 和移动端主屏幕入口使用统一的“词”字放大镜徽标。

## AI 配置

可以在网页设置里保存一组或多组 API 配置：

```text
Name=OpenAI 主线路
API URL=https://api.openai.com/v1/chat/completions
API Key=你的 API Key
Model=gpt-4o-mini
```

查询和追问会使用当前选中的配置组。外层配置区只负责选择当前配置；新增和编辑会打开弹窗填写 `Name / API URL / API Key / Model`，模型列表查询会通过 `/api/models` 代理访问兼容 OpenAI 的 `/models` 接口；弹窗里的草稿配置也可以通过 `/api/test-profile` 做一次极小请求测试，确认 URL、Key 和 Model 是否可用。旧版本保存的单组 `API URL / API Key / Model` 会自动迁移为默认配置组。

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

## Cloudflare Pages

本项目可以和 Vercel 并行部署到 Cloudflare Pages，项目名建议继续使用 `ai-vocab-tool`，默认域名会是：

```text
https://ai-vocab-tool.pages.dev
```

Cloudflare Pages 配置：

```text
Build command: npm run build:pages
Build output directory: dist
Functions directory: functions
```

需要在 Cloudflare Pages 的环境变量里配置与 Vercel 等价的值：

```text
AI_API_URL
AI_API_KEY
AI_MODEL
ADMIN_EMAILS
SUPABASE_URL
SUPABASE_ANON_KEY
AI_IPV4_RELAY_BASE_URL
```

`AI_IPV4_RELAY_BASE_URL` 是可选兜底项，用于处理模型供应商拒绝 Cloudflare IPv6 出口的情况。它可以先指向现有 Vercel 版域名，例如：

```text
AI_IPV4_RELAY_BASE_URL=https://ai-vocab-tool.vercel.app
```

用户浏览器仍然只访问 Cloudflare；只有 Cloudflare Functions 在发现上游返回“正在使用 IPv6 访问”等拦截页时，才会在服务端把同一个 `/api/analyze`、`/api/followup`、`/api/models` 或 `/api/test-profile` 请求转发给 relay。如果供应商同时拒绝 Vercel 出口，则需要换成一个有 IPv4 出口的自有 relay。

数据库不需要迁移。Cloudflare 版和 Vercel 版共用同一个 Supabase 项目、同一张 `public.study_store` 表和同一组 `ai_vocab_tool_*` key；同账号登录后历史、API profiles、主题、布局和日志会继续同步。上线后需要在 Supabase Auth 的 Site URL / Redirect URLs 中加入 Cloudflare Pages 域名，例如 `https://ai-vocab-tool.pages.dev`，绑定自定义域名后也要把自定义域名加入允许列表。

## Supabase

当前前端已配置为和 `study-kanban` 同一个 Supabase 项目，并使用同一张 `study_store` 表。Supabase 项目 URL 是 `https://uoifrqehkfvpzqojaazh.supabase.co`，所以在后台应找这个项目里的 `public.study_store`，而不是找名为 `ai-vocab-tool` 的表或项目。SQL 在 [supabase.sql](/d:/Files/Projects/lexi-glass/supabase.sql)。

使用的 key：

- `ai_vocab_tool_history`
- `ai_vocab_tool_settings`（含多组 API 配置、字段标签显示和字体风格）
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
- [favicon.svg](/d:/Files/Projects/lexi-glass/favicon.svg)
- [site.webmanifest](/d:/Files/Projects/lexi-glass/site.webmanifest)
- [styles.css](/d:/Files/Projects/lexi-glass/styles.css)
- [app.js](/d:/Files/Projects/lexi-glass/app.js)
- [api/analyze.js](/d:/Files/Projects/lexi-glass/api/analyze.js)
- [api/models.js](/d:/Files/Projects/lexi-glass/api/models.js)
- [api/test-profile.js](/d:/Files/Projects/lexi-glass/api/test-profile.js)
- [api/sync.js](/d:/Files/Projects/lexi-glass/api/sync.js)
- [PROJECT_CONTEXT.md](/d:/Files/Projects/lexi-glass/PROJECT_CONTEXT.md)

## 更新记录

完整记录见 [CHANGELOG.md](/d:/Files/Projects/lexi-glass/CHANGELOG.md)。
