# Chrome 商店上架指南（Selection AI / 划词 AI 助手）

> 本文档汇总上架所需的一切：前置条件、打包产物、商店文案、权限与隐私说明、素材清单、提交步骤。照着填即可。

---

## 0. 前置条件（必须你本人完成）

1. 注册 **Chrome 网上应用店开发者账号**：登录 Google 账号，打开
   `https://chrome.google.com/webstore/devconsole/register`
   支付一次性 **$5 美元** 注册费。
2. 这一步需要 Google 账号登录 + 支付，我无法代操作。

---

## 1. 打包产物（已就绪）

- 上传用的 zip：`dist/selection-ai-1.1.0.zip`（manifest.json 在根目录，含全部运行文件、图标与中英文语言包）

> 重新打包命令：`zip -r dist/selection-ai-1.1.0.zip manifest.json background.js content.js options.html options.js icons _locales`

---

## 2. 商店资料文案（直接复制）

> ⚠️ **多语言一致性（审核重点）**：商店的默认语言是简体中文；如果你同时提供英语语言区域的商品说明，英文内容必须是中文内容的**逐段对应翻译**——功能点、隐私声明完全一致，不能增删改换。内容不一致会被判定为「误导性元数据」并进入深入审核。下方给出的是逐段对应的中英双语文案，照抄即可。

| 字段 | 中文（默认） | English（语言区域） |
| --- | --- | --- |
| **名称** | `Selection AI - 划词解释与翻译助手` | `Selection AI - Explain & Translate Selected Text` |
| **分类** | 生产力工具（Productivity） | Productivity |
| **价格** | 免费 | Free |

**摘要（Summary，≤132 字符）**

中文（默认）：

```
选中网页文字，一键用 AI 解释或翻译。Prompt 可完全自定义，支持流式输出、Markdown 与任意 OpenAI 兼容接口。
```

英语：

```
Select any webpage text and explain or translate it with AI. Customizable prompts, streaming, Markdown, OpenAI-compatible APIs.
```

**详细说明（Description）**

中文（默认）：

```
选中网页上的任意文字，一键用 AI 解释或翻译。

核心功能
- 划词即用：鼠标选中文字，光标处弹出「问号 / 翻译」两个按钮
- 解释：选中名词/概念，结合费曼学习法通俗解释（字数可自定义）
- 翻译：忠实原文、结合上下文，结果信达雅
- 完全自定义：两个按钮的 Prompt 都可自由修改，想做什么就做什么
- 结合上下文：选中单个词时，点「在上下文中查看」结合段落给出更准确的解释/翻译
- 流式输出 + Markdown 渲染

接入方式
- 支持任意 OpenAI 兼容接口（DeepSeek / OpenAI / Kimi / 通义 / 智谱 / 中转站等）
- 只需填写接口地址、API Key、模型名称，点「测试连接」即可

隐私说明
- API Key 仅保存在浏览器本地（chrome.storage.local），不会上传到任何服务器
- 选中的文字与所在段落只会发送到你自行配置的大模型接口，用于生成解释/翻译
- 本扩展没有自建服务器，不会收集或存储你的任何内容
```

英语（与上面逐段对应）：

```
Select any text on a webpage and explain or translate it with AI in one click.

Core features
- Select and go: select text with your mouse and two buttons appear — Explain (?) and Translate (译)
- Explain: the selected term or concept is explained in plain language using the Feynman technique (length customizable)
- Translate: the result stays faithful to the original, takes context into account, and is accurate, expressive, and elegant
- Fully customizable: the prompts of both buttons can be freely edited to do whatever you want
- View in context: for short selections like a single word, click "View in context" at the end of the result to re-process it together with the surrounding paragraph, giving a more accurate explanation or translation
- Streaming output + Markdown rendering

Supported models
- Works with any OpenAI-compatible API (DeepSeek / OpenAI / Kimi / Qwen / Zhipu / relay stations, etc.)
- Just fill in the endpoint, API key, and model name, then click "Test connection"

Privacy
- Your API key is stored only locally in the browser (chrome.storage.local) and is never uploaded to any server
- Selected text and its surrounding paragraph are sent only to the model API you configure yourself, to generate explanations or translations
- This extension hosts no servers of its own and does not collect or store any of your content
```

---

## 3. 权限与隐私（商店审核必填）

**单一用途（Single purpose）**

```
在用户选中网页文字时，调用用户自行配置的大模型接口，对选中内容进行解释或翻译。
```

**权限说明（Permission justification，针对 <all_urls>）**

```
该扩展需要在用户选中文字时，向用户自行配置的大模型接口（任意域名的 OpenAI 兼容 API 或中转站）发起请求，因此需要访问所有 URL 的主机权限。所有请求均由用户在页面上主动触发。
```

**数据使用（Data usage）**

```
不收集、不存储用户数据。选中的文字与上下文仅发送到用户自行配置的第三方大模型接口；API Key 仅保存在浏览器本地。
```

**远程代码（Remote code）**：**否**（所有代码均为本地打包，无远程加载）。

---

## 4. 素材清单

| 素材 | 状态 | 说明 |
| --- | --- | --- |
| 图标 128×128 | ✅ 已有 `icons/icon128.png` | 商店图标 |
| 截图（至少 1 张，1280×800 或 640×400） | ⚠️ **需你补** | 需要真实截图，建议截：选中文字→弹出按钮→点「译」→翻译结果 |
| 小图 440×280 | ✅ 已生成 `store-assets/small-tile-440x280.png` | 可选，推荐 |
| 大图 920×680 | ✅ 已生成 `store-assets/large-tile-920x680.png` | 可选，推荐 |
| 宽横幅 1400×560 | ✅ 已生成 `store-assets/marquee-1400x560.png` | 可选 |

> 截图是**必填**项，我无法替你操作浏览器截图。最快做法：用调试窗口选一段英文点「译」，`Cmd+Shift+4` 截取整页或窗口，裁成 1280×800 上传。

---

## 5. 提交步骤

1. 打开开发者后台：`https://chrome.google.com/webstore/devconsole`
2. 点「**新增项目（New item）**」。
3. 上传 `dist/selection-ai-1.1.0.zip`。
4. 填写「**商品详情**」：名称、摘要、说明（用上面第 2 节文案）。
5. 搬运**英语语言区域**的商品详情时，用第 2 节英文栏的逐段对应翻译（不要机翻重写、不要增删功能点）。
6. 上传「**图片素材**」：图标、截图、推广图（用第 4 节文件）。
7. 填写「**隐私权**」：单一用途、权限说明、数据使用（用第 3 节文案）。
8. 选择「**发布**」可见范围（建议先「**不公开**」或「**测试人员**」试跑，确认无误再「公开」）。
9. 提交审核，等待 Google 审核（一般数天，权限较宽的扩展可能更久）。

---

## 6. 风险提示

- `host_permissions: ["<all_urls>"]` 是审核重点，务必把第 3 节的「权限说明」写清楚；若被打回，常见原因是权限用途描述不充分。
- **多语言元数据一致性**：若有英语语言区域，必须与默认（中文）说明逐段对应，否则触发「元数据不匹配」深入审核（本次已遇到，按第 2 节修正）。
- 首次上架建议先选「不公开」发布，验证安装/更新链路正常后再转公开。