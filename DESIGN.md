# DESIGN.md

## 品牌与视觉方向
- 应用名称: SecureVeil
- 定位: 端到端加密伪装传输工具
- 气质: 专业安全、低调克制、技术感

## Design Tokens

### 色彩
- 背景: 使用 `bg-background` 配合 `bg-gradient-to-b` 微渐变
- 主色: 使用 shadcn/ui 默认 primary 色，用于关键操作按钮和图标
- 卡片: `bg-card/60 backdrop-blur-sm` 半透明毛玻璃效果
- 成功状态: `green-500` 用于解密成功标识
- 错误状态: `destructive` 色系用于错误提示

### 字体
- 正文字体: PingFang SC / Microsoft YaHei (系统默认)
- 等宽字体: 用于密码展示 (`font-mono`)

### 圆角
- 卡片: `rounded-xl` (12px)
- 按钮: `rounded-xl` (12px)
- 输入框: 默认 shadcn 圆角

## 移动端优先
- 所有组件使用 `sm:` 断点做响应式适配
- 触控目标最小 44px (h-11)
- 间距使用 `space-y-4` 移动端紧凑，`sm:space-y-5` 桌面端宽松
- 字体尺寸: 移动端 text-xs/sm，桌面端 sm/base
- 按钮使用 `active:scale-[0.97]` 提供触控反馈

## 交互与状态
- 加密/解密操作使用 loading spinner 反馈
- 密码输入支持显示/隐藏切换 + 随机生成
- 文件上传支持拖拽和点击两种方式
- 复制结果后短暂显示"已复制"状态
- 粘贴文本后自动检测是否包含隐藏数据

## 设计禁忌
- 不使用亮色/高饱和度背景
- 不使用卡通风格图标
- 避免过多动画效果，保持专业感
