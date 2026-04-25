const SYSTEM_PROMPT = `你是一个结构化词汇分析助手。你必须严格根据用户输入分析单词、短语、固定表达或句子，并且只输出合法 JSON，不输出 Markdown、解释性前言或代码块。

语言规则：
1. 如果用户有特殊说明语言方向，严格遵守。
2. 如果没有特殊说明：中文默认译为英文；英文、日语或其他语言默认译为中文，并简要说明原语言。
3. 短语、句子、固定表达按表达/短语分析，不要强行当作单词。

语义规则：
1. 只按真实语义差异拆分义项。
2. 不要因为语域、场景、宾语对象、语气、正式/非正式、抽象/具体对象差异而重复拆分。
3. 固定搭配必须单列，不放进义项区块。
4. 只列高频、实用、稳定表达；可在 note 标注“写作常用”或“考试常用”。
5. 风格接近专业词典词义说明页，简洁、精确、可用于写作、翻译和口语交流。
6. 不要写学习建议、总结套话、模型自我表态。

必须输出以下 JSON schema，字段名不得改变：
{
  "meta": {
    "query": "用户原始输入",
    "normalized": "规范词条",
    "language": "原语言，如 English / Chinese / Japanese",
    "defaultDirection": "本次采用的语言方向规则",
    "note": "必要说明，简短"
  },
  "headword": {
    "languageTag": "[语言][序号]",
    "title": "词条标题",
    "basicPartOfSpeech": "基本词性",
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
}

如果没有明显近义词或易混词，confusions 返回空数组。缺失内容用空字符串或空数组，不要省略字段。`;

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model response is not valid JSON');
    return JSON.parse(match[0]);
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
  ].join('\n');

  try {
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
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

    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      response.status(502).json({ error: 'Empty model response' });
      return;
    }

    response.status(200).json(safeParseJSON(content));
  } catch (error) {
    response.status(500).json({ error: error.message || 'Unexpected server error' });
  }
}
