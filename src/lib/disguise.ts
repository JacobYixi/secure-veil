/**
 * Disguise module - Zero-width character steganography
 * 
 * Embeds encrypted data as invisible zero-width Unicode characters
 * within natural-looking cover text. The output is indistinguishable
 * from normal text in any messaging app, email, or document.
 * 
 * Passwords are auto-generated and embedded in the payload,
 * making the message fully self-contained for decryption.
 */

// Zero-width characters for binary encoding (2 bits each)
const ZW_CHARS = [
  '\u200B', // Zero-width space → 00
  '\u200C', // Zero-width non-joiner → 01
  '\u200D', // Zero-width joiner → 10
  '\uFEFF', // Zero-width no-break space → 11
];

// Magic marker: a specific sequence of zero-width chars that signals "this text contains hidden data"
// Using a unique pattern unlikely to appear naturally
const ZW_MAGIC = '\u200B\uFEFF\u200D\u200C'; // 10,11,10,01 = binary marker

/**
 * Convert bytes to zero-width character string
 */
function bytesToZeroWidth(data: Uint8Array): string {
  let result = '';
  
  // Add magic marker first
  result += ZW_MAGIC;
  
  // Encode data length as 4 bytes (32-bit) for reliable extraction
  const len = data.length;
  const lenBytes = new Uint8Array([
    (len >> 24) & 0xFF,
    (len >> 16) & 0xFF,
    (len >> 8) & 0xFF,
    len & 0xFF,
  ]);
  
  // Encode length
  for (const byte of lenBytes) {
    result += byteToZW(byte);
  }
  
  // Encode data
  for (const byte of data) {
    result += byteToZW(byte);
  }
  
  return result;
}

/**
 * Convert a single byte to 4 zero-width characters
 */
function byteToZW(byte: number): string {
  return (
    ZW_CHARS[(byte >> 6) & 0x03] +
    ZW_CHARS[(byte >> 4) & 0x03] +
    ZW_CHARS[(byte >> 2) & 0x03] +
    ZW_CHARS[byte & 0x03]
  );
}

/**
 * Extract zero-width characters from text and decode to bytes
 */
function zeroWidthToBytes(text: string): Uint8Array | null {
  // Extract all zero-width characters
  const zwSequence: string[] = [];
  for (const char of text) {
    if (ZW_CHARS.includes(char)) {
      zwSequence.push(char);
    }
  }
  
  if (zwSequence.length === 0) return null;
  
  // Find magic marker
  const magicCodes = [0, 3, 2, 1]; // indices in ZW_CHARS for the magic pattern
  let magicIdx = -1;
  
  for (let i = 0; i <= zwSequence.length - 4; i++) {
    let match = true;
    for (let j = 0; j < 4; j++) {
      if (ZW_CHARS.indexOf(zwSequence[i + j]) !== magicCodes[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      magicIdx = i;
      break;
    }
  }
  
  if (magicIdx === -1) return null;
  
  // Skip magic (4 chars) and read length (16 chars = 4 bytes)
  const dataStart = magicIdx + 4;
  if (zwSequence.length < dataStart + 16) return null;
  
  // Decode length
  let dataLen = 0;
  for (let i = 0; i < 4; i++) {
    let byte = 0;
    for (let j = 0; j < 4; j++) {
      const charIdx = ZW_CHARS.indexOf(zwSequence[dataStart + i * 4 + j]);
      byte = (byte << 2) | charIdx;
    }
    dataLen = (dataLen << 8) | byte;
  }
  
  // Validate length
  const expectedTotalChars = dataStart + 16 + dataLen * 4;
  if (zwSequence.length < expectedTotalChars) return null;
  if (dataLen > 10 * 1024 * 1024) return null; // 10MB safety limit
  
  // Decode data
  const result = new Uint8Array(dataLen);
  const payloadStart = dataStart + 16;
  
  for (let i = 0; i < dataLen; i++) {
    let byte = 0;
    for (let j = 0; j < 4; j++) {
      const charIdx = ZW_CHARS.indexOf(zwSequence[payloadStart + i * 4 + j]);
      byte = (byte << 2) | charIdx;
    }
    result[i] = byte;
  }
  
  return result;
}

// ============================================================
// Cover text templates - natural-looking Chinese text
// ============================================================

const COVER_TEMPLATES: Record<string, string[]> = {
  chat: [
    '今天天气还不错，早上出门的时候阳光挺好的。上午在公司忙了一阵，中午跟同事去楼下吃了个饭，点了一份番茄鸡蛋盖饭，味道还行。下午继续干活，开了个会讨论下个季度的计划。下班后去超市买了点水果，苹果和香蕉。晚上回到家随便做了点吃的，看了会儿手机就准备休息了。明天还得早起，希望天气能一直这么好。',
    '最近一直在追那个新出的电视剧，剧情还挺好看的，演员演技也在线。昨天跟朋友约了周末一起去看电影，听说最近上了几部不错的片子。对了，你上次推荐的那家餐厅我去吃了，确实很好吃，下次我们可以再去。最近工作挺忙的，不过周末终于可以放松一下了。',
    '刚下班回到家，今天真是累坏了。上午开了两个会，下午又赶了一个报告出来。晚饭还没吃呢，打算煮碗面条凑合一下。冰箱里还有昨天买的菜，应该够做一顿的。吃完饭打算早点睡，明天还要去健身房。最近感觉身体状态不太好，得多运动运动。',
    '周末带家人去了趟公园，天气特别舒服，不冷也不热。孩子在草地上跑来跑去的，玩得特别开心。我们在湖边坐了会儿，看了看风景，感觉特别放松。中午在公园附近的农家乐吃了饭，菜很新鲜。回来的路上买了些花，准备放家里装饰一下。这种日子虽然简单，但是很幸福。',
    '跟你分享一下我今天遇到的事情。早上坐地铁的时候差点坐过站，幸好反应快跳下去了。到公司发现忘带工牌了，又跑回去拿。中午吃饭的时候碰到好久没见的朋友，聊了一会儿。下午工作还算顺利，把拖了几天的事情终于搞定了。晚上打算早点休息，养足精神明天继续加油。',
  ],
  note: [
    '购物清单：鸡蛋一盒、牛奶两瓶、全麦面包一袋、西红柿四个、黄瓜两根、土豆三个、洋葱一个、生姜一块、大蒜两头、生抽一瓶、食盐一袋、洗洁精一瓶、垃圾袋两卷、抽纸三包。记得看看有没有打折的，如果有机蔬菜新鲜的话也可以买一些。另外家里的洗衣液快用完了，这次也顺便带上。',
    '本周工作安排：周一上午部门例会，下午整理上月数据报告；周二与客户对接项目需求，准备演示材料；周三团队内部培训，分享新技术方案；周四完成项目阶段性总结文档，提交审核；周五上午处理遗留问题，下午自由安排。注意事项：记得提前预约周三的会议室，培训材料周二晚上前发给大家审阅。',
    '读书笔记整理：这本书的核心观点是关于习惯养成的科学方法。作者认为，习惯的形成分为四个步骤：提示、渴望、响应和奖励。要养成好习惯，需要让提示显而易见、让过程有吸引力、让行动简便易行、让结果令人愉悦。反之，要戒掉坏习惯则需要反向操作。书中还提到了环境设计的重要性，通过改变周围环境来促进好习惯的形成。',
    '旅行计划备忘：目的地初步定在云南大理，预计去五天四晚。机票已经看好了，下个月中旬的价格比较合适。住宿打算订古城附近的民宿，评价都不错。行程方面，第一天到大理古城逛逛，第二天去洱海环湖，第三天爬苍山，第四天去喜洲古镇和双廊，第五天返程。需要带的东西：防晒霜、墨镜、薄外套、充电宝、相机。',
    '会议纪要：今天下午三点召开了项目推进会议，参会人员包括产品、开发、测试各组负责人。会议主要内容如下：一、产品组确认了新版本的功能清单，预计下周完成原型设计；二、开发组反馈了当前技术方案的几个风险点，需要进一步评估；三、测试组提出了自动化测试覆盖率的问题，建议增加资源投入。下次会议定于下周三同一时间，各组提前准备进展汇报材料。',
  ],
  diary: [
    '三月十五号，星期五，天气晴。今天早上醒来的时候窗外阳光已经很好了，照在床上一片温暖。起床后做了简单的早餐，一杯牛奶加两片吐司。出门的时候温度刚刚好，穿了一件薄外套就够了。上班路上听了一期播客，讲的是关于时间管理的方法，有些观点挺有启发的。中午休息的时候在楼下花园走了走，樱花开了，很漂亮。',
    '记录一下今天的想法。最近一直在思考未来的方向，觉得应该在技术深度上多下功夫。现在做的事情虽然面广，但缺乏核心竞争力。打算每天抽一个小时来学习算法和系统设计，坚持半年看看效果。另外也想开始写技术博客，把学到的东西整理出来分享。不知道能不能坚持下去，但至少先试试看。',
    '今天的晚餐做得很成功。尝试了一道新菜，红烧牛腩，按照网上的教程一步步来。先把牛腩焯水去腥，然后用冰糖炒色，加入各种调料慢炖两个小时。最后收汁的时候加了点土豆和胡萝卜，味道特别好。下次可以再做，可以试试加点八角和桂皮，味道应该会更香。',
    '春天来了，小区里的花陆续都开了。今天早上跑步的时候注意到路边的玉兰花开得正盛，白色的花瓣在阳光下特别好看。跑完步在楼下坐了会儿，晒晒太阳，感觉整个人都精神了。最近坚持跑步已经一个月了，体能确实有提升，之前跑三公里就喘，现在五公里都很轻松。继续坚持下去。',
    '今天整理了一下房间，扔掉了不少没用的东西。衣柜里好几件衣服都是一两年没穿过的，全部清理出来了。书架上也整理了一遍，把看过的书分类放好。收拾完之后感觉空间大了很多，心情也好了。断舍离果然是有道理的，东西少了，生活反而更清爽。以后要养成定期整理的习惯。',
  ],
  message: [
    '嗨，最近怎么样？好久没联系了。我这边一切都好，就是工作比较忙。上周项目上线了，加了好几天班，不过总算顺利完成了。这周末打算好好休息一下，可能在家看看电影或者出去走走。你最近有什么新鲜事吗？有空的话我们找个时间聚聚，一起吃个饭聊聊天。',
    '收到你的消息了，谢谢提醒。那个文件我已经看过了，没什么问题，可以按这个方案推进。我这边明天会把修改后的版本发给你，你确认一下就可以提交了。另外，上次说的那个合作的事情，我跟领导沟通过了，基本没问题，下周可以安排一次详细的面谈。具体的时间地点我确定了再通知你。',
    '亲，快递已经发了哦，大概两三天能到。这次给你寄了一些家乡的特产，有手工做的糕点和茶叶，你尝尝看喜不喜欢。糕点要尽快吃，保质期不长的。茶叶可以放久一些，泡的时候水温不要太高，八九十度就好。吃完了跟我说，我再给你寄。天气变凉了注意保暖。',
    '通知：各位同事，本月团建活动定于下周六举行。活动地点选在了郊外的拓展基地，包含户外拓展和烧烤环节。请大家穿着运动服装，做好防晒准备。当天早上八点在集合出发，预计下午五点返回。如有特殊情况不能参加的，请提前向部门负责人报备。详细安排见附件。',
    '你好，关于您咨询的产品问题，这边给您回复一下：首先，您反馈的使用异常我们已经收到，技术团队正在排查中，预计两个工作日内给出解决方案。其次，关于您提到的功能建议，我们已经记录并转交给产品团队评估。最后，您的会员权益已延期一个月作为补偿，请查收。如有其他问题欢迎随时联系。',
  ],
};

/**
 * Get available disguise scene options
 */
export function getDisguiseScenes(): Array<{ id: string; name: string; description: string }> {
  return [
    { id: 'chat', name: '日常聊天', description: '看起来像一条普通的聊天消息' },
    { id: 'note', name: '备忘清单', description: '看起来像购物清单或工作笔记' },
    { id: 'diary', name: '生活日记', description: '看起来像一篇个人日记或随笔' },
    { id: 'message', name: '通知消息', description: '看起来像正式的通知或回复消息' },
  ];
}

/**
 * Encode encrypted data into a disguised natural-looking text.
 * The data (including auto-generated passwords) is hidden as
 * zero-width characters within the cover text.
 */
export function encodeDisguised(data: Uint8Array, scene: string = 'chat'): string {
  // Convert data to zero-width characters
  const zwData = bytesToZeroWidth(data);
  
  // Get cover text - pick a random template from the scene
  const templates = COVER_TEMPLATES[scene] || COVER_TEMPLATES.chat;
  const coverText = templates[Math.floor(Math.random() * templates.length)];
  
  // Calculate how many characters we need for embedding
  // Each zero-width char goes between visible chars
  const visibleChars = [...coverText];
  const zwChars = [...zwData];
  
  // We need to distribute zero-width chars among visible chars
  // Strategy: insert ZW chars at regular intervals between visible characters
  if (zwChars.length === 0) return coverText;
  
  // Calculate interval: spread ZW chars evenly across the text
  const interval = Math.max(1, Math.floor(visibleChars.length / (zwChars.length + 1)));
  
  let result = '';
  let zwIdx = 0;
  
  for (let i = 0; i < visibleChars.length; i++) {
    result += visibleChars[i];
    
    // Insert zero-width chars after certain visible characters
    // Skip punctuation to look more natural
    const currentChar = visibleChars[i];
    const isPunctuation = /[，。！？、；：""''（）《》\s]/.test(currentChar);
    
    if (!isPunctuation && zwIdx < zwChars.length && (i + 1) % interval === 0) {
      // Insert one or more ZW chars at this position
      const charsToInsert = Math.min(
        Math.ceil(zwChars.length / Math.max(1, Math.floor(visibleChars.length / interval) - Math.floor(i / interval))),
        zwChars.length - zwIdx
      );
      for (let j = 0; j < charsToInsert && zwIdx < zwChars.length; j++) {
        result += zwChars[zwIdx];
        zwIdx++;
      }
    }
  }
  
  // If there are remaining ZW chars, append them at the end
  while (zwIdx < zwChars.length) {
    result += zwChars[zwIdx];
    zwIdx++;
  }
  
  return result;
}

/**
 * Decode disguised text back to encrypted data.
 * Automatically extracts zero-width characters and decodes them.
 */
export function decodeDisguised(text: string): Uint8Array {
  const result = zeroWidthToBytes(text);
  if (!result) {
    throw new Error('未检测到隐藏数据，请确认文本内容正确');
  }
  return result;
}

/**
 * Check if text contains hidden zero-width data
 */
export function hasHiddenData(text: string): boolean {
  // Quick check: does the text contain any zero-width characters?
  for (const char of text) {
    if (ZW_CHARS.includes(char)) return true;
  }
  return false;
}
