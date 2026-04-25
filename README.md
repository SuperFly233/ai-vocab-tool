# ai-vocab-tool

`ai-vocab-tool` 是一个极简 AI 查词工具：左侧输入单词、短语、表达或句子，右侧展示模型返回的结构化词条。模型输出强制为 JSON，前端再渲染成词典式页面。

## 命名

`ai-vocab-tool` 直接说明项目用途：AI + vocab + tool，就是一个 AI 词汇查询工具。名字不追求文艺感，优先清楚、好搜、好部署。

## 功能

- 首页：左侧大输入框，右侧结果区，支持排版视图和 JSON 视图。
- 历史记录：自动保存查询结果，支持查看、删除、导出、清空。
- 设置：填写 API URL、API Key、Model，并可切换主题。
- 登录：复用 `study-kanban` 的 Supabase 登录/离线模式风格；登录后同步历史、设置和主题。

## AI 配置

可以在网页设置里填写：

```text
API URL=https://api.openai.com/v1/chat/completions
API Key=你的 API Key
Model=gpt-4o-mini
```

也可以在 Vercel 环境变量里配置：

```text
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=你的 API Key
AI_MODEL=gpt-4o-mini
```

网页设置里的 API Key 会保存在浏览器 localStorage，并会随云同步保存到 Supabase。只适合个人自用或可信设备。

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

当前前端已配置为和 `study-kanban` 同一个 Supabase 项目，并使用同一张 `study_store` 表。SQL 在 [supabase.sql](/d:/Files/Projects/ai-vocab-tool/supabase.sql)。

使用的 key：

- `ai_vocab_tool_history`
- `ai_vocab_tool_settings`
- `ai_vocab_tool_theme`

## 文件

- [index.html](/d:/Files/Projects/ai-vocab-tool/index.html)
- [styles.css](/d:/Files/Projects/ai-vocab-tool/styles.css)
- [app.js](/d:/Files/Projects/ai-vocab-tool/app.js)
- [api/analyze.js](/d:/Files/Projects/ai-vocab-tool/api/analyze.js)
