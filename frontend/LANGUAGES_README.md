# SystemStatus 语言翻译指南

本文件说明如何为 SystemStatus 系统监控添加与维护语言翻译。

## 目录结构

每种语言现在独立存放在 `frontend/locales/` 目录下，由 `index.html` 按序加载后被 `translations.js` 聚合：

```
frontend/
├── translations.js          # 聚合器：将 locales/*.js 合并为 window.LANGUAGES
├── LANGUAGES_README.md      # 本说明文件
├── locales/
│   ├── zh.js               # 简体中文（基准语言，键集以此为准）
│   ├── en.js               # English
│   ├── ja.js               # 日本語
│   ├── fr.js               # Français
│   ├── de.js               # Deutsch（德语，此前缺失，已修复）
│   ├── ru.js               # Русский
│   └── ko.js               # 한국어
└── script.js               # 主脚本（无需修改）
```

> 各语言文件通过 `window.LANGUAGE_DATA['<code>'] = { ... }` 挂载自身数据；
> `translations.js` 再将其聚合为 `window.LANGUAGES` 供 `script.js` 的 `t()` 函数使用。

## 如何添加新语言

### 步骤 1：创建语言文件

在 `frontend/locales/` 下新建 `<code>.js`（`<code>` 为 ISO 639-1 两位语言代码）：

```javascript
// frontend/locales/es.js
window.LANGUAGE_DATA = window.LANGUAGE_DATA || {};
window.LANGUAGE_DATA['es'] = {
    title: "Monitor del Sistema",
    // 复制 zh.js 中的全部键，翻译为对应语言
    cpu: "CPU",
    // ...
};
```

⚠️ **键完整性要求**：新语言必须包含 `zh.js`（基准语言）中的**全部键**，缺失的键会回退到中文。

### 步骤 2：注册到 index.html

在 `frontend/index.html` 的 `translations.js` 之前，按序添加 `<script>` 标签：

```html
<script src="/static/locales/es.js"></script>
<!-- 聚合语言数据 -->
<script src="/static/translations.js"></script>
```

### 步骤 3：添加到语言配置

在 `frontend/translations.js` 的 `LANGUAGE_CONFIG` 中补充下拉菜单项：

```javascript
window.LANGUAGE_CONFIG = {
    // ...
    'es': {
        name: 'Spanish',
        nativeName: 'Español'
    }
};
```

### 步骤 4：完成

保存并刷新浏览器，语言选择下拉菜单中即可看到新语言。

## 语言代码参考

| 语言 | 代码 | 菜单名 (nativeName) |
|------|------|---------------------|
| 中文 | zh | 简体中文 |
| 英语 | en | English |
| 日语 | ja | 日本語 |
| 法语 | fr | Français |
| 德语 | de | Deutsch |
| 俄语 | ru | Русский |
| 韩语 | ko | 한국어 |
| 西班牙语 | es | Español（示例，待添加） |

## 注意事项

1. **完整性**：确保新语言包含 `zh.js` 的全部键，缺失的键会默认显示中文。
2. **语言菜单键**：每种语言都应包含 `chinese` / `english` / `japanese` / `french` / `german` / `russian` / `korean` 这 7 个菜单键，用于在下拉框中显示各语言名称。
3. **占位符**：部分翻译含占位符（如 `{count}`），请保持格式不变。
4. **不要手改外层结构**：各 locale 文件顶部的 `window.LANGUAGE_DATA` 初始化及底部的 `};` 由聚合逻辑依赖，请勿删除。
5. **测试**：添加或修改语言后，请切换至该语言测试所有界面元素显示。

## 贡献翻译

如果您添加了新语言的翻译，欢迎提交 Pull Request！
