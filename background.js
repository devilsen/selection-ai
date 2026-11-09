// 划词 AI 助手 - 后台 Service Worker
// 读取配置、以流式(SSE)方式调用 OpenAI 兼容接口，并把增量内容推送给内容脚本。

const DEFAULT_CONFIG = {
  endpoint: 'https://api.deepseek.com/chat/completions',
  apiKey: '',
  model: 'deepseek-chat'
};

function msg(key, subs) {
  try {
    const v = chrome.i18n.getMessage(key, subs);
    if (v) return v;
  } catch (e) {
    /* ignore */
  }
  return '';
}

async function getConfig() {
  const data = await chrome.storage.local.get(DEFAULT_CONFIG);
  return Object.assign({}, DEFAULT_CONFIG, data);
}

// 兼容「中转站」等 OpenAI 兼容接口：只填 base URL 时自动补全路径
function normalizeEndpoint(url) {
  let u = String(url || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  if (/\/chat\/completions$/.test(u)) return u;
  if (/\/completions$/.test(u)) return u;
  if (/\/v\d+$/.test(u)) return u + '/chat/completions';
  return u + '/v1/chat/completions';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'openOptions') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }
});

// 点击工具栏图标 → 打开设置页
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// 首次安装时自动打开设置页，引导配置 API Key
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

// 流式请求通道
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'llm-stream') return;
  // 握手：告知内容脚本“我准备好了”，避免冷启动时消息丢失
  port.postMessage({ type: 'ready' });
  port.onMessage.addListener((message) => {
    if (message && message.type === 'callLLM') {
      handleStreamCall(port, message).catch((err) => {
        try {
          port.postMessage({ type: 'error', error: err && err.message ? err.message : String(err) });
        } catch (e) {
          /* ignore */
        }
      });
    }
  });
});

async function handleStreamCall(port, { text, context, prompt }) {
  const config = await getConfig();

  if (!config.apiKey || !config.apiKey.trim()) {
    port.postMessage({ type: 'error', code: 'NO_API_KEY', error: msg('errNoApiKey') });
    return;
  }
  if (!config.endpoint) {
    port.postMessage({ type: 'error', code: 'NO_ENDPOINT', error: msg('errNoEndpoint') });
    return;
  }
  if (!config.model) {
    port.postMessage({ type: 'error', code: 'NO_MODEL', error: msg('errNoModel') });
    return;
  }

  const endpoint = normalizeEndpoint(config.endpoint);
  const finalPrompt = String(prompt || '')
    .split('{{selection}}')
    .join(text || '')
    .split('{{context}}')
    .join(context || '（无更多上下文）');

  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: '你是一名认真、可靠的助手。请直接给出结果，不要复述指令。' },
      { role: 'user', content: finalPrompt }
    ],
    temperature: 0.3,
    stream: true
  };

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + config.apiKey.trim()
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    port.postMessage({
      type: 'error',
      error:
        msg('errNet') +
        (e && e.message ? e.message : String(e)) +
        msg('errNetHint')
    });
    return;
  }

  if (!res.ok) {
    let raw = '';
    try {
      raw = await res.text();
    } catch (e) {
      /* ignore */
    }
    let errText = '';
    try {
      const d = raw ? JSON.parse(raw) : {};
      if (d && d.error) {
        errText = typeof d.error === 'string' ? d.error : d.error.message || JSON.stringify(d.error);
      }
    } catch (e) {
      /* ignore */
    }
    port.postMessage({
      type: 'error',
      error: msg('errHttp', [String(res.status)]) + (errText ? String(errText) : '')
    });
    return;
  }

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('text/event-stream')) {
    await streamSSE(port, res);
  } else {
    // 个别接口不返回 SSE，回退为整体解析
    await streamNonSSE(port, res);
  }
}

async function streamSSE(port, res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let received = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta =
          json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
        if (typeof delta === 'string' && delta) {
          received = true;
          port.postMessage({ type: 'chunk', content: delta });
        }
      } catch (e) {
        /* 忽略尚未完整的分行 */
      }
    }
  }

  // 冲刷剩余 buffer
  if (buffer.trim()) {
    const t = buffer.trim();
    if (t.startsWith('data:')) {
      const payload = t.slice(5).trim();
      if (payload !== '[DONE]') {
        try {
          const json = JSON.parse(payload);
          const delta =
            json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content;
          if (typeof delta === 'string' && delta) {
            received = true;
            port.postMessage({ type: 'chunk', content: delta });
          }
        } catch (e) {
          /* ignore */
        }
      }
    }
  }

  if (!received) {
    port.postMessage({ type: 'error', error: msg('errNoStream') });
    return;
  }
  port.postMessage({ type: 'done' });
}

async function streamNonSSE(port, res) {
  let raw = '';
  try {
    raw = await res.text();
  } catch (e) {
    /* ignore */
  }
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (e) {
    port.postMessage({ type: 'error', error: msg('errParse') + raw.slice(0, 300) });
    return;
  }
  const content =
    data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (typeof content !== 'string' || !content.trim()) {
    port.postMessage({ type: 'error', error: msg('errNoContent') + raw.slice(0, 300) });
    return;
  }
  port.postMessage({ type: 'chunk', content });
  port.postMessage({ type: 'done' });
}