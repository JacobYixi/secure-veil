'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Unlock,
  Eye,
  EyeOff,
  Shield,
  Download,
  FileText,
  Image,
  File,
  AlertCircle,
} from 'lucide-react';
import {
  decryptText,
  decryptFile,
} from '@/lib/crypto';
import {
  decodeFromDisguise,
  decodeFromConfig,
  isDisguisedContent,
} from '@/lib/disguise';

type DecryptResultType = 'text' | 'file' | 'unknown';

interface DecryptResult {
  type: DecryptResultType;
  text?: string;
  fileName?: string;
  fileType?: string;
  fileData?: ArrayBuffer;
}

export function DecryptPanel() {
  const [input, setInput] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [disguiseMode, setDisguiseMode] = useState('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DecryptResult | null>(null);

  const handleDecrypt = async () => {
    setError('');
    setResult(null);

    if (!input.trim()) {
      setError('请粘贴需要解密的伪装内容');
      return;
    }
    if (!password1 || !password2) {
      setError('请输入两层解密密钥');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Extract encrypted data from disguise
      let encryptedData: Uint8Array;
      const mode = disguiseMode === 'auto' ? detectMode(input) : disguiseMode;

      if (mode === 'classical') {
        encryptedData = decodeFromDisguise(input);
      } else if (mode === 'config') {
        encryptedData = decodeFromConfig(input);
      } else {
        // Try both
        try {
          encryptedData = decodeFromDisguise(input);
        } catch {
          encryptedData = decodeFromConfig(input);
        }
      }

      if (encryptedData.length === 0) {
        throw new Error('无法从伪装内容中提取有效数据');
      }

      // Step 2: Double decrypt
      // Try as text first
      try {
        const text = await decryptText(encryptedData, password1, password2);
        setResult({ type: 'text', text });
        return;
      } catch {
        // Not text, try as file
      }

      // Try as file
      try {
        const file = await decryptFile(encryptedData, password1, password2);
        setResult({
          type: 'file',
          fileName: file.name,
          fileType: file.type,
          fileData: file.data,
        });
        return;
      } catch {
        throw new Error('解密失败，请检查密码是否正确');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解密失败，请检查输入内容和密码');
    } finally {
      setIsProcessing(false);
    }
  };

  const detectMode = (text: string): string => {
    if (isDisguisedContent(text)) return 'classical';
    if (text.includes('[runtime]') || text.includes('param_')) return 'config';
    return 'classical'; // default
  };

  const handleDownloadFile = () => {
    if (!result || result.type !== 'file' || !result.fileData) return;

    const blob = new Blob([result.fileData], { type: result.fileType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName || 'decrypted_file';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async () => {
    if (!result || result.type !== 'text' || !result.text) return;
    await navigator.clipboard.writeText(result.text);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (type.startsWith('text/')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderImagePreview = useCallback(() => {
    if (!result || result.type !== 'file' || !result.fileData) return null;
    if (!result.fileType?.startsWith('image/')) return null;

    const blob = new Blob([result.fileData], { type: result.fileType });
    const url = URL.createObjectURL(blob);

    return (
      <div className="mt-4">
        <img
          src={url}
          alt={result.fileName || 'Decrypted image'}
          className="max-w-full max-h-[400px] rounded-lg border border-border/50"
          onLoad={() => URL.revokeObjectURL(url)}
        />
      </div>
    );
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            伪装内容
          </CardTitle>
          <CardDescription>粘贴接收到的伪装文本，系统将自动识别伪装方式并提取密文</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="粘贴伪装内容（古典文书或配置文件格式）..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[200px] resize-y font-mono text-sm bg-background/50"
          />
        </CardContent>
      </Card>

      {/* Disguise Detection */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" />
            伪装识别
          </CardTitle>
          <CardDescription>选择伪装方式或让系统自动检测</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={disguiseMode} onValueChange={setDisguiseMode}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="选择伪装方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动检测</SelectItem>
              <SelectItem value="classical">古典文书</SelectItem>
              <SelectItem value="config">配置文件</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            解密密钥
          </CardTitle>
          <CardDescription>输入与加密时相同的两层密码进行解密</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dpwd1" className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">第一层</Badge>
              外层解密密钥
            </Label>
            <div className="relative">
              <Input
                id="dpwd1"
                type={showPassword1 ? 'text' : 'password'}
                placeholder="输入第一层解密密码..."
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
            <Label htmlFor="dpwd2" className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">第二层</Badge>
              内层解密密钥
            </Label>
            <div className="relative">
              <Input
                id="dpwd2"
                type={showPassword2 ? 'text' : 'password'}
                placeholder="输入第二层解密密码..."
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

      {/* Decrypt Button */}
      <Button
        onClick={handleDecrypt}
        disabled={isProcessing}
        className="w-full h-12 text-base font-medium"
      >
        {isProcessing ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            解密中...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Unlock className="h-4 w-4" />
            解密还原
          </span>
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Section */}
      {result && (
        <Card className="border-green-500/20 bg-green-500/5 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              解密成功
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.type === 'text' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">文本消息</Badge>
                  <Button variant="outline" size="sm" onClick={handleCopyText}>
                    复制文本
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-background/80 border border-border/50">
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">
                    {result.text}
                  </p>
                </div>
              </div>
            )}

            {result.type === 'file' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.fileType && getFileIcon(result.fileType)}
                    <span className="font-medium text-sm">{result.fileName}</span>
                    {result.fileData && (
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(result.fileData.byteLength)}
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadFile}>
                    <Download className="h-3 w-3 mr-1" />
                    下载文件
                  </Button>
                </div>

                {result.fileType?.startsWith('image/') && renderImagePreview()}

                {result.fileType && !result.fileType.startsWith('image/') && (
                  <div className="p-4 rounded-lg bg-background/80 border border-border/50 text-sm text-muted-foreground">
                    文件已解密完成，点击下载按钮保存文件到本地。
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
