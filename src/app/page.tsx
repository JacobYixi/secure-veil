'use client';

import { useState } from 'react';
import { EncryptPanel } from '@/components/encrypt-panel';
import { DecryptPanel } from '@/components/decrypt-panel';
import { Shield, Lock, Unlock, Fingerprint } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt');

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-background via-background to-muted/20" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/15">
              <Fingerprint className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none">SecureVeil</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-none mt-0.5">隐写加密传输</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-[10px] sm:text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span className="hidden sm:inline">AES-256</span>
              <span className="sm:hidden">256</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl">
        {/* Compact intro */}
        <div className="mb-4 sm:mb-6 text-center space-y-1.5 sm:space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {activeTab === 'encrypt' ? '加密你的消息' : '解密收到的内容'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            {activeTab === 'encrypt'
              ? '输入内容后一键加密，密文隐藏在普通文字中，完全看不出痕迹'
              : '粘贴收到的文字，系统自动提取隐藏内容并还原'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center mb-4 sm:mb-6">
          <div className="inline-flex items-center rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-1 gap-0.5">
            <button
              onClick={() => setActiveTab('encrypt')}
              className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-[0.97] ${
                activeTab === 'encrypt'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              加密
            </button>
            <button
              onClick={() => setActiveTab('decrypt')}
              className={`flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-[0.97] ${
                activeTab === 'decrypt'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Unlock className="h-3.5 w-3.5" />
              解密
            </button>
          </div>
        </div>

        {/* Panel */}
        <div>
          {activeTab === 'encrypt' ? <EncryptPanel /> : <DecryptPanel />}
        </div>

        {/* Footer */}
        <footer className="mt-8 sm:mt-12 pb-6 text-center space-y-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground/70">
            所有加密操作均在浏览器本地完成，数据不会上传至任何服务器
          </p>
        </footer>
      </main>
    </div>
  );
}
