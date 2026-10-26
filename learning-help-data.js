(function(root){
 'use strict';
 const tours={
  basics:{title:'基础查词',description:'输入、查询选项、阅读结果和历史记录。',icon:'search',steps:[
   {view:'settings',target:'#api-profile-picker',title:'先核对文字模型配置',text:'首次查询前，在模型生成设置选择你的接口与模型。教程不会填写密钥、测试接口或调用模型；基础查词不需要 Bridge、Anki 或 Fushi。',example:'已经配置过的账号可沿用现有配置，不必重新填写。'},
   {view:'home',target:'#query-input',title:'输入想学的内容',text:'单词、词组或句子都可以；多条内容可换行输入。候选只补全文字，不会自动查询。',example:'clock → 注意到；时钟'},
   {view:'home',target:'#lookup-options-toggle',title:'按需展开查询选项',text:'语言方向、侧重点和收藏夹都可选。折叠不会清空输入，也不会取消任务。',example:'英语 → 中文；侧重口语用法'},
   {view:'home',target:'[data-help-target="lookup-submit"]',title:'明确查询才调用模型',text:'点击查询才使用所选配置。中文输入法确认文字不会提交；教程不会代你点击。',example:'一批多个词组会分别进入现有队列。'},
   {view:'home',target:'[data-help-target="result-tabs"]',title:'阅读与整理结果',text:'排版用于阅读，JSON 用于查看结构。核心义、例句和基础词典各自保留来源，不把演示当成查询结果。',example:'演示例句：I clocked the detail. / 我注意到了细节。'},
   {view:'history',target:'#history-search',title:'回到已保存的学习内容',text:'历史可搜索原始输入和释义，打开词条后可收藏、查看关联场景或进入制卡预览。',example:'重复输入先核对已有词条；需要新内容时明确重新查询。'}
  ]},
  scenes:{title:'场景与收藏回顾',description:'纯文字或素材录入，关联词条、分类与回顾。',icon:'images',steps:[
   {view:'home',target:'[data-scene-action="open"]',title:'从首页添加场景',text:'不必先上传图片。可以填写原句、译文、来源及可选待查词；保存与调用模型查询是不同操作。',example:'原句：I clocked the detail. / 待查：clock'},
   {view:'scenes',target:'[data-scene-action="new-library"]',title:'场景也能独立保存',text:'场景专区可直接添加文字或素材。保存成功后再查询或关联；失败时保留草稿。',example:'Ctrl / Cmd + Enter 保存；多行正文 Enter 换行。'},
   {view:'scenes',target:'[data-help-target="scene-search"]',title:'找回场景及关联词条',text:'按原句、来源或词条搜索。场景与词条双向关联；同图不等于同一场景，不会据此强行归并。',example:'在实际场景详情中可摘词查询或直接关联已有词条。'},
   {view:'folders',target:'#folder-sidebar',title:'一个收藏入口，分别整理',text:'个人收藏和自定义文件夹共用入口；场景收藏不会自动收藏其中所有词条。',example:'加入文件夹后可继续分类；取消收藏与移出当前文件夹不同。'},
   {view:'scenes',target:'[data-scene-review]',title:'按当前范围回顾',text:'先看原句和素材，再展开关联释义。没有关联词条的场景仍可浏览，但不能误标全部掌握。',example:'场景关联的学习状态与独立词条状态分别保存。'}
  ]},
  anki:{title:'Anki 制卡',description:'安装连接、完整释义预览、确认与逐项回执。',icon:'send',steps:[
   {view:'settings',target:'#learning-integrations',title:'先安装并连接电脑助手',text:'在安装连接页获取正式 ZIP 和逐步说明。手机／Mac 可提交，实际执行需要 Windows 助手与 Anki 在线。',example:'Fushi 和词典是可选来源，不是普通制卡的前提。'},
   {view:'settings',target:'#learning-integrations',title:'核对所选电脑的真实状态',text:'登记版本、最近在线和实际诊断分别显示。诊断超过120秒需重新检查，点过下载不代表安装成功。',example:'Anki 未连接时，先检查是否运行、端口与本地认证。'},
   {view:'history',target:'#history-list',title:'从已保存词条进入制卡',text:'首页已保存结果、历史、收藏与场景使用同一制卡面板。当前版本完整 AI 内容默认选中，可取消部分分区。',example:'每个词条默认一张完整卡，不自动拆成大量卡片。'},
   {view:'settings',target:'#anki-task-manager',title:'先预览，再明确确认',text:'任务窗口核对电脑配置、目标牌库、正反面和新增／更新差异。换目标后重新确认；教程不创建任务。',example:'首次在“Lexi 验收”牌库测试；既有 Lapis／Fushi 模板不变。'},
   {view:'settings',target:'#anki-task-manager',title:'看逐项回执，不只看通知',text:'写入 Anki、云端回执与 Anki 自身同步不是一回事。取消只停止剩余项，安全撤销会保留已修改或已学习的卡片。',example:'程序更新前暂停接单，完成或取消剩余项，再正常退出。'}
  ]},
  fushi:{title:'Fushi 与本机词典',description:'可选来源选取、词典快照与来源边界。',icon:'book-open',steps:[
   {view:'settings',target:'#learning-integrations',title:'可选接入，不替代主学习界面',text:'安装连接页提供官方入口。在 Windows 助手检查 Fushi 与已启用词典；网页不直接读取软件数据库。',example:'浏览器和手机不需要复制电脑上的插件密钥。'},
   {view:'scenes',target:'[data-fushi-browser]',title:'明确选取 Fushi 来源',text:'读取已确认范围后预览、勾选并导入。不会消费、删除或重发 Fushi 原队列；无可用来源时不会伪造。',example:'官方接口没有原素材引用时，可在现有场景编辑器手动补充。'},
   {view:'history',target:'#history-list',title:'词典与 AI 释义分开保存',text:'实际词条可显式查询本机词典，选择义项保存独立快照。已有快照可阅读，不覆盖 AI JSON、Origin 或场景。',example:'电脑不在线时无法新查本机词典；基础词典与已保存快照不等于在线连接。'},
   {view:'settings',target:'#anki-task-manager',title:'继续使用统一预览',text:'选择带入的词典义项后，回到同一制卡任务中核对并确认。不修改 Fushi 既有模板或复习进度。',example:'本教程只读，不读取真实 Fushi 收藏或创建卡片。'}
  ]}
 };
 const ledger=[
  {title:'批量截图学习收尾',dependency:'场景编辑器识图与已验证配置',acceptance:'批量采集 → 核对 → 保存 → 查询 → 制卡预览',next:'继续收尾独立批量截图预览与跨端生命周期',evidence:'场景编辑器已接入图片分析；独立批量截图工作区仍待正式交付'},
  {title:'Teyvat 语录与规范来源',dependency:'截图核对及增量中英索引',acceptance:'覆盖范围可见；唯一匹配可引用，多候选需核对',next:'增量读取已调研章节接口，建立独立公共索引',evidence:'已调研接口与句子身份，尚未接入'},
  {title:'可靠结果自动保存查词',dependency:'结构校验及独立来源证据',acceptance:'明确开启并限定范围；有冲突不自动保存',next:'在来源匹配通过后接入现有队列',evidence:'尚未交付；不自动批准 Anki 写入'},
  {title:'安全重复整理',dependency:'逐组预览和冲突核对',acceptance:'版本、收藏、场景关联原子迁移，可追踪与受保护撤销',next:'沿用已批准归并方案实现共享身份和迁移',evidence:'旧词条补遗已上线，重复归并仍未完成'},
  {title:'历史与设置大容量迁移',dependency:'事务、读回、账号与多标签页校验',acceptance:'验证成功才移除旧副本，失败可恢复及导出',next:'迁移至 IndexedDB，不以清空数据解决配额',evidence:'诊断日志已迁移；历史与设置尚未迁移'},
  {title:'图片／GIF／视频轻编辑',dependency:'保留原件、编辑参数和派生文件',acceptance:'输出可解码；GIF 保留动画，视频保留声音',next:'先做非破坏编辑，再验证电脑处理降级',evidence:'尚未交付；已有素材展示不等于支持编辑'},
  {title:'AI 裁剪建议',dependency:'非破坏媒体编辑与识图配置',acceptance:'先预览建议框，确认后生成副本，可恢复原件',next:'媒体编辑验收后增加可调整建议',evidence:'尚未交付；不静默替换素材'}
 ];
 root.LearningHelpData=Object.freeze({version:1,tours,ledger});
})(globalThis);
