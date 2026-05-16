# SystemStatus 语言翻译指南

本文件说明如何为 SystemStatus 系统监控添加新的语言翻译。

## 目录结构

```
frontend/
├── translations.js      # 语言翻译文件（主要修改位置）
└── script.js           # 主脚本文件（无需修改）
```

## 如何添加新语言

### 步骤 1: 在 translations.js 中添加新语言配置

在 `translations.js` 文件中，找到 `LANGUAGE_CONFIG` 对象，添加新语言的配置：

```javascript
const LANGUAGE_CONFIG = {
    zh: { 
        name: '中文', 
        nativeName: '中文' 
    },
    en: { 
        name: 'English', 
        nativeName: 'English' 
    },
    // 添加新语言，例如日语
    ja: {
        name: 'Japanese',
        nativeName: '日本語'
    }
};
```

### 步骤 2: 添加翻译内容

在 `translations.js` 文件的 `LANGUAGES` 对象中，添加新语言的完整翻译：

```javascript
const LANGUAGES = {
    zh: { ... },
    en: { ... },
    ja: {
        title: "システムモニター",
        selectServer: "監視サーバーを選択：",
        switchBtn: "切り替え",
        connecting: "バックエンドに接続中...",
        // 复制 zh 或 en 的所有键，翻译为日语
        cpu: "CPU",
        memory: "メモリ",
        // ... 其他翻译
    }
};
```

### 步骤 3: 完成

保存 `translations.js` 文件，刷新浏览器即可看到新添加的语言选项！

## 语言代码参考

| 语言 | 代码 | 示例 |
|------|------|------|
| 中文 | zh | 'zh' |
| 英语 | en | 'en' |
| 日语 | ja | 'ja' |
| 韩语 | ko | 'ko' |
| 法语 | fr | 'fr' |
| 德语 | de | 'de' |
| 西班牙语 | es | 'es' |
| 意大利语 | it | 'it' |
| 葡萄牙语 | pt | 'pt' |
| 俄语 | ru | 'ru' |

## 注意事项

1. **完整性**: 确保新语言包含所有翻译键，缺失的键会默认显示中文
2. **占位符**: 一些翻译包含占位符（如 `{count}`），请保持格式不变
3. **测试**: 添加新语言后请测试所有界面元素的显示

## 贡献翻译

如果您添加了新语言的翻译，欢迎提交 Pull Request！
