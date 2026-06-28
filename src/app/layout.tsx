import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SecureVeil - 端到端加密伪装传输',
  description:
    '支持双层端到端加密、密文伪装传输及多媒体文件处理的纯前端安全通信工具。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
