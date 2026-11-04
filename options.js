// 划词 AI 助手 - 设置页逻辑

const DEFAULTS = {
  endpoint: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  model: 'deepseek-chat',
  questionLabel: '?',
  questionPrompt:
    '用通俗易懂的概念，解释这个名词，可以结合费曼学习法说明，字数不要超过 200 个。\n\n名词：{{selection}}\n\n上下文：\n{{context}}',
  translateLabel: '译',
  translatePrompt:
    '将这段文字翻译成中文，在忠实原文的情况下，读取上下文进行翻译，结果要信达雅。\n\n原文：{{selection}}\n\n上下文：\n{{context}}',
  contextQuestionPrompt:
    '结合下方「上下文」段落，准确解释其中选中的词语/概念「{{selection}}」在具体语境中的含义，说明它在此处指的是什么、为什么这样用，避免脱离语境的泛泛解释。\n\n选中的词：{{selection}}\n\n上下文：\n{{context}}',
  contextTranslatePrompt:
    '结合下方「上下文」段落，准确翻译选中的内容「{{selection}}」，根据上下文确定词语在具体语境中的准确含义，结果要信达雅。\n\n选中的内容：{{selection}}\n\n上下文：\n{{context}}'
};

const $ = (id) => document.getElementById(id);

// 兼容「中转站」等 OpenAI 兼容接口：只填 base URL 时自动补全路径
function normalizeEndpoint(url) {
  let u = String(url || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  if (/\/chat\/completions$/.test(u)) return u;
  if (/\/completions$/.test(u)) return u;
  if (/\/v\d+$/.test(u)) return u + '/chat/completions';
  return u + '/v1/chat/completions';
}

function load() {
  chrome.storage.local.get(DEFAULTS, (data) => {
    const c = Object.assign({}, DEFAULTS, data);
    $('endpoint').value = c.endpoint;
    $('apiKey').value = c.apiKey;
    $('model').value = c.model;
    $('questionLabel').value = c.questionLabel;
    $('questionPrompt').value = c.questionPrompt;
    $('translateLabel').value = c.translateLabel;
    $('translatePrompt').value = c.translatePrompt;
    $('contextQuestionPrompt').value = c.contextQuestionPrompt;
    $('contextTranslatePrompt').value = c.contextTranslatePrompt;
  });
}

function collect() {
  return {
    endpoint: $('endpoint').value.trim(),
    apiKey: $('apiKey').value.trim(),
    model: $('model').value.trim(),
    questionLabel: $('questionLabel').value.trim() || '?',
    questionPrompt: $('questionPrompt').value,
    translateLabel: $('translateLabel').value.trim() || '译',
    translatePrompt: $('translatePrompt').value,
    contextQuestionPrompt: $('contextQuestionPrompt').value,
    contextTranslatePrompt: $('contextTranslatePrompt').value
  };
}

function flash(el, text, ok) {
  el.textContent = text;
  el.style.color = ok ? 'var(--ok)' : 'var(--danger)';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ''; }, 4000);
}

function save() {
  const c = collect();
  if (!c.endpoint) { flash($('saveStatus'), '请填写接口地址', false); return; }
  if (!c.apiKey) { flash($('saveStatus'), '请填写 API Key', false); return; }
  if (!c.model) { flash($('saveStatus'), '请填写模型名称', false); return; }
  chrome.storage.local.set(c, () => {
    flash($('saveStatus'), '已保存 ✓', true);
  });
}

function reset() {
  chrome.storage.local.set(DEFAULTS, () => {
    load();
    flash($('saveStatus'), '已恢复默认并保存 ✓', true);
  });
}

async function testConnection() {
  const c = collect();
  if (!c.endpoint || !c.apiKey || !c.model) {
    flash($('testStatus'), '请先填写接口地址、API Key、模型名称', false);
    return;
  }
  $('testStatus').textContent = '测试中…';
  $('testStatus').style.color = 'var(--muted)';
  try {
    const res = await fetch(normalizeEndpoint(c.endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.apiKey },
      body: JSON.stringify({
        model: c.model,
        messages: [{ role: 'user', content: '请只回复两个字：正常' }],
        temperature: 0,
        stream: false
      })
    });
    let data = null;
    let raw = '';
    try { raw = await res.text(); data = raw ? JSON.parse(raw) : null; } catch (e) { /* ignore */ }
    if (!res.ok) {
      const msg = data && data.error
        ? (typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error))
        : raw.slice(0, 200);
      flash($('testStatus'), '连接失败（HTTP ' + res.status + '）：' + msg, false);
      return;
    }
    const content =
      data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    flash($('testStatus'), '连接成功 ✓ 模型回复：' + (content || '(空)'), true);
  } catch (e) {
    flash($('testStatus'), '连接失败：' + ((e && e.message) || e), false);
  }
}

$('saveBtn').addEventListener('click', save);
$('resetBtn').addEventListener('click', reset);
$('testBtn').addEventListener('click', testConnection);
$('toggleKey').addEventListener('click', () => {
  const el = $('apiKey');
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  $('toggleKey').textContent = show ? '隐藏' : '显示';
});

load();
