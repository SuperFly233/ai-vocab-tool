# v0.28.0 交互收尾验收

本轮承接 v0.27.0 的 23 项主计划，只处理反馈中的场景阅读、设置、版本与入口问题，不再扩大为全站重设计。

## 逐项结果

修复 6 项，均已实现并通过对应本地自动回归：

1. 有声自动播放优先；浏览器拦截后静音兜底，隐藏工具或原生控件时仍可开启声音。`check-scene-media-ui.cjs`
2. 图文分隔线使用真实轨道与拖动 SVG，深浅色均可见；支持拖动、键盘与双击复位。`check:scene-reading-settings-ui`
3. 阅读目录仅收录顶层分区，场景原句不再与场景父分区并列。`check:interaction-polish-ui`
4. 版本整合改为图标入口，更多菜单图文同排且不换行。`check:interaction-polish-ui`
5. 拖动版本条后立即刷新管理列表，两处使用同一版本顺序。`check:interaction-polish-ui`
6. 网络状态移到右上账号旁，使用真实绿/橙/红/灰色点；点击查看检测结果。`check:delete-undo-ui`

优化 5 项，均已实现并通过对应本地自动回归：

1. 目录摘要清理空白、去重、分条、限制长度，不再堆入全部标签与例句。`check:interaction-polish-ui`
2. 添加场景统一使用 Lucide `image-plus`，区别于通用新增按钮。图标契约与截图检查。
3. 设置目录统一单行层级，顺序与正文一致，移动端横向目录保持可滚动。`check:interaction-polish-ui`
4. 整合先预览，再明确确认添加；保留来源，可撤销，来源变化或后续内容编辑受到保护。`check:versions-ui`、`check:interaction-polish-ui`
5. 场景加入主导航；手机保留五个核心入口，设置/关于放辅助图标区。320/390/1100/1440 深浅色导航碰撞检查。

新增 3 项，均已实现并通过对应本地自动回归：

1. 设置搜索：按分类与选项文本过滤，展示命中数，清空恢复。`check:interaction-polish-ui`
2. AI 语义整合预览：显式点击星光图标后使用当前配置；失败与超时保留本机预览；确认前不写入。保留基准标题与原始查询。`check:interaction-polish-ui`
3. 独立 `/batch` 批量页：逐行输入、去重、可关联场景、复用持久化查询队列与失败重试。`check:interaction-polish-ui`、`check:workspace-ui`

合计：14 项 = 修复 6 + 优化 5 + 新增 3；无本轮功能项标为未实现。

## 验证证据

- `npm run check`：语法、图标、版本/路由契约、历史、设置、场景合并、存储回滚、查询恢复、同步及媒体 API 权限均通过。
- `check:interaction-polish-ui`：320/390/1100/1440px 深浅色；五个主入口、设置搜索、批量去重、目录摘要、版本排序、AI 失败后重试、预览/确认/撤销、菜单尺寸与不换行通过。
- `check:workspace-ui`：390/768/1440px 深浅色；独立场景、SSE、共享编辑、批量与关联、确认/取消/撤销、过滤与持久化通过。
- `check:versions-ui`：320/390/1440px 深浅色；命名/默认/删除/取消/撤销/并发/导入/草稿/顺序/滚动/配额通过。
- `check:scene-reading-settings-ui`：Chromium 320/390/1024/1440px 深浅色；核心义优先、自动素材、失败重试、分隔线与胶囊控件通过。
- `node scripts/check-scene-media-ui.cjs`：真实编码 WebM、IndexedDB、私有素材往返、校验拒绝、备份、放大播放互斥，以及有声播放拦截后的声音入口通过。
- 截图位于忽略目录 `tmp/scene-qa/`；已人工查看手机设置与桌面版本菜单、阅读分隔线，未使用私人生产数据。
- `check:delete-undo-ui`、`check:overlays-ui`：记录/追问/配置/收藏夹恢复、并发新增保护、主动点空白关闭、拖动释放防误关、双向箭头提示通过。
- `check:mobile-notices-ui`：390/1440px 深浅色、上下通知位置均通过；普通简洁通知高度 45px，详细通知 81.5px，无巨型通知或横向溢出。
- `check:responsive`、`check:streaming-ui`：320/390/768/1440px 长字符串和内部表格滚动，390/1440px 深浅色半截数据、Unicode、首屏及追问流式/缓冲兜底、模型来源通过。
- WebKit 390/1440px 深浅色布局夹具通过；不替代实体 iPhone 验收。
- `npm run build:pages` 与 `git diff --check` 通过。

## 明确限制

- 有声自动播放无法绕过浏览器策略；并非所有浏览器都会允许未经点击的有声播放。自动播放本身仍默认关闭，手动开启后优先尝试有声。
- AI 回归使用受控响应验证失败/重试、预览、确认与撤销，不代表已经验证真实付费模型的语义合并质量。AI 不会后台自动调用。
- Windows WebKit 的媒体布局使用内存存储夹具；真实 Blob 持久化由 Chromium 验证，不能当作实体 Safari 存储验收。
- 本轮未实测实体 iPhone，也未修改私人生产词条或宣称真实跨设备云验收通过。
- OCR、视频转录与 Anki 自动联动仍属后续独立范围。

## 发布

待最终回归、构建、提交、Push、Cloudflare 部署及线上静态文件核验。
