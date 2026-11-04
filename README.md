# Selection AI（划词 AI 助手）

> A Chrome extension that adds explain & translate actions to text selection. Customizable prompts, streaming, Markdown, context-aware re-query, and OpenAI-compatible APIs (incl. relay stations).

选中网页上的文字，光标处弹出两个按钮：

- **？**（问号）—— 默认用费曼学习法解释选中的名词/概念
- **译**（翻译）—— 默认把选中的文字翻译成中文（信达雅）

两个按钮的 **Prompt 完全可自定义**，可改成任何你想让大模型做的事。支持任意 **OpenAI 兼容** 的大模型接口（DeepSeek / OpenAI / Kimi / 通义 / 智谱 / 硅基流动 等）。

---

## 一、安装到 Chrome

1. 打开 Chrome，地址栏输入 `chrome://extensions` 回车。
2. 右上角打开 **「开发者模式」** 开关。
3. 点击左上角 **「加载已解压的扩展程序」**。
4. 选择本目录（包含 `manifest.json` 的文件夹），即可完成安装。

> 也可以命令行冷启动加载（Chrome 需完全退出后执行）：
>
> ```bash
> open -a "Google Chrome" --args --load-extension="/Users/dongsen/Documents/Code/private/GooglePlugin"
> ```

## 二、配置 API Key

1. 点击浏览器工具栏里的 **划词 AI 助手** 图标（或右键图标 → 选项），打开设置页。
2. 填写：
   - **接口地址**：你的大模型 chat/completions 完整地址
   - **API Key**：你的密钥
   - **模型名称**：如 `deepseek-chat`
3. 点 **「测试连接」** 验证，再点 **「保存设置」**。

### 常见服务商默认填法

| 服务商 | 接口地址 | 模型 |
| --- | --- | --- |
| DeepSeek | `https://api.deepseek.com/chat/completions` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| Kimi (Moonshot) | `https://api.moonshot.cn/v1/chat/completions` | `moonshot-v1-8k` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-plus` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | `glm-4-flash` |
| 硅基流动 | `https://api.siliconflow.cn/v1/chat/completions` | `deepseek-ai/DeepSeek-V3` |
| 中转站（One-API / New-API 等） | `https://你的中转站域名`（base URL） | 中转站提供的模型 ID |

> **中转站 / 中转 API**：这类服务基本都是 OpenAI 兼容格式。接口地址**只填 base URL 即可**（如 `https://你的中转站域名` 或 `https://你的中转站域名/v1`），插件会自动补全为 `/v1/chat/completions`；API Key 填中转站发给你的 token，模型名按中转站提供的模型 ID 填。

## 三、使用

在任意网页上用鼠标选中一段文字，松开鼠标后光标处出现两个按钮，点击即可。

- **流式输出**：回答逐字显示，不用等整段生成完，体感速度更快。
- **Markdown 渲染**：回答里的标题、加粗、列表、代码块、链接等会以富文本形式显示。
- **在上下文中查看**：结果末尾可展开选中处的原始段落（高亮选中的文字），默认收起、保持精简。

Prompt 中可用两个占位符：

- `{{selection}}` —— 你选中的文字
- `{{context}}` —— 选中处所在段落（自动截取，供“读取上下文”使用）

## 四、默认 Prompt

**问号：**

```
用通俗易懂的概念，解释这个名词，可以结合费曼学习法说明，字数不要超过 200 个。

名词：{{selection}}

上下文：
{{context}}
```

**翻译：**

```
将这段文字翻译成中文，在忠实原文的情况下，读取上下文进行翻译，结果要信达雅。

原文：{{selection}}

上下文：
{{context}}
```

## 五、文件说明

| 文件 | 作用 |
| --- | --- |
| `manifest.json` | 扩展清单（Manifest V3） |
| `background.js` | 后台调用大模型接口（避开页面 CORS） |
| `content.js` | 划词检测、弹出按钮、展示结果（Shadow DOM 隔离样式） |
| `options.html` / `options.js` | 设置页（接口、Key、模型、两个按钮的 Prompt） |
| `icons/` | 扩展图标 |
