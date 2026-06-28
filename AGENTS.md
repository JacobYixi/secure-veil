# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/
│   │   ├── ui/             # Shadcn UI 组件库
│   │   ├── encrypt-panel.tsx  # 加密面板组件
│   │   └── decrypt-panel.tsx  # 解密面板组件
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   ├── utils.ts        # 通用工具函数 (cn)
│   │   ├── crypto.ts       # 双层 AES-GCM 加密核心模块
│   │   └── disguise.ts     # 密文伪装编解码模块
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## 核心模块说明

### 加密模块 (`src/lib/crypto.ts`)
- 使用 Web Crypto API 实现双层 AES-256-GCM 加密
- 密钥派生: PBKDF2-SHA256, 100,000 次迭代
- 数据格式: `[MAGIC(4)][SALT1(16)][IV1(12)][SALT2(16)][IV2(12)][ENCRYPTED_DATA]`
- 支持文本和文件加密，文件加密会附带元数据(JSON: name, type, size)

### 伪装模块 (`src/lib/disguise.ts`)
- 零宽字符隐写: 将二进制数据编码为零宽 Unicode 字符，嵌入自然文本中
- 支持4种伪装场景: 日常聊天、备忘清单、生活日记、通知消息
- 数据完全不可见，文本外观与普通消息无异
- 支持自动检测文本中是否包含隐藏数据

### 前端组件
- `encrypt-panel.tsx`: 加密面板 - 文本/文件输入、自动/手动密码模式、伪装场景选择、零宽隐写输出
- `decrypt-panel.tsx`: 解密面板 - 粘贴伪装内容、自动检测隐藏数据、自动提取密码解密、文件下载/图片预览

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**
