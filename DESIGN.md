# DESIGN.md

## 品牌与视觉方向
- 应用名称: SecureVeil
- 定位: 端到端加密伪装传输工具
- 气质: 专业安全、低调克制、技术感

## Design Tokens

### 色彩
- 背景: 深色主题，使用 `bg-background` 配合 `bg-gradient-to-br` 微渐变
- 主色: 使用 shadcn/ui 默认 primary 色，用于关键操作按钮和图标
- 卡片: `bg-card/50 backdrop-blur` 半透明毛玻璃效果
- 成功状态: `green-500` 用于解密成功标识
- 错误状态: `destructive` 色系用于错误提示

### 字体
- 正文字体: PingFang SC / Microsoft YaHei (系统默认)
- 等宽字体: 用于密文输出展示 (`font-mono`)

### 圆角
- 卡片: `rounded-xl` (12px)
- 按钮: `rounded-lg` (8px)
- 输入框: 默认 shadcn 圆角

## 交互与状态
- 加密/解密操作使用 loading spinner 反馈
- 密码输入支持显示/隐藏切换
- 文件上传支持拖拽和点击两种方式
- 复制结果后短暂显示"已复制"状态

## 设计禁忌
- 不使用亮色/高饱和度背景
- 不使用卡通风格图标
- 避免过多动画效果，保持专业感
