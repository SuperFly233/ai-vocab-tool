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
  {title:'规范来源、Teyvat 与分类建议',status:'部分完成',dependency:'生产迁移、公共中英索引及来源证据',acceptance:'稳定身份与确认别名；覆盖可见；歧义待核对，分类确认后采用',next:'完成迁移、索引导入、认证匹配与分类建议验收',evidence:'本机检查、来源文字和分类整理已上线；索引工具已有，云端规范来源与语录匹配仍关闭'},
  {title:'FSRS 语境记忆',status:'部分完成',dependency:'明确选取的场景与学习目标、独立复习事件存储',acceptance:'FSRS-6、四档评分、到期、曲线、撤销、离线及并发保护',next:'接入数据库原子提交、离线事件链及选取评分界面',evidence:'调度核心已实现并通过固定时钟与事件冲突测试；未接通持久化与界面，现有回顾不是间隔重复；不修改 Anki 调度'},
  {title:'批量截图学习收尾',status:'仅预览',dependency:'正式场景分析、配置验证及共享核对管线',acceptance:'批量采集 → 核对 → 保存 → 查询 → 制卡预览，逐项恢复与重试',next:'选择性整合隔离预览，完成真实通道及生产生命周期验收',evidence:'场景图片分析已上线；独立批量截图工作区尚未正式交付'},
  {title:'可靠结果自动保存查词',status:'待实现',dependency:'结构校验及独立来源证据',acceptance:'单独开启，最多20项与20次查询；冲突留待核对',next:'来源匹配通过后接入现有队列并验证预算、取消与重试',evidence:'目前仍由用户核对保存；不自动批准 Anki 写入'},
  {title:'历史与设置大容量迁移',status:'待实现',dependency:'账号隔离、事务、读回及多标签页校验',acceptance:'历史、设置、删除保护和同步待办可靠落盘；失败保留旧副本',next:'验证后迁入 IndexedDB，不以清空数据解决配额',evidence:'日志和新模块草稿已有 IndexedDB；历史与设置主体尚未迁移'},
  {title:'安全重复整理与统一查前匹配',status:'待实现',dependency:'语言、方向、身份与逐组冲突核对',acceptance:'保留版本和收藏，原子迁移关联及删除保护，受保护撤销',next:'修正 inflict 类查前匹配并实现逐组归并；不按同词或同图静默合并',evidence:'重复素材精确复用和旧词条补遗已上线；已有重复词条／场景的安全归并未完成'},
  {title:'电脑助手重媒体处理',status:'待实现',dependency:'独立媒体能力登记与可选组件包',acceptance:'下载及哈希、许可与源码资料、授权传输、有限参数任务及回执',next:'实现 Bridge 媒体组件与浏览器资源不足时的电脑处理',evidence:'浏览器手动图片／GIF／视频编辑已上线；Bridge仍为0.4.1，未提供媒体组件'},
  {title:'AI 裁剪建议',status:'待你验证',dependency:'已配置识图模型及本次画面发送确认',acceptance:'建议框可调整，确认后生成副本；视频仅发送当前画面',next:'按下方“真实验收步骤”使用合成图片核对模型质量；实体设备另测',evidence:'同一编辑器已接入建议、预览和副本流程；五宽度双主题及取消、人工修改和配置变化保护通过，真实模型由用户验收'},
  {title:'旧词条补遗真实模型质量',status:'待验收',dependency:'明确选择模型及合成旧词条',acceptance:'补全质量、分区差异及修改采用，保留原版本和场景关联',next:'补做真实文字通道的代表性质量验收',evidence:'补遗界面、版本保存和安全测试已上线；其真实生成质量没有完整验收记录'},
  {title:'实体设备与实际联动验证',status:'待实测',dependency:'实体 iPhone、用户设备及专用验收内容',acceptance:'触屏／键盘、设备播放、原生托盘外观、实际断网恢复及 Anki 自身同步',next:'分别实测并留证，不以浏览器模拟或网页回执代替',evidence:'桌面便携程序与专用牌库核心链路已有验收；本机当前运行版本未由本轮确认，实体项目未全通过'}
 ];
 const manualChecks=[
  {title:'AI 裁剪：先用合成图片',steps:['下载本页的合成验收图片。进入场景 → 添加场景，先关闭自动分析或等待分析结束；添加该图片后，点击素材旁的裁剪图标。','不勾选发送确认，点击分析：应提示先确认，不能发起模型调用。勾选后选字幕区域，点击分析；首次核对现有识图配置与费用，配置变化会重新验证合成数字图。','应出现覆盖完整英文字幕的建议；建议返回时，原裁剪框不应自动变化。点击预览建议后才显示建议框，可继续拖动或填写尺寸。','点击生成副本，再点击使用副本：仅加入场景草稿；保存场景后生效。重新编辑素材并恢复原件，再保存，原图应完整恢复。','分析中手动改尺寸、停止分析或关闭弹窗：旧结果不能覆盖修改。403、超时或无可靠建议时，应保留原件并允许手动编辑。真实返回的裁剪位置是否合适由你核对。']},
  {title:'GIF／视频和实体手机',steps:['先用非私人短素材。GIF检查副本仍有动画；视频在本机检查声音、截段时长和尺寸。处理组件需单独确认下载，仅本机处理。','AI裁剪只发送当前一帧。视频先拖动预览进度到目标画面，再确认分析；不要把一帧的建议当成整段视频都适用。','实体iPhone检查中文输入法、键盘遮挡、安全区、裁剪框触控与页面滚动；切换标签再回来确认输入保留。模拟宽度通过不等于实体通过。']},
  {title:'补遗真实质量与制卡',steps:['在历史中选择一条合成旧词条，更多 → 检查与补遗；扫描不应调用模型。明确选择分区和模型后再生成。','核对新增释义、译文、搭配及辨析，修改或取消不合适的建议，再采用。原版本应仍在版本列表，场景关联不丢。','制卡先选“Lexi 验收”牌库，核对电脑、版本、完整内容和正反面后独立批准。再次发送核对跳过回执，撤销只处理符合保护条件的卡片。','Anki自身同步请在Anki中手动执行并到另一设备核对；Lexi回执不能代替Anki云同步。来源云服务、FSRS和其他尚未接通能力当前不列为可验收入口。']}
 ];
 root.LearningHelpData=Object.freeze({version:1,tours,ledger,manualChecks});
})(globalThis);
