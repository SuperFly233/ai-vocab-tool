export function safeParseJSON(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch (error) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
}

export function lookupUserPrompt(payload) {
  return [
    `查询内容：${payload.query || ''}`,
    `特殊语言方向：${payload.direction || '未指定，按默认规则处理'}`,
    `补充要求：${payload.note || '无'}`,
    '请按完整规则生成结构化 JSON。常见多义词必须覆盖主要常见义项；存在稳定搭配时必须列出高频实用搭配；不要为简短而省略关键内容。必须判断 meta.entryType：单个词写 word，短语/固定表达/句子写 phrase。若词条有多个词性，headword.basicPartOfSpeech 必须用 "/" 列出全部主要词性，senses 里每个义项仍只写一个词性。',
  ].join('\n');
}

function compactContext(result) {
  return JSON.stringify({ meta:result?.meta,headword:result?.headword,senses:result?.senses,collocations:result?.collocations,register:result?.register,confusions:result?.confusions }).slice(0,18000);
}

export function followupMessages(payload, question) {
  const history=Array.isArray(payload.followups)?payload.followups.slice(-8).map(item=>`问：${item.question}\n答：${item.answer}`).join('\n\n'):'';
  return [
    {role:'system',content:'你是词汇追问助手。基于给定词条和上下文直接回答用户问题。回答要清楚、可读、简洁；可以使用短段落、列表、引用或表格等 Markdown 版式。不要返回 JSON，不要写寒暄，不要重复原词条全文。'},
    {role:'user',content:[`当前词条 JSON：${compactContext(payload.result||{})}`,history?`已有追问：\n${history}`:'已有追问：无',`本次追问：${question}`].join('\n\n')},
  ];
}
