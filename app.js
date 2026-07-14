const SUPABASE_CONFIG={
  url:'https://uoifrqehkfvpzqojaazh.supabase.co',
  anonKey:'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80',
};

const STORAGE_KEYS={
  history:'ai_vocab_tool_history_v1',
  settings:'ai_vocab_tool_settings_v1',
  theme:'ai_vocab_tool_theme',
  offline:'ai_vocab_tool_offline_mode',
  layout:'ai_vocab_tool_layout',
  logs:'ai_vocab_tool_logs_v1',
};
const CLOUD_KEYS={
  history:'ai_vocab_tool_history',
  settings:'ai_vocab_tool_settings',
  theme:'ai_vocab_tool_theme',
  layout:'ai_vocab_tool_layout',
  logs:'ai_vocab_tool_logs',
};

let cloudClient=null;
let cloudUser=null;
let activeView='home';
let currentResult=null;
let currentHistoryId=null;
let currentFollowups=[];
let modalResult=null;
let modalHistoryId=null;
let modalRollId=null;
let editingApiProfileId=null;
let openHistoryFilterKey=null;
let configInfo=null;
let confirmResolver=null;
let lookupBusy=false;
let lookupRunId=0;
let lookupQueueId=0;
let lookupQueue=[];
let activeLookupSignature='';
let followupBusy=false;
let cloudBusy=false;
let cloudSyncBusy=false;
let cloudBootstrapped=false;
let cloudSyncQueued=false;
let cloudAutoTimer=null;
let passwordRecoveryMode=false;
const cloudDirtyKeys=new Set();
let editingFollowup=null;
let pendingFollowup=null;
let resultTypewriterTimers=[];
let jsonTypewriterTimers=[];
let lookupLoadingTimers=[];
const activeToasts=new Map();
const historyState={
  query:'',
  scope:'all',
  sort:'updated',
  sortDir:'desc',
  filtersOpen:false,
  searchScopeOpen:false,
  searchScopes:['word','meaning','example','collocation','confusion','other'],
  visibleCount:0,
  filters:{
    entryType:[],
    language:[],
    direction:[],
    pos:[],
    style:[],
    tag:[],
  },
};
const historyCollator=new Intl.Collator(['zh-Hans-CN','en','ja','ko','fr','es'],{
  numeric:true,
  sensitivity:'base',
  ignorePunctuation:true,
});
const HISTORY_SEARCH_SCOPE_OPTIONS=[
  {key:'word',label:'单词'},
  {key:'meaning',label:'释义'},
  {key:'example',label:'例句'},
  {key:'collocation',label:'搭配'},
  {key:'confusion',label:'辨析'},
  {key:'other',label:'其他'},
];
const VISUAL_FIELD_HINTS={
  'visual-title':['词条标题','填写用户真正查询的词、短语、表达或句子；不要把词性、解释或例句塞进标题。'],
  'visual-core':['核心义','用最短中文抓住中心意思。优先写“可迁移的核心义”，不要写成长段例句翻译。'],
  'visual-entry-type':['类型','只填 word 或 phrase。单个词填 word；短语、固定表达、句子、惯用搭配填 phrase。'],
  'visual-pos':['词性','用固定词性或斜杠组合，例如 noun / verb / adjective / adverb / phrase；多词性用 / 分隔。'],
  'visual-language':['语言','用短代码，例如 en、zh、ja、ko、fr、es、de；不确定时填 other。'],
  'visual-direction':['方向','用“原语言-目标语言”，例如 en-zh、ja-zh、zh-en；不确定时填 other。'],
  'visual-summary':['摘要','说明这个词条的总体用法、适用场景和容易误解处，可以写长一点。'],
  partOfSpeech:['义项词性','只写当前义项的词性；如果同一词条有多个词性，应拆成多个义项组。'],
  shortestLabel:['义标','用极短标签概括这个义项，例如“发生”“除...外”“总之”。不要写完整解释。'],
  meaning:['语意','解释这个义项的真实含义、使用边界和语感；不要为了高亮而塞无关词。'],
  example:['例句','写一个自然例句，必须包含当前词条或该义项实际词形。'],
  translation:['译文','翻译例句，并保留与义项对应的中文片段，方便 translationHighlights 对齐。'],
  exampleHighlights:['例句高亮','只填例句中要标出的真实片段。多个片段用逗号、顿号或换行分隔；不要填上下文杂项。'],
  translationHighlights:['译文高亮','只填译文中与当前词条/义项对应的片段，例如“开发一款人工智能词汇工具”。可填较长短语。'],
  phrase:['搭配短语','填写固定搭配或表达本身；如果有占位符可用 ~，例如 “つもり～ということだ”。'],
  note:['标注','写语体、场景或简短提示，例如“口语常用”“写作常用”“用于强调”。'],
  term:['易混项','填写要对比的近义词、短语或表达。'],
  difference:['核心区别','写它和当前词条最容易混淆的差别，优先讲判断标准。'],
  usage:['使用倾向','写语体、常见场景、搭配限制或错误用法提醒。'],
  'visual-register-style':['语体属性','填写正式/非正式/口语/书面/学术等语体标签。'],
  'visual-register-tone':['语义气质','填写褒贬、强弱、委婉/直接、客观/情绪化等感受。'],
  'visual-register-environment':['使用环境','说明常出现在哪些场景、文本类型或对话关系中。'],
};
const DEFAULT_API_PROFILE={id:'default',name:'默认配置',apiUrl:'',apiKey:'',model:''};
const DEFAULT_SETTINGS={apiUrl:'',apiKey:'',model:'',activeApiProfileId:'default',apiProfiles:[DEFAULT_API_PROFILE],labelMode:'zh',fontMode:'system',historyTimeMode:'created',visualHintsPinned:false,modelPrompt:''};
const LOOKUP_MAX_ATTEMPTS=2;
const APP_INFO={
  name:'ai-vocab-tool',
  version:'0.10.5',
  releaseDate:'2026-07-14',
  site:'https://ai-vocab-tool.vercel.app',
  repo:'https://github.com/SuperFly233/ai-vocab-tool',
};
const CHANGELOG=[
  {
    version:'0.10.5',
    date:'2026-07-14',
    title:'新增历史 JSON 导入合并',
    items:['设置页数据区新增历史 JSON 导入，支持粘贴数组、raw 字符串或 Supabase value.raw 格式。','导入前会预检当前历史与导入历史的新增、重叠、可更新和重复数量，确认后再合并导入并同步云端。'],
  },
  {
    version:'0.10.4',
    date:'2026-07-14',
    title:'修复历史记录 120 条上限',
    items:['移除历史保存和云同步合并里的 120 条截断，历史总数会按真实存储数量显示。','历史列表仍保留分批渲染和继续加载按钮，避免大量记录一次性渲染导致滚动卡顿。'],
  },
  {
    version:'0.10.3',
    date:'2026-07-14',
    title:'修复可视化提示常驻开关',
    items:['修复可视化编辑提示的常驻显示开关被云端旧值粘住的问题，关闭后再次进入编辑页会恢复为聚焦气泡。','设置同步合并改为按本地未同步修改或更新时间决定开关状态，不再把曾经开启过的 true 当成永久优先。'],
  },
  {
    version:'0.10.2',
    date:'2026-07-14',
    title:'修正历史详情编辑区顶部显示',
    items:['恢复历史详情弹窗顶部标题、时间和操作按钮的原有显示方式，可视化编辑和 JSON 编辑时也保持一致。','取消滚动后额外出现的压缩信息浮块，避免它挤占编辑区域并重复展示词条摘要。'],
  },
  {
    version:'0.10.1',
    date:'2026-07-14',
    title:'补齐可视化填写提示与历史搜索范围',
    items:['可视化编辑不再只显示顶部横条说明，字段聚焦时会在对应输入框旁弹出具体填写规则，气泡可临时关闭。','设置页新增可视化填写提示常驻选项，需要时可把字段说明直接固定显示在每个输入项下方。','历史搜索框右侧新增搜索范围选择器，可限定只搜词条、释义、例句、搭配、辨析或其他信息，避免只想搜单词时被例句命中。','可视化编辑和 JSON 编辑模式下隐藏顶部标题信息块，让编辑区域更干净。'],
  },
  {
    version:'0.10.0',
    date:'2026-07-14',
    title:'纠正历史排序并升级编辑体验',
    items:['移除历史筛选区误加的创建/修改日期范围输入，保持筛选区简洁。','历史排序拆成“修改”和“创建”两个明确按钮，不再用含糊的“时间”按钮；历史时间外显偏好只保留在设置里。','创建时间和修改时间一致时只显示一个裸时间；不一致时按设置明确显示创建、修改或全部。','修复较长 translationHighlights 被截掉的问题，让“开发一款人工智能词汇工具”这类整段译文高亮能正常命中。','可视化编辑补齐例句/译文高亮、语义感受和近义/易混词，并支持义项、搭配和易混词上移下移或拖拽排序。','设置页大模块支持折叠，模型 Prompt 工作区撑满宽度；API 配置下拉固定在当前配置条附近，并支持配置顺序调整。'],
  },
  {
    version:'0.9.53',
    date:'2026-07-14',
    title:'优化历史时间显示与筛选',
    items:['修复重复排队去重里调用了不存在函数导致非空查询无反应的问题；查询入口现在也会把异常明确提示出来。','历史列表和详情页不会再把创建时间与修改时间相同的记录标成“已编辑”，只有真实修改后才显示已编辑时间。','设置页新增历史时间显示偏好，可选择默认展示创建时间、修改时间或全部时间；详情弹窗顶部也可直接切换。','历史页新增创建日期和修改日期范围筛选，方便按记录生成时间或后续编辑时间查找。','历史详情滚动时会保留压缩吸顶信息条，版本切换和重新生成按钮会缩小但不消失；API 配置弹窗有草稿时点击遮罩不会误关。'],
  },
  {
    version:'0.9.52',
    date:'2026-07-14',
    title:'优化 Prompt 工作区并修复重复排队',
    items:['设置页的模型 Prompt 专区改成实现路径 + 编辑工作区，直接展示输入、前端请求、system prompt、模型 JSON 和校验渲染的前后逻辑。','Prompt 编辑器改为更宽的工作台布局，并显示当前来源、默认长度和编辑状态，避免窄高输入框占着大片空白。','查询队列会识别正在执行或已经排队的相同请求，重复点击搜索不会继续堆出多条相同队列。','例句高亮支持 ~ / ～ 形式的搭配占位符，会把词条里的有效片段用于匹配实际例句。'],
  },
  {
    version:'0.9.51',
    date:'2026-07-14',
    title:'新增模型 Prompt 设置专区',
    items:['设置页新增模型 Prompt 专区，可查看默认查询 prompt、复制当前内容、保存自定义覆盖版或恢复默认。','自定义 prompt 会随 settings 云端同步；留空时继续使用内置默认 prompt，避免误改后影响查询。','查询请求会把自定义 system prompt 发送给 /api/analyze，默认 prompt 仍由后端统一维护并通过 /api/config 暴露给前端查看。'],
  },
  {
    version:'0.9.50',
    date:'2026-07-14',
    title:'补回译文对应高亮但避免杂项污染',
    items:['例句高亮继续只围绕查询词本身及模型给出的实际词形，不再高亮上下文里的其它内容。','译文行会高亮当前义项或搭配对应的中文表达，例如“除了”“除此之外”“完全撇开 / 不谈”，但不会把成本、可行等上下文词一起标出来。','新增更明确的 exampleHighlights / translationHighlights 输出约定，用来兼容英语、中文、法语、德语等不同语言里的词形或译文对应变化。'],
  },
  {
    version:'0.9.49',
    date:'2026-07-14',
    title:'重做左右布局的宽屏工作台',
    items:['左右布局改为真正的宽屏工作台：左侧用于长输入和侧重点，右侧保留结果阅读空间，避免只是把顶部布局硬拆成两栏。','左侧输入框不再被固定高度卡死，可以拖拽调整；查询按钮移到输入控制区底部，整体操作顺序更自然。','侧重点在左右布局里只保留一个字段，不再出现两个旧输入框并排挤在底部的古早样式。'],
  },
  {
    version:'0.9.48',
    date:'2026-07-14',
    title:'收窄结果高亮并固定首页查询区',
    items:['结果高亮只使用当前查询词条本身及其常见英文词形变化，不再把义标、语意或模型给出的杂项词组一起高亮。','高亮只出现在例句和译文行，语意说明保持纯文本，避免阅读时出现一片零散标记。','首页标题和查询区滚动时保持置顶，并在滚动后自动压缩高度；点击查询输入区会回到顶部并聚焦输入。'],
  },
  {
    version:'0.9.47',
    date:'2026-07-14',
    title:'优化结果高亮的词形与译文对应',
    items:['英文高亮会识别常见屈折变化，像 transpire / transpired / transpiring 会作为完整单词一起包住，不再只高亮半截词干。','义项和搭配支持可选 highlightTerms，模型可以把译文里实际对应的中文表达写进 JSON，避免 shortestLabel 与译文措辞不一致时漏高亮。','结果渲染会合并词条、义标、语意和 highlightTerms 做去重匹配，保留旧历史的兼容兜底。'],
  },
  {
    version:'0.9.46',
    date:'2026-07-14',
    title:'为 Cloudflare 版增加 IPv4 relay 兜底',
    items:['当模型供应商返回“正在使用 IPv6 访问”一类 HTML 拦截页时，服务端会自动把 analyze、followup、models 和 test-profile 请求转发到配置的 IPv4 relay。','Cloudflare 版可把 AI_IPV4_RELAY_BASE_URL 指向 Vercel 版域名，浏览器仍然全程访问 Cloudflare，但模型请求可借用 Vercel 的 IPv4 出口。','/api/config 会返回 hasIpv4Relay，便于确认当前部署是否启用了 IPv4 relay。'],
  },
  {
    version:'0.9.45',
    date:'2026-07-14',
    title:'新增 Cloudflare Pages 双部署支持',
    items:['新增 Cloudflare Pages Functions 适配层，复用现有 Vercel API handler 覆盖 analyze、followup、sync、models、test-profile 和 config。','新增 build:pages 构建脚本，只把公开静态资源复制到 dist，避免 Cloudflare Pages 直接公开仓库辅助文件。','补充 wrangler.toml 与 package.json，Cloudflare 版可继续使用同一个 Supabase study_store 数据库和同源 /api/* 调用。'],
  },
  {
    version:'0.9.44',
    date:'2026-07-14',
    title:'修复流式查询时的排队输入',
    items:['查询进行中清空主输入框不再触发 resetCurrentLookupState，因此不会意外取消当前流式查询或清空等待队列。','队列里的下一条开始执行时会同步回主输入、方向和备注字段，用户能看清当前正在处理哪条。','查询忙碌时遇到已有历史记录会直接加入队列并保留 existingId，不再弹确认框打断连续排队。'],
  },
  {
    version:'0.9.43',
    date:'2026-07-13',
    title:'回退主查询频繁重启动画',
    items:['取消主查询流式预览里的块级上浮动画，避免模型 delta 频繁刷新时所有区块反复浮动。','追问生成中的正文也不再反复触发入场动画，仅保留轻量光标和 pending 状态，优先保证阅读稳定。'],
  },
  {
    version:'0.9.42',
    date:'2026-07-13',
    title:'压缩移动端历史页并柔化流式动效',
    items:['历史记录在手机上默认收起高级筛选，只保留范围、搜索、筛选摘要和横向排序条，减少首屏控件占用。','历史条目移动端改为内容优先、按钮置底，避免右侧动作按钮把词条摘要挤成窄列。','历史列表改为分批渲染并在接近底部时继续加载，降低大量记录时的滚动压力；主查询和追问流式内容增加透明度与轻微上浮缓动。'],
  },
  {
    version:'0.9.41',
    date:'2026-07-13',
    title:'主查询改为真实流式生成',
    items:['主查询请求现在会向 /api/analyze 发送 stream:true，服务端按 OpenAI-style SSE 转发模型 delta，不再等完整 JSON 才返回。','前端会边接收边显示原始 JSON，并从已生成文本中提取 headword、义项、搭配、语感和易混块做实时预览。','模型结束后服务端仍会执行完整 JSON 校验和必要修复，历史保存只使用最终校验后的结构化结果。'],
  },
  {
    version:'0.9.40',
    date:'2026-07-13',
    title:'修复移动端追问表格溢出',
    items:['追问回答的普通正文在手机端进一步收紧字号和行高，避免比表格内容显得更大。','Markdown 表格现在被限制在自己的横向滚动容器内，不再把整段追问回答撑成一个可左右拖动的大块。','表格单元格里的 <br> 会渲染为真正换行，不再把标签文本显示出来。'],
  },
  {
    version:'0.9.39',
    date:'2026-07-13',
    title:'重做主查询生成反馈',
    items:['API 配置菜单改为 fixed 顶层浮层，移动端会避开底部导航，避免被主题、布局或导航按钮压住。','主查询等待期会先展示词条头、义项、搭配、语感、易混和相关记录等骨架块，并在角落显示估算百分比。','真实结果返回后会按结构块渐变接管并逐字显示内容，JSON 页也会逐段逐字揭示最终校验后的 JSON。'],
  },
  {
    version:'0.9.38',
    date:'2026-07-13',
    title:'升级主查询分块打字机',
    items:['主查询结果不再只是整页文本顺序揭示，而是按词条头、义项、搭配、语感、易混和相关记录等结构块分段出现。','每个结构块会先淡入，再逐字显示块内文本；追问面板和控件继续排除在主查询打字机之外。','保留完整 JSON 校验后再渲染的策略，避免半截 JSON 破坏词条结构或保存历史。'],
  },
  {
    version:'0.9.37',
    date:'2026-07-13',
    title:'收敛 API 配置菜单并加入主结果打字机',
    items:['API 配置外层只保留当前配置名称和下拉箭头，新增、选择、编辑、删除都收进下拉菜单，测试连接移入新增/编辑弹窗。','词条结果顶部把核心义单独突出为一行，类型、词性和方向合并为同一行辅助信息。','主查询结果在 JSON 校验完成后会逐字揭示结构化词条内容；手机端追问正文缩小并收紧行高。'],
  },
  {
    version:'0.9.36',
    date:'2026-07-13',
    title:'新增 API 配置连接测试',
    items:['设置页当前 API 配置卡片新增“测试连接”，可用极小请求验证 URL、Key、Model 或环境变量配置是否可用。','新增 /api/test-profile 端点，复用管理员环境变量权限校验，并返回连接耗时与明确失败原因。','当前配置卡片会显示尚未测试、测试中、连接正常或连接失败状态，减少配置后不知道是否生效的盲区。'],
  },
  {
    version:'0.9.35',
    date:'2026-07-13',
    title:'新增追问流式输出',
    items:['追问回答优先使用 SSE 流式返回，模型生成时会实时更新 pending 回答卡片，降低等待时的空白感。','/api/followup 兼容 OpenAI-style stream 数据，并保留普通 JSON 返回路径，避免不支持流的接口直接失效。','生成中的追问卡片新增轻量光标动效，最终回答仍会保存到对应历史记录并参与云端同步。'],
  },
  {
    version:'0.9.34',
    date:'2026-07-13',
    title:'优化移动端 Markdown 表格',
    items:['追问回答里的 Markdown 表格会按列数使用更稳的最小列宽，手机上多列表格改为横向滚动而不是把每列压得过扁。','表格容器限制在回答区域内并启用触摸惯性滚动，少列表格保持铺满，多列表格保持可读。','补齐窄屏样式，避免表格撑破页面或在历史详情里挤压其它内容。'],
  },
  {
    version:'0.9.33',
    date:'2026-07-13',
    title:'新增标签管理面板',
    items:['设置页“数据”区域新增标签管理，可汇总查看所有 Tag 及对应历史数量。','标签可一键跳转到历史筛选，也支持批量重命名和从全部历史中移除。','重命名和移除会更新相关历史记录并随云端同步，补齐 Tag 整理闭环。'],
  },
  {
    version:'0.9.32',
    date:'2026-07-13',
    title:'新增查询自动重试',
    items:['查询遇到网络失败、超时、429 或 5xx 这类可恢复错误时，会自动重试一次。','重试等待中会在结果区显示失败原因和下一次尝试状态，避免只看到卡住。','配置、权限、JSON 格式等不可恢复错误不会盲目重试，减少无意义 API 消耗。'],
  },
  {
    version:'0.9.31',
    date:'2026-07-13',
    title:'新增查询队列',
    items:['查询进行中再次提交会加入等待队列，不再被直接忽略。','队列支持上移、下移、插队到最前和移除，当前查询完成后会自动执行下一条。','队列会保留提交时的语言方向和侧重点，清空输入时也会同步清空等待队列。'],
  },
  {
    version:'0.9.30',
    date:'2026-07-13',
    title:'新增字体风格偏好',
    items:['设置页“外观”新增字体风格，可在系统默认、无衬线、衬线和等宽之间切换。','字体偏好写入 settings 并随云端同步，多设备会保持一致。','字体切换通过全站 CSS 变量生效，JSON、代码和密钥字段继续使用等宽字体。'],
  },
  {
    version:'0.9.29',
    date:'2026-07-13',
    title:'补齐站点图标',
    items:['新增与侧边栏品牌一致的 SVG favicon，浏览器标签页会显示“词”字放大镜徽标。','页面头部补充 theme-color、favicon 和 manifest 引用，为后续多项目统一图标打底。','站点 manifest 使用同一图标和品牌色，提升移动端添加到主屏幕时的识别度。'],
  },
  {
    version:'0.9.28',
    date:'2026-07-13',
    title:'新增单词/词组类型层',
    items:['查询结果会自动标记 meta.entryType 为 word 或 phrase，用于区分单词和词组/表达。','结果页和历史列表会显示“单词/词组”类型，历史筛选也新增类型多选。','历史可视化编辑支持修改词条类型，旧历史会根据查询文本自动推断，不需要手动迁移。'],
  },
  {
    version:'0.9.27',
    date:'2026-07-13',
    title:'新增词条可视化编辑',
    items:['历史详情新增“可视化编辑”页，可直接修改词条标题、核心义、摘要、词性、语言和方向。','义项和固定搭配支持表单编辑，并可新增或删除条目。','可视化编辑保存时会同步更新 JSON、历史标题与预览，原始 JSON 编辑模式仍完整保留。','移动端追问表格会按列数调整单列宽度，避免多列表格被压扁或横向过宽。'],
  },
  {
    version:'0.9.26',
    date:'2026-07-13',
    title:'新增备注 Markdown 工具条',
    items:['历史备注编辑区新增加粗、列表、引用、代码和表格快捷按钮。','按钮会尽量复用当前选区：有选中文字时包裹格式，没有选区时插入可直接填写的模板。','插入后会保持焦点并把光标放回备注框，减少手写 Markdown 的操作成本。'],
  },
  {
    version:'0.9.25',
    date:'2026-07-13',
    title:'新增历史标签筛选',
    items:['历史筛选区新增 Tag 多选筛选，可按个人标签快速收拢词条。','历史列表里的标签可直接点击筛选，并保持原有整条记录点击打开详情的行为。','历史筛选摘要、清空和搜索状态会把 Tag 纳入统一判断。'],
  },
  {
    version:'0.9.24',
    date:'2026-07-13',
    title:'新增历史标签与备注',
    items:['历史详情编辑页新增标签和备注字段，可给词条补充个人整理信息。','历史列表和结果预览会显示已保存的标签与备注，搜索历史时也会纳入匹配。','云同步合并历史时会保留两端标签，并通过 noteUpdatedAt 正确同步备注修改或清空。'],
  },
  {
    version:'0.9.23',
    date:'2026-07-13',
    title:'新增相关历史词条跳转',
    items:['结果页会根据当前查询和已有历史记录自动显示相关词条，支持单词与包含它的词组互相跳转。','相关词条卡片会展示核心释义、词性和方向摘要，点击即可打开对应历史详情。','当前词条会被排除在相关列表之外，避免历史详情里出现自我引用。'],
  },
  {
    version:'0.9.22',
    date:'2026-07-13',
    title:'新增标签显示偏好',
    items:['设置页新增“字段标签显示”，可在中文名称、英文缩写和中英双语之间切换。','历史筛选、历史摘要、词性分组、词条标题区和语体说明会统一使用当前显示偏好。','API 配置保存与清空逻辑会保留显示偏好，避免非接口设置被误重置。'],
  },
  {
    version:'0.9.21',
    date:'2026-07-13',
    title:'优化历史摘要与结果高亮',
    items:['历史记录列表新增核心释义、词性和方向摘要，减少只看词条名时的信息盲区。','查询结果的例句、译文和义项说明会高亮当前词条与对应义标，更容易对上原词和中文含义。','手动清空查询输入时会同步清空当前结果与状态；Markdown 表格继续保持横向滚动，避免手机窄屏多列内容被压扁。'],
  },
  {
    version:'0.9.20',
    date:'2026-07-02',
    title:'补齐追问 Markdown 表格',
    items:['追问回答新增 GitHub 风格 Markdown 表格渲染，支持表头、分隔行和多行数据。','表格单元格继续支持行内 code、链接、粗体、斜体和删除线。','表格样式使用横向滚动容器，避免手机窄屏挤压或溢出页面。'],
  },
  {
    version:'0.9.19',
    date:'2026-07-02',
    title:'完善追问 Markdown 渲染',
    items:['追问回答新增 > 引用块渲染，显示为带左侧强调线的引用版式。','追问回答补齐 fenced code block、分隔线、链接、删除线、下划线粗体/斜体等常见 Markdown 规则。','Markdown 渲染改为逐行解析，减少标题、列表、引用和普通段落之间的误判。'],
  },
  {
    version:'0.9.18',
    date:'2026-06-29',
    title:'加固手机端同步 token 获取',
    items:['同源同步兜底会优先读取 Supabase 本地 session token，避免手机端 getSession 刷新会话时再次触发 Load failed。','保留 SDK getSession 作为后备路径，登录会话有效时可稳定调用 /api/sync。','用 mock Supabase 跑通 /api/sync 的 select 和 upsert 流程，确认服务端兜底可读写允许的 ai_vocab_tool_* key。'],
  },
  {
    version:'0.9.17',
    date:'2026-06-29',
    title:'增加手机端同步兜底代理',
    items:['云同步直连 Supabase REST 遇到 TypeError Load failed / Failed to fetch 时，会自动改走本站同源 /api/sync。','新增 Vercel 同步代理，由服务端携带当前用户 token 读写 public.study_store，减少手机浏览器跨域网络失败。','本机保存和首次登录合并同步都会复用同一套直连优先、同源兜底的读写逻辑。'],
  },
  {
    version:'0.9.16',
    date:'2026-06-29',
    title:'修复登录后云同步卡住',
    items:['拆分云同步读写锁和界面忙碌状态，登录时显示“正在登录”不会再阻塞后续同步。','同步读写增加 try/catch/finally 防护，失败后会释放锁并继续处理排队的保存任务。','同步错误会提示 study_store 表、RLS 权限、登录会话或网络连接等具体排查方向。'],
  },
  {
    version:'0.9.15',
    date:'2026-04-29',
    title:'按词性分组义项',
    items:['查询结果的义项分析会先按词性分组，再在每个词性下重新编号。','词条标题区会从 headword 和 senses 归纳多个词性，不再只显示单个词性。','AI 输出规则改为允许 headword.basicPartOfSpeech 用斜杠记录多个固定词性枚举。'],
  },
  {
    version:'0.9.14',
    date:'2026-04-29',
    title:'重做收藏历史金色特效',
    items:['补齐收藏样式使用的金色主题变量，避免高亮和发光效果失效。','收藏历史卡片改为金色描边、流光扫过和细星芒背景，保留特殊感但不遮挡右侧操作。','收藏按钮改成更明确的金色发光状态，让收藏条目一眼可见。'],
  },
  {
    version:'0.9.13',
    date:'2026-04-29',
    title:'修复 API 配置保存覆盖',
    items:['保存 API 配置时不再让旧版顶层字段覆盖当前 profile，新增和编辑的名称、URL、Key、Model 会正确保留。','配置列表会合并完全重复的 profile，清理此前反复保存产生的默认配置重复项。','弹窗保存只写入 profile 数据和当前选中项，避免把旧 active profile 的兼容字段再次带回存储。'],
  },
  {
    version:'0.9.12',
    date:'2026-04-28',
    title:'修复首页布局默认保存',
    items:['启动时会把首页布局默认值写入本地设置，确保“顶部/左右”总有一个处于选中状态。','云端同步恢复布局后会重新规范化空值，避免空布局覆盖本地默认。','首次初始化默认布局会标记云端同步，确保布局偏好可跨设备保存。'],
  },
  {
    version:'0.9.11',
    date:'2026-04-28',
    title:'加固 API 配置保存反馈',
    items:['API 配置保存改为 try/catch 防护，成功和失败都用统一 toast 反馈。','保存弹窗不再停留在“正在保存”状态；本地保存成功后立即关闭弹窗。','云同步改为保存后的后台动作，避免同步链路影响配置保存体验。'],
  },
  {
    version:'0.9.10',
    date:'2026-04-28',
    title:'优化收藏历史与筛选多选',
    items:['收藏历史改成更精致的金色高亮、细光边和柔和背景，不再显得粗糙。','修复历史筛选点击选项后菜单被全局点击处理关闭的问题，多选时菜单会保持展开。'],
  },
  {
    version:'0.9.9',
    date:'2026-04-28',
    title:'修复配置弹窗保存与密码提示',
    items:['API 配置弹窗按钮改为显式事件绑定，保存配置不再依赖内联点击处理。','API Key 输入框改为非密码字段并关闭自动填充提示，减少和登录密码管理冲突。','登录邮箱和密码字段补充标准 autocomplete，帮助浏览器区分账号登录和 API 密钥。'],
  },
  {
    version:'0.9.8',
    date:'2026-04-28',
    title:'重做配置弹窗与历史筛选',
    items:['API 配置外层只保留当前配置选择，新增和编辑改为弹窗填写名称、URL、Key 和 Model。','删除配置和清空全部配置逻辑重新整理，最后一组也会清回默认空配置。','历史筛选改成自制多选菜单，每个分类可自由单选或多选，默认状态用短横摘要。'],
  },
  {
    version:'0.9.7',
    date:'2026-04-28',
    title:'重做 API 配置组入口',
    items:['自定义 API 配置组不再使用原生选择器，改为当前配置卡片和自制切换菜单。','新增、保存、删除和恢复默认拆成明确按钮，避免把危险操作藏在下拉选项里。','配置列表会显示每组是否完整，以及当前使用的模型或环境默认模型。'],
  },
  {
    version:'0.9.6',
    date:'2026-04-28',
    title:'整理历史筛选与收藏样式',
    items:['历史筛选改为紧凑下拉，不再占用大块列表空间。','排序按钮改为更窄的工具条样式，减少历史页顶部拥挤感。','收藏历史只保留轻量高亮和按钮状态，去掉遮挡操作区的大星水印。'],
  },
  {
    version:'0.9.5',
    date:'2026-04-28',
    title:'修复 toast 进度与加载态',
    items:['重复触发同一条 toast 时会重置关闭计时和底部进度条动画。','手动关闭 toast 时会清理对应计时器。','查询加载态去掉圆形 spinner，只保留更清爽的直线进度条。'],
  },
  {
    version:'0.9.4',
    date:'2026-04-27',
    title:'精简 API 配置管理',
    items:['设置页移除环境变量状态卡，减少无用信息干扰。','API 配置组操作改为新增、保存修改、删除当前。','恢复默认移入配置下拉菜单，配置管理更集中。'],
  },
  {
    version:'0.9.3',
    date:'2026-04-27',
    title:'规范历史筛选字段',
    items:['历史筛选改为多选，并将语言、方向、词性和语体归一化。','排序按钮文字和箭头保持居中，移动端筛选控件宽度更统一。','强化清空历史的二次确认文案。'],
  },
  {
    version:'0.9.2',
    date:'2026-04-27',
    title:'增强收藏历史辨识度',
    items:['在全部历史视图中，已收藏条目会显示更醒目的背景和左侧高亮。','收藏条目保留星标按钮，同时用卡片质感体现特殊状态。','收藏筛选视图保持克制，避免整页高亮过载。'],
  },
  {
    version:'0.9.1',
    date:'2026-04-27',
    title:'优化首页聚焦体验',
    items:['左上角品牌区新增可点击的网页图标。','进入主界面、点击品牌或首页按钮时自动聚焦搜索框。','减少查词前的额外点击，直接输入或回车即可开始查询。'],
  },
  {
    version:'0.9.0',
    date:'2026-04-27',
    title:'新增多组 API 配置同步',
    items:['设置页支持保存多组 API URL、API Key 和 Model。','可选择当前使用的 API 配置组，旧单组配置会自动迁移。','云同步会合并多设备 API 配置组，减少新设备拿不到模型设置的问题。'],
  },
  {
    version:'0.8.1',
    date:'2026-04-27',
    title:'优化右上角通知弹窗',
    items:['通知弹窗新增手动关闭按钮。','重做 toast 视觉层次、状态色、进度条和进入/退出动效。','通知仍会自动消失，但用户可以立即关闭当前消息。'],
  },
  {
    version:'0.8.0',
    date:'2026-04-27',
    title:'修复无感云端同步',
    items:['历史、收藏、API 设置、主题、布局和运行日志都进入 Supabase 同步。','登录后自动合并本机与云端数据，并在页面聚焦或回到前台时静默拉取更新。','新增项目上下文记录，方便新对话继续接手当前进度。'],
  },
  {
    version:'0.7.0',
    date:'2026-04-25',
    title:'新增词条追问对话',
    items:['结果页下方支持基于当前词条继续追问。','追问回答会保存进对应历史记录，并可在历史详情中继续查看。','追问支持卡片内编辑和删除。'],
  },
  {
    version:'0.6.0',
    date:'2026-04-25',
    title:'优化查询反馈、历史编辑和结果排版',
    items:['首页输入框取消伸缩特效，支持回车快速查询。','历史记录整块可点击进入详情，并保留删除按钮独立操作。','结果排版和 JSON 视图重做层级，减少全局粗体，突出义项、词性和重点内容。'],
  },
  {
    version:'0.5.0',
    date:'2026-04-25',
    title:'统一本地交互与设置体验',
    items:['首页输入区改为主输入框右侧工具按钮。','历史清空改为垃圾桶图标，单条删除保留 X。','新增自定义接口配置、恢复默认、运行日志和关于页。'],
  },
  {
    version:'0.4.0',
    date:'2026-04-25',
    title:'历史搜索与结果布局优化',
    items:['增强历史记录搜索和排序。','优化结果卡片与 JSON 查看体验。','加入云端设置同步。'],
  },
];

const els={
  authStatus:document.getElementById('auth-status'),
  accountPanel:document.getElementById('account-panel'),
  accountToggle:document.getElementById('account-toggle'),
  accountStatus:document.getElementById('account-status'),
  accountSyncStatus:document.getElementById('account-sync-status'),
  query:document.getElementById('query-input'),
  direction:document.getElementById('direction-input'),
  note:document.getElementById('note-input'),
  resultCard:document.getElementById('result-card'),
  resultJson:document.getElementById('result-json'),
  lookupQueue:document.getElementById('lookup-queue'),
  historyModal:document.getElementById('history-modal'),
  modalTitle:document.getElementById('modal-title'),
  modalSubtitle:document.getElementById('modal-subtitle'),
  historyModalBody:document.getElementById('history-modal-body'),
  modalRollbar:document.getElementById('modal-rollbar'),
  modalStickySummary:document.getElementById('modal-sticky-summary'),
  modalCardPage:document.getElementById('modal-card-page'),
  modalVisualPage:document.getElementById('modal-visual-page'),
  modalVisualEditor:document.getElementById('modal-visual-editor'),
  modalJsonPage:document.getElementById('modal-json-page'),
  modalQueryEdit:document.getElementById('modal-query-edit'),
  modalTagsEdit:document.getElementById('modal-tags-edit'),
  modalNoteEdit:document.getElementById('modal-note-edit'),
  modalJsonEdit:document.getElementById('modal-json-edit'),
  modalJsonStatus:document.getElementById('modal-json-status'),
  workspace:document.getElementById('workspace'),
  layoutTopBtn:document.getElementById('layout-top-btn'),
  layoutSplitBtn:document.getElementById('layout-split-btn'),
  labelModeZhBtn:document.getElementById('label-mode-zh'),
  labelModeCodeBtn:document.getElementById('label-mode-code'),
  labelModeBothBtn:document.getElementById('label-mode-both'),
  fontModeSystemBtn:document.getElementById('font-mode-system'),
  fontModeSansBtn:document.getElementById('font-mode-sans'),
  fontModeSerifBtn:document.getElementById('font-mode-serif'),
  fontModeMonoBtn:document.getElementById('font-mode-mono'),
  timeModeCreatedBtn:document.getElementById('time-mode-created'),
  timeModeUpdatedBtn:document.getElementById('time-mode-updated'),
  timeModeBothBtn:document.getElementById('time-mode-both'),
  visualHintsPinnedInput:document.getElementById('visual-hints-pinned'),
  historyList:document.getElementById('history-list'),
  historyCount:document.getElementById('history-count'),
  historyTools:document.getElementById('history-tools'),
  historySearch:document.getElementById('history-search'),
  historyClearBtn:document.getElementById('history-clear-btn'),
  historyImportText:document.getElementById('history-import-text'),
  historyImportStatus:document.getElementById('history-import-status'),
  historySearchScope:document.getElementById('history-search-scope'),
  historySearchScopeToggle:document.getElementById('history-search-scope-toggle'),
  historySearchScopeSummary:document.getElementById('history-search-scope-summary'),
  historySearchScopeMenu:document.getElementById('history-search-scope-menu'),
  historyFilterToggle:document.getElementById('history-filter-toggle'),
  historyFilterSummary:document.getElementById('history-filter-summary'),
  historyFilterbar:document.getElementById('history-filterbar'),
  historySortbar:document.getElementById('history-sortbar'),
  historyScope:document.getElementById('history-scope'),
  tagManager:document.getElementById('tag-manager'),
  apiProfilePicker:document.getElementById('api-profile-picker'),
  apiProfileMenu:document.getElementById('api-profile-menu'),
  apiProfileMenuToggle:document.getElementById('api-profile-menu-toggle'),
  apiProfileCurrentName:document.getElementById('api-profile-current-name'),
  apiProfileModal:document.getElementById('api-profile-modal'),
  apiProfileModalTitle:document.getElementById('api-profile-modal-title'),
  apiProfileModalSubtitle:document.getElementById('api-profile-modal-subtitle'),
  apiModalName:document.getElementById('api-modal-name'),
  apiModalUrl:document.getElementById('api-modal-url'),
  apiModalKey:document.getElementById('api-modal-key'),
  apiModalModel:document.getElementById('api-modal-model'),
  apiModelList:document.getElementById('api-model-list'),
  apiModelFetchBtn:document.getElementById('api-model-fetch-btn'),
  apiProfileModalStatus:document.getElementById('api-profile-modal-status'),
  apiProfileModalTest:document.getElementById('api-profile-modal-test'),
  apiProfileModalSave:document.getElementById('api-profile-modal-save'),
  apiProfileModalCancel:document.getElementById('api-profile-modal-cancel'),
  apiProfileModalClose:document.getElementById('api-profile-modal-close'),
  modelPromptEditor:document.getElementById('model-prompt-editor'),
  modelPromptStatus:document.getElementById('model-prompt-status'),
  modelPromptSource:document.getElementById('model-prompt-source'),
  modelPromptMetaSource:document.getElementById('model-prompt-meta-source'),
  modelPromptDefaultSize:document.getElementById('model-prompt-default-size'),
  modelPromptEditSize:document.getElementById('model-prompt-edit-size'),
  storageStatus:document.getElementById('storage-status'),
  settingsSyncStatus:document.getElementById('settings-sync-status'),
  logList:document.getElementById('log-list'),
  aboutContainer:document.getElementById('about-container'),
  clearQueryBtn:document.getElementById('clear-query-btn'),
  confirmLayer:document.getElementById('confirm-layer'),
  confirmTitle:document.getElementById('confirm-title'),
  confirmMessage:document.getElementById('confirm-message'),
  confirmCancel:document.getElementById('confirm-cancel'),
  confirmOk:document.getElementById('confirm-ok'),
};

function readJSON(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw?JSON.parse(raw):fallback;
  }catch{
    return fallback;
  }
}
function writeJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
function escapeHTML(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function escapeAttr(value){
  return escapeHTML(value).replace(/`/g,'&#96;');
}
function notify(message,type='info',title='ai-vocab-tool',record=true){
  if(record)pushLog(message,type,title);
  const key=`${type}|${title}|${message}`;
  const existing=activeToasts.get(key);
  if(existing?.element?.isConnected){
    if(existing.element.classList.contains('leaving')){
      clearTimeout(existing.timer);
      existing.element.remove();
      activeToasts.delete(key);
    }else{
      existing.count+=1;
      existing.element.querySelector('.toast-count').textContent=`×${existing.count}`;
      existing.element.classList.add('counted');
      existing.element.classList.remove('bump');
      void existing.element.offsetWidth;
      existing.element.classList.add('bump');
      armToastTimer(key,existing);
      return;
    }
  }
  const toast=document.createElement('div');
  toast.className=`toast ${type}`;
  toast.innerHTML=`
      <div class="toast-row">
        <div class="toast-mark" aria-hidden="true">${toastIcon(type)}</div>
        <div class="toast-title">${escapeHTML(title)}</div>
        <div class="toast-count" aria-live="polite"></div>
        <button class="toast-close" type="button" aria-label="关闭通知">×</button>
    </div>
    <div class="toast-msg">${escapeHTML(message)}</div>
    <div class="toast-progress" aria-hidden="true"></div>
  `;
  document.getElementById('toast-stack').appendChild(toast);
  toast.querySelector('.toast-close')?.addEventListener('click',()=>dismissToast(key));
  const state={element:toast,count:1,timer:null};
  activeToasts.set(key,state);
  armToastTimer(key,state);
}
function restartToastProgress(toast){
  const progress=toast?.querySelector('.toast-progress');
  if(!progress)return;
  progress.style.animation='none';
  void progress.offsetWidth;
  progress.style.animation='';
}
function armToastTimer(key,state,duration=3200){
  clearTimeout(state.timer);
  restartToastProgress(state.element);
  state.timer=setTimeout(()=>dismissToast(key),duration);
}
function toastIcon(type){
  if(type==='good')return '✓';
  if(type==='bad')return '!';
  if(type==='warn')return '!';
  return 'i';
}
function dismissToast(key){
  const toastState=activeToasts.get(key);
  const toast=toastState?.element;
  if(!toast)return activeToasts.delete(key);
  if(toast.classList.contains('leaving'))return;
  clearTimeout(toastState.timer);
  toast.classList.add('leaving');
  toast.addEventListener('animationend',()=>{
    toast.remove();
    activeToasts.delete(key);
  },{once:true});
}
function askConfirm(message,title='确认操作'){
  if(!els.confirmLayer)return Promise.resolve(false);
  resetConfirmUI();
  els.confirmTitle.textContent=title;
  els.confirmMessage.textContent=message;
  els.confirmLayer.classList.add('open');
  return new Promise(resolve=>{confirmResolver=resolve});
}
function closeConfirm(result=false){
  els.confirmLayer?.classList.remove('open');
  if(confirmResolver)confirmResolver(result);
  confirmResolver=null;
}
function resetConfirmUI(){
  const card=document.getElementById('confirm-card');
  card?.classList.remove('sync-card');
  document.getElementById('sync-merge')?.remove();
  if(els.confirmLayer)els.confirmLayer.onclick=null;
  if(els.confirmOk){
    els.confirmOk.textContent='确认';
    els.confirmOk.className='danger-btn';
    els.confirmOk.onclick=null;
  }
  if(els.confirmCancel){
    els.confirmCancel.textContent='取消';
    els.confirmCancel.onclick=null;
  }
}
function getLogs(){return readJSON(STORAGE_KEYS.logs,[])}
function setLogs(items){
  writeJSON(STORAGE_KEYS.logs,items.slice(0,80));
  markCloudDirty(CLOUD_KEYS.logs);
  renderLogs();
  syncAllToCloud(true);
}
function pushLog(message,type='info',title='ai-vocab-tool'){
  const logs=getLogs();
  logs.unshift({id:Date.now(),time:new Date().toISOString(),type,title,message});
  writeJSON(STORAGE_KEYS.logs,logs.slice(0,80));
  markCloudDirty(CLOUD_KEYS.logs);
  renderLogs();
}
function clearLogs(){
  setLogs([]);
  notify('日志已清空。','good','日志',false);
}
function offlineMode(){return localStorage.getItem(STORAGE_KEYS.offline)==='1'}
function canEnterApp(){return Boolean(cloudUser)||offlineMode()}
function renderAuthGate(){
  const couldEnter=!document.body.classList.contains('auth-required');
  document.body.classList.toggle('auth-required',!canEnterApp());
  document.body.classList.toggle('offline-mode',offlineMode()&&!cloudUser);
  document.body.classList.toggle('cloud-logged-in',Boolean(cloudUser));
  document.body.classList.toggle('password-recovery',passwordRecoveryMode);
  if(els.accountToggle){
    els.accountToggle.classList.toggle('signed-in',Boolean(cloudUser));
    els.accountToggle.textContent=cloudUser?'已登录':offlineMode()?'离线':'账号';
  }
  if(els.accountStatus){
    if(cloudUser&&passwordRecoveryMode)els.accountStatus.textContent=`重设密码：${cloudUser.email}`;
    else if(cloudUser)els.accountStatus.textContent=`已登录：${cloudUser.email}`;
    else if(offlineMode())els.accountStatus.textContent='当前为离线模式';
    else els.accountStatus.textContent=cloudClient?'未登录':'Supabase 未配置';
  }
  if(els.authStatus){
    els.authStatus.textContent=cloudClient?'未登录。可以登录或离线使用。':'Supabase 未配置。可以离线使用。';
  }
  if(els.storageStatus){
    els.storageStatus.textContent=cloudUser?'localStorage + Supabase 自动同步':'localStorage，本机本浏览器记录。';
  }
  if(!couldEnter&&canEnterApp())focusQueryInput();
}
function authRedirectTo(){
  return `${location.origin}${location.pathname}`;
}
function credentials(source){
  const prefix=source==='auth'?'auth':'account';
  return {
    email:document.getElementById(`${prefix}-email`)?.value.trim()||'',
    password:document.getElementById(`${prefix}-password`)?.value||'',
  };
}
async function initCloud(){
  if(!SUPABASE_CONFIG.url||!SUPABASE_CONFIG.anonKey||!window.supabase){
    setCloudStatus('Supabase 未配置，只使用本机数据。','bad');
    renderAuthGate();
    return;
  }
  cloudClient=window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
  });
  cloudClient.auth.onAuthStateChange((_event,session)=>{
    cloudUser=session?.user||null;
    if(!cloudUser)stopCloudAutoSync();
    if(_event==='PASSWORD_RECOVERY'){
      passwordRecoveryMode=true;
      els.accountPanel?.classList.add('open');
    }
    renderAuthGate();
  });
  const params=new URLSearchParams(location.search);
  const hasAuthCallback=params.has('code')||location.hash.includes('access_token')||location.hash.includes('type=');
  if(params.has('code')){
    const {error}=await cloudClient.auth.exchangeCodeForSession(params.get('code'));
    if(!error)history.replaceState({},document.title,location.pathname);
  }
  const {data}=await cloudClient.auth.getSession();
  cloudUser=data.session?.user||null;
  renderAuthGate();
  if(cloudUser)await bootstrapCloudSync('merge',hasAuthCallback);
}
async function loginPassword(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法登录');
  const {email,password}=credentials(source);
  if(!email||!password)return notify('请输入邮箱和密码。','bad','登录失败');
  setCloudStatus('正在登录并准备同步...','info',true);
  const {data,error}=await cloudClient.auth.signInWithPassword({email,password});
  if(error){setCloudStatus(`登录失败：${error.message}`,'bad');return notify(error.message,'bad','登录失败')}
  cloudUser=data.session?.user||null;
  passwordRecoveryMode=false;
  localStorage.removeItem(STORAGE_KEYS.offline);
  renderAuthGate();
  if(cloudUser)await bootstrapCloudSync('merge',true);
}
async function signupPassword(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法注册');
  const {email,password}=credentials(source);
  if(!email||password.length<6)return notify('密码至少 6 位。','bad','注册失败');
  setCloudStatus('正在注册账号...','info',true);
  const {data,error}=await cloudClient.auth.signUp({email,password,options:{emailRedirectTo:authRedirectTo()}});
  if(error){setCloudStatus(`注册失败：${error.message}`,'bad');return notify(error.message,'bad','注册失败')}
  cloudUser=data.session?.user||cloudUser;
  passwordRecoveryMode=false;
  localStorage.removeItem(STORAGE_KEYS.offline);
  renderAuthGate();
  if(cloudUser)await bootstrapCloudSync('merge',true);
  notify(cloudUser?'注册并登录成功。':'注册邮件已发送。','good','注册');
}
async function loginMagic(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法登录');
  const {email}=credentials(source);
  if(!email)return notify('请输入邮箱。','bad','登录失败');
  const {error}=await cloudClient.auth.signInWithOtp({email,options:{emailRedirectTo:authRedirectTo()}});
  if(error)return notify(error.message,'bad','登录失败');
  notify('邮箱链接已发送。','good','检查邮箱');
}
async function resetCloudPassword(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法重置');
  const {email}=source==='current'&&cloudUser?{email:cloudUser.email}:credentials(source);
  if(!email)return notify('请输入邮箱。','bad','重置失败');
  const {error}=await cloudClient.auth.resetPasswordForEmail(email,{redirectTo:authRedirectTo()});
  if(error)return notify(error.message,'bad','重置失败');
  notify('重置邮件已发送，打开邮件后回到这里输入新密码。','good','检查邮箱');
}
async function setCloudPassword(){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法重设');
  if(!cloudUser)return notify('请先登录。','bad','还没登录');
  if(!passwordRecoveryMode){
    passwordRecoveryMode=true;
    renderAuthGate();
    notify('输入新密码后，再点一次“重设密码”。','good','准备重设密码');
    return;
  }
  const {password}=credentials('account');
  if(!password||password.length<6)return notify('请输入至少 6 位新密码。','bad','重设失败');
  const email=cloudUser.email;
  const {error}=await cloudClient.auth.updateUser({password});
  if(error)return notify(error.message,'bad','重设失败');
  const {error:logoutError}=await cloudClient.auth.signOut();
  if(logoutError)return notify(logoutError.message,'bad','验证失败');
  const {data,error:loginError}=await cloudClient.auth.signInWithPassword({email,password});
  if(loginError){
    cloudUser=null;
    passwordRecoveryMode=false;
    renderAuthGate();
    return notify(`密码已提交，但自动验证失败：${loginError.message}`,'bad','验证失败');
  }
  cloudUser=data.session?.user||null;
  passwordRecoveryMode=false;
  renderAuthGate();
  await bootstrapCloudSync('merge',true);
  notify('以后可以直接用新密码登录。','good','密码已重设');
}
async function logoutCloud(){
  if(cloudClient)await cloudClient.auth.signOut();
  cloudUser=null;
  cloudBootstrapped=false;
  passwordRecoveryMode=false;
  stopCloudAutoSync();
  renderAuthGate();
  setCloudStatus('已退出云端账号，本机数据仍保留。','info');
}
function useOfflineMode(){
  localStorage.setItem(STORAGE_KEYS.offline,'1');
  renderAuthGate();
}
function exitOfflineMode(){
  localStorage.removeItem(STORAGE_KEYS.offline);
  renderAuthGate();
}
function toggleAccountPanel(){els.accountPanel.classList.toggle('open')}
function closeAccountPanel(){els.accountPanel.classList.remove('open')}

function getHistory(){return readJSON(STORAGE_KEYS.history,[])}
function setHistory(items){
  writeJSON(STORAGE_KEYS.history,items);
  markCloudDirty(CLOUD_KEYS.history);
  renderHistory();
  syncAllToCloud(true);
}
function getSettings(){return normalizeSettings(readJSON(STORAGE_KEYS.settings,DEFAULT_SETTINGS))}
function setSettings(settings){
  writeJSON(STORAGE_KEYS.settings,normalizeSettings(settings));
  markCloudDirty(CLOUD_KEYS.settings);
  syncAllToCloud(true);
}
function saveSettingsLocal(settings){
  writeJSON(STORAGE_KEYS.settings,normalizeSettings(settings));
  markCloudDirty(CLOUD_KEYS.settings);
}
function normalizeSettings(raw={}){
  const source={...raw};
  const hasProfileArray=Array.isArray(source.apiProfiles);
  let profiles=hasProfileArray?source.apiProfiles.map(normalizeApiProfile).filter(Boolean):[];
  const legacyHasValue=Boolean(source.apiUrl||source.apiKey||source.model);
  if(!profiles.length&&legacyHasValue){
    const legacyProfile=normalizeApiProfile({
      id:source.activeApiProfileId||'default',
      name:source.apiProfileName||source.profileName||'默认配置',
      apiUrl:source.apiUrl||'',
      apiKey:source.apiKey||'',
      model:source.model||'',
      updatedAt:source.updatedAt||new Date().toISOString(),
    });
    const existingIndex=profiles.findIndex(profile=>profile.id===legacyProfile.id);
    if(existingIndex>=0)profiles[existingIndex]={...profiles[existingIndex],...legacyProfile};
    else profiles.unshift(legacyProfile);
  }
  profiles=dedupeApiProfiles(profiles.length?profiles:[DEFAULT_API_PROFILE]);
  const activeId=profiles.some(profile=>profile.id===source.activeApiProfileId)?source.activeApiProfileId:profiles[0].id;
  const active=profiles.find(profile=>profile.id===activeId)||profiles[0];
  const labelMode=normalizeLabelMode(source.labelMode);
  const fontMode=normalizeFontMode(source.fontMode);
  const historyTimeMode=normalizeHistoryTimeMode(source.historyTimeMode);
  const visualHintsPinned=normalizeBooleanSetting(source.visualHintsPinned,DEFAULT_SETTINGS.visualHintsPinned);
  const modelPrompt=String(source.modelPrompt||'');
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    apiProfiles:profiles,
    activeApiProfileId:active.id,
    apiUrl:active.apiUrl,
    apiKey:active.apiKey,
    model:active.model,
    labelMode,
    fontMode,
    historyTimeMode,
    visualHintsPinned,
    modelPrompt,
  };
}
function normalizeLabelMode(value){
  return ['zh','code','both'].includes(value)?value:'zh';
}
function normalizeFontMode(value){
  return ['system','sans','serif','mono'].includes(value)?value:'system';
}
function normalizeHistoryTimeMode(value){
  return ['created','updated','both'].includes(value)?value:'created';
}
function normalizeBooleanSetting(value,fallback=false){
  if(value===true||value==='true'||value===1||value==='1')return true;
  if(value===false||value==='false'||value===0||value==='0')return false;
  return fallback;
}
function normalizeApiProfile(profile={}){
  const id=String(profile.id||`api_${Date.now()}_${Math.floor(Math.random()*1000)}`);
  return {
    id,
    name:String(profile.name||profile.label||'未命名配置').trim()||'未命名配置',
    apiUrl:String(profile.apiUrl||'').trim(),
    apiKey:String(profile.apiKey||'').trim(),
    model:String(profile.model||'').trim(),
    updatedAt:profile.updatedAt||new Date().toISOString(),
  };
}
function dedupeApiProfiles(profiles){
  const map=new Map();
  profiles.map(normalizeApiProfile).forEach(profile=>{
    const existing=map.get(profile.id);
    if(!existing||new Date(profile.updatedAt||0)>new Date(existing.updatedAt||0))map.set(profile.id,profile);
  });
  const unique=new Map();
  [...map.values()].forEach(profile=>{
    const signature=[profile.name,profile.apiUrl,profile.apiKey,profile.model].join('\u0001');
    const existing=unique.get(signature);
    if(!existing||new Date(profile.updatedAt||0)>new Date(existing.updatedAt||0))unique.set(signature,profile);
  });
  return [...unique.values()];
}
function activeApiProfile(settings=getSettings()){
  return settings.apiProfiles.find(profile=>profile.id===settings.activeApiProfileId)||settings.apiProfiles[0]||DEFAULT_API_PROFILE;
}
function mergeSettings(localRaw,remoteRaw){
  const local=localRaw?normalizeSettings(localRaw):{apiProfiles:[],activeApiProfileId:''};
  const remote=remoteRaw?normalizeSettings(remoteRaw):{apiProfiles:[],activeApiProfileId:''};
  const profiles=dedupeApiProfiles([...(remote.apiProfiles||[]),...(local.apiProfiles||[])]);
  if(!profiles.length)return normalizeSettings(DEFAULT_SETTINGS);
  const localHasPendingSettings=cloudDirtyKeys.has(CLOUD_KEYS.settings);
  const localTime=new Date(local.updatedAt||0).getTime()||0;
  const remoteTime=new Date(remote.updatedAt||0).getTime()||0;
  const preferLocalSettings=localHasPendingSettings||localTime>remoteTime;
  const activeId=preferLocalSettings
    ? local.activeApiProfileId
    : remote.activeApiProfileId||local.activeApiProfileId;
  return normalizeSettings({
    ...remote,
    labelMode:preferLocalSettings?local.labelMode:remote.labelMode||local.labelMode,
    fontMode:preferLocalSettings?local.fontMode:remote.fontMode||local.fontMode,
    historyTimeMode:preferLocalSettings?local.historyTimeMode:remote.historyTimeMode||local.historyTimeMode,
    visualHintsPinned:preferLocalSettings?local.visualHintsPinned:remote.visualHintsPinned,
    modelPrompt:preferLocalSettings?local.modelPrompt:remote.modelPrompt||local.modelPrompt||'',
    apiProfiles:profiles,
    activeApiProfileId:profiles.some(profile=>profile.id===activeId)?activeId:profiles[0]?.id,
    apiUrl:'',
    apiKey:'',
    model:'',
  });
}
function currentApiSettings(settings=getSettings()){
  const profile=activeApiProfile(settings);
  return {
    ...settings,
    apiUrl:profile.apiUrl||'',
    apiKey:profile.apiKey||'',
    model:profile.model||'',
    apiProfileName:profile.name||'默认配置',
  };
}
function cloudReady(){
  if(!cloudClient){notify('Supabase 未配置。','bad','云端不可用');return false}
  if(!cloudUser){notify('请先登录云端账号。','bad','还没登录');return false}
  return true;
}
function setCloudStatus(message,type='info',busy=false){
  cloudBusy=Boolean(busy);
  document.body.classList.toggle('cloud-syncing',cloudBusy);
  const text=message||'同步状态会显示在这里';
  [els.accountSyncStatus,els.settingsSyncStatus].forEach(node=>{
    if(!node)return;
    node.textContent=text;
    node.classList.remove('good','bad','info');
    node.classList.add(type);
  });
}
function setCloudBusy(busy,visible=false){
  cloudSyncBusy=Boolean(busy);
  cloudBusy=Boolean(busy);
  document.body.classList.toggle('cloud-syncing',cloudBusy&&visible);
}
function cloudErrorMessage(error,action='同步'){
  const message=String(error?.message||error?.details||error||'未知错误');
  const code=String(error?.code||'');
  if(code==='42P01'||/relation .*study_store.* does not exist|study_store.*does not exist/i.test(message)){
    return `${action}失败：Supabase 的 public.study_store 表不存在。请在项目 SQL Editor 里执行仓库的 supabase.sql。`;
  }
  if(code==='42501'||/row-level security|permission denied|violates row-level security/i.test(message)){
    return `${action}失败：study_store 的 RLS 权限不完整。请重新执行 supabase.sql 里的 policy。`;
  }
  if(/JWT|not authenticated|invalid claim|Auth session missing/i.test(message)){
    return `${action}失败：登录会话已失效，请退出后重新登录。`;
  }
  if(/Failed to fetch|NetworkError|Load failed|fetch/i.test(message)){
    return `${action}失败：网络无法连接 Supabase，请稍后重试或检查浏览器网络拦截。`;
  }
  return `${action}失败：${message}`;
}
function isCloudNetworkError(error){
  const message=String(error?.message||error||'');
  return /Load failed|Failed to fetch|NetworkError|fetch failed|TypeError/i.test(message);
}
async function cloudAccessToken(){
  const cached=localCloudAccessToken();
  if(cached)return cached;
  const {data,error}=await cloudClient.auth.getSession();
  if(error)throw error;
  const token=data.session?.access_token||localCloudAccessToken();
  if(!token)throw new Error('登录会话已失效，请重新登录。');
  return token;
}
function localCloudAccessToken(){
  try{
    const ref=new URL(SUPABASE_CONFIG.url).hostname.split('.')[0];
    const keys=[`sb-${ref}-auth-token`,...Object.keys(localStorage).filter(key=>key.startsWith('sb-')&&key.endsWith('-auth-token'))];
    for(const key of [...new Set(keys)]){
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      const token=parsed?.access_token||parsed?.currentSession?.access_token||parsed?.session?.access_token;
      if(token)return token;
    }
  }catch{}
  return '';
}
async function syncViaServer(action,payload={}){
  const token=await cloudAccessToken();
  const response=await fetch('/api/sync',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      Authorization:`Bearer ${token}`,
    },
    body:JSON.stringify({action,...payload}),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
  return data;
}
async function fetchCloudRows(keys=Object.values(CLOUD_KEYS)){
  try{
    const {data,error}=await cloudClient.from('study_store').select('key,value').eq('user_id',cloudUser.id).in('key',keys);
    if(error)throw error;
    return data||[];
  }catch(error){
    if(!isCloudNetworkError(error))throw error;
    const data=await syncViaServer('select',{keys});
    return data.rows||[];
  }
}
function markCloudDirty(key){
  if(key)cloudDirtyKeys.add(key);
}
function clearCloudDirty(keys=Object.values(CLOUD_KEYS)){
  keys.forEach(key=>cloudDirtyKeys.delete(key));
}
function syncableItems(){
  return {
    [CLOUD_KEYS.history]:JSON.stringify(getHistory()),
    [CLOUD_KEYS.settings]:JSON.stringify(getSettings()),
    [CLOUD_KEYS.theme]:localStorage.getItem(STORAGE_KEYS.theme)||'auto',
    [CLOUD_KEYS.layout]:localStorage.getItem(STORAGE_KEYS.layout)||'top',
    [CLOUD_KEYS.logs]:JSON.stringify(getLogs()),
  };
}
function cloudRawMap(rows){
  const allowed=new Set(Object.values(CLOUD_KEYS));
  const out={};
  (rows||[]).forEach(row=>{
    if(allowed.has(row.key))out[row.key]=String(row.value?.raw??'');
  });
  return out;
}
function mapsEqual(a,b){
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const key of keys){
    if((a[key]??null)!==(b[key]??null))return false;
  }
  return true;
}
function replaceLocalWithItems(items){
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.settings);
  localStorage.removeItem(STORAGE_KEYS.theme);
  localStorage.removeItem(STORAGE_KEYS.layout);
  localStorage.removeItem(STORAGE_KEYS.logs);
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.history)){
    writeJSON(STORAGE_KEYS.history,safeHistoryFromRaw(items[CLOUD_KEYS.history]));
  }
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.settings)){
    writeJSON(STORAGE_KEYS.settings,safeObjectFromRaw(items[CLOUD_KEYS.settings],DEFAULT_SETTINGS));
  }
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.theme)){
    localStorage.setItem(STORAGE_KEYS.theme,items[CLOUD_KEYS.theme]||'auto');
  }
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.layout)){
    localStorage.setItem(STORAGE_KEYS.layout,items[CLOUD_KEYS.layout]||'top');
  }
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.logs)){
    writeJSON(STORAGE_KEYS.logs,safeLogsFromRaw(items[CLOUD_KEYS.logs]));
  }
  hydrateSettings();
  rerenderHistoryFromStart();
  renderLogs();
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme)||'auto');
  ensureLayoutPreference();
  renderAuthGate();
}
function safeObjectFromRaw(raw,fallback={}){
  try{return {...fallback,...JSON.parse(raw||'{}')}}catch{return fallback}
}
function safeHistoryFromRaw(raw){
  try{return normalizeHistoryItems(JSON.parse(raw||'[]'))}catch{return []}
}
function safeLogsFromRaw(raw){
  try{
    const logs=JSON.parse(raw||'[]');
    return Array.isArray(logs)?logs.slice(0,80):[];
  }catch{return []}
}
function syncKind(key){
  if(key===CLOUD_KEYS.history)return '历史记录';
  if(key===CLOUD_KEYS.settings)return '模型设置';
  if(key===CLOUD_KEYS.theme)return '主题';
  if(key===CLOUD_KEYS.layout)return '布局';
  if(key===CLOUD_KEYS.logs)return '日志';
  return '数据';
}
function syncValuePreview(key,value){
  if(value===''||value===undefined||value===null)return '无';
  if(key===CLOUD_KEYS.history){
    const history=safeHistoryFromRaw(value);
    const rolls=history.reduce((sum,item)=>sum+getHistoryRolls(item).length,0);
    return `${history.length} 条历史，${rolls} 个结果版本`;
  }
  if(key===CLOUD_KEYS.settings){
    const settings=normalizeSettings(safeObjectFromRaw(value,DEFAULT_SETTINGS));
    const active=currentApiSettings(settings);
    const labelMode=settings.labelMode==='zh'?'中文':settings.labelMode==='code'?'缩写':'双语';
    const fontMode={system:'系统',sans:'无衬线',serif:'衬线',mono:'等宽'}[settings.fontMode]||'系统';
    const timeMode={created:'创建时间',updated:'修改时间',both:'全部时间'}[settings.historyTimeMode]||'创建时间';
    return `${settings.apiProfiles.length} 组 API，当前 ${active.apiProfileName}，URL ${active.apiUrl?'已填':'空'}，Key ${active.apiKey?'已填':'空'}，Model ${active.model||'空'}，标签 ${labelMode}，字体 ${fontMode}，时间 ${timeMode}，Prompt ${settings.modelPrompt?'自定义':'默认'}`;
  }
  if(key===CLOUD_KEYS.logs)return `${safeLogsFromRaw(value).length} 条日志`;
  return String(value).replace(/\s+/g,' ').trim().slice(0,120);
}
function syncDiffStats(local,remote){
  const keys=[...new Set([...Object.keys(local),...Object.keys(remote)])].sort();
  const stats={localTotal:Object.keys(local).length,remoteTotal:Object.keys(remote).length,localOnly:0,remoteOnly:0,changed:0,diffs:[],kinds:{}};
  const ensure=kind=>stats.kinds[kind]||(stats.kinds[kind]={local:0,remote:0,diff:0});
  Object.keys(local).forEach(key=>ensure(syncKind(key)).local+=1);
  Object.keys(remote).forEach(key=>ensure(syncKind(key)).remote+=1);
  keys.forEach(key=>{
    const inLocal=Object.prototype.hasOwnProperty.call(local,key);
    const inRemote=Object.prototype.hasOwnProperty.call(remote,key);
    const kind=ensure(syncKind(key));
    if(!inRemote){stats.localOnly+=1;kind.diff+=1;stats.diffs.push({key,type:'本机独有',local:local[key],remote:''});return}
    if(!inLocal){stats.remoteOnly+=1;kind.diff+=1;stats.diffs.push({key,type:'云端独有',local:'',remote:remote[key]});return}
    if(local[key]!==remote[key]){stats.changed+=1;kind.diff+=1;stats.diffs.push({key,type:'同名不同',local:local[key],remote:remote[key]})}
  });
  stats.diffTotal=stats.localOnly+stats.remoteOnly+stats.changed;
  return stats;
}
function mergeSyncItems(local,remote){
  const merged={...remote,...local};
  if(remote[CLOUD_KEYS.history]||local[CLOUD_KEYS.history]){
    const remoteHistory=safeHistoryFromRaw(remote[CLOUD_KEYS.history]);
    const localHistory=safeHistoryFromRaw(local[CLOUD_KEYS.history]);
    merged[CLOUD_KEYS.history]=JSON.stringify(mergeHistoryItems(localHistory,remoteHistory));
  }
  if(remote[CLOUD_KEYS.settings]||local[CLOUD_KEYS.settings]){
    merged[CLOUD_KEYS.settings]=JSON.stringify(mergeSettings(
      Object.prototype.hasOwnProperty.call(local,CLOUD_KEYS.settings)?safeObjectFromRaw(local[CLOUD_KEYS.settings],DEFAULT_SETTINGS):null,
      Object.prototype.hasOwnProperty.call(remote,CLOUD_KEYS.settings)?safeObjectFromRaw(remote[CLOUD_KEYS.settings],DEFAULT_SETTINGS):null,
    ));
  }
  if(remote[CLOUD_KEYS.theme]&&!cloudDirtyKeys.has(CLOUD_KEYS.theme))merged[CLOUD_KEYS.theme]=remote[CLOUD_KEYS.theme];
  if(remote[CLOUD_KEYS.layout]&&!cloudDirtyKeys.has(CLOUD_KEYS.layout))merged[CLOUD_KEYS.layout]=remote[CLOUD_KEYS.layout];
  if(remote[CLOUD_KEYS.logs]||local[CLOUD_KEYS.logs]){
    merged[CLOUD_KEYS.logs]=JSON.stringify(mergeLogs(safeLogsFromRaw(local[CLOUD_KEYS.logs]),safeLogsFromRaw(remote[CLOUD_KEYS.logs])));
  }
  return merged;
}
function mergeLogs(localLogs,remoteLogs){
  const map=new Map();
  [...remoteLogs,...localLogs].forEach(item=>{
    if(!item)return;
    const key=String(item.id||`${item.time}|${item.type}|${item.title}|${item.message}`);
    if(!map.has(key))map.set(key,item);
  });
  return [...map.values()].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)).slice(0,80);
}
function mergeHistoryItems(localHistory,remoteHistory){
  const map=new Map();
  const put=item=>{
    const normalized=normalizeHistoryItem(item);
    const key=normalizeSearch(normalized.query||normalized.result?.meta?.query||normalized.result?.headword?.title||normalized.id);
    const existing=map.get(key);
    if(!existing){map.set(key,normalized);return}
    const rolls=dedupeRolls([...getHistoryRolls(existing),...getHistoryRolls(normalized)]);
    const latest=rolls[0]||makeHistoryRoll(normalized.result,normalized.createdAt);
    map.set(key,{
      ...existing,
      ...normalized,
      id:existing.id||normalized.id,
      query:existing.query||normalized.query,
      favorite:Boolean(existing.favorite||normalized.favorite),
      favoriteAt:[existing.favoriteAt,normalized.favoriteAt].filter(Boolean).sort().pop()||'',
      tags:mergeTags(existing.tags,normalized.tags),
      note:latestHistoryNote(existing,normalized),
      noteUpdatedAt:Math.max(historyNoteTime(existing),historyNoteTime(normalized))?new Date(Math.max(historyNoteTime(existing),historyNoteTime(normalized))).toISOString():'',
      createdAt:new Date(Math.min(new Date(existing.createdAt||Date.now()),new Date(normalized.createdAt||Date.now()))).toISOString(),
      updatedAt:new Date(Math.max(new Date(existing.updatedAt||existing.createdAt||0),new Date(normalized.updatedAt||normalized.createdAt||0))).toISOString(),
      result:latest.result,
      followups:dedupeFollowups([...(existing.followups||[]),...(normalized.followups||[])]),
      rolls,
    });
  };
  remoteHistory.forEach(put);
  localHistory.forEach(put);
  return [...map.values()].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
}
function mergeTags(...groups){
  return uniq(groups.flatMap(normalizeTags));
}
function latestHistoryNote(a={},b={}){
  const left=String(a.note||'');
  const right=String(b.note||'');
  const leftTime=historyNoteTime(a);
  const rightTime=historyNoteTime(b);
  if(!leftTime&&!rightTime)return left||right;
  return rightTime>=leftTime?right:left;
}
function historyNoteTime(item={}){
  if(item.noteUpdatedAt)return new Date(item.noteUpdatedAt).getTime()||0;
  if(item.note)return new Date(item.updatedAt||item.createdAt||0).getTime()||0;
  return 0;
}
function dedupeFollowups(items){
  const seen=new Set();
  return items.filter(item=>{
    const key=String(item.id||`${item.question}|${item.answer}`);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
function dedupeRolls(rolls){
  const seen=new Set();
  return rolls
    .filter(roll=>{
      const key=JSON.stringify(roll.result||{});
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    })
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function makeHistoryRoll(result,createdAt=new Date().toISOString(),id=null,meta={}){
  return {id:id||Date.now()+Math.floor(Math.random()*1000),createdAt,result,...meta};
}
function normalizeHistoryItems(items){
  return Array.isArray(items)?items.map(normalizeHistoryItem).filter(item=>item.query||item.result):[];
}
function normalizeHistoryItem(item){
  const base={...item};
  const createdAt=base.createdAt||new Date().toISOString();
  const rolls=dedupeRolls(Array.isArray(base.rolls)&&base.rolls.length
    ? base.rolls.map(roll=>({
      ...roll,
      createdAt:roll.createdAt||createdAt,
      result:roll.result||base.result,
      model:roll.model||roll.modelName||base.model||base.result?.meta?.model||'未记录',
      modelSource:roll.modelSource||base.modelSource||'unknown',
    }))
    : [makeHistoryRoll(base.result,createdAt,base.id||Date.parse(createdAt),{
      model:base.model||base.result?.meta?.model||'未记录',
      modelSource:base.modelSource||'unknown',
    })]);
  const latest=rolls[0]||makeHistoryRoll(base.result,createdAt);
  return {...base,favorite:Boolean(base.favorite),favoriteAt:base.favoriteAt||'',tags:normalizeTags(base.tags),note:String(base.note||''),noteUpdatedAt:base.noteUpdatedAt||'',createdAt,result:base.result||latest.result,rolls};
}
function normalizeTags(value){
  const list=Array.isArray(value)?value:String(value||'').split(/[,\s，、;；]+/);
  return uniq(list.map(tag=>String(tag||'').trim()).filter(tag=>tag.length>0).slice(0,24));
}
function getHistoryRolls(item){
  return normalizeHistoryItem(item).rolls;
}
async function askSyncConflict(local,remote){
  return new Promise(resolve=>{
    const layer=els.confirmLayer;
    const card=document.getElementById('confirm-card');
    const actions=card?.querySelector('.confirm-actions');
    if(!layer||!els.confirmOk||!els.confirmCancel||!actions){
      resolve(window.confirm('检测到本机和云端数据不一致。确认保留本机，取消保留云端。')?'local':'remote');
      return;
    }
    resetConfirmUI();
    const mergeBtn=document.createElement('button');
    mergeBtn.className='plain-btn merge-btn';
    mergeBtn.id='sync-merge';
    mergeBtn.textContent='合并';
    actions.insertBefore(mergeBtn,els.confirmOk);
    const stats=syncDiffStats(local,remote);
    const kinds=['历史记录','模型设置','主题','布局','日志'].map(kind=>{
      const row=stats.kinds[kind]||{local:0,remote:0,diff:0};
      return `<div class="sync-kind"><b>${kind}</b><span>本机 ${row.local}</span><span>云端 ${row.remote}</span><em>${row.diff} 项不一致</em></div>`;
    }).join('');
    const rows=stats.diffs.map(item=>`
      <div class="sync-data-row">
        <div class="sync-data-head"><b>${escapeHTML(syncKind(item.key))}</b><em>${escapeHTML(item.type)}</em></div>
        <div class="sync-data-cols">
          <div><span>本机</span><p>${escapeHTML(syncValuePreview(item.key,item.local))}</p></div>
          <div><span>云端</span><p>${escapeHTML(syncValuePreview(item.key,item.remote))}</p></div>
        </div>
      </div>
    `).join('');
    card.classList.add('sync-card');
    els.confirmTitle.textContent='同步冲突';
    els.confirmMessage.innerHTML=`
      <div class="sync-simple">
        <div class="sync-side local"><span>本机</span><strong>${stats.localTotal}</strong><em>当前浏览器</em></div>
        <div class="sync-vs">不同步</div>
        <div class="sync-side remote"><span>云端</span><strong>${stats.remoteTotal}</strong><em>Supabase</em></div>
      </div>
      <div class="sync-plain">检测到 <b>${stats.diffTotal}</b> 项不一致。推荐“合并”：历史会按词条合并，多次生成结果都会保留。</div>
      <button class="sync-toggle" type="button" id="sync-detail-toggle">展开详细</button>
      <div class="sync-detail" id="sync-detail">
        <div class="sync-help"><b>本机独有</b> 只在当前浏览器；<b>云端独有</b> 只在 Supabase；<b>同名不同</b> 两边都有但内容不一样。</div>
        <div class="sync-breakdown">
          <div><b>${stats.localOnly}</b><span>本机独有</span></div>
          <div><b>${stats.remoteOnly}</b><span>云端独有</span></div>
          <div><b>${stats.changed}</b><span>同名不同</span></div>
        </div>
        <div class="sync-kinds">${kinds}</div>
        <div class="sync-data-list">${rows||'<div class="sync-help">没有不同的数据项。</div>'}</div>
      </div>
    `;
    els.confirmMessage.querySelector('#sync-detail-toggle')?.addEventListener('click',event=>{
      const detail=els.confirmMessage.querySelector('#sync-detail');
      const open=detail?.classList.toggle('open');
      event.currentTarget.textContent=open?'收起详细':'展开详细';
    });
    els.confirmOk.textContent='保留本机';
    els.confirmOk.className='plain-btn primary-btn';
    els.confirmCancel.textContent='保留云端';
    layer.classList.add('open');
    const close=value=>{
      layer.classList.remove('open');
      resetConfirmUI();
      resolve(value);
    };
    mergeBtn.onclick=()=>close('merge');
    els.confirmOk.onclick=()=>close('local');
    els.confirmCancel.onclick=()=>close('remote');
    layer.onclick=event=>{if(event.target===layer)close('remote')};
  });
}
async function bootstrapCloudSync(mode='ask',manual=false){
  if(!cloudReady())return;
  if(cloudSyncBusy){cloudSyncQueued=true;return}
  cloudBootstrapped=true;
  setCloudBusy(true,manual);
  if(manual)setCloudStatus('正在读取云端数据...','info',true);
  try{
    const local=syncableItems();
    const data=await fetchCloudRows();
    const remote=cloudRawMap(data);
    if(mode==='cloud'){
      replaceLocalWithItems(remote);
      setCloudStatus('已读取云端最新数据。','good');
      if(manual)notify('已读取云端最新数据。','good','云端同步');
      startCloudAutoSync();
      return;
    }
    const merged=Object.keys(remote).length?mergeSyncItems(local,remote):local;
    if(!mapsEqual(local,merged))replaceLocalWithItems(merged);
    if(!Object.keys(remote).length||!mapsEqual(remote,merged)){
      const result=await replaceCloudWithItems(merged);
      if(result.error)throw result.error;
    }
    setCloudStatus('已自动同步本机和云端数据。','good');
    if(manual)notify('已自动同步本机和云端数据。','good','同步完成');
    startCloudAutoSync();
  }catch(error){
    const message=cloudErrorMessage(error,'同步');
    setCloudStatus(message,'bad');
    notify(message,'bad','同步失败');
  }finally{
    setCloudBusy(false,false);
    flushQueuedCloudSync();
  }
}
async function uploadItemsToCloud(items){
  const rows=Object.entries(items).map(([key,raw])=>({user_id:cloudUser.id,key,value:{raw}}));
  if(!rows.length)return {count:0};
  try{
    const {error}=await cloudClient.from('study_store').upsert(rows,{onConflict:'user_id,key'});
    if(error)throw error;
    clearCloudDirty(Object.keys(items));
    return {count:rows.length};
  }catch(error){
    if(!isCloudNetworkError(error))return {error,count:rows.length};
    try{
      const data=await syncViaServer('upsert',{rows});
      clearCloudDirty(Object.keys(items));
      return {count:data.count||rows.length,proxied:true};
    }catch(proxyError){
      return {error:proxyError,count:rows.length};
    }
  }
}
async function replaceCloudWithItems(items){
  return uploadItemsToCloud(items);
}
async function syncAllToCloud(silent=false){
  if(!cloudClient||!cloudUser)return;
  if(cloudSyncBusy){cloudSyncQueued=true;return}
  setCloudBusy(true,!silent);
  setCloudStatus('正在保存到云端...','info',!silent);
  try{
    const result=await uploadItemsToCloud(syncableItems());
    if(result.error)throw result.error;
    setCloudStatus(`已同步 ${result.count} 项到云端。`,'good');
    if(!silent)notify('已同步到云端。','good','同步完成');
  }catch(error){
    const message=cloudErrorMessage(error,'同步');
    setCloudStatus(message,'bad');
    notify(message,'bad','同步失败');
  }finally{
    setCloudBusy(false,false);
    flushQueuedCloudSync();
  }
}
function flushQueuedCloudSync(){
  if(!cloudSyncQueued||cloudSyncBusy)return;
  cloudSyncQueued=false;
  syncAllToCloud(true);
}
function startCloudAutoSync(){
  if(cloudAutoTimer)clearInterval(cloudAutoTimer);
  if(!cloudClient||!cloudUser)return;
  cloudAutoTimer=setInterval(()=>bootstrapCloudSync('merge',false),15000);
}
function stopCloudAutoSync(){
  if(cloudAutoTimer)clearInterval(cloudAutoTimer);
  cloudAutoTimer=null;
}
async function uploadCloud(){
  if(!cloudReady())return;
  if(!await askConfirm('确认用本机数据覆盖云端的 ai-vocab-tool 数据？study-kanban 的数据不会被动到。','上传本机'))return;
  if(cloudSyncBusy){cloudSyncQueued=true;return notify('已有同步任务在进行，稍后会自动保存。','info','同步排队')}
  setCloudBusy(true,true);
  setCloudStatus('正在上传本机数据...','info',true);
  try{
    const result=await replaceCloudWithItems(syncableItems());
    if(result.error)throw result.error;
    setCloudStatus(`已上传 ${result.count} 项本机数据。`,'good');
    notify('本机数据已覆盖云端。','good','上传完成');
  }catch(error){
    const message=cloudErrorMessage(error,'上传');
    setCloudStatus(message,'bad');
    notify(message,'bad','上传失败');
  }finally{
    setCloudBusy(false,false);
    flushQueuedCloudSync();
  }
}
async function downloadCloud(){
  if(!cloudReady())return;
  if(!await askConfirm('确认用云端 ai-vocab-tool 数据覆盖当前浏览器本机数据？','恢复云端'))return;
  await bootstrapCloudSync('cloud',true);
}
async function loadConfigInfo(){
  try{
    const response=await fetch('/api/config');
    if(!response.ok)throw new Error('config unavailable');
    configInfo=await response.json();
  }catch{
    configInfo={hasApiUrl:false,hasApiKey:false,model:''};
  }
  hydrateSettings();
}

function showView(id,button){
  activeView=id;
  document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===`view-${id}`));
  document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
  if(button)button.classList.add('active');
  if(id==='history')renderHistory();
  if(id==='settings')renderSettings();
  if(id==='about')renderAbout();
  updateHomeStickyState();
  if(id==='home')focusQueryInput();
}
function goHomeAndFocus(){
  showView('home',document.getElementById('nav-home'));
  focusQueryInput();
}
function focusQueryInput(){
  requestAnimationFrame(()=>{
    if(!canEnterApp()||activeView!=='home'||document.body.classList.contains('modal-open'))return;
    els.query?.focus({preventScroll:true});
    const length=els.query?.value.length||0;
    els.query?.setSelectionRange(length,length);
  });
}
function updateHomeStickyState(){
  const compact=activeView==='home'&&window.scrollY>56;
  document.body.classList.toggle('home-scrolled',compact);
}
function focusHomeQueryFromSticky(event){
  if(activeView!=='home'||document.body.classList.contains('modal-open'))return;
  const target=event?.target;
  if(target?.closest?.('input,textarea,button,.clear-query-btn,.query-actions'))return;
  window.scrollTo({top:0,behavior:'smooth'});
  if(target!==els.direction&&target!==els.note){
    els.query?.focus({preventScroll:true});
    const length=els.query?.value.length||0;
    els.query?.setSelectionRange(length,length);
  }
}
function setResultTab(id,button){
  document.querySelectorAll('.result-page').forEach(page=>page.classList.remove('active'));
  document.getElementById(id==='card'?'result-card':'result-json').classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(btn=>btn.classList.remove('active'));
  button.classList.add('active');
}
function setModalTab(id,button){
  document.querySelectorAll('.modal-page').forEach(page=>page.classList.toggle('active',page.id===`modal-${id}-page`));
  document.querySelectorAll('.modal-head .tab-btn').forEach(btn=>btn.classList.remove('active'));
  button.classList.add('active');
  els.historyModal?.querySelector('.modal-card')?.classList.toggle('editing-mode',id!=='card');
  if(id==='json')validateModalJSON(false);
}
function renderEmpty(){
  clearLookupLoadingTimers();
  clearResultTypewriter();
  clearJSONTypewriter();
  els.resultCard.innerHTML='<div class="empty">等待查询</div>';
  els.resultJson.innerHTML='<div class="empty">等待 JSON</div>';
}
function clearLookupLoadingTimers(){
  lookupLoadingTimers.forEach(timer=>clearInterval(timer));
  lookupLoadingTimers=[];
}
function renderLookupLoading(query,settings,runId=lookupRunId){
  clearLookupLoadingTimers();
  clearResultTypewriter();
  clearJSONTypewriter();
  const apiSettings=currentApiSettings(settings);
  const source=apiSettings.apiUrl&&apiSettings.apiKey?`自定义接口：${apiSettings.apiProfileName}`:'环境变量接口';
  const blocks=[
    ['entry','词条头','准备标题、核心义和基础标签'],
    ['senses','义项','等待模型归纳词性与义项'],
    ['collocations','搭配','准备固定搭配、例句和译文'],
    ['register','语感','整理语体、语气和使用场景'],
    ['confusions','易混','检查相近表达和边界'],
    ['related','相关记录','匹配本地历史相近词条'],
  ];
  els.resultCard.innerHTML=`
    <div class="lookup-stream">
      <div class="lookup-progress-badge" aria-live="polite">
        <i aria-hidden="true"></i>
        <span id="lookup-progress-percent">8%</span>
      </div>
      <div class="entry-head lookup-skeleton-head">
        <div class="entry-kicker">生成中 · ${escapeHTML(source)}</div>
        <div class="entry-title">${escapeHTML(query)}</div>
        <div class="entry-core"><b>核心义</b><mark class="skeleton-text wide"></mark></div>
        <div class="entry-meta-grid">
          <span><b>类型</b><em class="skeleton-text short"></em></span>
          <span><b>词性</b><em class="skeleton-text short"></em></span>
          <span><b>方向</b><em class="skeleton-text short"></em></span>
        </div>
      </div>
      ${blocks.map((block,index)=>`
        <section class="block lookup-skeleton-block" data-lookup-block="${escapeHTML(block[0])}" style="--delay:${index}">
          <div class="block-title">${escapeHTML(block[1])}<small>${escapeHTML(block[2])}</small></div>
          <div class="lookup-skeleton-lines">
            <i></i><i></i><i></i>
          </div>
        </section>
      `).join('')}
    </div>
  `;
  els.resultJson.innerHTML=`<div class="json-stream-loading"><pre id="lookup-stream-json">{
  "meta": { "query": ${JSON.stringify(query)}, "status": "requesting" },
  "headword": "waiting...",
  "senses": [],
  "collocations": [],
  "register": {},
  "confusions": []
}</pre></div>`;
  startLookupJSONPlaceholder(runId);
  startLookupLoadingProgress(runId);
}
function startLookupJSONPlaceholder(runId){
  const pre=els.resultJson.querySelector('.json-stream-loading pre');
  if(!pre||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const text=pre.textContent||'';
  pre.textContent='';
  let index=0;
  const tick=()=>{
    if(runId!==lookupRunId||!lookupBusy)return;
    index=Math.min(text.length,index+4);
    pre.textContent=text.slice(0,index);
    if(index<text.length){
      jsonTypewriterTimers.push(setTimeout(tick,18));
      return;
    }
    jsonTypewriterTimers.push(setTimeout(()=>{
      if(runId===lookupRunId&&lookupBusy)pre.textContent=text;
    },180));
  };
  jsonTypewriterTimers.push(setTimeout(tick,80));
}
function startLookupLoadingProgress(runId){
  const percentEl=document.getElementById('lookup-progress-percent');
  if(!percentEl)return;
  let value=8;
  let blockIndex=0;
  const blocks=[...els.resultCard.querySelectorAll('.lookup-skeleton-block')];
  blocks[0]?.classList.add('active');
  const timer=setInterval(()=>{
    if(runId!==lookupRunId||!lookupBusy){
      clearInterval(timer);
      return;
    }
    value=Math.min(88,value+(value<45?3:value<72?2:1));
    percentEl.textContent=`${value}%`;
    const nextIndex=Math.min(blocks.length-1,Math.floor(value/16));
    while(blockIndex<=nextIndex){
      blocks[blockIndex]?.classList.add('active');
      blockIndex+=1;
    }
  },520);
  lookupLoadingTimers.push(timer);
}
function setLookupStreamPercent(value){
  const percentEl=document.getElementById('lookup-progress-percent');
  if(percentEl)percentEl.textContent=`${Math.max(1,Math.min(99,Math.round(value)))}%`;
}
function renderLookupRetry(query,error,nextAttempt,totalAttempts){
  clearLookupLoadingTimers();
  clearResultTypewriter();
  clearJSONTypewriter();
  const message=lookupErrorMessage(error);
  els.resultCard.innerHTML=`
    <div class="lookup-state lookup-loading retrying">
      <div class="lookup-copy">
        <div class="lookup-title">正在重试：${escapeHTML(query)}</div>
        <div class="lookup-steps">
          <span>已捕获错误</span>
          <span>等待重连</span>
          <span>第 ${Number(nextAttempt)} / ${Number(totalAttempts)} 次尝试</span>
        </div>
        <div class="lookup-progress" aria-hidden="true"><i></i></div>
        <p><b>上一次失败原因：</b>${escapeHTML(message)}。这是可恢复错误，稍后会自动再试一次。</p>
      </div>
    </div>
  `;
  els.resultJson.innerHTML=`<pre class="error-pre">${escapeHTML(JSON.stringify({ok:false,retrying:true,query,error:message,nextAttempt,totalAttempts},null,2))}</pre>`;
}
function renderLookupError(query,error,stage='查询失败'){
  clearLookupLoadingTimers();
  clearResultTypewriter();
  clearJSONTypewriter();
  const message=lookupErrorMessage(error);
  els.resultCard.innerHTML=`
    <div class="lookup-state lookup-error">
      <div class="lookup-error-mark">!</div>
      <div>
        <div class="lookup-title">${escapeHTML(stage)}：${escapeHTML(query)}</div>
        <div class="lookup-steps">
          <span>请求已结束</span>
          <span>未保存历史</span>
          <span>可修改设置后重试</span>
        </div>
        <p>${escapeHTML(message)}</p>
      </div>
    </div>
  `;
  els.resultJson.innerHTML=`<pre class="error-pre">${escapeHTML(JSON.stringify({ok:false,stage,query,error:message},null,2))}</pre>`;
}
function lookupErrorMessage(error){
  const message=error?.message||String(error||'未知错误');
  return error?.status?`HTTP ${error.status}：${message}`:message;
}
function renderResult(result,{animate=false}={}){
  currentResult=result;
  clearLookupLoadingTimers();
  clearJSONTypewriter();
  els.resultJson.innerHTML=renderStructuredJSON(result);
  clearResultTypewriter();
  els.resultCard.innerHTML=renderResultHTML(result,currentFollowups,'current',getCurrentHistoryItem());
  if(animate){
    startResultTypewriter(els.resultCard);
    startJSONTypewriter(els.resultJson);
  }
}
function clearResultTypewriter(){
  resultTypewriterTimers.forEach(timer=>clearTimeout(timer));
  resultTypewriterTimers=[];
  els.resultCard?.classList.remove('result-typing');
  els.resultCard?.querySelectorAll('.typewriter-chunk').forEach(chunk=>chunk.classList.remove('typewriter-chunk','pending','active','typing'));
}
function clearJSONTypewriter(){
  jsonTypewriterTimers.forEach(timer=>clearTimeout(timer));
  jsonTypewriterTimers=[];
  els.resultJson?.classList.remove('json-typing');
  els.resultJson?.querySelectorAll('.json-section').forEach(section=>section.classList.remove('typing'));
}
function startJSONTypewriter(root){
  if(!root||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const sections=[...root.querySelectorAll('.json-section pre')]
    .map(pre=>({pre,section:pre.closest('.json-section'),text:pre.textContent||'',index:0}))
    .filter(item=>item.text.trim());
  if(!sections.length)return;
  root.classList.add('json-typing');
  sections.forEach(item=>{item.pre.textContent=''});
  let sectionIndex=0;
  const tick=()=>{
    const item=sections[sectionIndex];
    if(!item){
      root.classList.remove('json-typing');
      jsonTypewriterTimers=[];
      return;
    }
    sections.forEach(entry=>entry.section?.classList.toggle('typing',entry===item));
    const step=item.text.length>1400?12:item.text.length>700?8:5;
    item.index=Math.min(item.text.length,item.index+step);
    item.pre.textContent=item.text.slice(0,item.index);
    if(item.index>=item.text.length){
      item.pre.textContent=item.text;
      item.section?.classList.remove('typing');
      sectionIndex+=1;
      jsonTypewriterTimers.push(setTimeout(tick,80));
      return;
    }
    jsonTypewriterTimers.push(setTimeout(tick,16));
  };
  jsonTypewriterTimers.push(setTimeout(tick,80));
}
function startResultTypewriter(root){
  if(!root||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const containers=[...root.children].filter(node=>!node.matches('.followup-panel'));
  const chunks=containers.map(container=>{
    const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        if(!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;
        const parent=node.parentElement;
        if(!parent)return NodeFilter.FILTER_REJECT;
        if(parent.closest('button,textarea,input,select,pre,code,script,style,.result-icons,.json-section'))return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const parts=[];
    while(walker.nextNode()){
      const node=walker.currentNode;
      const text=node.nodeValue;
      const match=text.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const body=match?.[2]||'';
      if(!body.trim())continue;
      parts.push({node,prefix:match?.[1]||'',body,suffix:match?.[3]||'',index:0});
      node.nodeValue=match?.[1]||'';
    }
    return {container,parts,partIndex:0};
  }).filter(chunk=>chunk.parts.length);
  if(!chunks.length)return;
  root.classList.add('result-typing');
  chunks.forEach(chunk=>chunk.container.classList.add('typewriter-chunk','pending'));
  const total=chunks.reduce((sum,chunk)=>sum+chunk.parts.reduce((inner,item)=>inner+item.body.length,0),0);
  const step=total>2200?9:total>1200?6:4;
  let chunkIndex=0;
  const activateChunk=chunk=>{
    chunk.container.classList.remove('pending');
    chunk.container.classList.add('active','typing');
  };
  activateChunk(chunks[0]);
  const tick=()=>{
    const chunk=chunks[chunkIndex];
    if(!chunk){
      root.classList.remove('result-typing');
      resultTypewriterTimers=[];
      return;
    }
    const item=chunk.parts[chunk.partIndex];
    if(!item){
      chunk.container.classList.remove('typing');
      chunkIndex+=1;
      if(chunks[chunkIndex])activateChunk(chunks[chunkIndex]);
      resultTypewriterTimers.push(setTimeout(tick,70));
      return;
    }
    item.index=Math.min(item.body.length,item.index+step);
    item.node.nodeValue=item.prefix+item.body.slice(0,item.index);
    if(item.index>=item.body.length){
      item.node.nodeValue=item.prefix+item.body+item.suffix;
      chunk.partIndex+=1;
    }
    resultTypewriterTimers.push(setTimeout(tick,16));
  };
  resultTypewriterTimers.push(setTimeout(tick,40));
}
function renderResultHTML(result,followups=[],scope='current',historyItem=null){
  result=normalizeResultEntryType(result,result?.meta?.query||result?.headword?.title||historyItem?.query||'');
  const head=result.headword||{};
  const meta=result.meta||{};
  const senses=result.senses||[];
  const collocations=result.collocations||[];
  const register=result.register||{};
  const confusions=result.confusions||[];
  const queryTerms=resultQueryHighlightTerms(result);
  const related=relatedHistoryItems(result,scope);
  return `
    <div class="entry-head">
      <div class="entry-kicker">${escapeHTML([displayLanguageLabel(head.languageTag||meta.language),displayEntryTypeLabel(entryTypeForResult(result,historyItem?.query))].filter(Boolean).join(' · ')||'词条')}</div>
      <div class="entry-title">${escapeHTML(head.title||meta.query||'')}</div>
      ${head.coreMeaning?`<div class="entry-core"><b>核心义</b><mark>${escapeHTML(head.coreMeaning)}</mark></div>`:''}
      <div class="entry-meta-grid">
        <span><b>类型</b>${escapeHTML(displayEntryTypeLabel(entryTypeForResult(result,historyItem?.query)))}</span>
        <span><b>词性</b>${escapeHTML(headwordPartOfSpeech(head,senses))}</span>
        <span><b>方向</b>${escapeHTML(displayDirectionLabel(meta.defaultDirection||meta.direction,result)||'')}</span>
      </div>
      ${head.summary?`<div class="entry-meta">${escapeHTML(head.summary)}</div>`:''}
    </div>
    ${renderSenseGroups(senses,result)}
    ${renderItems('固定搭配',collocations,item=>`
      <div class="item-index">${escapeHTML(item.index)}</div>
      <div class="item-body">
        <div class="item-title"><mark>${escapeHTML(item.phrase)}</mark>${item.note?`<span class="chip">${escapeHTML(item.note)}</span>`:''}</div>
        <div class="line"><b>语意</b><span>${escapeHTML(item.meaning||'')}</span></div>
        <div class="line"><b>例句</b><span>${highlightText(item.example,exampleHighlightTermsForItem(item,queryTerms))}</span></div>
        <div class="line"><b>译文</b><span>${highlightText(item.translation,translationHighlightTermsForItem(item,result))}</span></div>
      </div>
    `)}
    <div class="block">
      <div class="block-title">语义感受与使用说明</div>
      <div class="register-grid">
        <div><b>语体属性</b><span>${escapeHTML(displayStyleLabel(register.style)||'')}</span></div>
        <div><b>语义气质</b><span>${escapeHTML(register.tone||'')}</span></div>
        <div><b>使用环境</b><span>${escapeHTML(register.environment||'')}</span></div>
      </div>
    </div>
    ${renderConfusions(confusions)}
    ${renderRelatedHistory(related)}
    ${renderHistoryNoteBlock(historyItem)}
    ${renderFollowupHTML(followups,scope)}
  `;
}
function renderItems(title,items,renderer){
  return `<div class="block"><div class="block-title">${title}</div>${items.length?items.map(item=>`<div class="item">${renderer(item)}</div>`).join(''):'<div class="item empty-item">无</div>'}</div>`;
}
function renderSenseGroups(senses=[],result={}){
  const list=Array.isArray(senses)?senses:[];
  if(!list.length)return '<div class="block"><div class="block-title">义项分析</div><div class="item empty-item">无</div></div>';
  const groups=groupSensesByPartOfSpeech(list);
  const queryTerms=resultQueryHighlightTerms(result);
  return `<div class="block"><div class="block-title">义项分析</div>${groups.map(group=>`
    <section class="sense-group">
      <div class="sense-group-head">
        <span class="pos-pill">${escapeHTML(formatPosLabel(group.pos))}</span>
        <em>${group.items.length} 个义项</em>
      </div>
      ${group.items.map((item,index)=>`<div class="item">
        <div class="item-index">${index+1}</div>
        <div class="item-body">
          <div class="item-title"><mark>${escapeHTML(item.shortestLabel)}</mark></div>
          <div class="line"><b>语意</b><span>${escapeHTML(item.meaning||'')}</span></div>
          <div class="line"><b>例句</b><span>${highlightText(item.example,exampleHighlightTermsForItem(item,queryTerms))}</span></div>
          <div class="line"><b>译文</b><span>${highlightText(item.translation,translationHighlightTermsForItem(item,result))}</span></div>
        </div>
      </div>`).join('')}
    </section>
  `).join('')}</div>`;
}
function resultQueryHighlightTerms(result={}){
  const head=result.headword||{};
  const meta=result.meta||{};
  return uniq([
    meta.normalized,
    meta.query,
    head.title,
    ...tildeHighlightFragments(meta.normalized),
    ...tildeHighlightFragments(meta.query),
    ...tildeHighlightFragments(head.title),
  ].map(value=>String(value||'').trim()).filter(value=>value.length>=2));
}
function exampleHighlightTermsForItem(item={},queryTerms=[]){
  return uniq([
    ...(Array.isArray(queryTerms)?queryTerms:[queryTerms]),
    ...tildeHighlightFragments(item.shortestLabel),
    ...tildeHighlightFragments(item.phrase),
    ...rawList(item.exampleHighlights),
    ...rawList(item.sourceHighlights),
    ...rawList(item.inflectedForms),
  ].map(value=>String(value||'').trim()).filter(value=>value.length>=2));
}
function translationHighlightTermsForItem(item={},result={}){
  const explicit=rawList(item.translationHighlights)
    .map(value=>String(value||'').trim())
    .filter(value=>value.length>=2&&value.length<=40);
  const terms=[
    ...explicit,
    ...semanticLabelCandidates(item.shortestLabel),
    ...semanticLabelCandidates(item.phraseTranslation),
    ...semanticLabelCandidates(item.meaning),
  ];
  const head=result.headword||{};
  terms.push(...semanticLabelCandidates(head.coreMeaning));
  return uniq(terms.map(value=>String(value||'').trim()).filter(value=>value.length>=2&&value.length<=40)).slice(0,10);
}
function semanticLabelCandidates(value){
  const raw=String(value||'').trim();
  if(!raw)return [];
  const withoutParen=raw.replace(/[（(][^）)]*[）)]/g,' ');
  const chunks=withoutParen
    .split(/[，。；;、]/)
    .map(part=>part.trim())
    .filter(Boolean)
    .slice(0,1);
  const candidates=[];
  chunks.forEach(chunk=>{
    const compact=chunk
      .replace(/\s+/g,'')
      .replace(/相当于.*$/,'')
      .replace(/用于.*$/,'')
      .replace(/表示/, '')
      .trim();
    if(!compact)return;
    candidates.push(compact);
    compact.split(/[.。…·—-]+/).forEach(part=>{
      const cleaned=part.trim();
      if(cleaned.length>=2)candidates.push(cleaned);
    });
    if(/除[.。…·—-]*外/.test(compact)){
      candidates.push('除了','除外','除此之外');
    }
  });
  return uniq(candidates.filter(term=>/[\u3400-\u9fff]/.test(term)));
}
function tildeHighlightFragments(value){
  const raw=String(value||'').trim();
  if(!/[~～…]/.test(raw))return [];
  return uniq(raw
    .split(/[~～…]+/)
    .map(part=>part.replace(/[（）()[\]{}"'“”‘’、，。；;:：,.\s]+/g,' ').trim())
    .flatMap(part=>part.split(/\s+/))
    .map(part=>part.trim())
    .filter(part=>part.length>=2));
}
function escapeRegExp(value){
  return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}
function englishInflectionVariants(term){
  const value=String(term||'').trim();
  if(!/^[A-Za-z][A-Za-z'-]*$/.test(value))return [value];
  const variants=new Set([value]);
  const lower=value.toLowerCase();
  const add=suffix=>variants.add(value+suffix);
  add('s');
  add('es');
  add('ed');
  add('d');
  add('ing');
  if(/[bcdfghjklmnpqrstvwxyz]y$/i.test(value)){
    variants.add(value.slice(0,-1)+'ies');
    variants.add(value.slice(0,-1)+'ied');
  }
  if(/e$/i.test(value)&&!/(ee|ye|oe)$/i.test(value)){
    variants.add(value.slice(0,-1)+'ing');
  }
  if(/[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/i.test(value)&&!/w|x|y$/i.test(lower)){
    variants.add(value+value.slice(-1)+'ed');
    variants.add(value+value.slice(-1)+'ing');
  }
  return [...variants].sort((a,b)=>b.length-a.length);
}
function highlightPatternForTerm(term){
  const raw=String(term||'').trim();
  if(!raw)return '';
  if(/^[A-Za-z][A-Za-z'-]*$/.test(raw)){
    const variants=englishInflectionVariants(raw)
      .map(value=>escapeRegExp(escapeHTML(value)))
      .filter(Boolean);
    return variants.length?`\\b(?:${variants.join('|')})\\b`:'';
  }
  const escaped=raw.split(/\s+/).map(part=>escapeRegExp(escapeHTML(part))).join('\\s+');
  return escaped;
}
function highlightText(value,terms=[]){
  const escaped=escapeHTML(value||'');
  const tokens=uniq((Array.isArray(terms)?terms:[terms])
    .map(term=>String(term||'').trim())
    .filter(term=>term.length>=2))
    .sort((a,b)=>b.length-a.length)
    .slice(0,8)
    .map(highlightPatternForTerm)
    .filter(Boolean);
  if(!tokens.length)return escaped;
  return escaped.replace(new RegExp(`(${tokens.join('|')})`,'gi'),'<mark class="hit-mark">$1</mark>');
}
function groupSensesByPartOfSpeech(senses=[]){
  const groups=new Map();
  senses.forEach(sense=>{
    const tokens=posTokensFromValue(sense.partOfSpeech);
    const pos=tokens[0]||String(sense.partOfSpeech||'other').trim()||'other';
    if(!groups.has(pos))groups.set(pos,[]);
    groups.get(pos).push(sense);
  });
  return [...groups.entries()]
    .map(([pos,items],order)=>({pos,items,order}))
    .sort((a,b)=>posSortIndex(a.pos)-posSortIndex(b.pos)||a.order-b.order);
}
function headwordPartOfSpeech(head={},senses=[]){
  const tokens=uniq([
    ...posTokensFromValue(head.basicPartOfSpeech),
    ...(Array.isArray(senses)?senses.flatMap(sense=>posTokensFromValue(sense.partOfSpeech)):[]),
  ]);
  if(tokens.length)return tokens.map(formatPosLabel).join(' / ');
  return String(head.basicPartOfSpeech||'');
}
function posTokensFromValue(value){
  if(Array.isArray(value))return uniq(value.flatMap(posTokensFromValue));
  return canonicalPosTokens(value);
}
function formatPosLabel(value){
  const token=posTokensFromValue(value)[0]||String(value||'other');
  return displayFieldLabel('pos',token);
}
function posSortIndex(value){
  const order=['n','v','adj','adv','prep','conj','pron','det','aux','interj','phrase','sentence','other'];
  const index=order.indexOf(posTokensFromValue(value)[0]||value);
  return index>=0?index:order.length;
}
function renderConfusions(items){
  if(!items.length)return '';
  return `<div class="block"><div class="block-title">近义词 / 易混词辨析</div><table class="confusion-table"><thead><tr><th>词</th><th>核心区别</th><th>语体/使用倾向</th></tr></thead><tbody>${items.map(item=>`<tr><td><mark>${escapeHTML(item.term)}</mark></td><td>${escapeHTML(item.difference)}</td><td>${escapeHTML(item.usage)}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderRelatedHistory(items=[]){
  if(!items.length)return '';
  return `<div class="block related-block">
    <div class="block-title">相关历史词条</div>
    <div class="related-list">
      ${items.map(item=>{
        const summary=historyEntrySummary(item);
        const meta=historyEntryMeta(item);
        return `<button class="related-item" type="button" onclick="openRelatedHistory(${Number(item.id)},event)">
          <span class="related-word">${escapeHTML(item.query)}</span>
          ${summary?`<span class="related-summary">${escapeHTML(summary)}</span>`:''}
          <span class="related-meta">${meta.map(label=>`<em>${escapeHTML(label)}</em>`).join('')}</span>
        </button>`;
      }).join('')}
    </div>
  </div>`;
}
function renderHistoryNoteBlock(item){
  const normalized=item?normalizeHistoryItem(item):null;
  if(!normalized||(!normalized.tags.length&&!normalized.note))return '';
  return `<div class="block note-block">
    <div class="block-title">个人整理</div>
    ${renderHistoryTags(normalized.tags)}
    ${normalized.note?`<div class="history-note followup-answer">${formatFollowupAnswer(normalized.note)}</div>`:''}
  </div>`;
}
function relatedHistoryItems(result={},scope='current'){
  const selfId=scope==='modal'?modalHistoryId:currentHistoryId;
  const query=historyRelationKey(result.meta?.normalized||result.meta?.query||result.headword?.title||'');
  if(!query)return [];
  return getHistory()
    .map(normalizeHistoryItem)
    .filter(item=>Number(item.id)!==Number(selfId))
    .map(item=>({item,key:historyRelationKey(item.query)}))
    .filter(({key})=>key&&key!==query&&(key.includes(query)||query.includes(key)))
    .sort((a,b)=>Math.abs(a.key.length-query.length)-Math.abs(b.key.length-query.length)||new Date(b.item.updatedAt||b.item.createdAt)-new Date(a.item.updatedAt||a.item.createdAt))
    .slice(0,6)
    .map(({item})=>item);
}
function historyRelationKey(value){
  return normalizeSearch(value).replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
function openRelatedHistory(id,event){
  event?.stopPropagation();
  openHistoryModal(id);
}
function renderStructuredJSON(result){
  const sections=[
    ['meta','元信息',result.meta],
    ['headword','词条标题',result.headword],
    ['senses','义项分析',result.senses],
    ['collocations','固定搭配',result.collocations],
    ['register','语感说明',result.register],
    ['confusions','易混辨析',result.confusions],
  ];
  return `<div class="json-sections">${sections.map(([key,title,value])=>`
    <details class="json-section" open>
      <summary><span>${escapeHTML(title)}</span><code>${escapeHTML(key)}</code></summary>
      <pre>${escapeHTML(JSON.stringify(value??(Array.isArray(value)?[]:{}),null,2))}</pre>
    </details>
  `).join('')}</div>`;
}
function renderFollowupHTML(followups=[],scope='current'){
  const list=Array.isArray(followups)?[...followups]:[];
  if(pendingFollowup?.scope===scope)list.push(pendingFollowup.item);
  const inputId=scope==='modal'?'modal-followup-input':'followup-input';
  const buttonCall=scope==='modal'?'askModalFollowup()':'askCurrentFollowup()';
  return `
    <div class="followup-panel">
      <div class="block-title">追问</div>
      <div class="followup-list">
        ${list.length?list.map(item=>renderFollowupItem(item,scope)).join(''):'<div class="followup-empty">可以继续追问这个词条，回答会保存在历史记录里。</div>'}
      </div>
      <div class="followup-compose">
        <textarea id="${inputId}" rows="2" placeholder="针对这个结果继续问，比如：这个词写作里怎么用？和另一个词差在哪？"></textarea>
        <button class="plain-btn primary-btn" onclick="${buttonCall}">发送</button>
      </div>
    </div>
  `;
}
function renderFollowupItem(item,scope){
  const id=Number(item.id);
  if(editingFollowup&&editingFollowup.scope===scope&&Number(editingFollowup.id)===id){
    return `
      <article class="followup-item editing">
        <label class="setting-field">
          <span>问题</span>
          <textarea class="followup-edit-input" id="followup-edit-question-${scope}-${id}">${escapeHTML(item.question)}</textarea>
        </label>
        <label class="setting-field">
          <span>回答</span>
          <textarea class="followup-edit-input answer" id="followup-edit-answer-${scope}-${id}">${escapeHTML(item.answer)}</textarea>
        </label>
        <div class="followup-actions">
          <button class="plain-btn primary-btn" onclick="saveFollowupEdit('${scope}',${id})">保存</button>
          <button class="plain-btn ghost-btn" onclick="cancelFollowupEdit('${scope}')">取消</button>
        </div>
      </article>
    `;
  }
  return `
    <article class="followup-item ${item.pending?'pending':''}">
      <div class="followup-question"><b>问</b><span>${escapeHTML(item.question)}</span></div>
      <div class="followup-answer">${formatFollowupAnswer(item.answer)}</div>
      <div class="followup-actions">
        ${item.pending?'':`
          <button class="plain-btn ghost-btn" onclick="editFollowup('${scope}',${id})">编辑</button>
          <button class="danger-btn" onclick="deleteFollowup('${scope}',${id})">删除</button>
        `}
      </div>
    </article>
  `;
}
function formatFollowupAnswer(answer){
  const text=String(answer||'').replace(/\r\n?/g,'\n').trim();
  if(!text)return '<p>无内容</p>';
  const lines=text.split('\n');
  const html=[];
  let index=0;
  const isBlank=line=>!line.trim();
  const isFence=line=>/^```/.test(line.trim());
  const isHeading=line=>/^#{1,4}\s+\S/.test(line.trim());
  const isQuote=line=>/^>\s?/.test(line.trim());
  const isHr=line=>/^([-*_])(?:\s*\1){2,}\s*$/.test(line.trim());
  const isUnordered=line=>/^[-*•]\s+\S/.test(line.trim());
  const isOrdered=line=>/^\d+[.)]\s+\S/.test(line.trim());
  const tableCells=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
  const isTableDivider=line=>{
    const cells=tableCells(line);
    return cells.length>1&&cells.every(cell=>/^:?-{3,}:?$/.test(cell));
  };
  const isTableRow=line=>line.includes('|')&&tableCells(line).length>1;
  const isTableStart=i=>isTableRow(lines[i]||'')&&isTableDivider(lines[i+1]||'');
  const formatTableCell=cell=>formatInlineMarkdown(cell)
    .replace(/&lt;br\s*\/?&gt;/gi,'<br>')
    .replace(/\s*<br\s*\/?>\s*/gi,'<br>');
  const renderTable=(rows)=>{
    const header=tableCells(rows[0]);
    const align=tableCells(rows[1]).map(cell=>cell.startsWith(':')&&cell.endsWith(':')?'center':cell.endsWith(':')?'right':cell.startsWith(':')?'left':'');
    const body=rows.slice(2).map(row=>tableCells(row));
    const cellAttrs=index=>align[index]?` style="text-align:${align[index]}"`:'';
    const cols=Math.max(header.length,1);
    const colMin=cols>=7?132:cols>=5?146:cols>=4?154:168;
    const mobileColMin=cols>=7?118:cols>=5?126:cols>=4?134:142;
    return `<div class="md-table-wrap" style="--cols:${cols};--col-min:${colMin}px;--mobile-col-min:${mobileColMin}px"><table><thead><tr>${header.map((cell,index)=>`<th${cellAttrs(index)}>${formatTableCell(cell)}</th>`).join('')}</tr></thead><tbody>${body.map(row=>`<tr>${header.map((_,index)=>`<td${cellAttrs(index)}>${formatTableCell(row[index]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  const isBlockStart=(line,i=index)=>isBlank(line)||isFence(line)||isHeading(line)||isQuote(line)||isHr(line)||isUnordered(line)||isOrdered(line)||isTableStart(i);
  while(index<lines.length){
    const line=lines[index];
    if(isBlank(line)){index+=1;continue}
    if(isFence(line)){
      const language=line.trim().replace(/^```/,'').trim();
      index+=1;
      const code=[];
      while(index<lines.length&&!isFence(lines[index])){
        code.push(lines[index]);
        index+=1;
      }
      if(index<lines.length&&isFence(lines[index]))index+=1;
      html.push(`<pre class="md-code-block"${language?` data-lang="${escapeHTML(language)}"`:''}><code>${escapeHTML(code.join('\n'))}</code></pre>`);
      continue;
    }
    if(isQuote(line)){
      const quote=[];
      while(index<lines.length&&(isQuote(lines[index])||isBlank(lines[index]))){
        quote.push(isQuote(lines[index])?lines[index].trim().replace(/^>\s?/,''):lines[index]);
        index+=1;
      }
      html.push(`<blockquote>${formatFollowupAnswer(quote.join('\n'))}</blockquote>`);
      continue;
    }
    if(isTableStart(index)){
      const rows=[lines[index],lines[index+1]];
      index+=2;
      while(index<lines.length&&isTableRow(lines[index])&&!isBlank(lines[index])){
        rows.push(lines[index]);
        index+=1;
      }
      html.push(renderTable(rows));
      continue;
    }
    if(isHeading(line)){
      html.push(`<h4>${formatInlineMarkdown(line.trim().replace(/^#{1,4}\s+/,''))}</h4>`);
      index+=1;
      continue;
    }
    if(isHr(line)){
      html.push('<hr>');
      index+=1;
      continue;
    }
    if(isUnordered(line)){
      const items=[];
      while(index<lines.length&&isUnordered(lines[index])){
        items.push(lines[index].trim().replace(/^[-*•]\s+/,''));
        index+=1;
      }
      html.push(`<ul>${items.map(item=>`<li>${formatInlineMarkdown(item)}</li>`).join('')}</ul>`);
      continue;
    }
    if(isOrdered(line)){
      const items=[];
      while(index<lines.length&&isOrdered(lines[index])){
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/,''));
        index+=1;
      }
      html.push(`<ol>${items.map(item=>`<li>${formatInlineMarkdown(item)}</li>`).join('')}</ol>`);
      continue;
    }
    const paragraph=[];
    while(index<lines.length&&!isBlockStart(lines[index],index)){
      paragraph.push(lines[index].trim());
      index+=1;
    }
    html.push(`<p>${formatInlineMarkdown(paragraph.join('\n')).replace(/\n/g,'<br>')}</p>`);
  }
  return html.join('');
}
function formatInlineMarkdown(value){
  const codeSpans=[];
  const escaped=escapeHTML(value).replace(/`([^`]+)`/g,(_,code)=>{
    const token=`@@CODE_${codeSpans.length}@@`;
    codeSpans.push(`<code>${code}</code>`);
    return token;
  });
  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/__([^_]+)__/g,'<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g,'<del>$1</del>')
    .replace(/(^|[\s（(])\*([^*\n]+)\*/g,'$1<em>$2</em>')
    .replace(/(^|[\s（(])_([^_\n]+)_/g,'$1<em>$2</em>')
    .replace(/@@CODE_(\d+)@@/g,(_,index)=>codeSpans[Number(index)]||'');
}
function getCurrentHistoryItem(){
  return getHistory().find(item=>Number(item.id)===Number(currentHistoryId));
}
function saveFollowupsForCurrent(followups){
  currentFollowups=followups;
  const history=getHistory().map(item=>Number(item.id)===Number(currentHistoryId)?{...item,followups,updatedAt:new Date().toISOString()}:item);
  setHistory(history);
  renderResult(currentResult);
}
function saveFollowupsForModal(followups){
  const history=getHistory().map(item=>Number(item.id)===Number(modalHistoryId)?{...item,followups,updatedAt:new Date().toISOString()}:item);
  setHistory(history);
  const updated=getHistory().find(item=>Number(item.id)===Number(modalHistoryId));
  if(updated){
    els.modalCardPage.innerHTML=renderResultHTML(modalResult||updated.result,updated.followups||[],'modal',updated);
    renderModalRollbar(updated);
  }
  if(Number(modalHistoryId)===Number(currentHistoryId))saveFollowupsForCurrent(followups);
}
function setPendingFollowup(scope,question){
  pendingFollowup={
    scope,
    item:{id:Date.now(),question,answer:'正在连接模型...',createdAt:new Date().toISOString(),pending:true},
  };
  rerenderFollowupScope(scope);
}
function updatePendingFollowup(scope,answer){
  if(pendingFollowup?.scope!==scope)return;
  pendingFollowup.item={...pendingFollowup.item,answer:answer||'正在生成回答...'};
  rerenderFollowupScope(scope);
}
function clearPendingFollowup(scope){
  if(pendingFollowup?.scope===scope)pendingFollowup=null;
}
async function readFollowupStream(response,onDelta){
  const reader=response.body?.getReader();
  if(!reader)throw new Error('当前浏览器无法读取流式回答。');
  const decoder=new TextDecoder();
  let buffer='';
  let answer='';
  const handleEvent=event=>{
    const lines=event.split(/\r?\n/).filter(line=>line.startsWith('data:'));
    for(const line of lines){
      const raw=line.slice(5).trim();
      if(!raw)continue;
      if(raw==='[DONE]')return true;
      let data=null;
      try{data=JSON.parse(raw)}catch{continue}
      if(data.error)throw new Error(data.error);
      if(data.delta){
        answer+=String(data.delta);
        onDelta?.(answer);
      }
      if(data.done)return true;
    }
    return false;
  };
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    buffer+=decoder.decode(value,{stream:true});
    const events=buffer.split(/\r?\n\r?\n/);
    buffer=events.pop()||'';
    for(const event of events){
      if(handleEvent(event))return answer.trim();
    }
  }
  if(buffer&&handleEvent(buffer))return answer.trim();
  return answer.trim();
}
async function requestFollowup(question,baseItem,{scope=null,onDelta=null}={}){
  const settings=currentApiSettings();
  const hasLocalEndpoint=Boolean(settings.apiUrl&&settings.apiKey);
  const response=await fetch('/api/followup',{
    method:'POST',
    headers:await analyzeHeaders(hasLocalEndpoint),
    body:JSON.stringify({
      question,
      result:baseItem.result,
      followups:baseItem.followups||[],
      apiUrl:hasLocalEndpoint?settings.apiUrl:'',
      apiKey:hasLocalEndpoint?settings.apiKey:'',
      model:hasLocalEndpoint?settings.model:'',
      stream:true,
    }),
  });
  const contentType=response.headers.get('content-type')||'';
  if(response.ok&&response.body&&contentType.includes('text/event-stream')){
    const streamed=await readFollowupStream(response,onDelta);
    if(streamed)return streamed;
    throw new Error('模型没有返回追问内容。');
  }
  let data=null;
  try{
    data=await response.json();
  }catch{
    throw new Error(response.ok?'追问接口返回格式异常。':'追问失败，接口没有返回可解析的错误信息。');
  }
  if(!response.ok)throw new Error(data.error||'追问失败');
  if(!data.answer)throw new Error('模型没有返回追问内容。');
  if(scope&&data.answer)onDelta?.(data.answer);
  return data.answer;
}
async function askCurrentFollowup(){
  if(followupBusy)return;
  const input=document.getElementById('followup-input');
  const question=input?.value.trim()||'';
  if(!question)return notify('请输入追问内容。','bad','追问');
  const baseItem=getCurrentHistoryItem()||{id:currentHistoryId,result:currentResult,followups:currentFollowups};
  if(!baseItem.result)return notify('还没有可追问的结果。','bad','追问');
  input.value='';
  setPendingFollowup('current',question);
  followupBusy=true;
  document.body.classList.add('followup-busy');
  try{
    notify('正在追问，回答会边生成边显示。','info','追问中');
    const answer=await requestFollowup(question,baseItem,{
      scope:'current',
      onDelta:answer=>updatePendingFollowup('current',answer),
    });
    const followups=[...(baseItem.followups||[]),{id:Date.now(),question,answer,createdAt:new Date().toISOString()}];
    clearPendingFollowup('current');
    saveFollowupsForCurrent(followups);
    notify('追问已保存。','good','追问完成');
  }catch(error){
    clearPendingFollowup('current');
    rerenderFollowupScope('current');
    notify(error.message||'追问失败。','bad','追问失败');
  }finally{
    followupBusy=false;
    document.body.classList.remove('followup-busy');
  }
}
async function askModalFollowup(){
  if(followupBusy)return;
  const input=document.getElementById('modal-followup-input');
  const question=input?.value.trim()||'';
  if(!question)return notify('请输入追问内容。','bad','追问');
  const baseItem=getHistory().find(item=>Number(item.id)===Number(modalHistoryId));
  if(!baseItem)return notify('找不到这条历史记录。','bad','追问');
  input.value='';
  setPendingFollowup('modal',question);
  followupBusy=true;
  document.body.classList.add('followup-busy');
  try{
    notify('正在追问，回答会边生成边显示。','info','追问中');
    const answer=await requestFollowup(question,baseItem,{
      scope:'modal',
      onDelta:answer=>updatePendingFollowup('modal',answer),
    });
    const followups=[...(baseItem.followups||[]),{id:Date.now(),question,answer,createdAt:new Date().toISOString()}];
    clearPendingFollowup('modal');
    saveFollowupsForModal(followups);
    notify('追问已保存。','good','追问完成');
  }catch(error){
    clearPendingFollowup('modal');
    rerenderFollowupScope('modal');
    notify(error.message||'追问失败。','bad','追问失败');
  }finally{
    followupBusy=false;
    document.body.classList.remove('followup-busy');
  }
}
async function deleteFollowup(scope,id){
  if(!await askConfirm('确认删除这条追问？','删除追问'))return;
  if(scope==='modal'){
    const item=getHistory().find(row=>Number(row.id)===Number(modalHistoryId));
    saveFollowupsForModal((item?.followups||[]).filter(row=>Number(row.id)!==Number(id)));
  }else{
    saveFollowupsForCurrent((currentFollowups||[]).filter(row=>Number(row.id)!==Number(id)));
  }
  notify('追问已删除。','good','追问');
}
function editFollowup(scope,id){
  editingFollowup={scope,id};
  rerenderFollowupScope(scope);
}
function cancelFollowupEdit(scope){
  editingFollowup=null;
  rerenderFollowupScope(scope);
}
function saveFollowupEdit(scope,id){
  const source=scope==='modal'
    ? (getHistory().find(row=>Number(row.id)===Number(modalHistoryId))?.followups||[])
    : currentFollowups;
  const question=document.getElementById(`followup-edit-question-${scope}-${id}`)?.value.trim()||'';
  const answer=document.getElementById(`followup-edit-answer-${scope}-${id}`)?.value.trim()||'';
  if(!question||!answer){
    notify('问题和回答都不能为空。','bad','保存失败');
    return;
  }
  const next=source.map(row=>Number(row.id)===Number(id)?{...row,question,answer,updatedAt:new Date().toISOString()}:row);
  editingFollowup=null;
  if(scope==='modal')saveFollowupsForModal(next);
  else saveFollowupsForCurrent(next);
  notify('追问已编辑。','good','追问');
}
function rerenderFollowupScope(scope){
  if(scope==='modal'){
    const item=getHistory().find(row=>Number(row.id)===Number(modalHistoryId));
    if(item)els.modalCardPage.innerHTML=renderResultHTML(modalResult||item.result,item.followups||[],'modal',item);
    return;
  }
  if(currentResult)renderResult(currentResult);
}
async function runLookup(){
  try{
    const query=els.query.value.trim();
    if(!query)return notify('请输入要查的内容。','bad','无法查询');
    const existing=findHistoryByQuery(query);
    if(existing&&!lookupBusy){
      const rolls=getHistoryRolls(existing).length;
      notify(`“${query}” 已有历史记录，请确认是否重新生成。`,'info','已有记录');
      const ok=await askConfirm(`“${query}” 已经有历史记录${rolls>1?`（${rolls} 个版本）`:''}。确认重新生成并保留为新版本？取消则打开已有记录。`,'已有记录');
      if(!ok){
        showView('history',document.getElementById('nav-history'));
        openHistoryModal(existing.id);
        return;
      }
    }
    await submitLookup({query,existingId:existing?.id||null,direction:els.direction.value.trim(),note:els.note.value.trim()});
  }catch(error){
    console.error(error);
    notify(error?.message||'查询入口异常，请刷新后重试。','bad','无法查询');
  }
}
async function submitLookup(request){
  const signature=lookupRequestSignature(request);
  if(lookupBusy){
    if(signature&&signature===activeLookupSignature){
      notify(`“${request.query}” 正在查询中。`,'info','查询中');
      return;
    }
    if(signature&&lookupQueue.some(item=>item.signature===signature)){
      notify(`“${request.query}” 已在查询队列里。`,'info','已排队');
      return;
    }
    enqueueLookup(request);
    return;
  }
  await performLookup(request);
}
function lookupRequestSignature(request){
  if(!request)return'';
  const query=normalizeSearch(request.query||'');
  const direction=normalizeSearch(request.direction||'');
  const note=normalizeSearch(request.note||'');
  const existingId=String(request.existingId||'');
  return [query,direction,note,existingId].join('\u001f');
}
function enqueueLookup(request){
  const item={...request,id:++lookupQueueId,queuedAt:new Date().toISOString(),signature:lookupRequestSignature(request)};
  lookupQueue.push(item);
  renderLookupQueue();
  notify(`“${item.query}” 已加入查询队列。`,'info','已排队');
}
function renderLookupQueue(){
  if(!els.lookupQueue)return;
  if(!lookupQueue.length){
    els.lookupQueue.innerHTML='';
    els.lookupQueue.classList.remove('open');
    return;
  }
  els.lookupQueue.classList.add('open');
  els.lookupQueue.innerHTML=`
    <div class="queue-head"><b>查询队列</b><span>${lookupQueue.length} 条等待</span></div>
    <div class="queue-list">
      ${lookupQueue.map((item,index)=>`
        <article class="queue-item">
          <div class="queue-index">${index+1}</div>
          <div class="queue-copy">
            <strong>${escapeHTML(item.query)}</strong>
            <span>${escapeHTML([item.direction,item.note].filter(Boolean).join(' · ')||'默认规则')}</span>
          </div>
          <div class="queue-actions">
            <button class="icon-btn" data-tip="上移" onclick="moveLookupQueueItem(${Number(item.id)},-1)">↑</button>
            <button class="icon-btn" data-tip="下移" onclick="moveLookupQueueItem(${Number(item.id)},1)">↓</button>
            <button class="icon-btn" data-tip="插队到最前" onclick="promoteLookupQueueItem(${Number(item.id)})">↟</button>
            <button class="icon-btn danger-icon" data-tip="移除" onclick="removeLookupQueueItem(${Number(item.id)})">×</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}
function moveLookupQueueItem(id,delta){
  const index=lookupQueue.findIndex(item=>Number(item.id)===Number(id));
  if(index<0)return;
  const nextIndex=Math.max(0,Math.min(lookupQueue.length-1,index+delta));
  if(nextIndex===index)return;
  const [item]=lookupQueue.splice(index,1);
  lookupQueue.splice(nextIndex,0,item);
  renderLookupQueue();
}
function promoteLookupQueueItem(id){
  const index=lookupQueue.findIndex(item=>Number(item.id)===Number(id));
  if(index<=0)return;
  const [item]=lookupQueue.splice(index,1);
  lookupQueue.unshift(item);
  renderLookupQueue();
}
function removeLookupQueueItem(id){
  lookupQueue=lookupQueue.filter(item=>Number(item.id)!==Number(id));
  renderLookupQueue();
}
function clearLookupQueue(){
  lookupQueue=[];
  renderLookupQueue();
}
function processNextLookup(){
  if(lookupBusy||!lookupQueue.length)return;
  const next=lookupQueue.shift();
  renderLookupQueue();
  applyLookupRequestToEditor(next);
  performLookup(next);
}
function applyLookupRequestToEditor(request){
  if(!request)return;
  if(els.query)els.query.value=request.query||'';
  if(els.direction)els.direction.value=request.direction||'';
  if(els.note)els.note.value=request.note||'';
  updateEditorState();
}
async function performLookup({query,existingId=null,sourceItem=null,direction=null,note=null}){
  const request={query,existingId,sourceItem,direction,note};
  const settings=currentApiSettings();
  lookupBusy=true;
  activeLookupSignature=lookupRequestSignature(request);
  const runId=++lookupRunId;
  document.body.classList.add('lookup-busy');
  renderLookupLoading(query,settings,runId);
  notify('正在发送请求，模型返回后会自动校验 JSON。','info','查询中');
  const hasLocalEndpoint=Boolean(settings.apiUrl&&settings.apiKey);
  const modelInfo=lookupModelInfo(settings,hasLocalEndpoint);
  const payload={
    query,
    direction:direction??els.direction.value.trim(),
    note:note??els.note.value.trim(),
    apiUrl:hasLocalEndpoint?settings.apiUrl:'',
    apiKey:hasLocalEndpoint?settings.apiKey:'',
    model:hasLocalEndpoint?settings.model:'',
    systemPrompt:settings.modelPrompt||'',
  };
  try{
    const data=await fetchLookupWithRetry({query,payload,hasLocalEndpoint,runId});
    if(isStaleLookup(runId,query))return;
    const saved=saveLookupResult({query,result:data,existingId,sourceItem,modelInfo});
    currentHistoryId=saved.id;
    currentFollowups=saved.followups||[];
    renderResult(data,{animate:false});
    notify(existingId?'新版本已保存。':'结果已生成。','good','查询完成');
  }catch(error){
    if(isStaleLookup(runId,query))return;
    renderLookupError(query,error);
    notify(error.message||'查询失败。','bad','查询失败');
  }finally{
    if(runId===lookupRunId){
      lookupBusy=false;
      activeLookupSignature='';
      document.body.classList.remove('lookup-busy');
      processNextLookup();
    }
  }
}
async function fetchLookupWithRetry({query,payload,hasLocalEndpoint,runId}){
  let lastError=null;
  for(let attempt=1;attempt<=LOOKUP_MAX_ATTEMPTS;attempt+=1){
    try{
      const response=await fetch('/api/analyze',{
        method:'POST',
        headers:await analyzeHeaders(hasLocalEndpoint),
        body:JSON.stringify({...payload,stream:true}),
      });
      const contentType=response.headers.get('content-type')||'';
      const data=response.ok&&response.body&&contentType.includes('text/event-stream')
        ? await readLookupStream(response,{query,runId})
        : await parseLookupResponse(response);
      if(!response.ok)throw lookupHttpError(response,data);
      return data;
    }catch(error){
      lastError=normalizeLookupError(error);
      if(isStaleLookup(runId,query))throw lastError;
      if(attempt<LOOKUP_MAX_ATTEMPTS&&isRetryableLookupError(lastError)){
        renderLookupRetry(query,lastError,attempt+1,LOOKUP_MAX_ATTEMPTS);
        notify(`查询遇到可恢复错误，准备第 ${attempt+1} 次尝试。`,'info','自动重试');
        await sleep(900+attempt*450);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError||new Error('查询失败');
}
async function readLookupStream(response,{query,runId}){
  const reader=response.body?.getReader();
  if(!reader)throw new Error('当前浏览器无法读取流式查询。');
  const decoder=new TextDecoder();
  let buffer='';
  let raw='';
  let finalResult=null;
  let streamStarted=false;
  const handleEvent=data=>{
    if(data.delta){
      if(!streamStarted){
        streamStarted=true;
        clearLookupLoadingTimers();
        clearJSONTypewriter();
      }
      raw+=String(data.delta);
      renderLookupStreamPreview(raw,query,runId,false);
    }
    if(data.result){
      finalResult=data.result;
      renderLookupStreamPreview(raw,query,runId,true);
    }
    if(data.error)throw new Error(data.error);
  };
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    if(isStaleLookup(runId,query))throw new Error('查询已被新的请求取代。');
    buffer+=decoder.decode(value,{stream:true});
    const events=buffer.split(/\r?\n\r?\n/);
    buffer=events.pop()||'';
    for(const event of events){
      for(const line of event.split(/\r?\n/)){
        if(!line.startsWith('data:'))continue;
        const rawLine=line.slice(5).trim();
        if(!rawLine)continue;
        let data=null;
        try{data=JSON.parse(rawLine)}catch{continue}
        handleEvent(data);
      }
    }
  }
  if(!finalResult)throw new Error('流式查询结束但没有收到校验后的 JSON。');
  return finalResult;
}
function decodeJSONText(value){
  try{return JSON.parse(`"${String(value||'')}"`)}catch{return String(value||'')}
}
function partialStringValue(raw,key){
  const match=String(raw||'').match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return match?decodeJSONText(match[1]):'';
}
function scanJSONObjectAt(text,start){
  let depth=0,inString=false,escaped=false;
  for(let index=start;index<text.length;index+=1){
    const char=text[index];
    if(inString){
      if(escaped){escaped=false;continue}
      if(char==='\\'){escaped=true;continue}
      if(char==='"')inString=false;
      continue;
    }
    if(char==='"'){inString=true;continue}
    if(char==='{')depth+=1;
    if(char==='}'){
      depth-=1;
      if(depth===0)return text.slice(start,index+1);
    }
  }
  return '';
}
function valueStartForKey(raw,key){
  const match=new RegExp(`"${key}"\\s*:`).exec(raw);
  if(!match)return -1;
  let index=match.index+match[0].length;
  while(/\s/.test(raw[index]||''))index+=1;
  return index;
}
function partialObjectValue(raw,key){
  const start=valueStartForKey(raw,key);
  if(start<0||raw[start]!=='{')return null;
  const json=scanJSONObjectAt(raw,start);
  if(!json)return null;
  try{return JSON.parse(json)}catch{return null}
}
function partialArrayObjects(raw,key){
  const start=valueStartForKey(raw,key);
  if(start<0||raw[start]!=='[')return [];
  const items=[];
  let index=start+1,inString=false,escaped=false;
  while(index<raw.length){
    const char=raw[index];
    if(inString){
      if(escaped){escaped=false;index+=1;continue}
      if(char==='\\'){escaped=true;index+=1;continue}
      if(char==='"')inString=false;
      index+=1;
      continue;
    }
    if(char==='"'){inString=true;index+=1;continue}
    if(char==='{'){
      const json=scanJSONObjectAt(raw,index);
      if(!json)break;
      try{items.push(JSON.parse(json))}catch{}
      index+=json.length;
      continue;
    }
    if(char===']')break;
    index+=1;
  }
  return items;
}
function partialLookupFromRaw(raw,query){
  return {
    meta:{
      query:partialStringValue(raw,'query')||query,
      normalized:partialStringValue(raw,'normalized'),
      language:partialStringValue(raw,'language'),
      defaultDirection:partialStringValue(raw,'defaultDirection'),
      entryType:partialStringValue(raw,'entryType'),
    },
    headword:{
      languageTag:partialStringValue(raw,'languageTag'),
      title:partialStringValue(raw,'title')||query,
      basicPartOfSpeech:partialStringValue(raw,'basicPartOfSpeech'),
      coreMeaning:partialStringValue(raw,'coreMeaning'),
      summary:partialStringValue(raw,'summary'),
    },
    senses:partialArrayObjects(raw,'senses'),
    collocations:partialArrayObjects(raw,'collocations'),
    register:partialObjectValue(raw,'register')||{},
    confusions:partialArrayObjects(raw,'confusions'),
  };
}
function lookupStreamProgress(partial,raw,done=false){
  if(done)return 100;
  let score=Math.min(10,Math.floor(String(raw||'').length/180));
  if(partial.headword.title)score+=10;
  if(partial.headword.coreMeaning)score+=14;
  if(partial.headword.summary)score+=8;
  score+=Math.min(24,(partial.senses||[]).length*8);
  score+=Math.min(16,(partial.collocations||[]).length*5);
  if(partial.register?.style||partial.register?.tone||partial.register?.environment)score+=12;
  score+=Math.min(10,(partial.confusions||[]).length*5);
  return Math.max(8,Math.min(96,score));
}
function renderLookupStreamPreview(raw,query,runId,done=false){
  if(isStaleLookup(runId,query))return;
  const pre=document.getElementById('lookup-stream-json')||els.resultJson.querySelector('pre');
  if(pre)pre.textContent=raw||'';
  const partial=partialLookupFromRaw(raw,query);
  setLookupStreamPercent(lookupStreamProgress(partial,raw,done));
  els.resultCard.innerHTML=renderLookupStreamHTML(partial,raw,done);
}
function streamValue(value,placeholder='正在生成'){
  const text=String(value||'').trim();
  return text?escapeHTML(text):`<span class="stream-placeholder">${placeholder}</span>`;
}
function renderLookupStreamItems(items,type){
  if(!items?.length)return '<div class="stream-empty">这一块还在生成...</div>';
  return items.slice(0,8).map((item,index)=>{
    if(type==='sense')return `<div class="item stream-item">
      <div class="item-index">${Number(index)+1}</div>
      <div class="item-body">
        <div class="item-title"><mark>${streamValue(item.shortestLabel||item.partOfSpeech,'义标生成中')}</mark></div>
        <div class="line"><b>语意</b><span>${streamValue(item.meaning)}</span></div>
        <div class="line"><b>例句</b><span>${streamValue(item.example)}</span></div>
        <div class="line"><b>译文</b><span>${streamValue(item.translation)}</span></div>
      </div>
    </div>`;
    if(type==='collocation')return `<div class="item stream-item">
      <div class="item-index">${Number(index)+1}</div>
      <div class="item-body">
        <div class="item-title"><mark>${streamValue(item.phrase,'搭配生成中')}</mark>${item.note?`<span class="chip">${escapeHTML(item.note)}</span>`:''}</div>
        <div class="line"><b>语意</b><span>${streamValue(item.meaning)}</span></div>
        <div class="line"><b>例句</b><span>${streamValue(item.example)}</span></div>
      </div>
    </div>`;
    return `<div class="item stream-item">
      <div class="item-body">
        <div class="item-title"><mark>${streamValue(item.term,'词项生成中')}</mark></div>
        <div class="line"><b>区别</b><span>${streamValue(item.difference)}</span></div>
        <div class="line"><b>使用</b><span>${streamValue(item.usage)}</span></div>
      </div>
    </div>`;
  }).join('');
}
function renderLookupStreamHTML(partial,raw,done=false){
  const head=partial.headword||{};
  const meta=partial.meta||{};
  const register=partial.register||{};
  return `
    <div class="lookup-stream live">
      <div class="lookup-progress-badge" aria-live="polite">
        <i aria-hidden="true"></i>
        <span id="lookup-progress-percent">${Math.round(lookupStreamProgress(partial,raw,done))}%</span>
      </div>
      <div class="entry-head lookup-live-head">
        <div class="entry-kicker">模型正在生成 · ${streamValue(meta.language||head.languageTag,'语言识别中')}</div>
        <div class="entry-title">${streamValue(head.title||meta.normalized||meta.query,'词条生成中')}</div>
        <div class="entry-core"><b>核心义</b><mark>${streamValue(head.coreMeaning,'核心义生成中')}</mark></div>
        <div class="entry-meta-grid">
          <span><b>类型</b>${streamValue(displayEntryTypeLabel(meta.entryType),'—')}</span>
          <span><b>词性</b>${streamValue(head.basicPartOfSpeech,'—')}</span>
          <span><b>方向</b>${streamValue(displayDirectionLabel(meta.defaultDirection),'—')}</span>
        </div>
        ${head.summary?`<div class="entry-meta">${escapeHTML(head.summary)}</div>`:'<div class="entry-meta stream-placeholder">摘要生成中...</div>'}
      </div>
      <div class="block stream-block">
        <div class="block-title">义项分析 <small>${(partial.senses||[]).length} 项已生成</small></div>
        ${renderLookupStreamItems(partial.senses,'sense')}
      </div>
      <div class="block stream-block">
        <div class="block-title">固定搭配 <small>${(partial.collocations||[]).length} 项已生成</small></div>
        ${renderLookupStreamItems(partial.collocations,'collocation')}
      </div>
      <div class="block stream-block">
        <div class="block-title">语感与使用</div>
        <div class="register-grid">
          <div><b>语体</b><span>${streamValue(register.style)}</span></div>
          <div><b>语气</b><span>${streamValue(register.tone)}</span></div>
          <div><b>场景</b><span>${streamValue(register.environment)}</span></div>
        </div>
      </div>
      <div class="block stream-block">
        <div class="block-title">易混辨析 <small>${(partial.confusions||[]).length} 项已生成</small></div>
        ${renderLookupStreamItems(partial.confusions,'confusion')}
      </div>
    </div>
  `;
}
async function parseLookupResponse(response){
  try{
    return await response.json();
  }catch(error){
    const parsedError=new Error(response.ok?`接口返回不是合法 JSON：${error.message}`:`接口返回异常内容，无法解析错误详情。`);
    parsedError.status=response.status;
    parsedError.retryable=!response.ok&&(response.status===408||response.status===429||response.status>=500);
    throw parsedError;
  }
}
function lookupHttpError(response,data){
  const error=new Error(data?.error||`查询失败：HTTP ${response.status}`);
  error.status=response.status;
  error.retryable=response.status===408||response.status===429||response.status>=500;
  return error;
}
function normalizeLookupError(error){
  if(error instanceof Error)return error;
  return new Error(String(error||'查询失败'));
}
function isRetryableLookupError(error){
  if(error?.retryable)return true;
  const status=Number(error?.status||0);
  if(status===408||status===429||status>=500)return true;
  const message=String(error?.message||error||'').toLowerCase();
  return /failed to fetch|load failed|networkerror|network error|timeout|timed out|connection|socket|econnreset|etimedout/.test(message);
}
function sleep(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}
function isStaleLookup(runId,query){
  return runId!==lookupRunId;
}
function lookupModelInfo(settings,hasLocalEndpoint){
  const model=(hasLocalEndpoint?settings.model:configInfo?.model)||'未配置';
  return {
    model,
    modelSource:hasLocalEndpoint?`网页设置：${settings.apiProfileName||'默认配置'}`:'Vercel 环境变量',
  };
}
async function analyzeHeaders(hasLocalEndpoint){
  const headers={'Content-Type':'application/json'};
  if(!hasLocalEndpoint&&cloudClient){
    const {data}=await cloudClient.auth.getSession();
    const token=data.session?.access_token;
    if(token)headers.Authorization=`Bearer ${token}`;
  }
  return headers;
}
function addHistory(item){
  const history=getHistory().filter(existing=>normalizeSearch(existing.query)!==normalizeSearch(item.query));
  history.unshift(normalizeHistoryItem(item));
  setHistory(history);
}
function findHistoryByQuery(query){
  const normalized=normalizeSearch(query);
  return getHistory().find(item=>normalizeSearch(item.query)===normalized);
}
function saveLookupResult({query,result,existingId=null,sourceItem=null,modelInfo={}}){
  const now=new Date().toISOString();
  result=normalizeResultEntryType(result,query);
  const history=getHistory();
  const existing=sourceItem||history.find(item=>Number(item.id)===Number(existingId))||findHistoryByQuery(query);
  const roll=makeHistoryRoll(result,now,null,modelInfo);
  let saved;
  if(existing){
    saved={
      ...normalizeHistoryItem(existing),
      query,
      result,
      updatedAt:now,
      rolls:dedupeRolls([roll,...getHistoryRolls(existing)]),
    };
    setHistory(history.map(item=>Number(item.id)===Number(existing.id)?saved:item));
  }else{
    saved={id:Date.now(),query,result,followups:[],createdAt:now,updatedAt:now,rolls:[roll]};
    const next=history.filter(item=>normalizeSearch(item.query)!==normalizeSearch(query));
    next.unshift(saved);
    setHistory(next);
  }
  return saved;
}
function historyBatchSize(){
  return window.matchMedia?.('(max-width: 900px)').matches?18:42;
}
function resetHistoryVisible(){
  historyState.visibleCount=historyBatchSize();
}
function rerenderHistoryFromStart(){
  resetHistoryVisible();
  renderHistory();
}
function ensureHistoryVisible(){
  if(!historyState.visibleCount)resetHistoryVisible();
}
function historyFiltersActive(){
  return Object.values(historyState.filters).reduce((sum,value)=>sum+(Array.isArray(value)?value.length:(value?1:0)),0);
}
function historyFilterSummaryText(){
  const count=historyFiltersActive();
  if(!count)return '—';
  const labels=[];
  els.historyFilterbar?.querySelectorAll('.history-filter-trigger.active b').forEach(node=>{
    const text=node.textContent.trim();
    if(text&&text!=='—')labels.push(text);
  });
  return labels.length?labels.slice(0,3).join(' · ')+(labels.length>3?` +${labels.length-3}`:''):`${count} 项`;
}
function normalizeHistorySearchScopes(scopes){
  const valid=HISTORY_SEARCH_SCOPE_OPTIONS.map(item=>item.key);
  const picked=Array.isArray(scopes)?scopes.filter(key=>valid.includes(key)):[];
  return picked.length?uniq(picked):[...valid];
}
function historySearchScopeSummary(){
  const scopes=normalizeHistorySearchScopes(historyState.searchScopes);
  if(scopes.length===HISTORY_SEARCH_SCOPE_OPTIONS.length)return '全部';
  const labels=scopes.map(key=>HISTORY_SEARCH_SCOPE_OPTIONS.find(item=>item.key===key)?.label||key);
  return labels.slice(0,2).join(' / ')+(labels.length>2?` +${labels.length-2}`:'');
}
function renderHistorySearchScopeControls(){
  if(!els.historySearchScopeMenu)return;
  historyState.searchScopes=normalizeHistorySearchScopes(historyState.searchScopes);
  const scopes=new Set(historyState.searchScopes);
  if(els.historySearchScopeSummary)els.historySearchScopeSummary.textContent=historySearchScopeSummary();
  els.historySearchScope?.classList.toggle('open',historyState.searchScopeOpen);
  els.historySearchScopeToggle?.setAttribute('aria-expanded',String(historyState.searchScopeOpen));
  els.historySearchScopeMenu.innerHTML=`
    ${HISTORY_SEARCH_SCOPE_OPTIONS.map(option=>`
      <button class="history-search-scope-option ${scopes.has(option.key)?'active':''}" type="button" data-scope="${escapeHTML(option.key)}">
        <span>${scopes.has(option.key)?'✓':' '}</span>${escapeHTML(option.label)}
      </button>
    `).join('')}
    <button class="history-search-scope-clear" type="button" data-scope-action="all">全部范围</button>
  `;
}
function toggleHistorySearchScopeMenu(){
  historyState.searchScopeOpen=!historyState.searchScopeOpen;
  renderHistorySearchScopeControls();
}
function closeHistorySearchScopeMenu(){
  if(!historyState.searchScopeOpen)return;
  historyState.searchScopeOpen=false;
  renderHistorySearchScopeControls();
}
function toggleHistorySearchScope(scope){
  const valid=HISTORY_SEARCH_SCOPE_OPTIONS.map(item=>item.key);
  if(!valid.includes(scope))return;
  const current=new Set(normalizeHistorySearchScopes(historyState.searchScopes));
  if(current.has(scope)&&current.size>1)current.delete(scope);
  else current.add(scope);
  historyState.searchScopes=[...current];
  rerenderHistoryFromStart();
}
function resetHistorySearchScopes(){
  historyState.searchScopes=HISTORY_SEARCH_SCOPE_OPTIONS.map(item=>item.key);
  rerenderHistoryFromStart();
}
function updateHistoryFilterToggle(){
  const count=historyFiltersActive();
  els.historyTools?.classList.toggle('filters-open',historyState.filtersOpen);
  els.historyTools?.classList.toggle('has-filters',count>0);
  if(els.historyFilterSummary)els.historyFilterSummary.textContent=historyFilterSummaryText();
  if(els.historyFilterToggle){
    els.historyFilterToggle.classList.toggle('active',historyState.filtersOpen||count>0);
    els.historyFilterToggle.setAttribute('aria-expanded',String(historyState.filtersOpen));
  }
}
function loadMoreHistory(){
  historyState.visibleCount+=historyBatchSize();
  renderHistory();
}
function maybeLoadMoreHistory(){
  if(activeView!=='history')return;
  if((historyState.visibleCount||0)>=(window.__historyFilteredCount||0))return;
  const remaining=document.documentElement.scrollHeight-window.scrollY-window.innerHeight;
  if(remaining<420)loadMoreHistory();
}
function toggleHistoryFilters(){
  historyState.filtersOpen=!historyState.filtersOpen;
  if(!historyState.filtersOpen)closeHistoryFilterMenus();
  updateHistoryFilterToggle();
}
function renderHistory(){
  renderHistoryFilterOptions(getHistory());
  renderHistorySearchScopeControls();
  renderHistorySortControls();
  renderHistoryScopeControls();
  ensureHistoryVisible();
  updateHistoryFilterToggle();
  const history=filterAndSortHistory(getHistory());
  window.__historyFilteredCount=history.length;
  const total=getHistory().length;
  const favoriteTotal=getHistory().filter(item=>normalizeHistoryItem(item).favorite).length;
  const constrained=historyState.scope!=='all'||historyState.query||Object.values(historyState.filters).some(filterHasValues);
  els.historyCount.textContent=constrained?`${history.length}/${total} 条`:`${total} 条`;
  if(!history.length){
    els.historyList.innerHTML=`<div class="empty">${historyState.scope==='favorites'&&!favoriteTotal?'暂无收藏记录':constrained?'没有匹配记录':'暂无历史记录'}</div>`;
    return;
  }
  const visible=history.slice(0,Math.min(historyState.visibleCount,history.length));
  const more=visible.length<history.length;
  els.historyList.innerHTML=visible.map(item=>{
    const normalized=normalizeHistoryItem(item);
    const favoriteInAll=normalized.favorite&&historyState.scope==='all';
    const summary=historyEntrySummary(normalized);
    const meta=historyEntryMeta(normalized);
    const versionText=getHistoryRolls(normalized).length>1?`${getHistoryRolls(normalized).length} 个版本`:'';
    return `
    <div class="history-item ${favoriteInAll?'favorite-item':''}" role="button" tabindex="0" onclick="openHistoryModal(${Number(item.id)})" onkeydown="handleHistoryItemKey(event,${Number(item.id)})">
      <div class="history-copy">
        <div class="history-word">${escapeHTML(item.query)}</div>
        ${summary?`<div class="history-summary">${escapeHTML(summary)}</div>`:''}
        ${renderHistoryTags(normalized.tags)}
        <div class="history-meta">
          ${meta.map(label=>`<span>${escapeHTML(label)}</span>`).join('')}
          ${historyTimeMetaHTML(item,getSettings().historyTimeMode)}
          ${versionText?`<em>${escapeHTML(versionText)}</em>`:''}
          ${favoriteInAll?'<em>已收藏</em>':''}
        </div>
      </div>
      <div class="history-actions">
        <button class="icon-btn favorite-icon ${normalized.favorite?'active':''}" data-tip="${normalized.favorite?'取消收藏':'收藏'}" aria-label="${normalized.favorite?'取消收藏':'收藏'}" onclick="event.stopPropagation();toggleFavoriteHistory(${Number(item.id)})">${normalized.favorite?'★':'☆'}</button>
        <button class="icon-btn" data-tip="重新生成" onclick="event.stopPropagation();regenerateHistory(${Number(item.id)})">↻</button>
        <button class="icon-btn" data-tip="查看" onclick="event.stopPropagation();openHistoryModal(${Number(item.id)})">↗️</button>
        <button class="icon-btn danger-icon" data-tip="删除" onclick="event.stopPropagation();deleteHistory(${Number(item.id)})">×</button>
      </div>
    </div>
  `;
  }).join('')+(more?`
    <button class="history-load-more" type="button" onclick="loadMoreHistory()">
      继续显示 ${Math.min(historyBatchSize(),history.length-visible.length)} 条
    </button>
  `:'');
}
function renderHistoryTags(tags=[]){
  const list=normalizeTags(tags);
  if(!list.length)return '';
  return `<div class="history-tags">${list.slice(0,5).map(tag=>`<button type="button" onclick="filterByHistoryTag('${escapeAttr(tag)}',event)">${escapeHTML(tag)}</button>`).join('')}${list.length>5?`<em>+${list.length-5}</em>`:''}</div>`;
}
function latestHistoryResult(item){
  const normalized=normalizeHistoryItem(item);
  return getHistoryRolls(normalized)[0]?.result||normalized.result||{};
}
function historyEntrySummary(item){
  const result=latestHistoryResult(item);
  const head=result.headword||{};
  const senses=Array.isArray(result.senses)?result.senses:[];
  const fromHead=head.coreMeaning||head.summary||'';
  if(fromHead)return fromHead;
  const labels=uniq(senses.map(sense=>sense.shortestLabel||sense.meaning).filter(Boolean));
  return labels.slice(0,3).join(' / ');
}
function historyEntryMeta(item){
  const result=latestHistoryResult(item);
  const head=result.headword||{};
  const senses=Array.isArray(result.senses)?result.senses:[];
  const entryType=displayEntryTypeLabel(entryTypeForResult(result,item.query));
  const pos=compactPartOfSpeech(head,senses);
  const direction=historyCanonicalValues(item,'direction').map(value=>displayFieldLabel('direction',value)).filter(Boolean)[0];
  const language=historyCanonicalValues(item,'language').map(value=>displayFieldLabel('language',value)).filter(Boolean)[0];
  return [entryType,pos,direction,language].filter(Boolean);
}
function formatHistoryTime(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toLocaleString('zh-CN',{hour12:false});
}
function historyEdited(item={}){
  const created=new Date(item.createdAt||0).getTime();
  const updated=new Date(item.updatedAt||0).getTime();
  return Boolean(created&&updated&&Math.abs(updated-created)>1000);
}
function historyTimeMetaHTML(item={},mode='created'){
  const normalized=normalizeHistoryItem(item);
  const next=normalizeHistoryTimeMode(mode);
  const created=formatHistoryTime(normalized.createdAt);
  const updated=formatHistoryTime(normalized.updatedAt);
  const edited=historyEdited(normalized);
  if(!edited){
    const single=created||updated;
    return single?`<em>${escapeHTML(single)}</em>`:'';
  }
  const parts=[];
  if(next==='created'||next==='both')parts.push(['创建',created]);
  if(next==='updated'||next==='both')parts.push(['修改',updated]);
  if(!parts.length&&created)parts.push(['创建',created]);
  return parts.filter(([,value])=>value).map(([label,value])=>`<em>${escapeHTML(label)} ${escapeHTML(value)}</em>`).join('');
}
function historyTimeMetaText(item={},mode='created'){
  const normalized=normalizeHistoryItem(item);
  const next=normalizeHistoryTimeMode(mode);
  const created=formatHistoryTime(normalized.createdAt);
  const updated=formatHistoryTime(normalized.updatedAt);
  const edited=historyEdited(normalized);
  if(!edited)return created||updated||'';
  const parts=[];
  if(next==='created'||next==='both')parts.push(['创建',created]);
  if(next==='updated'||next==='both')parts.push(['修改',updated]);
  if(!parts.length&&created)parts.push(['创建',created]);
  return parts.filter(([,value])=>value).map(([label,value])=>`${label} ${value}`).join(' · ');
}
function historyPrimaryTime(item={}){
  const updated=new Date(item.updatedAt||item.createdAt||0).getTime();
  const created=new Date(item.createdAt||0).getTime();
  return updated||created||0;
}
function historyCreatedTime(item={}){
  return new Date(item.createdAt||0).getTime()||0;
}
function compactPartOfSpeech(head={},senses=[]){
  const tokens=uniq([
    ...posTokensFromValue(head.basicPartOfSpeech),
    ...(Array.isArray(senses)?senses.flatMap(sense=>posTokensFromValue(sense.partOfSpeech)):[]),
  ]);
  if(!tokens.length)return '';
  const visible=tokens.slice(0,3).map(token=>displayFieldLabel('pos',token));
  return tokens.length>3?`${visible.join(' / ')} +${tokens.length-3}`:visible.join(' / ');
}
function handleHistoryItemKey(event,id){
  if(event.key==='Enter'||event.key===' '){
    event.preventDefault();
    openHistoryModal(id);
  }
}
function filterAndSortHistory(history){
  const query=normalizeSearch(historyState.query);
  const scoped=historyState.scope==='favorites'
    ? history.filter(item=>normalizeHistoryItem(item).favorite)
    : [...history];
  const filteredByText=query
    ? scoped.filter(item=>historySearchText(item).includes(query))
    : scoped;
  const filtered=filteredByText.filter(item=>historyMatchesFilters(item));
  return filtered.sort((a,b)=>{
    let value=0;
    if(historyState.sort==='text')value=compareHistoryText(a,b);
    else if(historyState.sort==='language')value=historyCollator.compare(historyField(a,'language'),historyField(b,'language'));
    else if(historyState.sort==='rolls')value=getHistoryRolls(a).length-getHistoryRolls(b).length;
    else if(historyState.sort==='followups')value=(a.followups||[]).length-(b.followups||[]).length;
    else if(historyState.sort==='created')value=historyCreatedTime(a)-historyCreatedTime(b);
    else value=historyPrimaryTime(a)-historyPrimaryTime(b);
    return historyState.sortDir==='asc'?value:-value;
  });
}
function historyMatchesFilters(item){
  const filters=historyState.filters;
  return filterMatches(historyCanonicalValues(item,'language'),filters.language)
    && filterMatches(historyCanonicalValues(item,'entryType'),filters.entryType)
    && filterMatches(historyCanonicalValues(item,'direction'),filters.direction)
    && filterMatches(historyCanonicalValues(item,'pos'),filters.pos)
    && filterMatches(historyCanonicalValues(item,'style'),filters.style)
    && filterMatches(historyCanonicalValues(item,'tag'),filters.tag);
}
function filterMatches(values,selected){
  const picks=Array.isArray(selected)?selected:[selected].filter(Boolean);
  if(!picks.length)return true;
  return values.some(value=>picks.includes(value));
}
function filterHasValues(value){
  return Array.isArray(value)?value.length>0:Boolean(value);
}
function compareHistoryText(a,b){
  return historyCollator.compare(historySortTitle(a),historySortTitle(b));
}
function historySortTitle(item){
  return item.result?.meta?.normalized||item.result?.headword?.title||item.query||'';
}
function historyField(item,key){
  const result=item.result||{};
  if(key==='language')return result.headword?.languageTag||result.meta?.language||'';
  if(key==='direction')return result.meta?.defaultDirection||result.meta?.direction||'';
  if(key==='style')return result.register?.style||'';
  return '';
}
function historyFieldList(item,key){
  const result=item.result||{};
  if(key==='pos'){
    return [
      ...rawList(result.headword?.basicPartOfSpeech),
      ...(Array.isArray(result.senses)?result.senses.flatMap(sense=>rawList(sense.partOfSpeech)):[]),
    ].filter(Boolean);
  }
  return [];
}
function rawList(value){
  if(Array.isArray(value))return value.flatMap(rawList);
  return value?[value]:[];
}
function normalizeResultEntryType(result={},fallbackQuery=''){
  result.meta=result.meta||{};
  result.meta.entryType=entryTypeForResult(result,fallbackQuery);
  return result;
}
function entryTypeForResult(result={},fallbackQuery=''){
  const explicit=canonicalEntryType(result.meta?.entryType);
  if(explicit)return explicit;
  const pos=canonicalPosTokens(result.headword?.basicPartOfSpeech||'');
  if(pos.includes('phrase')||pos.includes('sentence'))return 'phrase';
  return inferEntryTypeFromText(result.meta?.normalized||result.meta?.query||result.headword?.title||fallbackQuery);
}
function canonicalEntryType(value){
  const text=normalizeSearch(value);
  if(!text)return '';
  if(/\b(word|single)\b|单词|單詞|词$|詞$/.test(text))return 'word';
  if(/\b(phrase|expression|idiom|sentence|clause)\b|短语|短語|词组|詞組|表达|固定搭配|句子|从句|片语|片語/.test(text))return 'phrase';
  if(text==='word')return 'word';
  if(text==='phrase'||text==='sentence')return 'phrase';
  return '';
}
function inferEntryTypeFromText(value){
  const text=normalizeSearch(value);
  if(!text)return 'word';
  if(/\s/.test(text))return 'phrase';
  if(/[，,。.!?？；;:：/／|、()（）[\]{}"“”‘’]/.test(text))return 'phrase';
  return 'word';
}
function displayEntryTypeLabel(value){
  const type=canonicalEntryType(value)||value;
  return displayFieldLabel('entryType',type);
}
const LABELS={
  entryType:{word:'单词',phrase:'词组'},
  language:{en:'英语',zh:'中文',ja:'日语',ko:'韩语',fr:'法语',es:'西语',de:'德语',other:'其他'},
  direction:{'en-zh':'英译中','zh-en':'中译英','ja-zh':'日译中','zh-ja':'中译日','ko-zh':'韩译中','zh-ko':'中译韩','fr-zh':'法译中','zh-fr':'中译法','es-zh':'西译中','zh-es':'中译西','de-zh':'德译中','zh-de':'中译德','other':'其他'},
  pos:{n:'名词',v:'动词',adj:'形容词',adv:'副词',prep:'介词',conj:'连词',pron:'代词',det:'限定词',aux:'助动词',interj:'感叹词',phrase:'短语',sentence:'句子',other:'其他'},
  style:{neutral:'中性',formal:'正式',informal:'非正式',spoken:'口语',written:'书面',academic:'学术',business:'商务',literary:'文学',slang:'俚语',technical:'专业',archaic:'古旧',offensive:'冒犯',other:'其他'},
};
function currentLabelMode(){
  return normalizeLabelMode(getSettings().labelMode);
}
function displayFieldLabel(group,value,mode=currentLabelMode()){
  const code=String(value||'').trim();
  if(!code)return '';
  const text=LABELS[group]?.[code]||code;
  if(mode==='code')return code;
  if(mode==='both'&&text!==code)return `${code} · ${text}`;
  return text;
}
function displayFieldLabels(group,values,mode=currentLabelMode()){
  const list=Array.isArray(values)?values:[values];
  return uniq(list.map(value=>displayFieldLabel(group,value,mode)).filter(Boolean));
}
function displayLanguageLabel(value){
  const canonical=canonicalLanguage(value);
  return canonical?displayFieldLabel('language',canonical):String(value||'');
}
function displayDirectionLabel(value,item){
  const canonical=canonicalDirection(value,item);
  return canonical?displayFieldLabel('direction',canonical):String(value||'');
}
function displayStyleLabel(value){
  const tokens=canonicalStyleTokens(value);
  return tokens.length?displayFieldLabels('style',tokens).join(' / '):String(value||'');
}
function historyCanonicalOptions(item,key){
  return historyCanonicalValues(item,key).map(value=>({value,label:displayFieldLabel(key,value)}));
}
function historyCanonicalValues(item,key){
  if(key==='entryType')return uniq([entryTypeForResult(latestHistoryResult(item),item.query)]);
  if(key==='language')return uniq([canonicalLanguage(historyField(item,'language'))]);
  if(key==='direction')return uniq([canonicalDirection(historyField(item,'direction'),item)]);
  if(key==='style')return uniq(canonicalStyleTokens(historyField(item,'style')));
  if(key==='pos')return uniq(historyFieldList(item,'pos').flatMap(canonicalPosTokens));
  if(key==='tag')return normalizeTags(normalizeHistoryItem(item).tags);
  return [];
}
function canonicalLanguage(value){
  const text=normalizeSearch(value).replace(/\[[^\]]*\]/g,'').replace(/[0-9]/g,'');
  if(/\b(en|eng|english)\b|英语|英文|英/.test(text))return 'en';
  if(/\b(zh|zho|chi|chinese|cn)\b|中文|汉语|漢語|中/.test(text))return 'zh';
  if(/\b(ja|jpn|japanese)\b|日语|日文|日/.test(text))return 'ja';
  if(/\b(ko|kor|korean)\b|韩语|韓語|韩文|韓文|韩|韓/.test(text))return 'ko';
  if(/\b(fr|fra|fre|french)\b|法语|法文|法/.test(text))return 'fr';
  if(/\b(es|spa|spanish)\b|西语|西班牙语|西文/.test(text))return 'es';
  if(/\b(de|deu|ger|german)\b|德语|德文|德/.test(text))return 'de';
  return text?'other':'';
}
function canonicalDirection(value,item){
  const text=normalizeSearch([value,item?.result?.meta?.direction,item?.result?.meta?.language,item?.result?.headword?.languageTag].filter(Boolean).join(' '));
  const targetZh=/译为中文|翻成中文|翻译成中文|to chinese|into chinese|中文|中/.test(text);
  if((/英译中|英文.*中|英语.*中|english.*chinese|en[-_ ]?zh|英.*译/.test(text)||canonicalLanguage(text)==='en')&&targetZh)return 'en-zh';
  if(/中译英|中文.*英|汉语.*英|chinese.*english|zh[-_ ]?en/.test(text))return 'zh-en';
  if(/日译中|日文.*中|日语.*中|japanese.*chinese|ja[-_ ]?zh/.test(text))return 'ja-zh';
  if(/中译日|中文.*日|chinese.*japanese|zh[-_ ]?ja/.test(text))return 'zh-ja';
  if(/韩译中|韓譯中|韩文.*中|韩语.*中|korean.*chinese|ko[-_ ]?zh/.test(text))return 'ko-zh';
  if(/中译韩|中文.*韩|chinese.*korean|zh[-_ ]?ko/.test(text))return 'zh-ko';
  if(/法译中|法文.*中|法语.*中|french.*chinese|fr[-_ ]?zh/.test(text))return 'fr-zh';
  if(/中译法|中文.*法|chinese.*french|zh[-_ ]?fr/.test(text))return 'zh-fr';
  if(/西译中|西班牙.*中|spanish.*chinese|es[-_ ]?zh/.test(text))return 'es-zh';
  if(/中译西|中文.*西班牙|chinese.*spanish|zh[-_ ]?es/.test(text))return 'zh-es';
  if(/德译中|德文.*中|德语.*中|german.*chinese|de[-_ ]?zh/.test(text))return 'de-zh';
  if(/中译德|中文.*德|chinese.*german|zh[-_ ]?de/.test(text))return 'zh-de';
  const language=canonicalLanguage(text);
  if(language&&language!=='zh'&&targetZh)return `${language}-zh`;
  return text?'other':'';
}
function canonicalPosTokens(value){
  const text=normalizeSearch(value).replace(/[()（）]/g,' ');
  const chunks=text.split(/[、,，/／;；|+&\s]+/).filter(Boolean);
  const out=[];
  chunks.forEach(chunk=>{
    if(/^n\.?$|noun|名词|名$/.test(chunk))out.push('n');
    else if(/^v\.?$|verb|动词|動詞|动$|動$/.test(chunk))out.push('v');
    else if(/^adj\.?$|adjective|形容词|形容詞/.test(chunk))out.push('adj');
    else if(/^adv\.?$|adverb|副词|副詞/.test(chunk))out.push('adv');
    else if(/^prep\.?$|preposition|介词|介詞/.test(chunk))out.push('prep');
    else if(/^conj\.?$|conjunction|连词|連詞/.test(chunk))out.push('conj');
    else if(/^pron\.?$|pronoun|代词|代詞/.test(chunk))out.push('pron');
    else if(/^det\.?$|determiner|限定词|限定詞|冠词|冠詞/.test(chunk))out.push('det');
    else if(/^aux\.?$|auxiliary|助动词|助動詞/.test(chunk))out.push('aux');
    else if(/^interj\.?$|interjection|感叹词|感嘆詞/.test(chunk))out.push('interj');
    else if(/phrase|短语|短語|词组|詞組|表达/.test(chunk))out.push('phrase');
    else if(/sentence|句子|整句/.test(chunk))out.push('sentence');
    else if(chunk)out.push('other');
  });
  return out.length?uniq(out):[];
}
function canonicalStyleTokens(value){
  const text=normalizeSearch(value);
  const out=[];
  if(/中性|neutral|通用|一般/.test(text))out.push('neutral');
  if(/正式|formal/.test(text))out.push('formal');
  if(/非正式|informal|随意|casual/.test(text))out.push('informal');
  if(/口语|口語|spoken|oral|日常/.test(text))out.push('spoken');
  if(/书面|書面|written/.test(text))out.push('written');
  if(/学术|學術|academic/.test(text))out.push('academic');
  if(/商务|商務|business|职场|職場/.test(text))out.push('business');
  if(/文学|文學|literary/.test(text))out.push('literary');
  if(/俚语|俚語|slang/.test(text))out.push('slang');
  if(/专业|專業|technical|术语|術語/.test(text))out.push('technical');
  if(/古旧|古舊|archaic/.test(text))out.push('archaic');
  if(/冒犯|offensive|粗俗|vulgar/.test(text))out.push('offensive');
  if(!out.length&&text)out.push('other');
  return uniq(out);
}
function uniq(items){
  return [...new Set(items.filter(Boolean))];
}
function collectHistoryOptions(history){
  const maps={entryType:new Map(),language:new Map(),direction:new Map(),pos:new Map(),style:new Map(),tag:new Map()};
  history.forEach(item=>{
    Object.keys(maps).forEach(key=>{
      historyCanonicalOptions(item,key).forEach(option=>{
        if(option.value&&!maps[key].has(option.value))maps[key].set(option.value,option.label);
      });
    });
  });
  return Object.fromEntries(Object.entries(maps).map(([key,map])=>[
    key,
    [...map.entries()]
      .map(([value,label])=>({value,label}))
      .sort((a,b)=>historyCollator.compare(a.label,b.label)),
  ]));
}
function renderHistoryFilterOptions(history){
  const options=collectHistoryOptions(history);
  renderHistoryFilterGroup('entryType','类型',options.entryType);
  renderHistoryFilterGroup('language','语言',options.language);
  renderHistoryFilterGroup('direction','方向',options.direction);
  renderHistoryFilterGroup('pos','词性',options.pos);
  renderHistoryFilterGroup('style','语体',options.style);
  renderHistoryFilterGroup('tag','Tag',options.tag);
}
function renderHistoryFilterGroup(key,label,values=[]){
  const root=els.historyFilterbar?.querySelector(`[data-filter-key="${key}"]`);
  if(!root)return;
  const current=Array.isArray(historyState.filters[key])?historyState.filters[key]:[];
  const valid=new Set(values.map(option=>option.value));
  const next=current.filter(value=>valid.has(value));
  historyState.filters[key]=next;
  const selectedLabels=values.filter(option=>next.includes(option.value)).map(option=>option.label);
  const summary=selectedLabels.length?selectedLabels.join('、'):'—';
  root.classList.toggle('open',openHistoryFilterKey===key);
  root.innerHTML=`
    <button class="history-filter-trigger ${next.length?'active':''}" type="button">
      <span>${escapeHTML(label)}</span>
      <b>${escapeHTML(summary)}</b>
      <i aria-hidden="true">⌄</i>
    </button>
    <div class="history-filter-menu">
      <button class="history-filter-clear" type="button" ${next.length?'':'disabled'}>—</button>
      ${values.length?values.map(option=>`
        <button class="history-filter-option ${next.includes(option.value)?'active':''}" type="button" data-value="${escapeHTML(option.value)}">
          ${escapeHTML(option.label)}
        </button>
      `).join(''):'<div class="history-filter-empty">—</div>'}
    </div>
  `;
}
function setHistoryFilter(key,value){
  const next=Array.isArray(value)?value:[value].filter(Boolean);
  historyState.filters[key]=next.includes('')?[]:next;
  rerenderHistoryFromStart();
}
function toggleHistoryFilter(key,value){
  if(!key||!value)return;
  const current=Array.isArray(historyState.filters[key])?historyState.filters[key]:[];
  historyState.filters[key]=current.includes(value)
    ? current.filter(item=>item!==value)
    : [...current,value];
  openHistoryFilterKey=key;
  rerenderHistoryFromStart();
}
function filterByHistoryTag(tag,event){
  event?.stopPropagation();
  const value=String(tag||'').trim();
  if(!value)return;
  const current=Array.isArray(historyState.filters.tag)?historyState.filters.tag:[];
  if(!current.includes(value))historyState.filters.tag=[...current,value];
  openHistoryFilterKey='tag';
  showView('history',document.getElementById('nav-history'));
  rerenderHistoryFromStart();
}
function tagStats(){
  const map=new Map();
  getHistory().forEach(item=>{
    normalizeHistoryItem(item).tags.forEach(tag=>{
      const stats=map.get(tag)||{tag,count:0};
      stats.count+=1;
      map.set(tag,stats);
    });
  });
  return [...map.values()].sort((a,b)=>b.count-a.count||historyCollator.compare(a.tag,b.tag));
}
function renderTagManager(){
  if(!els.tagManager)return;
  const tags=tagStats();
  if(!tags.length){
    els.tagManager.innerHTML='<div class="empty small-empty tag-empty">暂无标签</div>';
    return;
  }
  els.tagManager.innerHTML=`
    <div class="tag-manager-list">
      ${tags.map(item=>`
        <article class="tag-manager-item">
          <div class="tag-manager-copy">
            <strong>${escapeHTML(item.tag)}</strong>
            <span>${Number(item.count)} 条记录</span>
          </div>
          <div class="tag-manager-actions">
            <button class="plain-btn" type="button" onclick="filterByManagedTag('${escapeAttr(item.tag)}')">筛选</button>
            <button class="plain-btn" type="button" onclick="renameManagedTag('${escapeAttr(item.tag)}')">重命名</button>
            <button class="danger-btn" type="button" onclick="deleteManagedTag('${escapeAttr(item.tag)}')">移除</button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}
function filterByManagedTag(tag){
  const value=String(tag||'').trim();
  if(!value)return;
  historyState.filters.tag=[value];
  openHistoryFilterKey='tag';
  showView('history',document.getElementById('nav-history'));
  rerenderHistoryFromStart();
}
async function renameManagedTag(oldTag){
  const from=String(oldTag||'').trim();
  if(!from)return;
  const next=window.prompt(`把标签「${from}」重命名为：`,from);
  if(next===null)return;
  const to=normalizeTags(next)[0]||'';
  if(!to)return notify('新标签名不能为空。','bad','标签管理');
  if(to===from)return;
  const history=getHistory().map(item=>{
    const normalized=normalizeHistoryItem(item);
    if(!normalized.tags.includes(from))return item;
    return {...normalized,tags:normalizeTags(normalized.tags.map(tag=>tag===from?to:tag)),updatedAt:new Date().toISOString()};
  });
  historyState.filters.tag=historyState.filters.tag.map(tag=>tag===from?to:tag);
  setHistory(history);
  renderTagManager();
  notify(`已把「${from}」重命名为「${to}」。`,'good','标签管理');
}
async function deleteManagedTag(tag){
  const value=String(tag||'').trim();
  if(!value)return;
  const count=tagStats().find(item=>item.tag===value)?.count||0;
  if(!await askConfirm(`确认从 ${count} 条历史记录中移除「${value}」标签？`,'移除标签'))return;
  const history=getHistory().map(item=>{
    const normalized=normalizeHistoryItem(item);
    if(!normalized.tags.includes(value))return item;
    return {...normalized,tags:normalized.tags.filter(tag=>tag!==value),updatedAt:new Date().toISOString()};
  });
  historyState.filters.tag=historyState.filters.tag.filter(tag=>tag!==value);
  setHistory(history);
  renderTagManager();
  notify(`已移除「${value}」标签。`,'good','标签管理');
}
function clearHistoryFilter(key){
  if(!key)return;
  historyState.filters[key]=[];
  openHistoryFilterKey=key;
  rerenderHistoryFromStart();
}
function closeHistoryFilterMenus(except=null){
  openHistoryFilterKey=except?.dataset?.filterKey||null;
  els.historyFilterbar?.querySelectorAll('.history-filter.open').forEach(filter=>{
    if(filter!==except)filter.classList.remove('open');
  });
}
function setHistoryScope(scope){
  historyState.scope=scope==='favorites'?'favorites':'all';
  rerenderHistoryFromStart();
}
function setHistorySort(sort){
  if(historyState.sort===sort)historyState.sortDir=historyState.sortDir==='asc'?'desc':'asc';
  else{
    historyState.sort=sort;
    historyState.sortDir=(sort==='updated'||sort==='created'||sort==='rolls'||sort==='followups')?'desc':'asc';
  }
  rerenderHistoryFromStart();
}
function renderHistorySortControls(){
  els.historySortbar?.querySelectorAll('.sort-btn').forEach(button=>{
    const active=button.dataset.sort===historyState.sort;
    button.classList.toggle('active',active);
    const mark=button.querySelector('span');
    if(mark)mark.textContent=active?(historyState.sortDir==='asc'?'↑':'↓'):'';
  });
}
function renderHistoryScopeControls(){
  els.historyScope?.querySelectorAll('.scope-btn').forEach(button=>{
    button.classList.toggle('active',button.dataset.scope===historyState.scope);
  });
}
function normalizeSearch(value){
  return String(value||'').toLocaleLowerCase().normalize('NFKC').trim();
}
function historySearchText(item){
  const normalized=normalizeHistoryItem(item);
  const result=normalized.result||{};
  const scopes=normalizeHistorySearchScopes(historyState.searchScopes);
  const pieces=[];
  if(scopes.includes('word')){
    pieces.push(normalized.query,result.meta?.query,result.meta?.normalized,result.headword?.title);
  }
  if(scopes.includes('meaning')){
    pieces.push(result.headword?.coreMeaning,result.headword?.summary,result.senses?.map(sense=>[sense.shortestLabel,sense.meaning,sense.translation]),result.collocations?.map(item=>[item.phrase,item.meaning,item.translation]));
  }
  if(scopes.includes('example')){
    pieces.push(result.senses?.map(sense=>sense.example),result.collocations?.map(item=>item.example));
  }
  if(scopes.includes('collocation')){
    pieces.push(result.collocations);
  }
  if(scopes.includes('confusion')){
    pieces.push(result.confusions);
  }
  if(scopes.includes('other')){
    pieces.push(normalized.tags,normalized.note,normalized.createdAt,normalized.updatedAt,result.meta,result.register,normalized.followups);
  }
  return normalizeSearch(flattenText(pieces));
}
function flattenText(value){
  if(value==null)return '';
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);
  if(Array.isArray(value))return value.map(flattenText).join(' ');
  if(typeof value==='object')return Object.values(value).map(flattenText).join(' ');
  return '';
}
function clearHistorySearch(){
  historyState.query='';
  if(els.historySearch)els.historySearch.value='';
  updateHistorySearchState();
  rerenderHistoryFromStart();
}
function toggleFavoriteHistory(id){
  const now=new Date().toISOString();
  let favorite=false;
  const history=getHistory().map(item=>{
    if(Number(item.id)!==Number(id))return item;
    const normalized=normalizeHistoryItem(item);
    favorite=!normalized.favorite;
    return {...normalized,favorite,favoriteAt:favorite?now:'',updatedAt:now};
  });
  setHistory(history);
  notify(favorite?'已收藏。':'已取消收藏。','good','收藏');
}
function updateHistorySearchState(){
  const hasText=Boolean(els.historySearch?.value.trim());
  els.historyClearBtn?.classList.toggle('hidden',!hasText);
}
function insertNoteMarkdown(kind){
  const field=els.modalNoteEdit;
  if(!field)return;
  const start=field.selectionStart??field.value.length;
  const end=field.selectionEnd??start;
  const selected=field.value.slice(start,end);
  const linePrefix=start>0&&!field.value.slice(0,start).endsWith('\n')?'\n':'';
  const snippets={
    bold:{text:selected?`**${selected}**`:'**重点**',select:[2,4]},
    list:{text:selected?selected.split('\n').map(line=>`- ${line||'条目'}`).join('\n'):`${linePrefix}- 要点一\n- 要点二`,select:null},
    quote:{text:selected?selected.split('\n').map(line=>`> ${line}`).join('\n'):`${linePrefix}> 引用或提醒`,select:null},
    code:{text:selected?`\`${selected}\``:`${linePrefix}\`\`\`\n示例\n\`\`\``,select:null},
    table:{text:`${linePrefix}| 项目 | 说明 |\n| --- | --- |\n| 关键词 | 备注 |`,select:null},
  };
  const snippet=snippets[kind]||snippets.bold;
  field.value=`${field.value.slice(0,start)}${snippet.text}${field.value.slice(end)}`;
  const cursor=start+snippet.text.length;
  field.focus();
  if(snippet.select&&!selected){
    field.setSelectionRange(start+snippet.select[0],start+snippet.select[1]);
  }else{
    field.setSelectionRange(cursor,cursor);
  }
}
function cloneResult(result){
  return JSON.parse(JSON.stringify(result||{}));
}
function renderVisualEditor(result=modalResult){
  if(!els.modalVisualEditor)return;
  const data=cloneResult(result);
  const meta=data.meta||{};
  const head=data.headword||{};
  const senses=Array.isArray(data.senses)?data.senses:[];
  const collocations=Array.isArray(data.collocations)?data.collocations:[];
  const register=data.register||{};
  const confusions=Array.isArray(data.confusions)?data.confusions:[];
  els.modalVisualEditor.classList.toggle('hints-pinned',normalizeBooleanSetting(getSettings().visualHintsPinned,false));
  els.modalVisualEditor.innerHTML=`
    <div class="visual-grid visual-headword-grid">
      ${visualField('visual-title','词条标题',head.title||meta.query||'')}
      ${visualField('visual-core','核心义',head.coreMeaning||'')}
      ${visualField('visual-entry-type','类型',entryTypeForResult(data,head.title||meta.query||''))}
      ${visualField('visual-pos','词性',head.basicPartOfSpeech||'')}
      ${visualField('visual-language','语言',head.languageTag||meta.language||'')}
      ${visualField('visual-direction','方向',meta.defaultDirection||meta.direction||'')}
      ${visualTextarea('visual-summary','摘要',head.summary||'')}
    </div>
    ${visualList('senses','义项',senses,renderVisualSense)}
    ${visualList('collocations','固定搭配',collocations,renderVisualCollocation)}
    <section class="visual-section">
      <div class="visual-head"><b>语义感受</b><span>语体、语气和使用场景</span></div>
      <div class="visual-grid compact">
        ${visualField('visual-register-style','语体属性',register.style||'')}
        ${visualField('visual-register-tone','语义气质',register.tone||'')}
        ${visualTextarea('visual-register-environment','使用环境',register.environment||'')}
      </div>
    </section>
    ${visualList('confusions','近义词 / 易混词',confusions,renderVisualConfusion)}
  `;
}
function visualField(id,label,value){
  return `<label class="setting-field visual-field-hinted" data-visual-hint="${escapeAttr(id)}"><span>${escapeHTML(label)}</span><input class="cloud-input" id="${id}" type="text" value="${escapeHTML(value)}">${visualHintHTML(id)}</label>`;
}
function visualTextarea(id,label,value){
  return `<label class="setting-field visual-wide visual-field-hinted" data-visual-hint="${escapeAttr(id)}"><span>${escapeHTML(label)}</span><textarea class="visual-input" id="${id}">${escapeHTML(value)}</textarea>${visualHintHTML(id)}</label>`;
}
function visualList(kind,title,items,renderer){
  return `<section class="visual-section">
    <div class="visual-head"><b>${escapeHTML(title)}</b><button class="plain-btn icon-add-btn" type="button" data-tip="新增" onclick="addVisualItem('${kind}')">+</button></div>
    <div class="visual-list ${items.length?'':'empty'}">
      ${items.length?items.map((item,index)=>renderer(item,index)).join(''):'<div class="empty small-empty">暂无，可点击新增。</div>'}
    </div>
  </section>`;
}
function renderVisualSense(item={},index=0){
  return `<article class="visual-card" draggable="true" ondragstart="startVisualDrag(event,'senses',${index})" ondragover="overVisualDrag(event,'senses',${index})" ondragleave="clearVisualDropMarks()" ondragend="endVisualDrag()" ondrop="dropVisualItem(event,'senses',${index})" data-visual-kind="senses" data-index="${index}">
    <div class="visual-card-head"><b><span class="drag-handle">⋮⋮</span>义项 ${index+1}</b><div class="visual-card-actions"><button class="danger-btn" type="button" onclick="removeVisualItem('senses',${index})">删除</button></div></div>
    <div class="visual-grid compact visual-sense-grid">
      ${visualInlineField('partOfSpeech','词性',item.partOfSpeech||'')}
      ${visualInlineField('shortestLabel','义标',item.shortestLabel||'')}
      ${visualInlineTextarea('meaning','语意',item.meaning||'')}
      ${visualInlineTextarea('example','例句',item.example||'')}
      ${visualInlineTextarea('translation','译文',item.translation||'')}
      ${visualInlineTextarea('exampleHighlights','例句高亮',rawList(item.exampleHighlights).join('\n'))}
      ${visualInlineTextarea('translationHighlights','译文高亮',rawList(item.translationHighlights).join('\n'))}
    </div>
  </article>`;
}
function renderVisualCollocation(item={},index=0){
  return `<article class="visual-card" draggable="true" ondragstart="startVisualDrag(event,'collocations',${index})" ondragover="overVisualDrag(event,'collocations',${index})" ondragleave="clearVisualDropMarks()" ondragend="endVisualDrag()" ondrop="dropVisualItem(event,'collocations',${index})" data-visual-kind="collocations" data-index="${index}">
    <div class="visual-card-head"><b><span class="drag-handle">⋮⋮</span>搭配 ${index+1}</b><div class="visual-card-actions"><button class="danger-btn" type="button" onclick="removeVisualItem('collocations',${index})">删除</button></div></div>
    <div class="visual-grid compact">
      ${visualInlineField('phrase','短语',item.phrase||'')}
      ${visualInlineField('note','标注',item.note||'')}
      ${visualInlineTextarea('meaning','语意',item.meaning||'')}
      ${visualInlineTextarea('example','例句',item.example||'')}
      ${visualInlineTextarea('translation','译文',item.translation||'')}
      ${visualInlineTextarea('exampleHighlights','例句高亮',rawList(item.exampleHighlights).join('\n'))}
      ${visualInlineTextarea('translationHighlights','译文高亮',rawList(item.translationHighlights).join('\n'))}
    </div>
  </article>`;
}
function renderVisualConfusion(item={},index=0){
  return `<article class="visual-card" draggable="true" ondragstart="startVisualDrag(event,'confusions',${index})" ondragover="overVisualDrag(event,'confusions',${index})" ondragleave="clearVisualDropMarks()" ondragend="endVisualDrag()" ondrop="dropVisualItem(event,'confusions',${index})" data-visual-kind="confusions" data-index="${index}">
    <div class="visual-card-head"><b><span class="drag-handle">⋮⋮</span>易混 ${index+1}</b><div class="visual-card-actions"><button class="danger-btn" type="button" onclick="removeVisualItem('confusions',${index})">删除</button></div></div>
    <div class="visual-grid compact">
      ${visualInlineField('term','词',item.term||'')}
      ${visualInlineTextarea('difference','核心区别',item.difference||'')}
      ${visualInlineTextarea('usage','语体/使用倾向',item.usage||'')}
    </div>
  </article>`;
}
function visualInlineField(key,label,value){
  return `<label class="setting-field visual-field-hinted" data-visual-hint="${escapeAttr(key)}"><span>${escapeHTML(label)}</span><input class="cloud-input" data-field="${key}" type="text" value="${escapeHTML(value)}">${visualHintHTML(key)}</label>`;
}
function visualInlineTextarea(key,label,value){
  return `<label class="setting-field visual-wide visual-field-hinted" data-visual-hint="${escapeAttr(key)}"><span>${escapeHTML(label)}</span><textarea class="visual-input" data-field="${key}">${escapeHTML(value)}</textarea>${visualHintHTML(key)}</label>`;
}
function visualHintHTML(key){
  const hint=VISUAL_FIELD_HINTS[key]||['填写提示','按当前字段含义填写，保持简洁、准确，并能同步回 JSON。'];
  return `<div class="visual-hint-pinned"><b>${escapeHTML(hint[0])}</b><span>${escapeHTML(hint[1])}</span></div><div class="visual-hint-bubble" role="note"><button type="button" class="visual-hint-close" aria-label="关闭提示">×</button><b>${escapeHTML(hint[0])}</b><span>${escapeHTML(hint[1])}</span></div>`;
}
function collectVisualResult(){
  const data=cloneResult(modalResult||{});
  data.meta=data.meta||{};
  data.headword=data.headword||{};
  data.headword.title=document.getElementById('visual-title')?.value.trim()||data.headword.title||data.meta.query||'';
  data.headword.coreMeaning=document.getElementById('visual-core')?.value.trim()||'';
  data.meta.entryType=canonicalEntryType(document.getElementById('visual-entry-type')?.value.trim())||entryTypeForResult(data,data.headword.title);
  data.headword.basicPartOfSpeech=document.getElementById('visual-pos')?.value.trim()||'';
  data.headword.languageTag=document.getElementById('visual-language')?.value.trim()||'';
  data.headword.summary=document.getElementById('visual-summary')?.value.trim()||'';
  data.meta.query=data.headword.title||data.meta.query||'';
  data.meta.normalized=data.headword.title||data.meta.normalized||'';
  data.meta.language=data.headword.languageTag||data.meta.language||'';
  data.meta.defaultDirection=document.getElementById('visual-direction')?.value.trim()||'';
  data.register={
    style:document.getElementById('visual-register-style')?.value.trim()||'',
    tone:document.getElementById('visual-register-tone')?.value.trim()||'',
    environment:document.getElementById('visual-register-environment')?.value.trim()||'',
  };
  data.senses=collectVisualCards('senses').map(normalizeVisualHighlightFields);
  data.collocations=collectVisualCards('collocations').map((item,index)=>({...normalizeVisualHighlightFields(item),index:item.index||String(index+1)}));
  data.confusions=collectVisualCards('confusions');
  return data;
}
function normalizeVisualHighlightFields(item={}){
  return {
    ...item,
    exampleHighlights:splitVisualList(item.exampleHighlights),
    translationHighlights:splitVisualList(item.translationHighlights),
  };
}
function splitVisualList(value){
  return String(value||'').split(/[\n,，、;；]+/).map(item=>item.trim()).filter(Boolean);
}
function collectVisualCards(kind){
  return [...(els.modalVisualEditor?.querySelectorAll(`[data-visual-kind="${kind}"]`)||[])].map(card=>{
    const item={};
    card.querySelectorAll('[data-field]').forEach(field=>{item[field.dataset.field]=field.value.trim()});
    return item;
  }).filter(item=>Object.values(item).some(Boolean));
}
function addVisualItem(kind){
  const data=collectVisualResult();
  if(kind==='senses')data.senses=[...(data.senses||[]),{partOfSpeech:'',shortestLabel:'',meaning:'',example:'',translation:''}];
  if(kind==='collocations')data.collocations=[...(data.collocations||[]),{phrase:'',meaning:'',example:'',translation:'',note:''}];
  if(kind==='confusions')data.confusions=[...(data.confusions||[]),{term:'',difference:'',usage:''}];
  modalResult=data;
  renderVisualEditor(data);
}
function removeVisualItem(kind,index){
  const data=collectVisualResult();
  if(Array.isArray(data[kind]))data[kind].splice(index,1);
  modalResult=data;
  renderVisualEditor(data);
}
function moveVisualItem(kind,index,delta){
  const data=collectVisualResult();
  const list=Array.isArray(data[kind])?data[kind]:[];
  const nextIndex=Math.max(0,Math.min(list.length-1,index+delta));
  if(index<0||index>=list.length||nextIndex===index)return;
  const [item]=list.splice(index,1);
  list.splice(nextIndex,0,item);
  data[kind]=list;
  modalResult=data;
  renderVisualEditor(data);
}
let visualDragState=null;
function startVisualDrag(event,kind,index){
  visualDragState={kind,index};
  event.dataTransfer?.setData('text/plain',`${kind}:${index}`);
  event.currentTarget?.classList.add('dragging');
}
function overVisualDrag(event,kind,index){
  event.preventDefault();
  if(!visualDragState||visualDragState.kind!==kind)return;
  autoScrollDuringDrag(event.clientY);
  clearVisualDropMarks();
  const target=event.currentTarget;
  const rect=target.getBoundingClientRect();
  target.classList.add(event.clientY>rect.top+rect.height/2?'drop-after':'drop-before');
}
function clearVisualDropMarks(){
  document.querySelectorAll('.visual-card.drop-before,.visual-card.drop-after').forEach(node=>node.classList.remove('drop-before','drop-after'));
}
function endVisualDrag(){
  document.querySelectorAll('.visual-card.dragging').forEach(node=>node.classList.remove('dragging'));
  clearVisualDropMarks();
  visualDragState=null;
}
function dropVisualItem(event,kind,index){
  event.preventDefault();
  event.stopPropagation();
  const state=visualDragState;
  const rect=event.currentTarget.getBoundingClientRect();
  const after=event.clientY>rect.top+rect.height/2;
  endVisualDrag();
  if(!state||state.kind!==kind||state.index===index)return;
  const data=collectVisualResult();
  const list=Array.isArray(data[kind])?data[kind]:[];
  const [item]=list.splice(state.index,1);
  let targetIndex=index+(after?1:0);
  if(state.index<targetIndex)targetIndex-=1;
  list.splice(Math.max(0,Math.min(list.length,targetIndex)),0,item);
  data[kind]=list;
  modalResult=data;
  renderVisualEditor(data);
}
function autoScrollDuringDrag(clientY){
  const scroller=els.historyModalBody||document.scrollingElement;
  if(!scroller||typeof clientY!=='number')return;
  const rect=scroller===document.scrollingElement
    ? {top:0,bottom:window.innerHeight}
    : scroller.getBoundingClientRect();
  const edge=72;
  const maxSpeed=18;
  let delta=0;
  if(clientY<rect.top+edge)delta=-Math.round(maxSpeed*(1-(clientY-rect.top)/edge));
  else if(clientY>rect.bottom-edge)delta=Math.round(maxSpeed*(1-(rect.bottom-clientY)/edge));
  if(delta)scroller.scrollBy({top:delta,behavior:'auto'});
}
function saveVisualHistoryEdit(){
  const data=collectVisualResult();
  modalResult=data;
  if(els.modalQueryEdit)els.modalQueryEdit.value=data.headword?.title||data.meta?.query||els.modalQueryEdit.value;
  els.modalJsonEdit.value=JSON.stringify(data,null,2);
  saveHistoryEdit();
}
function openHistoryModal(id){
  const item=getHistory().find(row=>Number(row.id)===Number(id));
  if(!item)return;
  const normalized=normalizeHistoryItem(item);
  const latest=getHistoryRolls(normalized)[0];
  modalResult=latest?.result||normalized.result;
  modalHistoryId=Number(item.id);
  modalRollId=latest?.id||null;
  els.modalTitle.textContent=normalized.query;
  els.modalSubtitle.textContent=historyModalMeta(normalized);
  renderModalRollbar(normalized);
  renderModalStickySummary(modalResult,normalized);
  els.modalCardPage.innerHTML=renderResultHTML(modalResult,normalized.followups||[],'modal',normalized);
  renderVisualEditor(modalResult);
  els.modalQueryEdit.value=normalized.query;
  if(els.modalTagsEdit)els.modalTagsEdit.value=normalized.tags.join(' ');
  if(els.modalNoteEdit)els.modalNoteEdit.value=normalized.note;
  els.modalJsonEdit.value=JSON.stringify(modalResult,null,2);
  validateModalJSON(false);
  setModalTab('card',document.getElementById('modal-card-tab'));
  els.historyModal.classList.add('open');
  document.body.classList.add('modal-open');
  els.historyModalBody?.scrollTo({top:0});
  updateHistoryModalScrollState();
}
function closeHistoryModal(event){
  if(event&&event.target!==els.historyModal)return;
  els.historyModal.classList.remove('open');
  document.body.classList.remove('modal-open');
  els.historyModal.querySelector('.modal-card')?.classList.remove('modal-scrolled');
}
function saveHistoryEdit(){
  if(!modalHistoryId)return;
  let parsed;
  try{
    parsed=JSON.parse(els.modalJsonEdit.value);
  }catch(error){
    updateModalJSONStatus(false,error.message);
    notify(`JSON 格式不对：${error.message}`,'bad','保存失败');
    return;
  }
  const query=els.modalQueryEdit.value.trim()||parsed?.meta?.query||parsed?.headword?.title||'未命名记录';
  parsed=normalizeResultEntryType(parsed,query);
  const tags=normalizeTags(els.modalTagsEdit?.value||'');
  const note=String(els.modalNoteEdit?.value||'').trim();
  const now=new Date().toISOString();
  const history=getHistory().map(item=>{
    if(Number(item.id)!==Number(modalHistoryId))return item;
    const rolls=getHistoryRolls(item);
    const normalized=normalizeHistoryItem(item);
    const noteChanged=note!==normalized.note;
    const updatedRolls=rolls.map((roll,index)=>Number(roll.id)===Number(modalRollId)||(!modalRollId&&index===0)
      ? {...roll,result:parsed,updatedAt:now}
      : roll);
    return {...normalized,query,tags,note,noteUpdatedAt:noteChanged?now:normalized.noteUpdatedAt,result:parsed,rolls:updatedRolls,followups:item.followups||[],updatedAt:now};
  });
  setHistory(history);
  modalResult=parsed;
  els.modalTitle.textContent=query;
  const updatedItem=getHistory().find(item=>Number(item.id)===Number(modalHistoryId));
  const updatedFollowups=updatedItem?.followups||[];
  els.modalSubtitle.textContent=historyModalMeta(updatedItem);
  renderModalRollbar(updatedItem);
  renderModalStickySummary(parsed,updatedItem);
  els.modalCardPage.innerHTML=renderResultHTML(parsed,updatedFollowups,'modal',updatedItem);
  renderVisualEditor(parsed);
  if(els.modalTagsEdit)els.modalTagsEdit.value=tags.join(' ');
  if(els.modalNoteEdit)els.modalNoteEdit.value=note;
  els.modalJsonEdit.value=JSON.stringify(parsed,null,2);
  updateModalJSONStatus(true,'语法正确，已保存');
  setModalTab('card',document.getElementById('modal-card-tab'));
  notify('历史记录已保存。','good','编辑完成');
}
function historyModalMeta(item){
  if(!item)return '';
  const normalized=normalizeHistoryItem(item);
  const followupCount=(item.followups||[]).length;
  const rollCount=getHistoryRolls(item).length;
  const tagText=normalized.tags.length?` · ${normalized.tags.length} 个标签`:'';
  const noteText=normalized.note?' · 有备注':'';
  const timeText=historyTimeMetaText(normalized,getSettings().historyTimeMode);
  return `${timeText}${rollCount>1?` · ${rollCount} 个版本`:''}${followupCount?` · ${followupCount} 条追问`:''}${tagText}${noteText}`;
}
function renderModalStickySummary(result={},historyItem=null){
  if(!els.modalStickySummary)return;
  const head=result?.headword||{};
  const meta=result?.meta||{};
  const title=historyItem?.query||head.title||meta.query||'历史记录';
  const core=head.coreMeaning||head.summary||'';
  const chips=[
    displayLanguageLabel(head.languageTag||meta.language),
    displayEntryTypeLabel(entryTypeForResult(result,historyItem?.query)),
    headwordPartOfSpeech(head,result?.senses||[]),
    displayDirectionLabel(meta.defaultDirection||meta.direction,result),
  ].filter(Boolean);
  els.modalStickySummary.innerHTML=`
    <div class="modal-sticky-copy">
      <strong>${escapeHTML(title)}</strong>
      ${core?`<span>${escapeHTML(core)}</span>`:''}
    </div>
    <div class="modal-sticky-chips">${chips.slice(0,4).map(chip=>`<em>${escapeHTML(chip)}</em>`).join('')}</div>
  `;
}
function updateHistoryModalScrollState(){
  const scrolled=(els.historyModalBody?.scrollTop||0)>34;
  els.historyModal?.querySelector('.modal-card')?.classList.toggle('modal-scrolled',scrolled);
}
function renderModalRollbar(item){
  if(!els.modalRollbar)return;
  const normalized=normalizeHistoryItem(item||{});
  const rolls=getHistoryRolls(normalized);
  if(!rolls.length){
    els.modalRollbar.innerHTML='';
    return;
  }
  els.modalRollbar.innerHTML=`
    <div class="roll-tabs">
      ${rolls.map((roll,index)=>`
        <button class="roll-btn ${Number(roll.id)===Number(modalRollId)?'active':''}" onclick="setModalRoll(${Number(roll.id)})">
          <span>版本 ${rolls.length-index}</span>
          <em>${escapeHTML(new Date(roll.createdAt).toLocaleString('zh-CN',{hour12:false}))}</em>
          <strong>${escapeHTML(roll.model||'未记录')}</strong>
        </button>
      `).join('')}
    </div>
    <button class="icon-btn primary-icon reroll-btn" data-tip="重新生成" aria-label="重新生成" onclick="regenerateModalHistory()">↻</button>
  `;
}
function setModalRoll(rollId){
  const item=getHistory().find(row=>Number(row.id)===Number(modalHistoryId));
  if(!item)return;
  const roll=getHistoryRolls(item).find(row=>Number(row.id)===Number(rollId));
  if(!roll)return;
  modalRollId=Number(roll.id);
  modalResult=roll.result;
  els.modalCardPage.innerHTML=renderResultHTML(roll.result,item.followups||[],'modal',item);
  els.modalJsonEdit.value=JSON.stringify(roll.result,null,2);
  renderVisualEditor(roll.result);
  renderModalRollbar(item);
  renderModalStickySummary(roll.result,item);
  validateModalJSON(false);
}
function validateModalJSON(showSuccess=true){
  if(!els.modalJsonEdit)return false;
  try{
    JSON.parse(els.modalJsonEdit.value);
    updateModalJSONStatus(true,showSuccess?'语法正确':'可编辑，保存时会再次检查');
    return true;
  }catch(error){
    updateModalJSONStatus(false,error.message);
    return false;
  }
}
function updateModalJSONStatus(isValid,message){
  if(!els.modalJsonStatus)return;
  els.modalJsonStatus.classList.toggle('good',isValid);
  els.modalJsonStatus.classList.toggle('bad',!isValid);
  els.modalJsonStatus.textContent=isValid?message:`JSON 错误：${message}`;
}
function copyModalJSON(){
  if(!modalResult)return;
  navigator.clipboard.writeText(JSON.stringify(modalResult,null,2));
  notify('JSON 已复制。','good','复制完成');
}
async function regenerateHistory(id){
  const item=getHistory().find(row=>Number(row.id)===Number(id));
  if(!item)return notify('找不到这条历史记录。','bad','重新生成');
  const ok=await askConfirm(`确认重新生成“${item.query}”？新结果会保存为一个新版本，旧版本仍可切换查看。`,'重新生成');
  if(!ok)return;
  els.query.value=item.query;
  updateEditorState();
  goHomeAndFocus();
  await submitLookup({query:item.query,existingId:item.id,sourceItem:item,direction:els.direction.value.trim(),note:els.note.value.trim()});
}
async function regenerateModalHistory(){
  if(!modalHistoryId)return;
  closeHistoryModal();
  await regenerateHistory(modalHistoryId);
}
function exportModalJSON(){
  if(!modalResult)return;
  const name=(modalResult.meta?.normalized||modalResult.meta?.query||'history').replace(/[\\/:*?"<>|]/g,'_');
  downloadText(`${name}.json`,JSON.stringify(modalResult,null,2));
}
async function deleteHistory(id){
  if(!await askConfirm('确认删除这条历史记录？','删除记录'))return;
  setHistory(getHistory().filter(item=>Number(item.id)!==Number(id)));
  notify('记录已删除。','good','历史记录');
}
async function clearHistory(){
  const count=getHistory().length;
  if(!await askConfirm(`确认清空全部 ${count} 条历史记录？这会同步到云端，所有设备都会清空。`,'危险操作：清空历史'))return;
  setHistory([]);
  notify('历史记录已清空。','good','历史记录');
}
function exportHistory(){downloadText('ai-vocab-tool-history.json',JSON.stringify(getHistory(),null,2))}
function parseHistoryImportPayload(text){
  const unwrap=value=>{
    if(typeof value==='string')return unwrap(JSON.parse(value));
    if(Array.isArray(value))return value;
    if(value&&typeof value==='object'){
      if(Array.isArray(value.history))return value.history;
      if(Array.isArray(value.items))return value.items;
      if(value.value&&Object.prototype.hasOwnProperty.call(value.value,'raw'))return unwrap(value.value.raw);
      if(Object.prototype.hasOwnProperty.call(value,'raw'))return unwrap(value.raw);
      if(value.data)return unwrap(value.data);
    }
    return [];
  };
  return normalizeHistoryItems(unwrap(JSON.parse(String(text||'').trim())));
}
function historyImportKey(item={}){
  const normalized=normalizeHistoryItem(item);
  return normalizeSearch(normalized.query||normalized.result?.meta?.query||normalized.result?.headword?.title||normalized.id);
}
function historyRangeLabel(items=[]){
  const times=items.flatMap(item=>[item.createdAt,item.updatedAt]).filter(Boolean).map(value=>new Date(value).getTime()).filter(Boolean).sort((a,b)=>a-b);
  if(!times.length)return '无时间';
  return `${formatTime(new Date(times[0]).toISOString())} → ${formatTime(new Date(times[times.length-1]).toISOString())}`;
}
function analyzeHistoryImport(text){
  const imported=parseHistoryImportPayload(text);
  const current=normalizeHistoryItems(getHistory());
  const currentMap=new Map(current.map(item=>[historyImportKey(item),normalizeHistoryItem(item)]).filter(([key])=>key));
  const importedUnique=mergeHistoryItems(imported,[]);
  const importedMap=new Map();
  importedUnique.forEach(item=>{
    const key=historyImportKey(item);
    if(key&&!importedMap.has(key))importedMap.set(key,normalizeHistoryItem(item));
  });
  const merged=mergeHistoryItems([...importedMap.values()],current);
  const mergedMap=new Map(merged.map(item=>[historyImportKey(item),normalizeHistoryItem(item)]).filter(([key])=>key));
  let newCount=0;
  let changedCount=0;
  let unchangedCount=0;
  importedMap.forEach((item,key)=>{
    if(!currentMap.has(key)){newCount+=1;return}
    const before=JSON.stringify(currentMap.get(key));
    const after=JSON.stringify(mergedMap.get(key));
    if(before===after)unchangedCount+=1;
    else changedCount+=1;
  });
  return {
    imported,
    importedUnique:[...importedMap.values()],
    current,
    merged,
    rawCount:imported.length,
    uniqueCount:importedMap.size,
    duplicateCount:Math.max(0,imported.length-importedMap.size),
    newCount,
    overlapCount:importedMap.size-newCount,
    changedCount,
    unchangedCount,
    currentCount:current.length,
    mergedCount:merged.length,
    range:historyRangeLabel(imported),
  };
}
function renderHistoryImportStatus(stats,type='info'){
  if(!els.historyImportStatus)return;
  if(!stats){
    els.historyImportStatus.className='import-status';
    els.historyImportStatus.textContent='尚未预检。';
    return;
  }
  els.historyImportStatus.className=`import-status ${type}`;
  els.historyImportStatus.innerHTML=`
    <b>预检完成</b>
    <span>导入 ${stats.rawCount} 条，去重后 ${stats.uniqueCount} 条；当前 ${stats.currentCount} 条，合并后 ${stats.mergedCount} 条。</span>
    <span>新增 ${stats.newCount} 条，重叠 ${stats.overlapCount} 条；重叠中可更新 ${stats.changedCount} 条，完全相同 ${stats.unchangedCount} 条；导入文件内部重复 ${stats.duplicateCount} 条。</span>
    <span>导入时间范围：${escapeHTML(stats.range)}</span>
  `;
}
function previewHistoryImport(){
  try{
    const text=els.historyImportText?.value||'';
    if(!text.trim())return notify('先粘贴历史 JSON。','bad','无法预检');
    const stats=analyzeHistoryImport(text);
    renderHistoryImportStatus(stats,stats.newCount||stats.changedCount?'good':'warn');
    notify(`预检完成：新增 ${stats.newCount}，可更新 ${stats.changedCount}。`,'good','历史导入');
  }catch(error){
    if(els.historyImportStatus){
      els.historyImportStatus.className='import-status bad';
      els.historyImportStatus.textContent=`解析失败：${error.message}`;
    }
    notify(`解析失败：${error.message}`,'bad','历史导入');
  }
}
async function importHistoryFromText(){
  try{
    const text=els.historyImportText?.value||'';
    if(!text.trim())return notify('先粘贴历史 JSON。','bad','无法导入');
    const stats=analyzeHistoryImport(text);
    renderHistoryImportStatus(stats,stats.newCount||stats.changedCount?'good':'warn');
    if(!stats.rawCount)return notify('没有识别到可导入的历史记录。','bad','历史导入');
    if(!stats.newCount&&!stats.changedCount)return notify('导入内容和当前历史完全重叠，不需要合并。','warn','历史导入');
    const ok=await askConfirm(`将合并导入 ${stats.rawCount} 条历史：新增 ${stats.newCount} 条，更新 ${stats.changedCount} 条重叠记录。当前 ${stats.currentCount} 条，合并后 ${stats.mergedCount} 条。继续？`,'合并导入历史');
    if(!ok)return;
    setHistory(stats.merged);
    renderHistoryImportStatus(stats,'good');
    notify(`已合并导入：新增 ${stats.newCount}，更新 ${stats.changedCount}。`,'good','历史导入');
  }catch(error){
    if(els.historyImportStatus){
      els.historyImportStatus.className='import-status bad';
      els.historyImportStatus.textContent=`导入失败：${error.message}`;
    }
    notify(`导入失败：${error.message}`,'bad','历史导入');
  }
}
function clearHistoryImportText(){
  if(els.historyImportText)els.historyImportText.value='';
  renderHistoryImportStatus(null);
}
function exportCurrent(){
  if(!currentResult)return notify('还没有结果。','bad','无法导出');
  const name=(currentResult.meta?.normalized||currentResult.meta?.query||'ai-vocab-tool').replace(/[\\/:*?"<>|]/g,'_');
  downloadText(`${name}.json`,JSON.stringify(currentResult,null,2));
}
function copyJSON(){
  if(!currentResult)return notify('还没有结果。','bad','无法复制');
  navigator.clipboard.writeText(JSON.stringify(currentResult,null,2));
  notify('JSON 已复制。','good','复制完成');
}
function downloadText(filename,text){
  const blob=new Blob([text],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  link.click();
  URL.revokeObjectURL(url);
}
function resetCurrentLookupState(){
  clearResultTypewriter();
  lookupRunId+=1;
  lookupBusy=false;
  clearLookupQueue();
  document.body.classList.remove('lookup-busy');
  currentResult=null;
  currentHistoryId=null;
  currentFollowups=[];
  pendingFollowup=null;
  editingFollowup=null;
  renderEmpty();
}
function clearEditor(){
  els.query.value='';
  els.direction.value='';
  els.note.value='';
  resetCurrentLookupState();
  updateEditorState();
}
function hydrateSettings(){
  const settings=getSettings();
  const profile=activeApiProfile(settings);
  renderApiProfilePicker(settings,profile);
  applyLabelMode(settings.labelMode);
  applyFontMode(settings.fontMode);
  applyHistoryTimeMode(settings.historyTimeMode);
  applyVisualHintsPinned(settings.visualHintsPinned);
  renderModelPromptSettings(settings);
  if(els.apiModalModel)els.apiModalModel.placeholder=configInfo?.model||'gpt-4o-mini';
}
function defaultModelPrompt(){
  return String(configInfo?.defaultAnalyzePrompt||'');
}
function currentPromptText(settings=getSettings()){
  return settings.modelPrompt||defaultModelPrompt();
}
function renderModelPromptSettings(settings=getSettings()){
  if(els.modelPromptEditor&&document.activeElement!==els.modelPromptEditor){
    els.modelPromptEditor.value=settings.modelPrompt||'';
  }
  const usingCustom=Boolean(settings.modelPrompt);
  const defaultText=defaultModelPrompt();
  const defaultReady=Boolean(defaultText);
  const sourceText=usingCustom?'自定义覆盖':'默认 Prompt';
  if(els.modelPromptStatus){
    els.modelPromptStatus.textContent=usingCustom
      ? `正在使用自定义 Prompt，约 ${settings.modelPrompt.length} 字。`
      : defaultReady
        ? '当前使用内置默认 Prompt；编辑框留空时不会覆盖默认规则。'
        : '默认 Prompt 正在读取中；留空会使用服务端内置规则。';
    els.modelPromptStatus.classList.toggle('good',usingCustom);
    els.modelPromptStatus.classList.toggle('info',!usingCustom);
  }
  if(els.modelPromptSource)els.modelPromptSource.textContent=sourceText;
  if(els.modelPromptMetaSource)els.modelPromptMetaSource.textContent=sourceText;
  if(els.modelPromptDefaultSize)els.modelPromptDefaultSize.textContent=defaultReady?`${defaultText.length} 字`:'读取中';
  if(els.modelPromptEditSize)els.modelPromptEditSize.textContent=usingCustom?`${settings.modelPrompt.length} 字`:'未覆盖';
}
function loadDefaultPromptIntoEditor(){
  const text=defaultModelPrompt();
  if(!text)return notify('默认 Prompt 还没加载完成。','bad','Prompt');
  if(els.modelPromptEditor)els.modelPromptEditor.value=text;
  notify('已把默认 Prompt 放入编辑框，保存后才会覆盖当前规则。','info','Prompt');
}
function copyModelPrompt(){
  const text=els.modelPromptEditor?.value.trim()?els.modelPromptEditor.value:currentPromptText();
  if(!text)return notify('还没有可复制的 Prompt。','bad','Prompt');
  navigator.clipboard.writeText(text);
  notify('Prompt 已复制。','good','复制完成');
}
function saveModelPrompt(){
  const text=els.modelPromptEditor?.value.trim()||'';
  const settings=getSettings();
  setSettings({...settings,modelPrompt:text,updatedAt:new Date().toISOString()});
  renderModelPromptSettings(getSettings());
  notify(text?'自定义 Prompt 已保存。':'已切回默认 Prompt。','good','Prompt');
}
async function resetModelPrompt(){
  const settings=getSettings();
  if(settings.modelPrompt){
    const ok=await askConfirm('确认恢复默认 Prompt？当前自定义 Prompt 会被清空，并随云端同步。','恢复默认 Prompt');
    if(!ok)return;
  }
  setSettings({...settings,modelPrompt:'',updatedAt:new Date().toISOString()});
  renderModelPromptSettings(getSettings());
  notify('已恢复默认 Prompt。','good','Prompt');
}
function renderApiProfilePicker(settings,profile){
  if(els.apiProfileCurrentName)els.apiProfileCurrentName.textContent=profile.name||'未命名配置';
  if(!els.apiProfileMenu)return;
  els.apiProfileMenu.innerHTML=`
    <button class="api-profile-create" type="button" data-profile-action="new">新增配置</button>
    <div class="api-profile-menu-list">
      ${settings.apiProfiles.map((item,index)=>`
        <div class="api-profile-option ${item.id===profile.id?'active':''}" draggable="true" data-profile-index="${index}" data-profile-id="${escapeHTML(item.id)}">
          <span class="api-profile-drag" aria-hidden="true">⋮⋮</span>
          <button class="api-profile-select" type="button" data-profile-action="select">
            <span>${escapeHTML(item.name||'未命名配置')}</span>
            <em>${escapeHTML(apiProfileSummary(item))}</em>
          </button>
          <button class="api-profile-edit" type="button" data-profile-action="edit">编辑</button>
          <button class="api-profile-delete" type="button" data-profile-action="delete" aria-label="删除 ${escapeAttr(item.name||'未命名配置')}">×</button>
        </div>
      `).join('')}
    </div>
  `;
}
function apiProfileSummary(profile){
  const hasUrl=Boolean(profile?.apiUrl);
  const hasKey=Boolean(profile?.apiKey);
  if(hasUrl&&hasKey)return profile.model?`已完整 · ${profile.model}`:'已完整 · 使用环境默认模型';
  if(hasUrl||hasKey)return '未完整 · 还缺 API URL 或 Key';
  return '空配置 · 使用 Vercel 环境变量';
}
function closeApiProfileMenu(){
  els.apiProfilePicker?.classList.remove('open');
  els.apiProfilePicker?.closest('.setting-group')?.classList.remove('profile-menu-host-open');
  els.apiProfileMenuToggle?.setAttribute('aria-expanded','false');
  if(els.apiProfileMenu){
    els.apiProfileMenu.classList.remove('floating-open');
    if(els.apiProfileMenu.parentElement!==els.apiProfilePicker)els.apiProfilePicker?.appendChild(els.apiProfileMenu);
    els.apiProfileMenu.style.left='';
    els.apiProfileMenu.style.top='';
    els.apiProfileMenu.style.width='';
    els.apiProfileMenu.style.maxHeight='';
  }
}
function positionApiProfileMenu(){
  if(!els.apiProfileMenu||!els.apiProfilePicker)return;
  const anchor=els.apiProfilePicker.querySelector('.api-profile-current')||els.apiProfilePicker;
  const rect=anchor.getBoundingClientRect();
  const margin=12;
  const mobile=window.matchMedia?.('(max-width: 900px)').matches;
  const bottomReserve=mobile?96:margin;
  const width=Math.min(rect.width,window.innerWidth-margin*2);
  const left=Math.max(margin,Math.min(rect.left,window.innerWidth-width-margin));
  const top=Math.min(rect.bottom+2,window.innerHeight-bottomReserve-120);
  els.apiProfileMenu.style.left=`${left}px`;
  els.apiProfileMenu.style.top=`${Math.max(margin,top)}px`;
  els.apiProfileMenu.style.width=`${width}px`;
  els.apiProfileMenu.style.maxHeight=`${Math.max(160,window.innerHeight-Math.max(margin,top)-bottomReserve)}px`;
}
function toggleApiProfileMenu(){
  const open=!els.apiProfilePicker?.classList.contains('open');
  els.apiProfilePicker?.classList.toggle('open',open);
  els.apiProfilePicker?.closest('.setting-group')?.classList.toggle('profile-menu-host-open',open);
  els.apiProfileMenuToggle?.setAttribute('aria-expanded',String(open));
  if(open){
    if(els.apiProfileMenu&&els.apiProfileMenu.parentElement!==document.body)document.body.appendChild(els.apiProfileMenu);
    els.apiProfileMenu?.classList.add('floating-open');
    requestAnimationFrame(positionApiProfileMenu);
  }else{
    els.apiProfileMenu?.classList.remove('floating-open');
  }
}
function renderSettings(){
  setupSettingGroupToggles();
  hydrateSettings();
  renderTagManager();
  renderLogs();
}
function setupSettingGroupToggles(){
  document.querySelectorAll('.setting-group').forEach((group,index)=>{
    const title=group.querySelector('.setting-title');
    if(!title||title.querySelector('.setting-collapse-btn'))return;
    const text=title.textContent.trim()||`模块 ${index+1}`;
    title.innerHTML=`<span>${escapeHTML(text)}</span><button class="setting-collapse-btn" type="button" aria-label="折叠 ${escapeAttr(text)}">⌄</button>`;
    title.querySelector('.setting-collapse-btn')?.addEventListener('click',event=>{
      event.stopPropagation();
      group.classList.toggle('collapsed');
      event.currentTarget.setAttribute('aria-expanded',String(!group.classList.contains('collapsed')));
    });
    title.addEventListener('click',event=>{
      if(event.target.closest('button'))return;
      const button=title.querySelector('.setting-collapse-btn');
      button?.click();
    });
  });
}
function applyLabelMode(mode){
  const next=normalizeLabelMode(mode);
  els.labelModeZhBtn?.classList.toggle('active',next==='zh');
  els.labelModeCodeBtn?.classList.toggle('active',next==='code');
  els.labelModeBothBtn?.classList.toggle('active',next==='both');
}
function setLabelMode(mode){
  const next=normalizeLabelMode(mode);
  const settings=getSettings();
  setSettings({...settings,labelMode:next,updatedAt:new Date().toISOString()});
  applyLabelMode(next);
  renderHistory();
  if(currentResult)renderResult(currentResult);
  if(modalHistoryId){
    const item=getHistory().find(row=>Number(row.id)===Number(modalHistoryId));
    if(item)openHistoryModal(modalHistoryId);
  }
  notify(`字段标签已切换为${next==='zh'?'中文':next==='code'?'缩写':'双语'}显示。`,'good','显示设置');
}
function applyFontMode(mode){
  const next=normalizeFontMode(mode);
  document.body.dataset.fontMode=next;
  els.fontModeSystemBtn?.classList.toggle('active',next==='system');
  els.fontModeSansBtn?.classList.toggle('active',next==='sans');
  els.fontModeSerifBtn?.classList.toggle('active',next==='serif');
  els.fontModeMonoBtn?.classList.toggle('active',next==='mono');
}
function fontModeLabel(mode){
  return {system:'系统默认',sans:'无衬线',serif:'衬线',mono:'等宽'}[normalizeFontMode(mode)]||'系统默认';
}
function setFontMode(mode){
  const next=normalizeFontMode(mode);
  const settings=getSettings();
  setSettings({...settings,fontMode:next,updatedAt:new Date().toISOString()});
  applyFontMode(next);
  notify(`字体风格已切换为${fontModeLabel(next)}。`,'good','显示设置');
}
function historyTimeModeLabel(mode){
  return {created:'创建时间',updated:'修改时间',both:'全部时间'}[normalizeHistoryTimeMode(mode)]||'创建时间';
}
function applyHistoryTimeMode(mode){
  const next=normalizeHistoryTimeMode(mode);
  els.timeModeCreatedBtn?.classList.toggle('active',next==='created');
  els.timeModeUpdatedBtn?.classList.toggle('active',next==='updated');
  els.timeModeBothBtn?.classList.toggle('active',next==='both');
}
function setHistoryTimeMode(mode){
  const next=normalizeHistoryTimeMode(mode);
  const settings=getSettings();
  setSettings({...settings,historyTimeMode:next,updatedAt:new Date().toISOString()});
  applyHistoryTimeMode(next);
  renderHistory();
  if(modalHistoryId){
    const item=getHistory().find(row=>Number(row.id)===Number(modalHistoryId));
    if(item)els.modalSubtitle.textContent=historyModalMeta(item);
  }
  notify(`历史时间默认显示已切换为${historyTimeModeLabel(next)}。`,'good','显示设置');
}
function applyVisualHintsPinned(value){
  const enabled=normalizeBooleanSetting(value,false);
  if(els.visualHintsPinnedInput)els.visualHintsPinnedInput.checked=enabled;
  els.modalVisualEditor?.classList.toggle('hints-pinned',enabled);
}
function setVisualHintsPinned(value){
  const enabled=normalizeBooleanSetting(value,false);
  const settings=getSettings();
  setSettings({...settings,visualHintsPinned:enabled,updatedAt:new Date().toISOString()});
  applyVisualHintsPinned(enabled);
  renderVisualEditor(modalResult);
  notify(enabled?'可视化填写提示已设为常驻。':'可视化填写提示改为聚焦时显示。','good','显示设置');
}
function saveSettings(){
  openApiProfileModal('edit');
}
function editApiProfile(id=null){
  openApiProfileModal('edit',id);
}
function openApiProfileModal(mode='edit',profileId=null){
  const settings=getSettings();
  const target=settings.apiProfiles.find(item=>item.id===profileId)||activeApiProfile(settings);
  const profile=mode==='new'
    ? {...DEFAULT_API_PROFILE,id:`api_${Date.now()}`,name:`配置 ${settings.apiProfiles.length+1}`}
    : target;
  editingApiProfileId=profile.id;
  if(els.apiProfileModalTitle)els.apiProfileModalTitle.textContent=mode==='new'?'新增 API 配置':'编辑 API 配置';
  if(els.apiProfileModalSubtitle)els.apiProfileModalSubtitle.textContent=mode==='new'?'填写后会新增并切换到这组配置。':'保存后会更新当前配置。';
  if(els.apiModalName)els.apiModalName.value=profile.name||'';
  if(els.apiModalUrl)els.apiModalUrl.value=profile.apiUrl||'';
  if(els.apiModalKey)els.apiModalKey.value=profile.apiKey||'';
  if(els.apiModalModel)els.apiModalModel.value=profile.model||'';
  if(els.apiModelList)els.apiModelList.innerHTML='';
  setApiProfileModalStatus('未保存','');
  els.apiProfileModal?.classList.add('open');
  document.body.classList.add('modal-open');
  requestAnimationFrame(()=>els.apiModalName?.focus());
}
function closeApiProfileModal(event){
  if(event&&event.target!==els.apiProfileModal)return;
  if(event&&event.target===els.apiProfileModal&&apiProfileModalHasDraft()){
    notify('已保留当前填写内容；请用取消或关闭按钮退出。','info','未关闭');
    return;
  }
  els.apiProfileModal?.classList.remove('open');
  document.body.classList.remove('modal-open');
  editingApiProfileId=null;
}
function setApiProfileModalStatus(message,type=''){
  if(!els.apiProfileModalStatus)return;
  els.apiProfileModalStatus.textContent=message;
  els.apiProfileModalStatus.classList.toggle('good',type==='good');
  els.apiProfileModalStatus.classList.toggle('bad',type==='bad');
}
function apiProfileDraftFromModal(){
  return {
    name:els.apiModalName?.value.trim()||'未命名配置',
    apiUrl:els.apiModalUrl?.value.trim()||'',
    apiKey:els.apiModalKey?.value.trim()||'',
    model:els.apiModalModel?.value.trim()||'',
  };
}
function apiProfileModalHasDraft(){
  if(!els.apiProfileModal?.classList.contains('open'))return false;
  const draft=apiProfileDraftFromModal();
  const settings=getSettings();
  const current=settings.apiProfiles.find(item=>item.id===editingApiProfileId);
  if(!current){
    return Boolean(draft.name&&draft.name!=='未命名配置'||draft.apiUrl||draft.apiKey||draft.model);
  }
  return ['name','apiUrl','apiKey','model'].some(key=>String(draft[key]||'')!==String(current[key]||''));
}
function saveApiProfileFromModal(){
  try{
    const settings=getSettings();
    const id=editingApiProfileId||`api_${Date.now()}`;
    const now=new Date().toISOString();
    const draft={
      id,
      ...apiProfileDraftFromModal(),
      updatedAt:now,
    };
    const exists=settings.apiProfiles.some(profile=>profile.id===id);
    const profiles=exists
      ? settings.apiProfiles.map(profile=>profile.id===id?{...profile,...draft}:profile)
      : [draft,...settings.apiProfiles];
    saveSettingsLocal({...settings,apiProfiles:profiles,activeApiProfileId:id,updatedAt:now});
    hydrateSettings();
    closeApiProfileModal();
    notify(`已保存「${draft.name}」。`,'good','API 配置');
    setTimeout(()=>syncAllToCloud(true),0);
  }catch(error){
    const message=error?.message||String(error||'保存失败');
    notify(message,'bad','API 配置保存失败');
    setApiProfileModalStatus(message,'bad');
  }
}
async function testApiProfileDraft(){
  const draft=apiProfileDraftFromModal();
  if(!draft.apiUrl)return setApiProfileModalStatus('先填写 API URL。','bad');
  if(!draft.apiKey)return setApiProfileModalStatus('先填写 API Key。','bad');
  setApiProfileModalStatus('正在测试当前填写内容...','');
  try{
    const response=await fetch('/api/test-profile',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({apiUrl:draft.apiUrl,apiKey:draft.apiKey,model:draft.model}),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false)throw new Error(data.error||`HTTP ${response.status}`);
    const model=data.model||draft.model||configInfo?.model||'默认模型';
    const elapsed=Number(data.elapsedMs||0);
    setApiProfileModalStatus(`连接正常：${model}${elapsed?` · ${elapsed}ms`:''}`,'good');
  }catch(error){
    setApiProfileModalStatus(`连接失败：${error.message||error}`,'bad');
  }
}
async function fetchApiModels(){
  const apiUrl=els.apiModalUrl?.value.trim();
  const key=els.apiModalKey?.value.trim();
  if(!apiUrl)return setApiProfileModalStatus('先填写 API URL。','bad');
  if(!key)return setApiProfileModalStatus('先填写 API Key。','bad');
  setApiProfileModalStatus('正在查询模型列表...','');
  if(els.apiModelList)els.apiModelList.innerHTML='';
  try{
    const response=await fetch('/api/models',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({apiUrl,apiKey:key}),
    });
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const models=Array.isArray(data?.models)?data.models:[];
    if(!models.length)throw new Error('没有读到模型列表');
    renderModelChoices([...new Set(models)].slice(0,40));
    setApiProfileModalStatus(`已查询到 ${models.length} 个模型。`,'good');
  }catch(error){
    setApiProfileModalStatus(`查询失败：${error.message||error}`,'bad');
  }
}
function renderModelChoices(models){
  if(!els.apiModelList)return;
  els.apiModelList.innerHTML=models.map(model=>`
    <button class="model-choice" type="button" data-model="${escapeHTML(model)}">${escapeHTML(model)}</button>
  `).join('');
}
async function resetModelSettings(){
  if(!await askConfirm('这会清空所有自定义 API 配置组，改回 Vercel 环境变量。','恢复接口默认'))return;
  setSettings({...getSettings(),apiProfiles:[DEFAULT_API_PROFILE],activeApiProfileId:'default',apiUrl:'',apiKey:'',model:'',updatedAt:new Date().toISOString()});
  hydrateSettings();
  closeApiProfileMenu();
  notify('接口配置已恢复默认。','good','设置');
}
function selectApiProfile(id){
  const settings=getSettings();
  if(!settings.apiProfiles.some(profile=>profile.id===id))return;
  setSettings({...settings,activeApiProfileId:id,updatedAt:new Date().toISOString()});
  hydrateSettings();
  closeApiProfileMenu();
}
function moveApiProfile(id,delta){
  const settings=getSettings();
  const index=settings.apiProfiles.findIndex(profile=>profile.id===id);
  if(index<0)return;
  const nextIndex=Math.max(0,Math.min(settings.apiProfiles.length-1,index+delta));
  if(nextIndex===index)return;
  const profiles=[...settings.apiProfiles];
  const [item]=profiles.splice(index,1);
  profiles.splice(nextIndex,0,item);
  setSettings({...settings,apiProfiles:profiles,updatedAt:new Date().toISOString()});
  renderApiProfilePicker(getSettings(),activeApiProfile(getSettings()));
  requestAnimationFrame(positionApiProfileMenu);
  notify('配置顺序已调整。','good','API 配置');
}
let apiProfileDragState=null;
function startApiProfileDrag(event){
  const option=event.target.closest('.api-profile-option');
  if(!option)return;
  apiProfileDragState={index:Number(option.dataset.profileIndex),id:option.dataset.profileId};
  option.classList.add('dragging');
  event.dataTransfer?.setData('text/plain',apiProfileDragState.id);
}
function overApiProfileDrag(event){
  const option=event.target.closest('.api-profile-option');
  if(!option||!apiProfileDragState)return;
  event.preventDefault();
  autoScrollDuringDrag(event.clientY);
  clearApiProfileDropMarks();
  const rect=option.getBoundingClientRect();
  option.classList.add(event.clientY>rect.top+rect.height/2?'drop-after':'drop-before');
}
function clearApiProfileDropMarks(){
  els.apiProfileMenu?.querySelectorAll('.api-profile-option.drop-before,.api-profile-option.drop-after').forEach(node=>node.classList.remove('drop-before','drop-after'));
}
function endApiProfileDrag(){
  els.apiProfileMenu?.querySelectorAll('.api-profile-option.dragging').forEach(node=>node.classList.remove('dragging'));
  clearApiProfileDropMarks();
  apiProfileDragState=null;
}
function dropApiProfile(event){
  const option=event.target.closest('.api-profile-option');
  if(!option||!apiProfileDragState)return;
  event.preventDefault();
  event.stopPropagation();
  const from=apiProfileDragState.index;
  const rect=option.getBoundingClientRect();
  const after=event.clientY>rect.top+rect.height/2;
  let to=Number(option.dataset.profileIndex)+(after?1:0);
  if(from<to)to-=1;
  endApiProfileDrag();
  reorderApiProfile(from,to);
}
function reorderApiProfile(from,to){
  const settings=getSettings();
  const profiles=[...settings.apiProfiles];
  if(from<0||from>=profiles.length)return;
  const target=Math.max(0,Math.min(profiles.length-1,to));
  if(target===from)return;
  const [item]=profiles.splice(from,1);
  profiles.splice(target,0,item);
  setSettings({...settings,apiProfiles:profiles,updatedAt:new Date().toISOString()});
  renderApiProfilePicker(getSettings(),activeApiProfile(getSettings()));
  requestAnimationFrame(positionApiProfileMenu);
  notify('配置顺序已调整。','good','API 配置');
}
function newApiProfile(){
  closeApiProfileMenu();
  openApiProfileModal('new');
}
async function deleteApiProfile(id=null){
  const settings=getSettings();
  const current=settings.apiProfiles.find(profile=>profile.id===id)||activeApiProfile(settings);
  if(!await askConfirm(`确认删除「${current.name}」？`,'删除 API 配置'))return;
  const profiles=settings.apiProfiles.filter(profile=>profile.id!==current.id);
  const nextProfiles=profiles.length?profiles:[DEFAULT_API_PROFILE];
  const activeId=current.id===settings.activeApiProfileId?nextProfiles[0].id:settings.activeApiProfileId;
  setSettings({...settings,apiProfiles:nextProfiles,activeApiProfileId:activeId,updatedAt:new Date().toISOString()});
  hydrateSettings();
  closeApiProfileMenu();
  notify(profiles.length?'当前 API 配置组已删除。':'最后一组已清空为默认配置。','good','设置');
}
async function factoryReset(){
  if(!await askConfirm('这会清空本机历史、接口配置、主题、布局和日志。','恢复出厂设置'))return;
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.settings);
  localStorage.removeItem(STORAGE_KEYS.theme);
  localStorage.removeItem(STORAGE_KEYS.layout);
  localStorage.removeItem(STORAGE_KEYS.logs);
  currentResult=null;
  currentHistoryId=null;
  currentFollowups=[];
  modalResult=null;
  historyState.query='';
  historyState.scope='all';
  Object.keys(historyState.filters).forEach(key=>{historyState.filters[key]=[]});
  if(els.historySearch)els.historySearch.value='';
  hydrateSettings();
  renderEmpty();
  rerenderHistoryFromStart();
  renderLogs();
  applyTheme('auto');
  applyLayout('top');
  syncAllToCloud(true);
  notify('已恢复默认设置。','good','恢复出厂',false);
}
function renderLogs(){
  if(!els.logList)return;
  const logs=getLogs();
  if(!logs.length){
    els.logList.innerHTML='<div class="empty small-empty">暂无日志</div>';
    return;
  }
  els.logList.innerHTML=logs.slice(0,18).map(item=>`
    <article class="log-item ${escapeHTML(item.type)}">
      <div class="log-head"><b>${escapeHTML(item.title)}</b><span>${new Date(item.time).toLocaleString('zh-CN',{hour12:false})}</span></div>
      <p>${escapeHTML(item.message)}</p>
    </article>
  `).join('');
}
function renderAbout(){
  if(!els.aboutContainer)return;
  const latest=CHANGELOG[0];
  els.aboutContainer.innerHTML=`
    <div class="about-hero">
      <div>
        <div class="setting-title">关于</div>
        <h2>${escapeHTML(APP_INFO.name)}</h2>
        <p>一个面向写作、考试和日常阅读的词汇结构化查询工具。它把释义、搭配、例句、语体和易混辨析整理成可以回看、导出和同步的记录。</p>
      </div>
      <div class="about-version">
        <span>当前版本</span>
        <strong>v${escapeHTML(APP_INFO.version)}</strong>
        <em>${escapeHTML(APP_INFO.releaseDate)}</em>
      </div>
    </div>
    <div class="about-grid">
      <a class="about-link" href="${APP_INFO.site}" target="_blank" rel="noopener noreferrer"><b>线上地址</b><span>${escapeHTML(APP_INFO.site)}</span></a>
      <a class="about-link" href="${APP_INFO.repo}" target="_blank" rel="noopener noreferrer"><b>GitHub 仓库</b><span>${escapeHTML(APP_INFO.repo)}</span></a>
      <div class="about-link"><b>数据存储</b><span>localStorage + Supabase Auth / Postgres</span></div>
      <div class="about-link"><b>最近更新</b><span>v${escapeHTML(latest.version)} · ${escapeHTML(latest.title)}</span></div>
    </div>
    <div class="about-card">
      <div class="setting-title">更新记录</div>
      <div class="release-list">
        ${CHANGELOG.map(entry=>`
          <article class="release-item">
            <div class="release-head"><b>v${escapeHTML(entry.version)}</b><span>${escapeHTML(entry.date)}</span></div>
            <h3>${escapeHTML(entry.title)}</h3>
            <ul>${entry.items.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}
function applyTheme(theme){
  document.documentElement.dataset.theme=theme==='auto'?'':theme;
  document.body.dataset.themeMode=theme;
  document.querySelectorAll('.seg button').forEach(btn=>btn.classList.remove('active'));
  document.getElementById(`th-${theme}`)?.classList.add('active');
  const themeToggle=document.getElementById('theme-toggle-btn');
  if(themeToggle)themeToggle.textContent=theme==='light'?'☀️':theme==='dark'?'🌙':'◐';
}
function setTheme(theme){
  localStorage.setItem(STORAGE_KEYS.theme,theme);
  markCloudDirty(CLOUD_KEYS.theme);
  applyTheme(theme);
  syncAllToCloud(true);
}
function cycleTheme(){
  const order=['auto','light','dark'];
  const current=localStorage.getItem(STORAGE_KEYS.theme)||'auto';
  setTheme(order[(order.indexOf(current)+1)%order.length]);
}
function normalizeLayout(layout){
  return layout==='split'?'split':'top';
}
function ensureLayoutPreference(syncDefault=false){
  const raw=localStorage.getItem(STORAGE_KEYS.layout);
  const next=normalizeLayout(raw);
  if(raw!==next){
    localStorage.setItem(STORAGE_KEYS.layout,next);
    if(syncDefault)markCloudDirty(CLOUD_KEYS.layout);
  }
  applyLayout(next);
  return next;
}
function applyLayout(layout){
  const next=normalizeLayout(layout);
  els.workspace.classList.toggle('layout-split',next==='split');
  els.workspace.classList.toggle('layout-top',next==='top');
  els.layoutTopBtn?.classList.toggle('active',next==='top');
  els.layoutSplitBtn?.classList.toggle('active',next==='split');
}
function setLayout(layout){
  const next=normalizeLayout(layout);
  localStorage.setItem(STORAGE_KEYS.layout,next);
  markCloudDirty(CLOUD_KEYS.layout);
  applyLayout(next);
  syncAllToCloud(true);
}
function updateEditorState(){
  const hasText=Boolean(els.query.value.trim()||els.direction.value.trim()||els.note.value.trim());
  els.clearQueryBtn?.classList.toggle('hidden',!hasText);
}
function handleQueryInput(){
  if(!els.query.value.trim()&&currentResult&&!lookupBusy){
    resetCurrentLookupState();
  }
  updateEditorState();
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&els.confirmLayer?.classList.contains('open'))closeConfirm(false);
  if(event.key==='Escape'&&els.historyModal.classList.contains('open'))closeHistoryModal();
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
    event.preventDefault();
    showView('history',document.getElementById('nav-history'));
    requestAnimationFrame(()=>els.historySearch?.focus());
  }
  if(activeView==='history'&&event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
    const tag=document.activeElement?.tagName;
    if(tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT'){
      event.preventDefault();
      els.historySearch?.focus();
    }
  }
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&cloudClient&&cloudUser)bootstrapCloudSync('merge',false);
});
window.addEventListener('focus',()=>{
  if(cloudClient&&cloudUser)bootstrapCloudSync('merge',false);
});
els.historySearch?.addEventListener('input',event=>{
  historyState.query=event.target.value;
  updateHistorySearchState();
  rerenderHistoryFromStart();
});
els.historySearchScopeToggle?.addEventListener('click',event=>{
  event.preventDefault();
  event.stopPropagation();
  toggleHistorySearchScopeMenu();
});
els.historySearchScopeMenu?.addEventListener('click',event=>{
  event.preventDefault();
  event.stopPropagation();
  if(event.target.closest('[data-scope-action="all"]'))return resetHistorySearchScopes();
  const option=event.target.closest('[data-scope]');
  if(option)return toggleHistorySearchScope(option.dataset.scope);
});
els.historyModalBody?.addEventListener('scroll',updateHistoryModalScrollState,{passive:true});
els.modalVisualEditor?.addEventListener('focusin',event=>{
  event.target.closest?.('.visual-field-hinted')?.classList.remove('hint-dismissed');
});
els.modalVisualEditor?.addEventListener('click',event=>{
  const close=event.target.closest('.visual-hint-close');
  if(!close)return;
  event.preventDefault();
  event.stopPropagation();
  close.closest('.visual-field-hinted')?.classList.add('hint-dismissed');
});
els.historyFilterbar?.addEventListener('click',event=>{
  event.stopPropagation();
  const filter=event.target.closest('.history-filter');
  if(!filter)return;
  const key=filter.dataset.filterKey;
  if(event.target.closest('.history-filter-trigger')){
    const willOpen=!filter.classList.contains('open');
    closeHistoryFilterMenus(filter);
    filter.classList.toggle('open',willOpen);
    openHistoryFilterKey=willOpen?key:null;
    return;
  }
  const option=event.target.closest('.history-filter-option');
  if(option)return toggleHistoryFilter(key,option.dataset.value);
  if(event.target.closest('.history-filter-clear'))return clearHistoryFilter(key);
});
els.apiProfileMenu?.addEventListener('click',event=>{
  const action=event.target.closest('[data-profile-action]')?.dataset.profileAction;
  if(!action)return;
  const option=event.target.closest('.api-profile-option');
  const id=option?.dataset.profileId||'';
  if(action==='new')return newApiProfile();
  if(action==='select')return selectApiProfile(id);
  if(action==='edit'){
    closeApiProfileMenu();
    return editApiProfile(id);
  }
  if(action==='delete')return deleteApiProfile(id);
});
els.apiProfileMenu?.addEventListener('dragstart',startApiProfileDrag);
els.apiProfileMenu?.addEventListener('dragover',overApiProfileDrag);
els.apiProfileMenu?.addEventListener('dragleave',event=>{
  if(!els.apiProfileMenu?.contains(event.relatedTarget))clearApiProfileDropMarks();
});
els.apiProfileMenu?.addEventListener('dragend',endApiProfileDrag);
els.apiProfileMenu?.addEventListener('drop',dropApiProfile);
els.apiModelList?.addEventListener('click',event=>{
  const option=event.target.closest('.model-choice');
  if(!option)return;
  if(els.apiModalModel)els.apiModalModel.value=option.dataset.model||option.textContent.trim();
});
els.apiModelFetchBtn?.addEventListener('click',fetchApiModels);
els.apiProfileModalTest?.addEventListener('click',testApiProfileDraft);
els.apiProfileModalSave?.addEventListener('click',saveApiProfileFromModal);
els.apiProfileModalCancel?.addEventListener('click',()=>closeApiProfileModal());
els.apiProfileModalClose?.addEventListener('click',()=>closeApiProfileModal());
document.addEventListener('click',event=>{
  if(!els.historyFilterbar?.contains(event.target))closeHistoryFilterMenus();
  if(!els.historySearchScope?.contains(event.target))closeHistorySearchScopeMenu();
  if(!els.apiProfilePicker?.contains(event.target)&&!els.apiProfileMenu?.contains(event.target))closeApiProfileMenu();
});
window.addEventListener('resize',()=>{
  if(els.apiProfilePicker?.classList.contains('open'))positionApiProfileMenu();
});
window.addEventListener('scroll',()=>{
  updateHomeStickyState();
  maybeLoadMoreHistory();
},{passive:true});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    closeApiProfileMenu();
    closeHistoryFilterMenus();
    closeHistorySearchScopeMenu();
    if(els.apiProfileModal?.classList.contains('open'))closeApiProfileModal();
  }
});
els.query?.addEventListener('input',handleQueryInput);
document.querySelector('#view-home .editor-pane')?.addEventListener('click',focusHomeQueryFromSticky);
els.query?.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.shiftKey){
    event.preventDefault();
    runLookup();
  }
});
els.direction?.addEventListener('input',updateEditorState);
els.note?.addEventListener('input',updateEditorState);
els.modalJsonEdit?.addEventListener('input',()=>validateModalJSON(false));
els.confirmCancel?.addEventListener('click',()=>closeConfirm(false));
els.confirmOk?.addEventListener('click',()=>closeConfirm(true));
els.confirmLayer?.addEventListener('click',event=>{
  if(event.target===els.confirmLayer)closeConfirm(false);
});

renderEmpty();
hydrateSettings();
renderHistory();
applyTheme(localStorage.getItem(STORAGE_KEYS.theme)||'auto');
ensureLayoutPreference(true);
updateEditorState();
updateHistorySearchState();
loadConfigInfo();
initCloud();
focusQueryInput();
