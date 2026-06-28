/**
 * Disguise module - Zero-width character steganography
 * 
 * Embeds encrypted data as invisible zero-width Unicode characters
 * within natural-looking cover text. The output is indistinguishable
 * from normal text in any messaging app, email, or document.
 */

// Zero-width characters for binary encoding (2 bits each)
const ZW_CHARS = [
  '\u200B', // Zero-width space → 00
  '\u200C', // Zero-width non-joiner → 01
  '\u200D', // Zero-width joiner → 10
  '\uFEFF', // Zero-width no-break space → 11
];

const ZW_SET = new Set(ZW_CHARS);

// Magic marker to identify hidden data
const ZW_MAGIC = '\u200B\uFEFF\u200D\u200C';

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
 * Convert bytes to zero-width character string with header
 */
function bytesToZeroWidth(data: Uint8Array): string {
  let result = ZW_MAGIC;
  
  // Encode data length as 4 bytes (big-endian 32-bit)
  const len = data.length;
  result += byteToZW((len >> 24) & 0xFF);
  result += byteToZW((len >> 16) & 0xFF);
  result += byteToZW((len >> 8) & 0xFF);
  result += byteToZW(len & 0xFF);
  
  // Encode data bytes
  for (let i = 0; i < data.length; i++) {
    result += byteToZW(data[i]);
  }
  
  return result;
}

/**
 * Extract and decode zero-width data from text
 */
function zeroWidthToBytes(text: string): Uint8Array | null {
  // Collect all zero-width characters in order
  const zwSeq: number[] = []; // store indices into ZW_CHARS
  for (const char of text) {
    const idx = ZW_CHARS.indexOf(char);
    if (idx !== -1) {
      zwSeq.push(idx);
    }
  }
  
  if (zwSeq.length < 20) return null; // minimum: 4 magic + 16 length
  
  // Find magic marker: indices [0, 3, 2, 1]
  let magicPos = -1;
  for (let i = 0; i <= zwSeq.length - 4; i++) {
    if (zwSeq[i] === 0 && zwSeq[i+1] === 3 && zwSeq[i+2] === 2 && zwSeq[i+3] === 1) {
      magicPos = i;
      break;
    }
  }
  if (magicPos === -1) return null;
  
  // Read length (4 bytes = 16 ZW chars after magic)
  const lenStart = magicPos + 4;
  if (zwSeq.length < lenStart + 16) return null;
  
  let dataLen = 0;
  for (let i = 0; i < 4; i++) {
    let byte = 0;
    for (let j = 0; j < 4; j++) {
      byte = (byte << 2) | zwSeq[lenStart + i * 4 + j];
    }
    dataLen = (dataLen << 8) | byte;
  }
  
  // Safety checks
  if (dataLen <= 0 || dataLen > 10 * 1024 * 1024) return null;
  
  const payloadStart = lenStart + 16;
  if (zwSeq.length < payloadStart + dataLen * 4) return null;
  
  // Decode data
  const result = new Uint8Array(dataLen);
  for (let i = 0; i < dataLen; i++) {
    let byte = 0;
    for (let j = 0; j < 4; j++) {
      byte = (byte << 2) | zwSeq[payloadStart + i * 4 + j];
    }
    result[i] = byte;
  }
  
  return result;
}

// ============================================================
// Cover text templates
// ============================================================

const COVER_TEXTS: Record<string, string[]> = {
  chat: [
    '吃了，确实很好吃，下次我们可以再去。最近工作挺忙的，不过周末终于可以放松一下了。对了，你上次说的那个事情我想了想，觉得还是可以尝试一下的。毕竟机会难得，错过了可能就没有了。我这边没什么问题，主要就是时间上需要协调一下。你看下周什么时候方便，我们找个时间详细聊聊？',
    '今天天气还不错，早上出门的时候阳光挺好的。上午在公司忙了一阵，中午跟同事去楼下吃了个饭。下午继续干活，开了个会讨论下个季度的计划。下班后去超市买了点水果，苹果和香蕉。晚上回到家随便做了点吃的，看了会儿手机就准备休息了。明天还得早起，希望天气能一直这么好。',
    '跟你分享一下我今天遇到的事情。早上坐地铁的时候差点坐过站，幸好反应快跳下去了。到公司发现忘带工牌了，又跑回去拿。中午吃饭的时候碰到好久没见的朋友，聊了一会儿。下午工作还算顺利，把拖了几天的事情终于搞定了。晚上打算早点休息，养足精神明天继续加油。',
    '周末带家人去了趟公园，天气特别舒服，不冷也不热的。孩子在草地上跑来跑去的，玩得特别开心。我们在湖边坐了会儿，看了看风景，感觉特别放松。中午在公园附近的农家乐吃了饭，菜很新鲜，味道也不错。回来的路上买了些花，准备放家里装饰一下。这种日子虽然简单，但是很幸福。',
    '最近一直在追那个新出的电视剧，剧情还挺好看的，演员演技也在线。昨天跟朋友约了周末一起去看电影，听说最近上了几部不错的片子。你上次推荐的那家餐厅我去吃了，确实很好吃。最近工作挺忙的，不过周末终于可以放松一下了。你有什么好的推荐吗？',
  ],
  note: [
    '购物清单：鸡蛋一盒、牛奶两瓶、全麦面包一袋、西红柿四个、黄瓜两根、土豆三个、洋葱一个、生姜一块、大蒜两头、生抽一瓶、食盐一袋、洗洁精一瓶、垃圾袋两卷、抽纸三包。记得看看有没有打折的，如果有机蔬菜新鲜的话也可以买一些。另外家里的洗衣液快用完了，这次也顺便带上。回来之后把冰箱整理一下，过期的东西扔掉。',
    '本周工作安排：周一上午部门例会，下午整理上月数据报告；周二与客户对接项目需求，准备演示材料；周三团队内部培训，分享新技术方案；周四完成项目阶段性总结文档，提交审核；周五上午处理遗留问题，下午自由安排。注意事项：记得提前预约周三的会议室，培训材料周二晚上前发给大家审阅。',
    '旅行计划：目的地初步定在云南大理，预计去五天四晚。机票已经看好了，下个月中旬的价格比较合适。住宿打算订古城附近的民宿，评价都不错。行程方面，第一天到大理古城逛逛，第二天去洱海环湖，第三天爬苍山，第四天去喜洲古镇和双廊，第五天返程。需要带的东西：防晒霜、墨镜、薄外套、充电宝、相机。',
    '读书笔记：这本书的核心观点是关于习惯养成的科学方法。作者认为，习惯的形成分为四个步骤：提示、渴望、响应和奖励。要养成好习惯，需要让提示显而易见、让过程有吸引力、让行动简便易行、让结果令人愉悦。反之，要戒掉坏习惯则需要反向操作。书中还提到了环境设计的重要性，通过改变周围环境来促进好习惯的形成。',
    '会议纪要：今天下午三点召开了项目推进会议，参会人员包括产品、开发、测试各组负责人。会议主要内容如下：一、产品组确认了新版本的功能清单，预计下周完成原型设计；二、开发组反馈了当前技术方案的几个风险点，需要进一步评估；三、测试组提出了自动化测试覆盖率的问题，建议增加资源投入。下次会议定于下周三同一时间。',
  ],
  diary: [
    '三月十五号，星期五，天气晴。今天早上醒来的时候窗外阳光已经很好了，照在床上一片温暖。起床后做了简单的早餐，一杯牛奶加两片吐司。出门的时候温度刚刚好，穿了一件薄外套就够了。上班路上听了一期播客，讲的是关于时间管理的方法，有些观点挺有启发的。中午休息的时候在楼下花园走了走，樱花开了，很漂亮。',
    '今天做得很成功的一道菜是红烧牛腩。按照网上的教程一步步来，先把牛腩焯水去腥，然后用冰糖炒色，加入各种调料慢炖两个小时。最后收汁的时候加了点土豆和胡萝卜，味道特别好。下次可以再做，可以试试加点八角和桂皮，味道应该会更香。做饭这种事情真的是熟能生巧，多练几次就好了。',
    '春天来了，小区里的花陆续都开了。今天早上跑步的时候注意到路边的玉兰花开得正盛，白色的花瓣在阳光下特别好看。跑完步在楼下坐了会儿，晒晒太阳，感觉整个人都精神了。最近坚持跑步已经一个月了，体能确实有提升，之前跑三公里就喘，现在五公里都很轻松。继续坚持下去，争取年底前能跑一次半马。',
    '记录一下今天的想法。最近一直在思考未来的方向，觉得应该在技术深度上多下功夫。现在做的事情虽然面广，但缺乏核心竞争力。打算每天抽一个小时来学习算法和系统设计，坚持半年看看效果。另外也想开始写技术博客，把学到的东西整理出来分享。不知道能不能坚持下去，但至少先试试看吧。',
    '今天整理了一下房间，扔掉了不少没用的东西。衣柜里好几件衣服都是一两年没穿过的，全部清理出来了。书架上也整理了一遍，把看过的书分类放好。收拾完之后感觉空间大了很多，心情也好了。断舍离果然是有道理的，东西少了，生活反而更清爽。以后要养成定期整理的习惯，每个月清理一次。',
  ],
  message: [
    '您好，关于您咨询的产品问题，这边给您回复一下：首先，您反馈的使用异常我们已经收到，技术团队正在排查中，预计两个工作日内给出解决方案。其次，关于您提到的功能建议，我们已经记录并转交给产品团队评估。最后，您的会员权益已延期一个月作为补偿，请查收确认。如有其他问题欢迎随时联系我们客服团队。',
    '通知：各位同事，本月团建活动定于下周六举行。活动地点选在了郊外的拓展基地，包含户外拓展和烧烤环节。请大家穿着运动服装，做好防晒准备。当天早上八点在集合出发，预计下午五点返回。如有特殊情况不能参加的，请提前向部门负责人报备。详细安排见附件文档，请大家提前查阅做好准备。',
    '亲，快递已经发了哦，大概两三天能到。这次给你寄了一些家乡的特产，有手工做的糕点和茶叶，你尝尝看喜不喜欢。糕点要尽快吃，保质期不长的，放阴凉干燥处就好。茶叶可以放久一些，泡的时候水温不要太高，八九十度就好，这样味道更鲜。吃完了跟我说，我再给你寄。天气变凉了注意保暖。',
    '嗨，最近怎么样？好久没联系了。我这边一切都好，就是工作比较忙。上周项目上线了，加了好几天班，不过总算顺利完成了。这周末打算好好休息一下，可能在家看看电影或者出去走走。你最近有什么新鲜事吗？有空的话我们找个时间聚聚，一起吃个饭聊聊天，好久没见了挺想你的。',
    '收到你的消息了，谢谢提醒。那个文件我已经看过了，没什么问题，可以按这个方案推进。我这边明天会把修改后的版本发给你，你确认一下就可以提交了。另外，上次说的那个合作的事情，我跟领导沟通过了，基本没问题，下周可以安排一次详细的面谈。具体的时间地点我确定了再通知你，你先准备一下相关材料。',
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
 * Encode encrypted data into disguised natural-looking text.
 * Inserts all zero-width chars at a single point in the cover text.
 */
export function encodeDisguised(data: Uint8Array, scene: string = 'chat'): string {
  const zwData = bytesToZeroWidth(data);
  
  // Pick a random cover text
  const templates = COVER_TEXTS[scene] || COVER_TEXTS.chat;
  const coverText = templates[Math.floor(Math.random() * templates.length)];
  
  // Find a good insertion point: after a punctuation mark in the middle portion
  const chars = [...coverText];
  const midStart = Math.floor(chars.length * 0.2);
  const midEnd = Math.floor(chars.length * 0.7);
  
  let insertIdx = -1;
  // Look for punctuation in the middle portion
  const punctChars = new Set(['，', '。', '！', '？', '；', '、', '：']);
  for (let i = midStart; i < midEnd; i++) {
    if (punctChars.has(chars[i])) {
      insertIdx = i + 1;
      break;
    }
  }
  
  // Fallback: insert after the first character
  if (insertIdx === -1) {
    insertIdx = Math.floor(chars.length / 2);
  }
  
  // Build result: text before + ZW data + text after
  const before = chars.slice(0, insertIdx).join('');
  const after = chars.slice(insertIdx).join('');
  
  return before + zwData + after;
}

/**
 * Decode disguised text back to encrypted data.
 */
export function decodeDisguised(text: string): Uint8Array {
  const result = zeroWidthToBytes(text);
  if (!result) {
    throw new Error('未检测到隐藏数据，请确认文本内容正确且完整');
  }
  return result;
}

/**
 * Check if text contains hidden zero-width data
 */
export function hasHiddenData(text: string): boolean {
  for (const char of text) {
    if (ZW_SET.has(char)) return true;
  }
  return false;
}
