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
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import {
  encryptText,
  encryptFile,
} from '@/lib/crypto';
import {
  encodeToDisguise,
  encodeAsConfig,
} from '@/lib/disguise';

type InputMode = 'text' | 'file';

export function EncryptPanel() {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [textInput, setTextInput] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [disguiseMode, setDisguiseMode] = useState('classical');
  const [output, setOutput] = useState('');
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
    reader.onload = () => {
      setFileData(reader.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileInfo({ name: file.name, type: file.type, size: file.size });
    setError('');

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleEncrypt = async () => {
    setError('');
    setOutput('');

    if (!password1 || !password2) {
      setError('请设置两层加密密码');
      return;
    }

    setIsProcessing(true);

    try {
      let encrypted: Uint8Array;

      if (inputMode === 'text') {
        if (!textInput.trim()) {
          setError('请输入要加密的文本内容');
          setIsProcessing(false);
          return;
        }
        encrypted = await encryptText(textInput, password1, password2);
      } else {
        if (!fileData) {
          setError('请上传要加密的文件');
          setIsProcessing(false);
          return;
        }
        encrypted = await encryptFile(fileData, fileInfo!.name, fileInfo!.type, password1, password2);
      }

      // Apply disguise
      let disguised: string;
      if (disguiseMode === 'classical') {
        disguised = encodeToDisguise(encrypted);
      } else {
        disguised = encodeAsConfig(encrypted);
      }

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
    a.download = `encrypted_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setTextInput('');
    setFileData(null);
    setFileInfo(null);
    setOutput('');
    setError('');
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

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            加密内容
          </CardTitle>
          <CardDescription>选择输入文本或上传文件进行双层加密</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">文本消息</TabsTrigger>
              <TabsTrigger value="file">文件/图片</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              <Textarea
                placeholder="输入需要加密的文本内容..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[160px] resize-y font-mono text-sm bg-background/50"
              />
            </TabsContent>

            <TabsContent value="file" className="mt-4">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
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
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2 text-foreground">
                      {getFileIcon(fileInfo.type)}
                      <span className="font-medium">{fileInfo.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(fileInfo.size)}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      点击或拖拽文件到此处上传
                    </p>
                    <p className="text-xs text-muted-foreground/70">
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
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            双层加密密钥
          </CardTitle>
          <CardDescription>设置两层独立密码，消息将依次使用两个密码加密</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pwd1" className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">第一层</Badge>
              外层加密密码
            </Label>
            <div className="relative">
              <Input
                id="pwd1"
                type={showPassword1 ? 'text' : 'password'}
                placeholder="输入第一层加密密码..."
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                className="pr-10 bg-background/50"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword1(!showPassword1)}
              >
                {showPassword1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pwd2" className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">第二层</Badge>
              内层加密密码
            </Label>
            <div className="relative">
              <Input
                id="pwd2"
                type={showPassword2 ? 'text' : 'password'}
                placeholder="输入第二层加密密码..."
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="pr-10 bg-background/50"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword2(!showPassword2)}
              >
                {showPassword2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disguise Options */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            伪装方式
          </CardTitle>
          <CardDescription>选择密文的伪装形式，使其看起来像无害内容</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={disguiseMode} onValueChange={setDisguiseMode}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="选择伪装方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classical">
                <div className="flex items-center gap-2">
                  <span>古典文书</span>
                  <span className="text-xs text-muted-foreground">- 伪装为文言文风格</span>
                </div>
              </SelectItem>
              <SelectItem value="config">
                <div className="flex items-center gap-2">
                  <span>配置文件</span>
                  <span className="text-xs text-muted-foreground">- 伪装为系统配置</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleEncrypt}
          disabled={isProcessing}
          className="flex-1 h-12 text-base font-medium"
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
          className="h-12 px-6"
        >
          清空
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Output Section */}
      {output && (
        <>
          <Separator />
          <Card className="border-primary/20 bg-primary/5 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  伪装结果
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-3 w-3 mr-1 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copied ? '已复制' : '复制'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-3 w-3 mr-1" />
                    下载
                  </Button>
                </div>
              </div>
              <CardDescription>以下文本可直接发送给接收方，对方使用解密功能即可还原</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-background/80 border border-border/50 max-h-[300px] overflow-y-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all text-foreground/90">
                  {output}
                </pre>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {inputMode === 'text' ? '文本' : '文件'}
                </Badge>
                <Badge variant="secondary" className="text-xs">双层加密</Badge>
                <Badge variant="secondary" className="text-xs">
                  {disguiseMode === 'classical' ? '古典文书伪装' : '配置文件伪装'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
