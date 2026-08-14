// 语言翻译聚合文件 - System Status Monitor
// 各语言翻译已拆分到 frontend/locales/<code>.js 独立文件，
// 由 index.html 按序加载后，本文件负责聚合为 window.LANGUAGES。
// 注意：使用 window 对象导出，避免与其他脚本冲突。

window.LANGUAGE_DATA = window.LANGUAGE_DATA || {};

// 聚合所有语言数据
window.LANGUAGES = window.LANGUAGE_DATA;

// 语言选择配置（下拉菜单展示）
// 新增语言时请同时在 frontend/locales/ 下添加对应 <code>.js 文件
window.LANGUAGE_CONFIG = {
    'zh-CN': {
        name: 'Chinese',
        nativeName: '简体中文'
    },
    'en-US': {
        name: 'English',
        nativeName: 'English'
    },
    'ja-JP': {
        name: 'Japanese',
        nativeName: '日本語'
    },
    'fr-FR': {
        name: 'French',
        nativeName: 'Français'
    },
    'de-DE': {
        name: 'German',
        nativeName: 'Deutsch'
    },
    'ru-RU': {
        name: 'Russian',
        nativeName: 'Русский'
    },
    'ko-KR': {
        name: 'Korean',
        nativeName: '한국어'
    },
    'es-ES': {
        name: 'Spanish',
        nativeName: 'Español'
    },
    'id-ID': {
        name: 'Indonesian',
        nativeName: 'Bahasa Indonesia'
    },
    'th-TH': {
        name: 'Thai',
        nativeName: 'ไทย'
    }
};
