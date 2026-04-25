# lexi-glass

`lexi-glass` 是一个极简词汇查询工作台：左侧输入单词、短语、表达或句子，右侧展示模型返回的结构化词条。模型输出强制为 JSON，前端再渲染成词典式页面。

## 命名

`lexi` 来自 lexicon / lexical，指词汇；`glass` 表示透明、清晰、像玻璃一样把语义结构看清楚。这个名字短、好记，也比较贴合“把词义拆开看”的用途。

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

网页设置里的 API Key 会保存在浏览器 localStorage，并会随云同步保存到 Supabase。只适合个人自用项目；公开多人使用时建议只使用 Vercel 环境变量。

## Supabase

当前前端已配置为和 `study-kanban` 同一个 Supabase 项目，并使用同一张 `study_store` 表。SQL 在 [supabase.sql](/d:/Files/Projects/lexi-glass/supabase.sql)。

使用的 key：

- `lexi_glass_history`
- `lexi_glass_settings`
- `lexi_glass_theme`

## 文件

- [index.html](/d:/Files/Projects/lexi-glass/index.html)
- [styles.css](/d:/Files/Projects/lexi-glass/styles.css)
- [app.js](/d:/Files/Projects/lexi-glass/app.js)
- [api/analyze.js](/d:/Files/Projects/lexi-glass/api/analyze.js)
