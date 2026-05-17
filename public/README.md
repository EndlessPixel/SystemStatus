# Public 静态文件目录

本目录用于存放公共静态文件，以提升项目的可扩展性。

## 目录结构

```
public/
├── README.md              # 本说明文件
├── images/                # 图片资源目录
├── css/                   # 额外CSS样式目录
├── js/                    # 额外JavaScript脚本目录
└── custom/                # 自定义文件目录（可自由创建子目录）
```

## 访问方式

### 通过浏览器直接访问

所有放在 `public` 目录下的文件都可以通过以下URL访问：

```
http://localhost:8001/public/文件名
```

例如：
- `public/images/logo.png` → `/public/images/logo.png`
- `public/css/custom.css` → `/public/css/custom.css`
- `public/js/widget.js` → `/public/js/widget.js`

### 在前端代码中引用

```html
<!-- 图片引用 -->
<img src="/public/images/logo.png" alt="Logo">

<!-- CSS引用 -->
<link rel="stylesheet" href="/public/css/custom.css">

<!-- JavaScript引用 -->
<script src="/public/js/widget.js"></script>
```

## 使用场景

### 1. 自定义品牌资源
```
public/
└── images/
    ├── logo.png           # 自定义Logo
    ├── favicon.ico        # 网站图标
    └── background.jpg     # 自定义背景图
```

### 2. 自定义样式扩展
```
public/
└── css/
    ├── custom.css         # 自定义CSS样式
    └── theme.css          # 自定义主题样式
```

### 3. 第三方插件
```
public/
└── js/
    ├── analytics.js       # 统计分析脚本
    ├── chat-widget.js     # 客服聊天插件
    └── social-share.js    # 社交分享插件
```

### 4. 文档和资源
```
public/
├── docs/
│   ├── manual.pdf        # 用户手册
│   └── api.md            # API文档
└── downloads/
    └── client.exe        # 客户端下载
```

## 注意事项

1. **文件大小限制**：建议单个文件不超过10MB
2. **安全限制**：请勿在public目录中存放敏感文件（如密钥、配置文件等）
3. **目录创建**：可以自由创建新的子目录来组织文件
4. **热更新**：新增文件后无需重启服务，可直接访问

## 示例：添加自定义Logo

1. 将 `logo.png` 放入 `public/images/` 目录
2. 在 `frontend/index.html` 中替换Logo引用：
```html
<!-- 将默认Logo替换为自定义Logo -->
<img src="/public/images/logo.png" alt="SystemStatus" class="logo">
```

## 示例：添加自定义样式

1. 创建 `public/css/custom.css` 文件
2. 添加自定义样式：
```css
.logo {
    height: 40px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}
```

3. 在 `frontend/index.html` 中引入：
```html
<link rel="stylesheet" href="/public/css/custom.css">
```

## API端点

- 主静态文件：`/static/*`
- 公共文件：`/public/*`

两个目录都可以直接访问静态文件，区别在于用途：
- `/static/` - 项目内置文件（frontend目录）
- `/public/` - 公共扩展文件（可自定义）

---

如需更多帮助，请参考项目主 README.md
