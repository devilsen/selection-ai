// 划词 AI 助手 - 内容脚本
// 选中文字后弹出「问号 / 翻译」按钮（显示在文字下方）；点击后流式接收大模型输出并渲染 Markdown。
// 使用 Shadow DOM 隔离样式。文案通过 chrome.i18n 多语言化。

(() => {
  'use strict';
  if (window.__selectionAILoaded__) return;
  window.__selectionAILoaded__ = true;

  function msg(key) {
    try {
      const v = chrome.i18n.getMessage(key);
      if (v) return v;
    } catch (e) {
      /* ignore */
    }
    return '';
  }

  const DEFAULT_CONFIG = {
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

  const CSS = `
    .toolbar {
      position: fixed; display: none; align-items: center; gap: 6px; padding: 4px;
      background: rgba(255, 255, 255, 0.78);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.5),
        0 1px 1px rgba(0, 0, 0, 0.04),
        0 4px 12px rgba(0, 0, 0, 0.08),
        0 12px 32px rgba(0, 0, 0, 0.10);
      pointer-events: auto; z-index: 2147483647;
      animation: sa-pop .18s cubic-bezier(.2, .9, .35, 1.15);
    }
    .toolbar .btn {
      min-width: 32px; height: 29px; padding: 0 9px; border-radius: 8px; font-size: 13px;
      color: #1d1d1f; background: transparent; border: none;
      transition: background .16s ease, transform .08s ease, color .16s ease;
    }
    .toolbar .btn:hover { background: rgba(0, 0, 0, 0.055); }
    .toolbar .btn:active { background: rgba(0, 0, 0, 0.12); transform: scale(0.96); }
    .btn {
      all: unset; cursor: pointer; min-width: 36px; height: 32px; padding: 0 10px;
      border-radius: 8px; color: #fff; font-size: 15px; font-weight: 600; line-height: 1;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent; transition: background .12s ease; box-sizing: border-box;
      white-space: nowrap;
    }
    .btn:hover { background: rgba(255,255,255,.16); }
    .btn:active { background: rgba(255,255,255,.26); }
    .result {
      position: fixed; display: none; width: min(460px, calc(100vw - 16px));
      pointer-events: auto; z-index: 2147483647; background: #fff; color: #1f2937;
      border-radius: 14px; overflow: hidden;
      box-shadow:
        0 1px 1px rgba(0, 0, 0, 0.04),
        0 8px 20px rgba(0, 0, 0, 0.08),
        0 20px 48px rgba(0, 0, 0, 0.12);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      font-size: 14px; line-height: 1.65; box-sizing: border-box;
      animation: sa-pop-result .2s cubic-bezier(.2, .9, .35, 1.08);
    }
    .result-head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 8px 12px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;
    }
    .result-title { font-weight: 600; color: #111827; font-size: 13px; }
    .result-actions { display: flex; gap: 6px; align-items: center; }
    .result-head .btn {
      color: #374151; background: #fff; border: 1px solid #d1d5db; font-size: 12px;
      height: 26px; min-width: 0; padding: 0 9px; border-radius: 6px; font-weight: 500;
    }
    .result-head .btn:hover { background: #f3f4f6; }
    .result-head .btn.btn-primary { color: #fff; background: #4f46e5; border-color: #4f46e5; }
    .result-head .btn.btn-primary:hover { background: #4338ca; }
    .result-body {
      padding: 12px 14px; word-break: break-word; max-height: 62vh; overflow: auto;
    }
    .result-body.loading { color: #6b7280; display: flex; align-items: center; }
    .result-body.streaming { white-space: pre-wrap; }
    .result-body.error { color: #b91c1c; white-space: pre-wrap; }
    .spinner {
      display: inline-block; width: 14px; height: 14px; border: 2px solid #d1d5db;
      border-top-color: #4f46e5; border-radius: 50%; animation: spin .7s linear infinite;
      margin-right: 9px; flex: 0 0 auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes sa-pop {
      from { opacity: 0; transform: translateY(6px) scale(.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes sa-pop-result {
      from { opacity: 0; transform: translateY(4px) scale(.99); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ---- Markdown ---- */
    .md { line-height: 1.7; }
    .md > :first-child { margin-top: 0; }
    .md > :last-child { margin-bottom: 0; }
    .md p { margin: 0 0 10px; }
    .md h1, .md h2, .md h3, .md h4, .md h5, .md h6 { margin: 14px 0 8px; line-height: 1.4; font-weight: 700; }
    .md h1 { font-size: 18px; }
    .md h2 { font-size: 16px; }
    .md h3 { font-size: 15px; }
    .md h4, .md h5, .md h6 { font-size: 14px; }
    .md ul, .md ol { margin: 0 0 10px; padding-left: 22px; }
    .md li { margin: 3px 0; }
    .md code {
      background: #eef0f6; color: #4338ca; padding: 1px 5px; border-radius: 5px;
      font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 12.5px;
    }
    .md pre {
      background: #f6f8fa; border: 1px solid #e6e8ef; border-radius: 8px;
      padding: 10px 12px; overflow: auto; margin: 0 0 10px;
    }
    .md pre code { background: transparent; padding: 0; color: #24292f; font-size: 12.5px; }
    .md blockquote { margin: 0 0 10px; padding: 2px 12px; border-left: 3px solid #d1d5db; color: #4b5563; }
    .md a { color: #4f46e5; text-decoration: none; }
    .md a:hover { text-decoration: underline; }
    .md hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
    .md strong { font-weight: 700; }
    .md del { color: #9ca3af; }

    /* ---- 上下文折叠 ---- */
    .ctx-foot { margin-top: 12px; padding-top: 10px; border-top: 1px solid #eef0f6; }
    .ctx-toggle { all: unset; cursor: pointer; color: #4f46e5; font-size: 13px; font-weight: 500; }
    .ctx-toggle:hover { text-decoration: underline; }
    .ctx-box {
      margin-top: 8px; padding: 10px 12px; background: #f8f9fc; border: 1px solid #e6e8ef;
      border-radius: 8px; font-size: 12.5px; color: #4b5563;
      line-height: 1.6; max-height: 40vh; overflow: auto; word-break: break-word;
    }
    .ctx-loading { display: flex; align-items: center; color: #6b7280; }
    .ctx-streaming { white-space: pre-wrap; }
    .ctx-error { color: #b91c1c; white-space: pre-wrap; }

    /* ---- 夜间模式（跟随系统） ---- */
    @media (prefers-color-scheme: dark) {
      .toolbar {
        background: rgba(30, 30, 32, 0.66);
        border-color: rgba(255, 255, 255, 0.10);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.06),
          0 1px 1px rgba(0, 0, 0, 0.35),
          0 4px 12px rgba(0, 0, 0, 0.35),
          0 12px 32px rgba(0, 0, 0, 0.40);
      }
      .toolbar .btn {
        color: #f5f5f7; background: transparent; border: none;
      }
      .toolbar .btn:hover { background: rgba(255, 255, 255, 0.10); }
      .toolbar .btn:active { background: rgba(255, 255, 255, 0.18); }

      .result {
        background: #1f2937; color: #e5e7eb;
        box-shadow:
          0 1px 1px rgba(0, 0, 0, 0.3),
          0 8px 20px rgba(0, 0, 0, 0.35),
          0 20px 48px rgba(0, 0, 0, 0.35);
      }
      .result-head { background: #111827; border-bottom-color: #374151; }
      .result-title { color: #f9fafb; }
      .result-head .btn {
        color: #e5e7eb; background: #1f2937; border-color: #4b5563;
      }
      .result-head .btn:hover { background: #374151; }
      .result-body.loading { color: #9ca3af; }
      .result-body.error { color: #f87171; }
      .spinner { border-color: #4b5563; border-top-color: #818cf8; }

      .md code { background: #374151; color: #c7d2fe; }
      .md pre { background: #111827; border-color: #374151; }
      .md pre code { color: #e5e7eb; }
      .md blockquote { border-left-color: #4b5563; color: #9ca3af; }
      .md a { color: #818cf8; }
      .md hr { border-top-color: #374151; }
      .md del { color: #6b7280; }

      .ctx-foot { border-top-color: #374151; }
      .ctx-toggle { color: #818cf8; }
      .ctx-box {
        background: #111827; border-color: #374151; color: #9ca3af;
      }
      .ctx-loading { color: #9ca3af; }
      .ctx-error { color: #f87171; }
    }
  `;

  // ---- 挂载 Shadow DOM 宿主 ----
  const host = document.createElement('div');
  host.id = '__selection-ai-host';
  host.setAttribute(
    'style',
    'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;'
  );
  (document.body || document.documentElement).appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  shadow.appendChild(styleEl);

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  shadow.appendChild(toolbar);

  const resultBox = document.createElement('div');
  resultBox.className = 'result';
  shadow.appendChild(resultBox);

  // ---- 状态 ----
  let cachedConfig = null;
  let currentText = '';
  let currentContext = '';
  let anchor = { x: 0, top: 0, bottom: 0 };
  let loading = false;
  let resultDismissed = false;
  let resultBodyEl = null;
  let resultRawText = '';
  let currentKey = '';

  async function getConfig() {
    if (cachedConfig) return cachedConfig;
    try {
      const data = await chrome.storage.local.get(DEFAULT_CONFIG);
      cachedConfig = Object.assign({}, DEFAULT_CONFIG, data);
    } catch (e) {
      cachedConfig = Object.assign({}, DEFAULT_CONFIG);
    }
    return cachedConfig;
  }

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') cachedConfig = null;
    });
  } catch (e) {
    /* ignore */
  }

  function clamp(v, min, max) {
    if (max < min) return min;
    return Math.max(min, Math.min(v, max));
  }

  // ---- Markdown 渲染 ----
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const SOFT = '\u0002'; // 段内软换行占位符

  function inlineMarkdown(text) {
    const stash = [];
    let s = escapeHtml(text);
    // 行内代码（先占位，避免被后续规则二次处理）
    s = s.replace(/`([^`]+)`/g, (m, c) => {
      stash.push('<code>' + c + '</code>');
      return '\u0001' + (stash.length - 1) + '\u0001';
    });
    // 链接 [text](url)
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    // 加粗 **bold**
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体 *italic*
    s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    // 删除线 ~~x~~
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    // 还原行内代码
    s = s.replace(/\u0001(\d+)\u0001/g, (m, i) => stash[+i]);
    return s;
  }

  function renderMarkdown(src) {
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let inCode = false;
    let codeLang = '';
    let codeBuf = [];
    let listType = null;
    let paraBuf = [];

    const flushPara = () => {
      if (paraBuf.length) {
        const html = inlineMarkdown(paraBuf.join(SOFT)).replace(new RegExp(SOFT, 'g'), '<br>');
        out.push('<p>' + html + '</p>');
        paraBuf = [];
      }
    };
    const closeList = () => {
      if (listType) {
        out.push('</' + listType + '>');
        listType = null;
      }
    };
    const flushCode = () => {
      out.push(
        '<pre><code' +
          (codeLang ? ' class="language-' + escapeHtml(codeLang) + '"' : '') +
          '>' +
          escapeHtml(codeBuf.join('\n')) +
          '</code></pre>'
      );
      codeBuf = [];
      codeLang = '';
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const fence = line.match(/^```([^`]*)$/);
      if (fence) {
        if (!inCode) {
          closeList();
          flushPara();
          inCode = true;
          codeLang = (fence[1] || '').trim();
          codeBuf = [];
        } else {
          flushCode();
          inCode = false;
        }
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        continue;
      }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeList();
        flushPara();
        const lvl = h[1].length;
        out.push('<h' + lvl + '>' + inlineMarkdown(h[2]) + '</h' + lvl + '>');
        continue;
      }

      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        closeList();
        flushPara();
        out.push('<hr/>');
        continue;
      }

      const bq = line.match(/^\s*>\s?(.*)$/);
      if (bq) {
        closeList();
        flushPara();
        out.push('<blockquote>' + inlineMarkdown(bq[1]) + '</blockquote>');
        continue;
      }

      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ul) {
        flushPara();
        if (listType !== 'ul') {
          closeList();
          out.push('<ul>');
          listType = 'ul';
        }
        out.push('<li>' + inlineMarkdown(ul[1]) + '</li>');
        continue;
      }

      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ol) {
        flushPara();
        if (listType !== 'ol') {
          closeList();
          out.push('<ol>');
          listType = 'ol';
        }
        out.push('<li>' + inlineMarkdown(ol[1]) + '</li>');
        continue;
      }

      if (line.trim() === '') {
        closeList();
        flushPara();
        continue;
      }

      closeList();
      paraBuf.push(line);
    }

    if (inCode) flushCode();
    closeList();
    flushPara();
    return out.join('\n');
  }

  // ---- 工具栏 ----
  function buildToolbar(cfg) {
    toolbar.textContent = '';
    addButton(toolbar, cfg.questionLabel || msg('defaultQuestionLabel'), msg('titleQuestion'), 'question');
    addButton(toolbar, cfg.translateLabel || msg('defaultTranslateLabel'), msg('titleTranslate'), 'translate');
  }

  function addButton(parent, label, title, key) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = label;
    b.title = title;
    b.setAttribute('data-key', key);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    b.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      runAction(key);
    });
    parent.appendChild(b);
  }

  async function showToolbar() {
    const cfg = await getConfig();
    buildToolbar(cfg);
    toolbar.style.display = 'flex';
    toolbar.style.visibility = 'hidden';
    const w = toolbar.offsetWidth;
    const h = toolbar.offsetHeight;
    let left = clamp(anchor.x - w / 2, 6, window.innerWidth - w - 6);
    // 优先显示在选中文字的下方，不遮挡文字
    let top = anchor.bottom + 4;
    if (top + h > window.innerHeight - 6) {
      top = anchor.top - h - 4; // 下方放不下时回退到上方
    }
    top = clamp(top, 6, window.innerHeight - h - 6);
    toolbar.style.left = left + 'px';
    toolbar.style.top = top + 'px';
    toolbar.style.visibility = 'visible';
  }

  function hideToolbar() {
    toolbar.style.display = 'none';
  }
  function hideResult() {
    resultBox.style.display = 'none';
  }
  function dismissResult() {
    resultDismissed = true;
    hideResult();
  }
  function hideAll() {
    hideToolbar();
    hideResult();
  }

  // 打开设置页（跳转配置）
  function openOptions() {
    try {
      const p = chrome.runtime.sendMessage({ type: 'openOptions' });
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      /* ignore */
    }
  }

  // ---- 结果面板 ----
  function buildGearButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.title = msg('gearTitle');
    btn.setAttribute('aria-label', msg('gearTitle'));
    btn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3"></circle>' +
      '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' +
      '</svg>';
    btn.addEventListener('click', () => openOptions());
    return btn;
  }

  function buildCopyButton() {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn';
    copy.textContent = msg('copyBtn');
    copy.addEventListener('click', () => {
      copyText(resultRawText).then((ok) => {
        copy.textContent = ok ? msg('copied') : msg('copyFailed');
        setTimeout(() => {
          if (copy.isConnected) copy.textContent = msg('copyBtn');
        }, 1200);
      });
    });
    return copy;
  }

  function buildContextFooter() {
    const foot = document.createElement('div');
    foot.className = 'ctx-foot';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ctx-toggle';
    toggle.textContent = msg('viewInContext');
    const box = document.createElement('div');
    box.className = 'ctx-box';
    box.style.display = 'none';

    let ctxDone = false;

    const renderLoading = () => {
      box.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'ctx-loading';
      const spin = document.createElement('span');
      spin.className = 'spinner';
      const label = document.createElement('span');
      label.textContent = msg('ctxProcessing');
      el.appendChild(spin);
      el.appendChild(label);
      box.appendChild(el);
    };

    const runContext = async () => {
      renderLoading();
      const cfg = await getConfig();
      const prompt =
        currentKey === 'question' ? cfg.contextQuestionPrompt : cfg.contextTranslatePrompt;

      streamFromBackground(
        { type: 'callLLM', text: currentText, context: currentContext, prompt },
        {
          onChunk(delta, acc) {
            box.innerHTML = '';
            const pre = document.createElement('div');
            pre.className = 'ctx-streaming';
            pre.textContent = acc;
            box.appendChild(pre);
            box.scrollTop = box.scrollHeight;
          },
          onDone(acc) {
            ctxDone = true;
            box.innerHTML = '';
            const md = document.createElement('div');
            md.className = 'md';
            md.innerHTML = renderMarkdown(acc);
            box.appendChild(md);
          },
          onError(msgText) {
            box.innerHTML = '';
            const err = document.createElement('div');
            err.className = 'ctx-error';
            err.textContent = msgText;
            box.appendChild(err);
          }
        }
      );
    };

    toggle.addEventListener('click', () => {
      const open = box.style.display === 'none';
      box.style.display = open ? 'block' : 'none';
      toggle.textContent = open ? msg('hideContext') : msg('viewInContext');
      if (open && !ctxDone) {
        runContext();
      }
    });

    foot.appendChild(toggle);
    foot.appendChild(box);
    return foot;
  }

  function showResult(title, mode, payload) {
    resultBox.textContent = '';
    resultBodyEl = null;

    const head = document.createElement('div');
    head.className = 'result-head';
    const titleEl = document.createElement('span');
    titleEl.className = 'result-title';
    titleEl.textContent = title;
    const actions = document.createElement('div');
    actions.className = 'result-actions';

    const body = document.createElement('div');
    body.className = 'result-body';
    resultBodyEl = body;

    if (mode === 'loading') {
      body.classList.add('loading');
      const spin = document.createElement('span');
      spin.className = 'spinner';
      const label = document.createElement('span');
      label.textContent = msg('generating');
      body.appendChild(spin);
      body.appendChild(label);
    } else if (mode === 'stream') {
      body.classList.add('streaming');
      body.textContent = payload || '';
    } else if (mode === 'error') {
      body.classList.add('error');
      body.textContent = payload && payload.msg ? payload.msg : String(payload || '');
      if (payload && payload.needConfig) {
        actions.appendChild(buildGearButton());
      }
    } else {
      // final
      resultRawText = payload || '';
      const md = document.createElement('div');
      md.className = 'md';
      md.innerHTML = renderMarkdown(resultRawText);
      body.appendChild(md);
      actions.appendChild(buildCopyButton());
      if (currentContext) {
        body.appendChild(buildContextFooter());
      }
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn';
    close.textContent = '×';
    close.title = msg('closeTitle');
    close.addEventListener('click', () => dismissResult());
    actions.appendChild(close);

    head.appendChild(titleEl);
    head.appendChild(actions);
    resultBox.appendChild(head);
    resultBox.appendChild(body);
    resultBox.style.display = 'block';
    positionResult();
  }

  function updateStream(text) {
    if (!resultBodyEl) return;
    if (!resultBodyEl.classList.contains('streaming')) {
      resultBodyEl.className = 'result-body streaming';
    }
    resultBodyEl.textContent = text;
    resultBodyEl.scrollTop = resultBodyEl.scrollHeight;
  }

  function positionResult() {
    resultBox.style.visibility = 'hidden';
    const w = resultBox.offsetWidth;
    const h = resultBox.offsetHeight;
    let left = clamp(anchor.x - w / 2, 6, window.innerWidth - w - 6);
    // 结果面板同样显示在选中文字下方，不遮挡文字
    let top = anchor.bottom + 4;
    if (top + h > window.innerHeight - 6) {
      top = anchor.top - h - 4; // 下方放不下时回退到上方
    }
    top = clamp(top, 6, window.innerHeight - h - 6);
    resultBox.style.left = left + 'px';
    resultBox.style.top = top + 'px';
    resultBox.style.visibility = 'visible';
  }

  // ---- 复制 ----
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard
        .writeText(t)
        .then(() => true)
        .catch(() => legacyCopy(t));
    }
    return Promise.resolve(legacyCopy(t));
  }

  function legacyCopy(t) {
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  // ---- 选中 / 上下文 ----
  function selectionAnchor(sel) {
    try {
      if (sel && sel.rangeCount > 0) {
        const rects = sel.getRangeAt(0).getClientRects();
        if (rects && rects.length) {
          const first = rects[0];
          const last = rects[rects.length - 1];
          if (first && last && (first.width || first.height)) {
            return {
              x: first.left + first.width / 2,
              top: first.top,
              bottom: last.bottom
            };
          }
        }
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  const BLOCK_TAGS = new Set([
    'P', 'DIV', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'SECTION', 'ARTICLE', 'TD', 'TH', 'PRE', 'DD', 'DT', 'FIGCAPTION', 'SUMMARY'
  ]);

  function getContext(sel) {
    try {
      if (!sel || sel.rangeCount === 0) return '';
      const selText = String(sel.toString() || '').trim();
      const node = sel.getRangeAt(0).startContainer;
      let el =
        node && node.nodeType === 3 ? node.parentElement :
        node && node.nodeType === 1 ? node : null;
      let best = null;
      let cur = el;
      while (cur && cur !== document.documentElement) {
        if (BLOCK_TAGS.has(cur.tagName)) {
          const t = (cur.textContent || '').trim();
          if (t.length > selText.length) {
            best = cur;
            break;
          }
        }
        cur = cur.parentElement;
      }
      if (!best) return '';
      const t = (best.textContent || '').trim();
      return t.length > 2000 ? t.slice(0, 2000) + '…' : t;
    } catch (e) {
      return '';
    }
  }

  // ---- 事件 ----
  function onMouseUp(e) {
    if (e.composedPath && e.composedPath().includes(host)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? String(sel.toString() || '').trim() : '';
      if (text) {
        currentText = text;
        currentContext = getContext(sel);
        const rect = selectionAnchor(sel);
        anchor = rect || { x: e.clientX, top: e.clientY, bottom: e.clientY };
        showToolbar();
      } else if (!loading) {
        hideAll();
      }
    }, 10);
  }

  function onMouseDownDoc(e) {
    if (e.composedPath && e.composedPath().includes(host)) return;
    if (!loading) hideAll();
  }

  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('mousedown', onMouseDownDoc, true);
  window.addEventListener('scroll', () => { if (!loading) hideToolbar(); }, true);
  window.addEventListener('resize', () => { hideToolbar(); }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideToolbar();
      dismissResult();
    }
  }, true);

  // ---- 流式请求通用封装 ----
  function streamFromBackground(request, handlers) {
    let port = null;
    let finished = false;
    let acc = '';
    let gotAny = false;

    const finish = () => {
      finished = true;
      try {
        if (port) port.disconnect();
      } catch (e) {
        /* ignore */
      }
    };
    const state = { cancel: finish };

    try {
      port = chrome.runtime.connect({ name: 'llm-stream' });
    } catch (e) {
      handlers.onError(msg('errConnect') + ((e && e.message) || e));
      return state;
    }

    port.onMessage.addListener((msgPort) => {
      if (!msgPort) return;
      if (msgPort.type === 'ready') {
        try {
          port.postMessage(request);
        } catch (e) {
          finish();
          handlers.onError(msg('errSend') + ((e && e.message) || e));
        }
      } else if (msgPort.type === 'chunk') {
        gotAny = true;
        acc += msgPort.content;
        handlers.onChunk(msgPort.content, acc);
      } else if (msgPort.type === 'done') {
        if (finished) return;
        finish();
        handlers.onDone(acc);
      } else if (msgPort.type === 'error') {
        if (finished) return;
        finish();
        const needConfig =
          msgPort.code === 'NO_API_KEY' || msgPort.code === 'NO_ENDPOINT' || msgPort.code === 'NO_MODEL';
        handlers.onError(msgPort.error, needConfig);
      }
    });

    port.onDisconnect.addListener(() => {
      if (finished) return;
      finish();
      if (gotAny) handlers.onDone(acc);
      else handlers.onError(msg('errInterrupted'));
    });

    return state;
  }

  // ---- 发起流式请求 ----
  async function runAction(key) {
    if (loading || !currentText) return;
    const cfg = await getConfig();
    const isQuestion = key === 'question';
    const prompt = isQuestion ? cfg.questionPrompt : cfg.translatePrompt;
    const label =
      (isQuestion ? cfg.questionLabel : cfg.translateLabel) ||
      (isQuestion ? msg('defaultQuestionLabel') : msg('defaultTranslateLabel'));

    currentKey = key;
    hideToolbar();
    resultDismissed = false;
    showResult(label, 'loading');
    loading = true;

    streamFromBackground(
      { type: 'callLLM', text: currentText, context: currentContext, prompt },
      {
        onChunk(delta, acc) {
          if (!resultDismissed) updateStream(acc);
        },
        onDone(acc) {
          loading = false;
          if (!resultDismissed) showResult(label, 'final', acc);
        },
        onError(msgText, needConfig) {
          loading = false;
          if (!resultDismissed) showResult(label, 'error', { msg: msgText, needConfig });
        }
      }
    );
  }
})();