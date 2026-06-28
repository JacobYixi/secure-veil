'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Upload,
  Copy,
  Check,
  FileText,
  Image,
  File,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  Download,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  encryptText,
  encryptFile,
  selfContainedEncrypt,
  generatePassword,
} from '@/lib/crypto';
import { encodeDisguised, getDisguiseScenes } from '@/lib/disguise';

type InputMode = 'text' | 'file';

export function EncryptPanel() {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [textInput, setTextInput] = useState('');
  const [useAutoPassword, setUseAutoPassword] = useState(true);
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [scene, setScene] = useState('chat');
  const [output, setOutput] = useState('');
  const [generatedPasswords, setGeneratedPasswords] = useState<{ p1: string; p2: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string; size: number } | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileInfo({ name: file.name, type: file.type, size: file.size });
    setError('');
    const reader = new FileReader();
    reader.onload = () => { setFileData(reader.result as ArrayBuffer); };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileInfo({ name: file.name, type: file.type, size: file.size });
    setError('');
    const reader = new FileReader();
    reader.onload = () => { setFileData(reader.result as ArrayBuffer); };
    reader.readAsArrayBuffer(file);
  }, []);

  const regeneratePasswords = () => {
    setPassword1(generatePassword(12));
    setPassword2(generatePassword(12));
  };

  const handleEncrypt = async () => {
    setError('');
    setOutput('');
    setGeneratedPasswords(null);

    let pwd1 = password1;
    let pwd2 = password2;

    if (useAutoPassword) {
      pwd1 = generatePassword(16);
      pwd2 = generatePassword(16);
    } else {
      if (!pwd1 || !pwd2) {
        setError('请设置两层加密密码');
        return;
      }
    }

    if (inputMode === 'text' && !textInput.trim()) {
      setError('请输入要加密的文本内容');
      return;
    }
    if (inputMode === 'file' && !fileData) {
      setError('请上传要加密的文件');
      return;
    }

    setIsProcessing(true);

    try {
      let encrypted: Uint8Array;

      if (useAutoPassword) {
        // Self-contained mode: passwords embedded in payload
        let rawData: ArrayBuffer;
        if (inputMode === 'text') {
          const encoder = new TextEncoder();
          rawData = encoder.encode(textInput).buffer;
        } else {
          // Pack file metadata
          const enc = new TextEncoder();
          const meta = JSON.stringify({ name: fileInfo!.name, type: fileInfo!.type, size: fileInfo!.size });
          const metaBytes = enc.encode(meta);
          const metaLen = new Uint8Array(new Uint32Array([metaBytes.length]).buffer);
          rawData = new Uint8Array(4 + metaBytes.length + fileData!.byteLength).buffer;
          const view = new Uint8Array(rawData);
          view.set(metaLen, 0);
          view.set(metaBytes, 4);
          view.set(new Uint8Array(fileData!), 4 + metaBytes.length);
        }

        const { payload } = await selfContainedEncrypt(rawData, inputMode === 'file');
        encrypted = payload;
        setGeneratedPasswords({ p1: pwd1, p2: pwd2 });
      } else {
        if (inputMode === 'text') {
          encrypted = await encryptText(textInput, pwd1, pwd2);
        } else {
          encrypted = await encryptFile(fileData!, fileInfo!.name, fileInfo!.type, pwd1, pwd2);
        }
        setGeneratedPasswords({ p1: pwd1, p2: pwd2 });
      }

      // Apply disguise
      const disguised = encodeDisguised(encrypted, scene);
      setOutput(disguised);
    } catch (err) {
      setError(`加密失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `msg_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setTextInput('');
    setFileData(null);
    setFileInfo(null);
    setOutput('');
    setError('');
    setGeneratedPasswords(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.startsWith('text/')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const scenes = getDisguiseScenes();

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Input Section */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            加密内容
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">选择输入文本或上传文件</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
            <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
              <TabsTrigger value="text" className="text-xs sm:text-sm">文本消息</TabsTrigger>
              <TabsTrigger value="file" className="text-xs sm:text-sm">文件/图片</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-3">
              <Textarea
                placeholder="输入需要加密的文本内容..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[120px] sm:min-h-[160px] resize-y text-sm bg-background/50"
              />
            </TabsContent>

            <TabsContent value="file" className="mt-3">
              <div
                className="border-2 border-dashed border-border/60 rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] active:scale-[0.99] transition-all"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {fileInfo ? (
                  <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      {getFileIcon(fileInfo.type)}
                      <span className="font-medium truncate max-w-[200px]">{fileInfo.name}</span>
                      <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                        {formatFileSize(fileInfo.size)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleClear(); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center">
                      <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      点击或拖拽文件到此处
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/60">
                      支持图片、文档及任意格式文件
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              加密密钥
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAutoPassword}
                  onChange={(e) => setUseAutoPassword(e.target.checked)}
                  className="rounded border-border h-3.5 w-3.5 sm:h-4 sm:w-4 accent-primary"
                />
                <span className="text-[10px] sm:text-xs text-muted-foreground">自动</span>
              </label>
            </div>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            {useAutoPassword
              ? '系统自动生成密码并嵌入密文，接收方无需输入密码即可解密'
              : '手动设置两层独立密码，需将密码告知接收方'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
          {useAutoPassword ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                密码将自动生成并隐藏在伪装文本中，发送时无需额外传递密码
              </span>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="pwd1" className="text-xs sm:text-sm flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">第一层</Badge>
                  外层密码
                </Label>
                <div className="relative">
                  <Input
                    id="pwd1"
                    type={showPassword1 ? 'text' : 'password'}
                    placeholder="输入第一层密码..."
                    value={password1}
                    onChange={(e) => setPassword1(e.target.value)}
                    className="pr-20 text-sm bg-background/50 h-10 sm:h-11"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword1(!showPassword1)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword1 ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassword1(generatePassword(12))}
                      className="p-1 text-muted-foreground hover:text-primary"
                      title="随机生成"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd2" className="text-xs sm:text-sm flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">第二层</Badge>
                  内层密码
                </Label>
                <div className="relative">
                  <Input
                    id="pwd2"
                    type={showPassword2 ? 'text' : 'password'}
                    placeholder="输入第二层密码..."
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="pr-20 text-sm bg-background/50 h-10 sm:h-11"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword2(!showPassword2)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword2 ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassword2(generatePassword(12))}
                      className="p-1 text-muted-foreground hover:text-primary"
                      title="随机生成"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Disguise Scene */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            伪装场景
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">选择密文的外观形式</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-2 gap-2">
            {scenes.map((s) => (
              <button
                key={s.id}
                onClick={() => setScene(s.id)}
                className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${
                  scene === s.id
                    ? 'border-primary/40 bg-primary/5 shadow-sm'
                    : 'border-border/40 bg-background/30 hover:border-border/60'
                }`}
              >
                <div className="text-xs sm:text-sm font-medium">{s.name}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2.5">
        <Button
          onClick={handleEncrypt}
          disabled={isProcessing}
          className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-medium rounded-xl"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              加密中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              加密并伪装
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          className="h-11 sm:h-12 px-5 rounded-xl"
        >
          清空
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Output */}
      {output && (
        <Card className="border-green-500/20 bg-green-500/[0.03] backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                伪装完成
              </CardTitle>
              <div className="flex gap-1.5 sm:gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs">
                  {copied ? <Check className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? '已复制' : '复制'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  下载
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              这段文字看起来完全正常，可直接发送给对方
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="p-3 sm:p-4 rounded-xl bg-background/80 border border-border/30 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
              <p className="text-xs sm:text-sm leading-relaxed break-all text-foreground/85">
                {output}
              </p>
            </div>
            {generatedPasswords && !useAutoPassword && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                  请将以下密码单独告知接收方：
                </p>
                <div className="space-y-1 font-mono text-[10px] sm:text-xs">
                  <div>第一层: <span className="select-all">{generatedPasswords.p1}</span></div>
                  <div>第二层: <span className="select-all">{generatedPasswords.p2}</span></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
