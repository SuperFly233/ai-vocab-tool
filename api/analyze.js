const SYSTEM_PROMPT = `你是一个专门用于查单词、短语、表达和句子的结构化词汇分析助手。用户原始规则必须完整保留；JSON 只是为了让网页格式化排版的输出容器。你必须严格根据用户输入输出合法 JSON；不要输出 Markdown、代码块、解释性前言、总结套话或模型自我表态。

原始规则如下：
专门开一个用来查单词、短语、表达等的对话。当用户发来有关词汇的内容时，请默认按以下规则输出。

一、语言规则
1. 如果用户有特殊说明语言方向，则严格按用户说明来。例如：“翻译成法语”“只解释英文”“给我韩语法语西班牙语三语”。
2. 如果用户没有特殊说明：
   - 用户发中文：默认译为英文。
   - 用户发英文、日语、其他语言：默认译为中文，并在 meta.language 简要说明原语言。
3. 如果输入是短语、句子、固定表达，不要强行当作单词处理，应按“表达/短语”方式分析。

二、整体输出要求
1. 词条标题必须包含语言标签、标题、基本词性、核心义。
2. 核心义必须用最凝练的方式概括该词最核心的语义中心，不要写成长句或解释性废话。
3. 义项分析只按真实语义差异拆分义项。
4. 每个义项必须包含：编号、词性、最短义标、语意、例句、译文。
5. 最短义标只能是简短标签，不能写完整解释句。
6. 语意要详细但尽量控制在一句话内。
7. 例句必须自然，适合写作、翻译、口语交流等真实使用。
8. 译文只翻译例句实际含义，不添加其他解释、评价或学习建议。

三、语义拆分规则
只保留真实语义不同的义项。不要按以下方式拆分义项：
- 语域差异
- 使用场景差异
- 宾语对象差异
- 语气差异
- 正式/非正式差异
- 抽象/具体对象差异但核心语义不变的情况
更换宾语而语义不变，只能算一个义项。只有当词义本身发生实质变化时，才拆分义项。
如果一个常见词确实有多个高频核心义项，必须覆盖主要常见义项，不要为了简短而只给一个义项。

四、固定搭配
固定搭配必须单列，不要放在义项区块内。包括但不限于：
- 介词结构
- 短语动词
- 固定名词结构
- 高频句型
- 常见书面表达
- 考试作文常用表达
不要罗列冷门搭配，只列高频、实用、稳定表达。如果某搭配在写作、翻译、考试中特别常用，可以在 note 标注“写作常用”或“考试常用”。
如果存在稳定结构，必须提供若干个固定搭配；不要因为追求简短而省略。

五、语义感受与使用说明
从母语者语感角度说明这个词的使用倾向，包含：
- 语体属性：正式 / 中性 / 口语 / 书面 / 文学 / 学术 / 商务等。
- 语义气质：凝练描述该词给人的感觉，例如“理性、正式、抽象、温和、强烈、负面、积极”等。
- 使用环境：说明常见使用场景，如学术写作、日常交流、新闻报道、商务表达、文学描写等。
表达要凝练、精确，风格接近专业词典的词义说明，不要写学习建议。

六、近义词 / 易混词辨析
如该词存在常见近义词、易混词，应补充本模块。如果没有明显易混词，可以返回空数组。
要求：
- 重点说明真实语义差异。
- 优先列考试、写作、翻译中容易混淆的词。
- 不要泛泛而谈。
- 不要把完全不相关的词强行放进来。

七、输出风格
整体风格：遵循简洁原则。专业英英词典的词义注释页 + 面向写作、翻译、口语交流运用的词汇说明。
内容要完整，但不要臃肿。输出应以语言事实、语义结构、语体感受、真实用法为主。
不要写成：单纯教学讲义、背单词软件释义、机械翻译结果、过度口语化解释、情绪化评价、总结性套话。
译文和说明中尽量避免出现：“你”“我”“我们”“这个词很有用”“建议记住”“可以帮助你”“简单来说”“总之”“需要注意的是”等过度重复、模型自我表态。
注重真实语义准确、义项拆分合理、例句自然、固定搭配实用、语感说明精炼、写作迁移有效。
不要为了显得丰富而强行拆分义项、堆砌搭配或加入冷门表达。

八、必须输出的 JSON schema
字段名不得改变。缺失内容用空字符串或空数组，不要省略字段。
把原始模板映射到 JSON：默认输出模板的词条标题对应 headword；“一、义项分析”对应 senses；“二、固定搭配”对应 collocations；“三、语义感受与使用说明”对应 register；“四、近义词 / 易混词辨析”对应 confusions。内容完整性以原始规则为准，不得因为 JSON 化而删减。
用于筛选的字段必须使用固定枚举，不要自由发挥：
- meta.language 只能输出 en / zh / ja / ko / fr / es / de / other。
- meta.defaultDirection 只能输出 en-zh / zh-en / ja-zh / zh-ja / ko-zh / zh-ko / fr-zh / zh-fr / es-zh / zh-es / de-zh / zh-de / other。
- meta.entryType 只能输出 word / phrase。单个词输出 word；短语、固定表达、句子、从句和多词搭配都输出 phrase。
- headword.languageTag 使用与 meta.language 相同的值，不要写 EN、English、英文、[英语1] 等变体。
- headword.basicPartOfSpeech 记录词条层面的全部主要词性，只能从 n / v / adj / adv / prep / conj / pron / det / aux / interj / phrase / sentence / other 中选择；如有多个词性，用 "/" 连接固定枚举值，例如 "n/v/adj"，并且必须覆盖 senses[].partOfSpeech 中出现的主要词性。senses[].partOfSpeech 仍然只能是单个固定枚举值；同一个词有多个词性时拆成多个 senses。
- register.style 只能从 neutral / formal / informal / spoken / written / academic / business / literary / slang / technical / archaic / offensive / other 中选择；如确有多个，用 "/" 连接这些枚举值，例如 "formal/written"。
{
  "meta": {
    "query": "用户原始输入",
    "normalized": "规范词条",
    "language": "原语言，如 English / Chinese / Japanese",
    "defaultDirection": "本次采用的语言方向规则",
    "entryType": "word 或 phrase",
    "note": "必要说明，简短"
  },
  "headword": {
    "languageTag": "[语言][序号]",
    "title": "词条标题",
    "basicPartOfSpeech": "基本词性；多词性用 n/v/adj 这类固定枚举串",
    "coreMeaning": "最短核心义",
    "summary": "一句话总述"
  },
  "senses": [
    {
      "index": 1,
      "partOfSpeech": "词性",
      "shortestLabel": "最短义标",
      "meaning": "语意说明，一句话内",
      "example": "自然例句",
      "translation": "例句译文"
    }
  ],
  "collocations": [
    {
      "index": 1,
      "phrase": "固定搭配",
      "meaning": "搭配语意，一句话内",
      "example": "自然例句",
      "translation": "例句译文",
      "note": ""
    }
  ],
  "register": {
    "style": "语体属性",
    "tone": "语义气质",
    "environment": "使用环境"
  },
  "confusions": [
    {
      "term": "近义词或易混词",
      "difference": "核心区别",
      "usage": "语体/使用倾向"
    }
  ]
}`;

async function assertCanUseEnvironmentKey(request, payload) {
  if (payload.apiKey) return;
  const admins = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.length) return;

  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    const error = new Error('当前部署限制为管理员使用环境变量 API。请登录管理员账号，或在设置里填写自己的 API Key。');
    error.status = 403;
    throw error;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uoifrqehkfvpzqojaazh.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80';
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!authResponse.ok) {
    const error = new Error('登录状态无效。请重新登录管理员账号，或在设置里填写自己的 API Key。');
    error.status = 403;
    throw error;
  }
  const user = await authResponse.json();
  if (!admins.includes(String(user.email || '').toLowerCase())) {
    const error = new Error('当前账号没有使用环境变量 API 的权限。请在设置里填写自己的 API Key。');
    error.status = 403;
    throw error;
  }
}

function safeParseJSON(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw firstError;
    return JSON.parse(match[0]);
  }
}

async function repairJSON({ apiUrl, apiKey, model, content }) {
  const upstream = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 9000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是 JSON 修复器。只返回合法 JSON，不要 Markdown、不要解释。保留原始字段名和内容；只修复逗号、引号、转义、括号闭合等格式问题。',
        },
        {
          role: 'user',
          content: `修复下面这段 JSON，使它可以被 JSON.parse 解析：\n${String(content || '').slice(0, 24000)}`,
        },
      ],
    }),
  });
  if (!upstream.ok) throw new Error('模型返回的 JSON 格式有误，自动修复也没有成功。请重试一次。');
  const data = await upstream.json();
  const repaired = data.choices?.[0]?.message?.content;
  if (!repaired) throw new Error('模型返回的 JSON 格式有误，自动修复返回为空。请重试一次。');
  return safeParseJSON(repaired);
}

async function parseModelJSON({ apiUrl, apiKey, model, content }) {
  try {
    return safeParseJSON(content);
  } catch (error) {
    try {
      return await repairJSON({ apiUrl, apiKey, model, content });
    } catch {
      const message = error.message || 'JSON parse failed';
      throw new Error(`模型返回了不完整或不合法的 JSON：${message}。已建议自动重试；如果连续出现，换一个模型或缩短输入会更稳。`);
    }
  }
}

function writeStreamEvent(response, data) {
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamAnalyze(upstream, response, parseContext) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const reader = upstream.body?.getReader();
  if (!reader) {
    writeStreamEvent(response, { error: '当前模型接口没有返回可读取的流。' });
    response.end();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  const finish = async () => {
    try {
      const result = await parseModelJSON({ ...parseContext, content });
      writeStreamEvent(response, { result, done: true });
    } catch (error) {
      writeStreamEvent(response, { error: error.message || '流式查询 JSON 校验失败。' });
    } finally {
      response.end();
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      for (const event of events) {
        for (const line of event.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          if (raw === '[DONE]') {
            await finish();
            return;
          }
          try {
            const parsed = JSON.parse(raw);
            const delta = parsed.choices?.[0]?.delta?.content
              ?? parsed.choices?.[0]?.message?.content
              ?? parsed.choices?.[0]?.text
              ?? '';
            if (delta) {
              content += delta;
              writeStreamEvent(response, { delta });
            }
          } catch {
            // Ignore provider keepalive frames that are not JSON.
          }
        }
      }
    }
    await finish();
  } catch (error) {
    writeStreamEvent(response, { error: error.message || '流式查询中断。' });
    response.end();
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload = request.body || {};
  const apiUrl = payload.apiUrl || process.env.AI_API_URL;
  const apiKey = payload.apiKey || process.env.AI_API_KEY;
  const model = payload.model || process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiUrl || !apiKey) {
    response.status(501).json({ error: '请先在设置里填写 API URL 和 API Key，或配置 Vercel 环境变量 AI_API_URL / AI_API_KEY。' });
    return;
  }

  const userPrompt = [
    `查询内容：${payload.query || ''}`,
    `特殊语言方向：${payload.direction || '未指定，按默认规则处理'}`,
    `补充要求：${payload.note || '无'}`,
    '请按完整规则生成结构化 JSON。常见多义词必须覆盖主要常见义项；存在稳定搭配时必须列出高频实用搭配；不要为简短而省略关键内容。必须判断 meta.entryType：单个词写 word，短语/固定表达/句子写 phrase。若词条有多个词性，headword.basicPartOfSpeech 必须用 "/" 列出全部主要词性，senses 里每个义项仍只写一个词性。',
  ].join('\n');

  try {
    await assertCanUseEnvironmentKey(request, payload);
    const stream = Boolean(payload.stream);
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 9000,
        stream,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!upstream.ok) {
      response.status(upstream.status).json({ error: await upstream.text() });
      return;
    }

    const upstreamContentType = upstream.headers.get('content-type') || '';
    if (stream && upstreamContentType.includes('text/event-stream')) {
      await streamAnalyze(upstream, response, { apiUrl, apiKey, model });
      return;
    }

    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      response.status(502).json({ error: 'Empty model response' });
      return;
    }

    const result = await parseModelJSON({ apiUrl, apiKey, model, content });
    if (stream) {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      writeStreamEvent(response, { delta: content });
      writeStreamEvent(response, { result, done: true });
      response.end();
      return;
    }
    response.status(200).json(result);
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message || 'Unexpected server error' });
  }
}
