# SecureVeil

**端到端加密伪装传输工具** — 将加密信息隐藏在普通文本中，肉眼不可见，复制粘贴即可传输。

所有加密操作在浏览器本地完成，数据不经过任何服务器。

## 特性

- **双层 AES-256-GCM 加密** — 消息经过两次独立加密，PBKDF2 密钥派生（100,000 次迭代）
- **零宽字符隐写** — 密文编码为零宽 Unicode 字符，嵌入日常文本中，肉眼完全不可见
- **生活化伪装场景** — 日常聊天、备忘清单、生活日记、通知消息，4 种场景可选
- **自动密码模式** — 系统自动生成密码并嵌入密文，接收方一键解密无需输入密码
- **手动密码模式** — 也支持手动指定两层密码，通过其他渠道传递
- **多媒体支持** — 文本、图片、任意格式文件均可加密传输
- **纯前端** — 基于 Web Crypto API，所有操作在浏览器内完成，零后端依赖

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 16 (App Router) | 应用框架 |
| React 19 | UI 框架 |
| TypeScript 5 | 类型安全 |
| Tailwind CSS 4 | 样式 |
| shadcn/ui | 组件库 |
| Web Crypto API | 加密核心 |

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 部署到 Cloudflare Pages

1. 将代码推送到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 选择仓库，配置：
   - **Build command**: `pnpm build`
   - **Build output directory**: `out`
4. 点击 **Save and Deploy**

## 安全说明

- 所有加密/解密操作均在浏览器本地执行，使用 [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- 数据不会上传到任何服务器
- 加密算法：AES-256-GCM（双层）+ PBKDF2-SHA256 密钥派生
- 零宽字符隐写基于 Unicode 零宽字符（U+200B / U+200C / U+200D / U+FEFF）
- 自动模式下密码嵌入密文中，适合便捷传输；手动模式下需单独传递密码

> **注意**：零宽字符在某些平台（如部分社交媒体、邮件客户端）可能会被过滤。建议通过微信、Telegram 等即时通讯工具传输。

## 许可证

[MIT License](./LICENSE)
