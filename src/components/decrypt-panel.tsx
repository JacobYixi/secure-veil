'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import {
  selfContainedDecrypt,
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

export function DecryptPanel() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DecryptResult | null>(null);
  const [hasData, setHasData] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const prevInputRef = useRef('');

  // Auto-detect hidden data as user pastes
  useEffect(() => {
    if (input !== prevInputRef.current) {
      prevInputRef.current = input;
      setHasData(hasHiddenData(input));
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
      // Step 1: Extract hidden data from the text
      const hiddenData = decodeDisguised(input);

      if (hiddenData.length === 0) {
        throw new Error('提取的数据为空，内容可能已损坏');
      }

      // Step 2: Try self-contained decrypt first (auto-password mode)
      try {
        const { data, isFile } = await selfContainedDecrypt(hiddenData);

        if (isFile) {
          // Parse file metadata
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

          // Generate image preview
          if (meta.type?.startsWith('image/')) {
            const blob = new Blob([fileData], { type: meta.type });
            setImagePreviewUrl(URL.createObjectURL(blob));
          }
        } else {
          const decoder = new TextDecoder();
          const text = decoder.decode(data);
          setResult({ type: 'text', text });
        }
        return;
      } catch {
        // Not self-contained, try manual password mode
        // In this case we can't decrypt without passwords
        throw new Error('解密失败：此消息使用手动密码模式加密，需要对应的密码才能解密。请使用加密时的密码。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解密失败，请检查内容是否完整');
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
              className="min-h-[160px] sm:min-h-[200px] resize-y text-sm bg-background/50 pr-10"
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
                  <span>已检测到隐藏数据，可以解密</span>
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

      {/* Decrypt Button */}
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
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
          系统会自动从伪装文本中提取隐藏数据并解密，无需输入任何密码。
          支持自动密码模式和文本/文件/图片的解密还原。
        </p>
      </div>
    </div>
  );
}
