// 划词 AI 助手 - 设置页逻辑

function msg(key, subs) {
  try {
    const v = chrome.i18n.getMessage(key, subs);
    if (v) return v;
  } catch (e) {
    /* ignore */
  }
  return '';
}

const DEFAULTS = {
  endpoint: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  model: 'deepseek-chat',
  questionLabel: msg('defaultQuestionLabel'),
  questionPrompt: msg('defaultQuestionPrompt'),
  translateLabel: msg('defaultTranslateLabel'),
  translatePrompt: msg('defaultTranslatePrompt'),
  contextQuestionPrompt: msg('defaultContextQuestionPrompt'),
  contextTranslatePrompt: msg('defaultContextTranslatePrompt')
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
    questionLabel: $('questionLabel').value.trim() || msg('defaultQuestionLabel'),
    questionPrompt: $('questionPrompt').value,
    translateLabel: $('translateLabel').value.trim() || msg('defaultTranslateLabel'),
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
  if (!c.endpoint) { flash($('saveStatus'), msg('msgNeedEndpoint'), false); return; }
  if (!c.apiKey) { flash($('saveStatus'), msg('msgNeedApiKey'), false); return; }
  if (!c.model) { flash($('saveStatus'), msg('msgNeedModel'), false); return; }
  chrome.storage.local.set(c, () => {
    flash($('saveStatus'), msg('msgSaved'), true);
  });
}

function reset() {
  chrome.storage.local.set(DEFAULTS, () => {
    load();
    flash($('saveStatus'), msg('msgReset'), true);
  });
}

async function testConnection() {
  const c = collect();
  if (!c.endpoint || !c.apiKey || !c.model) {
    flash($('testStatus'), msg('msgNeedAll'), false);
    return;
  }
  $('testStatus').textContent = msg('msgTesting');
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
      const errText = data && data.error
        ? (typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error))
        : raw.slice(0, 200);
      flash($('testStatus'), msg('msgTestFailHttp', [String(res.status)]) + errText, false);
      return;
    }
    const content =
      data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    flash($('testStatus'), msg('msgTestOk') + (content || msg('msgTestEmpty')), true);
  } catch (e) {
    flash($('testStatus'), msg('msgTestFail') + ((e && e.message) || e), false);
  }
}

$('saveBtn').addEventListener('click', save);
$('resetBtn').addEventListener('click', reset);
$('testBtn').addEventListener('click', testConnection);
$('toggleKey').addEventListener('click', () => {
  const el = $('apiKey');
  const show = el.type === 'password';
  el.type = show ? 'text' : 'password';
  $('toggleKey').textContent = show ? msg('msgHide') : msg('msgShow');
});

load();