'use client';

import { useState } from 'react';
import { EncryptPanel } from '@/components/encrypt-panel';
import { DecryptPanel } from '@/components/decrypt-panel';
import { Shield, Lock, Unlock, Fingerprint, Layers, FileStack } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt');

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">SecureVeil</h1>
                <p className="text-xs text-muted-foreground">端到端加密 · 密文伪装传输</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
                AES-256-GCM
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Layers className="h-3 w-3" />
                双层加密
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Feature Banner */}
        <div className="mb-8 text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">
            安全加密，隐于无形
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            支持文本、图片及任意文件的双层端到端加密，密文自动伪装为古典文书或配置文件，
            确保传输内容在第三方眼中完全无害。
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" />
              PBKDF2 密钥派生
            </span>
            <span className="flex items-center gap-1.5">
              <FileStack className="h-4 w-4 text-primary" />
              多媒体支持
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center rounded-xl border border-border/50 bg-card/50 backdrop-blur p-1">
            <button
              onClick={() => setActiveTab('encrypt')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'encrypt'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Lock className="h-4 w-4" />
              加密发送
            </button>
            <button
              onClick={() => setActiveTab('decrypt')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'decrypt'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Unlock className="h-4 w-4" />
              解密接收
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="transition-all duration-300">
          {activeTab === 'encrypt' ? <EncryptPanel /> : <DecryptPanel />}
        </div>

        {/* Footer Info */}
        <footer className="mt-12 pb-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>所有加密操作均在浏览器本地完成，数据不会上传至任何服务器</span>
          </div>
          <p className="text-xs text-muted-foreground/60">
            使用 Web Crypto API · AES-256-GCM · PBKDF2-SHA256
          </p>
        </footer>
      </main>
    </div>
  );
}
