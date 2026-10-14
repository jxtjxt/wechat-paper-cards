# wechat-paper-cards

将论文 PDF、DOI 或网址制作成中文微信公众号贴图文章的 Codex skill。

## 产出

- 通常 4–8 张 1080×1440 PNG 卡片，按论文内容调整张数。
- 400–600 个非空白字符的正文配文。
- 可编辑 HTML/SVG、离线预览、来源与论断证据记录、上传 ZIP。
- 默认使用雾白底、深靛蓝正文与橙色强调的示意图风格。

## 安装与使用

将本仓库完整内容放入 `~/.codex/skills/wechat-paper-cards/`，保留目录结构。在 Codex 中调用：

```text
用 $wechat-paper-cards 把这篇论文制作成公众号贴图文章：<PDF 路径、DOI 或网址>
```

完整工作流程与验收要求见 [SKILL.md](SKILL.md)。

## 目录

- `agents/openai.yaml`：技能显示信息与默认提示。
- `references/style.md`：默认风格与科学图形标准。
- `assets/card-template.html`：可编辑卡片模板。
- `assets/approved-overview.jpg`：视觉风格参考，不作为科学证据。
- `scripts/render-check.cjs`：导出 PNG，检查尺寸、越界与资源加载。
- `scripts/package.py`：检查配文、交付文件与 ZIP 一致性。

## 运行条件

渲染脚本需要 Node.js、已安装的 `playwright` 和 `sharp`，以及本机浏览器。优先复用现有依赖；可通过 `NODE_PATH` 指定模块目录，通过 `WECHAT_CARD_BROWSER` 指定浏览器路径。脚本也会查找 Codex 共享运行时及 Windows 上的 Chrome/Edge。

打包脚本使用 Python 3 标准库，不需要额外 Python 包。

```text
node scripts/render-check.cjs <html-directory> [png-output-directory]
python scripts/package.py <delivery-directory>
```

软件检查不能代替原始论文核查和逐张科学、视觉审阅。此 skill 不自动发布到微信公众号。
