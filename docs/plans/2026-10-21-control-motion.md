# v0.32.2 共用控件边界稳定

## 根因与范围

素材切换复用 `.plain-btn`，继承悬停 translateY(-1px) + scale(1.025)。同样的规则散见 `.icon-btn`、标签页、分段选择和 focus 输入框。仅调整素材工具栏内边距不能解决后续复发。

本轮属于动效/交互修补，不重排页面，沿用已有设计参考。

- 修复 1 组：从共用样式源头移除 hover/focus 外扩与位移，包含场景素材切换及其他控件家族。
- 优化 2 项：颜色、边线、内阴影提供稳定反馈；新增 CSSOM/实际边界回归约束并写入长期 SOP。
- 新增产品功能 0 项。没有数据、同步、媒体内容或 Anki 状态变更。

## 保留的动效

主动拖拽位移、按下时向内收缩、顶层提示气泡浮出仍保留。定位所需的 translateY(-50%) 不变；Logo 内部装饰动画不属于外层按钮缩放。没有用全局 transform:none!important 禁掉交互动画。

## 验证

- `check-control-motion.cjs`：CSSOM 解析所有样式表的 hover/focus transform 规则，仅允许固定定位偏移和明确的内部装饰例外。
- 320/390/768/1440px × 明暗主题：素材切换及其选中态、普通/危险/图标按钮、标签页、分段选择、版本按钮、输入框。真实 hover 与 focus 前后 x/y/width/height 不变（误差 <0.6px）。
- 裁切容器内重复测试；切换素材保持可用，无横向越界。主动拖拽 transform 不被 hover 覆盖。
- 桌面深色及手机浅色实际悬停截图已检查，位于忽略目录 `tmp/dialog-qa/motion/`。
- 实体 iPhone 未实测，鼠标窄屏测试不等同于触屏设备验收。
- `npm run check`、场景工作台 320/390/768/1024/1440 明暗主题、版本 UI 320/390/1440 明暗主题及遮罩/气泡检查通过；版本顺序、草稿、撤销与队列交互不受影响。

## 发布验收

- 实现提交 `308a5cf` 已推送 main；Cloudflare 部署 https://0d1defbc.ai-vocab-tool.pages.dev ，生产 https://ai-vocab-tool.pages.dev/scenes 。
- 生产 HTML、app 与 CSS 和本地构建一致；实际浏览器确认版本 v0.32.2，素材切换按钮悬停前后 x/y/width/height 均不变，无页面脚本错误。
- 生产检查仅用隔离浏览器的本地临时场景，不改用户正式记录。
