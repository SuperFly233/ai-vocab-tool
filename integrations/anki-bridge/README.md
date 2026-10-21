# Lexi Anki Bridge 0.1.0

Windows 本地伴侣程序，复用已有 AnkiConnect。不修改 Fushi、既有模板或复习调度，不设置开机自启。

## 当前发布边界

代码与测试包已提供。生产云任务保持关闭，必须先由项目管理通道执行 migration.sql 并通过账号隔离与端到端验收，再设置 Cloudflare 环境变量 ANKI_BRIDGE_ENABLED=true。
没有完成迁移时，手机不能成功提交任务；此时不是 Anki 自动云同步已经上线。

## 使用流程

1. 手动运行 Windows 程序，在本地页面独立登录 Lexi。密码仅用于登录，不写日志或配置；刷新令牌与本地密钥保存到 Windows 凭据管理器，不降级明文。
2. 手动启动安装了 AnkiConnect 的 Anki，检查端口与连接。程序仅访问回环地址，不自动安装插件或更改 CORS。
3. 保存电脑名称、目标牌库，登记电脑。首次选择专用“Lexi 验收”牌库；真实牌库需在写入前再次确认。
4. 手机或电脑在 Lexi 场景中选择关联词条与释义，提交快照。视频含封面和原文件，不保证各终端能内嵌播放。
5. 本地选择批次，检查卡面与更新差异，确认后才创建专用模板和写入卡片。任务自动刷新，但从不自动确认。
6. 手机查看逐项回执。写入 Anki 成功不等于 Anki 自身云同步完成。
7. 使用“退出程序”停止本地服务。关闭浏览器窗口本身不会终止服务；未执行任务仍在云端。

## 恢复与撤销

重复任务通过来源键核对已有笔记。写入成功但回执丢失时，重新预览会查找已建卡片，不直接重复创建。
取消只停止剩余项目，不删除已完成内容。撤销需确认；已学习、有后续编辑或来源不匹配的卡片会保留。
用户切换 Anki 配置、Lexi 账号或目标牌库后需要重新预览。没有跨系统绝对“恰好一次”保证。

配置和操作日志位于 Windows 本机用户数据目录，不应上传到 Git。日志含用于安全撤销的卡片字段，不含密码与令牌。
程序仅开放回环 HTTP，随机会话令牌与 Origin/Host 检查保护写入；没有对公网开放本地端口。

## 开发与打包

推荐 Python 3.12.10 或更新的 3.12 修复版。使用 requirements-lock.txt 创建隔离环境，并设置 PYTHONPATH 为 integrations/anki-bridge 后运行 `python -m unittest discover -s integrations/anki-bridge/tests -v`。
SQL/API 测试使用隔离的 PGlite：先在项目 tmp/anki-bridge-qa 安装 @electric-sql/pglite，再运行 `node scripts/check-anki-jobs.cjs`；它不连接生产数据库。
运行 `python integrations/anki-bridge/build.py` 生成 Windows 测试包及第三方许可证；EXE 支持 `--self-test`，只在临时目录启动并检查本地 HTTP，不登录、不读写真实牌库。未代码签名，首次运行可能有系统信誉提示。
PyInstaller 使用其 GPL 加打包例外；FastAPI/keyring 为 MIT，uvicorn/httpx 为 BSD。完整运行依赖许可证随测试包生成；不打包或复制 Anki/Fushi 程序代码。

Fushi 仍属于后续路线：通过现有来源标识接入其场景、素材及制卡映射，不在此版冒充双向联动已完成。
