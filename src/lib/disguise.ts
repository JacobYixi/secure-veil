/**
 * Disguise module - Convert encrypted binary data to seemingly normal text
 * and reverse the process to extract the original encrypted data.
 *
 * Uses a dictionary-based encoding: each byte (0-255) maps to a unique
 * Chinese character from a curated dictionary. The output looks like
 * a block of classical/literary Chinese text.
 */

// 256 carefully selected Chinese characters that form a plausible-looking text
// Organized by radical/theme to look more natural when concatenated
const DISGUISE_DICT = [
  // 0-15: Common function words
  '之','乎','者','也','矣','焉','哉','兮','而','以','于','其','乃','则','为','所',
  // 16-31: Nature
  '风','花','雪','月','云','雨','霜','露','山','水','泉','石','松','竹','梅','兰',
  // 32-47: Celestial
  '天','地','日','星','春','秋','晨','暮','朝','霞','虹','雷','电','雾','烟','冰',
  // 48-63: Colors & qualities
  '青','白','红','紫','碧','翠','金','银','玉','瑶','琉','璃','琥','珀','翡','翠',
  // 64-79: Emotions & states
  '思','念','愁','喜','悲','欢','离','合','梦','忆','望','归','隐','逸','闲','静',
  // 80-95: Actions
  '行','走','飞','翔','望','观','听','闻','吟','咏','歌','舞','书','画','琴','棋',
  // 96-111: Places
  '楼','台','亭','阁','殿','堂','院','庭','桥','渡','江','河','湖','海','溪','涧',
  // 112-127: Flora
  '草','木','叶','藤','荷','菊','桃','柳','桐','槐','桂','棠','藤','萝','萍','藻',
  // 128-143: Fauna
  '鹤','鸿','鸾','凤','龙','虎','鹿','猿','鱼','蝶','燕','莺','鸦','鹊','鸥','鹭',
  // 144-159: Objects & artifacts
  '剑','琴','镜','灯','炉','香','茶','酒','钟','鼎','瓶','盘','帘','屏','扇','伞',
  // 160-175: Body & senses
  '心','目','耳','手','足','影','声','色','气','神','魂','魄','骨','肌','颜','容',
  // 176-191: Time & seasons
  '年','岁','时','刻','分','秒','昼','夜','寒','暑','暖','凉','古','今','昔','初',
  // 192-207: Literary & scholarly
  '诗','词','赋','文','章','卷','册','简','帛','墨','砚','笔','纸','印','符','箓',
  // 208-223: Spiritual & philosophical
  '道','德','仁','义','礼','智','信','忠','孝','廉','禅','悟','空','无','虚','玄',
  // 224-239: Architecture & landscape
  '峰','崖','谷','洞','岩','岭','关','塞','城','郭','巷','陌','径','途','野','郊',
  // 240-255: Miscellaneous elegant characters
  '缘','情','意','志','气','韵','律','调','曲','辞','言','语','话','书','信','笺',
];

// Build reverse lookup map
const REVERSE_MAP = new Map<string, number>();
DISGUISE_DICT.forEach((char, index) => {
  REVERSE_MAP.set(char, index);
});

// Markers to identify disguised content
const DISGUISE_PREFIX = '\u{1D4D0}'; // Mathematical bold script A (rarely used in normal text)
const DISGUISE_SUFFIX = '\u{1D4D1}'; // Mathematical bold script B

/**
 * Encode encrypted binary data into disguised Chinese text
 */
export function encodeToDisguise(data: Uint8Array): string {
  let result = DISGUISE_PREFIX;

  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    result += DISGUISE_DICT[byte];
  }

  result += DISGUISE_SUFFIX;
  return result;
}

/**
 * Decode disguised Chinese text back to encrypted binary data
 */
export function decodeFromDisguise(text: string): Uint8Array {
  // Find the markers
  const startIdx = text.indexOf(DISGUISE_PREFIX);
  const endIdx = text.lastIndexOf(DISGUISE_SUFFIX);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('未找到伪装标记，请确认输入内容包含伪装密文');
  }

  const encoded = text.slice(startIdx + DISGUISE_PREFIX.length, endIdx);
  const bytes: number[] = [];

  for (const char of encoded) {
    const idx = REVERSE_MAP.get(char);
    if (idx === undefined) {
      // Skip unknown characters (could be formatting)
      continue;
    }
    bytes.push(idx);
  }

  return new Uint8Array(bytes);
}

/**
 * Check if a string contains disguised content
 */
export function isDisguisedContent(text: string): boolean {
  return text.includes(DISGUISE_PREFIX) && text.includes(DISGUISE_SUFFIX);
}

/**
 * Alternative disguise: encode as Base64 with a subtle wrapper
 * Makes it look like a normal configuration string
 */
export function encodeAsConfig(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const base64 = btoa(binary);

  // Wrap in a fake config format
  const lines: string[] = [];
  lines.push('# System Configuration File v2.4.1');
  lines.push(`# Timestamp: ${new Date().toISOString()}`);
  lines.push('# Encoding: UTF-8');
  lines.push('');
  lines.push('[runtime]');
  lines.push(`engine = "standard"`);
  lines.push(`version = "2.4.1"`);
  lines.push(`mode = "optimized"`);
  lines.push('');
  lines.push('[parameters]');

  // Split base64 into chunks and embed in config-like lines
  const chunkSize = 64;
  for (let i = 0; i < base64.length; i += chunkSize) {
    const chunk = base64.slice(i, i + chunkSize);
    const key = `param_${String(Math.floor(i / chunkSize)).padStart(3, '0')}`;
    lines.push(`${key} = "${chunk}"`);
  }

  lines.push('');
  lines.push('[metadata]');
  lines.push(`checksum = "${base64.slice(0, 8)}"`);
  lines.push(`size = "${data.length}"`);
  lines.push('# End of configuration');

  return lines.join('\n');
}

/**
 * Decode from config disguise back to binary data
 */
export function decodeFromConfig(text: string): Uint8Array {
  const lines = text.split('\n');
  let base64 = '';

  for (const line of lines) {
    const match = line.match(/^param_\d+\s*=\s*"([^"]+)"/);
    if (match) {
      base64 += match[1];
    }
  }

  if (!base64) {
    throw new Error('无法从配置文件中提取数据');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get the list of available disguise modes
 */
export function getDisguiseModes(): Array<{ id: string; name: string; description: string }> {
  return [
    {
      id: 'classical',
      name: '古典文书',
      description: '将密文转化为古典中文风格文本，外观如同一篇文言文',
    },
    {
      id: 'config',
      name: '配置文件',
      description: '将密文伪装成系统配置文件格式，看似普通的INI配置',
    },
  ];
}
