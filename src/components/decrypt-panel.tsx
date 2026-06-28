'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Unlock,
  Download,
  FileText,
  Image,
  File,
  AlertCircle,
  Check,
  Sparkles,
  ClipboardPaste,
  Eye,
  EyeOff,
  Shield,
  KeyRound,
} from 'lucide-react';
import {
  selfContainedDecrypt,
  doubleDecrypt,
  decryptFile,
} from '@/lib/crypto';
import {
  decodeDisguised,
  hasHiddenData,
} from '@/lib/disguise';

type DecryptResultType = 'text' | 'file';

interface DecryptResult {
  type: DecryptResultType;
  text?: string;
  fileName?: string;
  fileType?: string;
  fileData?: ArrayBuffer;
}

// Magic header for manual-mode encrypted data: "ENC2" = [0x45, 0x4e, 0x43, 0x32]
const MANUAL_MAGIC = [0x45, 0x4e, 0x43, 0x32];

function isManualMode(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  return data[0] === MANUAL_MAGIC[0] && data[1] === MANUAL_MAGIC[1] &&
         data[2] === MANUAL_MAGIC[2] && data[3] === MANUAL_MAGIC[3];
}

export function DecryptPanel() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DecryptResult | null>(null);
  const [hasData, setHasData] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [extractedData, setExtractedData] = useState<Uint8Array | null>(null);
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const prevInputRef = useRef('');

  // Auto-detect hidden data as user pastes
  useEffect(() => {
    if (input !== prevInputRef.current) {
      prevInputRef.current = input;
      const detected = hasHiddenData(input);
      setHasData(detected);
      if (!detected) {
        setNeedsPassword(false);
        setExtractedData(null);
      }
    }
  }, [input]);

  // Cleanup image preview URL
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch {
      // Clipboard API may not be available
    }
  };

  const handleDecrypt = async () => {
    setError('');
    setResult(null);
    setNeedsPassword(false);
    setExtractedData(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }

    if (!input.trim()) {
      setError('请粘贴收到的伪装文本');
      return;
    }

    if (!hasHiddenData(input)) {
      setError('未检测到隐藏数据，请确认粘贴的内容完整');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Extract hidden data
      const hiddenData = decodeDisguised(input);

      if (hiddenData.length === 0) {
        throw new Error('提取的数据为空，内容可能已损坏');
      }

      // Step 2: Check if it's self-contained (auto-password) or manual mode
      if (isManualMode(hiddenData)) {
        // Manual mode - need passwords
        setExtractedData(hiddenData);
        setNeedsPassword(true);
        setIsProcessing(false);
        return;
      }

      // Step 3: Self-contained decrypt (auto-password mode)
      try {
        const { data, isFile } = await selfContainedDecrypt(hiddenData);

        if (isFile) {
          const view = new Uint8Array(data);
          const metaLen = new Uint32Array(view.slice(0, 4).buffer)[0];
          const decoder = new TextDecoder();
          const meta = JSON.parse(decoder.decode(view.slice(4, 4 + metaLen)));
          const fileData = view.slice(4 + metaLen);

          setResult({
            type: 'file',
            fileName: meta.name,
            fileType: meta.type,
            fileData: fileData.buffer,
          });

          if (meta.type?.startsWith('image/')) {
            const blob = new Blob([fileData], { type: meta.type });
            setImagePreviewUrl(URL.createObjectURL(blob));
          }
        } else {
          const decoder = new TextDecoder();
          const text = decoder.decode(data);
          setResult({ type: 'text', text });
        }
      } catch {
        throw new Error('解密失败，数据格式可能不匹配');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解密失败，请检查内容是否完整');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualDecrypt = async () => {
    setError('');
    setResult(null);

    if (!password1 || !password2) {
      setError('请输入两层解密密码');
      return;
    }

    if (!extractedData) {
      setError('数据异常，请重新粘贴密文');
      return;
    }

    setIsProcessing(true);

    try {
      // Try as text first
      try {
        const decrypted = await doubleDecrypt(extractedData, password1, password2);
        const decoder = new TextDecoder();
        const text = decoder.decode(decrypted);
        setResult({ type: 'text', text });
        setNeedsPassword(false);
        return;
      } catch {
        // Not plain text, try as file
      }

      // Try as file
      try {
        const file = await decryptFile(extractedData, password1, password2);
        setResult({
          type: 'file',
          fileName: file.name,
          fileType: file.type,
          fileData: file.data,
        });

        if (file.type?.startsWith('image/')) {
          const blob = new Blob([file.data], { type: file.type });
          setImagePreviewUrl(URL.createObjectURL(blob));
        }

        setNeedsPassword(false);
      } catch {
        setError('解密失败，请检查密码是否正确');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解密失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadFile = useCallback(() => {
    if (!result || result.type !== 'file' || !result.fileData) return;
    const blob = new Blob([result.fileData], { type: result.fileType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName || 'decrypted_file';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleCopyText = useCallback(async () => {
    if (!result || result.type !== 'text' || !result.text) return;
    await navigator.clipboard.writeText(result.text);
  }, [result]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4 sm:h-5 sm:w-5" />;
    if (type.startsWith('text/')) return <FileText className="h-4 w-4 sm:h-5 sm:w-5" />;
    return <File className="h-4 w-4 sm:h-5 sm:w-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Input Section */}
      <Card className="border-border/40 bg-card/60 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            粘贴密文
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            粘贴收到的伪装文本，系统自动识别并提取隐藏数据
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
          <div className="relative">
            <Textarea
              placeholder="将收到的消息粘贴到这里..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[140px] sm:min-h-[180px] resize-y text-sm bg-background/50 pr-10"
            />
            <button
              onClick={handlePaste}
              className="absolute right-2.5 top-2.5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="从剪贴板粘贴"
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          </div>

          {/* Detection Status */}
          {input && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              hasData
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-muted/50 text-muted-foreground'
            }`}>
              {hasData ? (
                <>
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  <span>已检测到隐藏数据</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>未检测到隐藏数据，请确认内容完整</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Password Section - shown when manual mode detected */}
      {needsPassword && (
        <Card className="border-amber-500/20 bg-amber-500/[0.03] backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <KeyRound className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
              </div>
              需要解密密钥
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              此消息使用了手动密码加密，请输入加密时的两层密码
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mpwd1" className="text-xs sm:text-sm flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">第一层</Badge>
                外层密码
              </Label>
              <div className="relative">
                <Input
                  id="mpwd1"
                  type={showPassword1 ? 'text' : 'password'}
                  placeholder="输入第一层解密密码..."
                  value={password1}
                  onChange={(e) => setPassword1(e.target.value)}
                  className="pr-10 text-sm bg-background/50 h-10 sm:h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword1(!showPassword1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword1 ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mpwd2" className="text-xs sm:text-sm flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">第二层</Badge>
                内层密码
              </Label>
              <div className="relative">
                <Input
                  id="mpwd2"
                  type={showPassword2 ? 'text' : 'password'}
                  placeholder="输入第二层解密密码..."
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="pr-10 text-sm bg-background/50 h-10 sm:h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2(!showPassword2)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword2 ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <Button
              onClick={handleManualDecrypt}
              disabled={isProcessing || !password1 || !password2}
              className="w-full h-10 sm:h-11 text-sm rounded-xl"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  解密中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Unlock className="h-4 w-4" />
                  使用密码解密
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Auto Decrypt Button - only show when not in password mode */}
      {!needsPassword && (
        <Button
          onClick={handleDecrypt}
          disabled={isProcessing || !hasData}
          className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium rounded-xl"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              解密中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Unlock className="h-4 w-4" />
              自动解密
            </span>
          )}
        </Button>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card className="border-green-500/20 bg-green-500/[0.03] backdrop-blur-sm shadow-sm">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              解密成功
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {result.type === 'text' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">文本消息</Badge>
                  <Button variant="outline" size="sm" onClick={handleCopyText} className="h-8 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    复制
                  </Button>
                </div>
                <div className="p-3 sm:p-4 rounded-xl bg-background/80 border border-border/30">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground/85">
                    {result.text}
                  </p>
                </div>
              </div>
            )}

            {result.type === 'file' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {result.fileType && getFileIcon(result.fileType)}
                    <span className="font-medium text-xs sm:text-sm truncate">{result.fileName}</span>
                    {result.fileData && (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                        {formatFileSize(result.fileData.byteLength)}
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadFile} className="h-8 text-xs shrink-0">
                    <Download className="h-3 w-3 mr-1" />
                    下载
                  </Button>
                </div>

                {imagePreviewUrl && (
                  <div className="rounded-xl overflow-hidden border border-border/30">
                    <img
                      src={imagePreviewUrl}
                      alt={result.fileName || '解密图片'}
                      className="max-w-full max-h-[300px] sm:max-h-[400px] w-auto mx-auto object-contain"
                    />
                  </div>
                )}

                {result.fileType && !result.fileType.startsWith('image/') && (
                  <div className="p-3 rounded-xl bg-background/80 border border-border/30 text-xs sm:text-sm text-muted-foreground">
                    文件已解密完成，点击下载按钮保存到本地。
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      {!needsPassword && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
            自动密码模式：系统自动从伪装文本中提取隐藏数据并解密，无需输入密码。
            如果对方使用了手动密码模式，系统会提示你输入密码。
          </p>
        </div>
      )}
    </div>
  );
}
