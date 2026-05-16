/**
 * 买马牌面解析器
 * 
 * 规则：
 * - 字牌：东南西北 -> 1,2,3,4；中发白 -> 1,2,3
 * - 数字牌：提取数字（如 1万=1, 5筒=5, 9条=9）
 * - 纯数字：直接当作牌面数字（如输入 5 就当 5）
 * 
 * 输入示例："1万,东,5筒,中,白,9条"
 */

const WIND_MAP = {
  '东': 1, '南': 2, '西': 3, '北': 4
};

const WORD_MAP = {
  '中': 1, '发': 2, '白': 3
};

const VALID_SUITS = ['万', '条', '筒', '萬', '索', '饼'];

/**
 * 解析单个牌面字符串，返回数字
 * @param {string} token - 如 "1万", "东", "5"
 * @returns {number|null} 解析出的数字，无效返回null
 */
function parseTile(token) {
  token = token.trim();
  if (!token) return null;

  // 1. 字牌（风牌）
  if (WIND_MAP[token] !== undefined) {
    return {
      number: WIND_MAP[token],
      display: token,
      type: '风牌'
    };
  }

  // 2. 字牌（箭牌）
  if (WORD_MAP[token] !== undefined) {
    return {
      number: WORD_MAP[token],
      display: token,
      type: '箭牌'
    };
  }

  // 3. 数字牌（如 1万, 5筒, 9条）
  for (const suit of VALID_SUITS) {
    if (token.endsWith(suit)) {
      const numStr = token.slice(0, token.length - suit.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        return {
          number: num,
          display: token,
          type: '数牌'
        };
      }
    }
  }

  // 4. 纯数字（直接当作牌面数字）
  const pureNum = parseInt(token, 10);
  if (!isNaN(pureNum) && pureNum >= 1 && pureNum <= 9) {
    return {
      number: pureNum,
      display: token,
      type: '数字'
    };
  }

  return null;
}

/**
 * 解析买马输入字符串
 * @param {string} input - 用户输入，如 "1万,东,5筒,中" 或 "1234" 或 "1,2,3,4"
 * @returns {Object} { ok, tiles, error }
 *   - tiles: [{ number, display, type }]
 */
function parseHorseInput(input) {
  const raw = String(input || '').trim();

  if (!raw) {
    return { ok: true, tiles: [] };
  }

  // 先尝试按分隔符切分
  let tokens = raw.split(/[,，、;；|\s]+/).filter(t => t.trim());
  
  const tiles = [];
  const invalidTokens = [];

  for (const token of tokens) {
    const result = parseTile(token);
    if (result) {
      tiles.push(result);
    } else if (/^\d{2,}$/.test(token)) {
      // 多位连续数字（如 1234），拆成单个数字
      for (const ch of token) {
        const num = parseInt(ch, 10);
        if (num >= 1 && num <= 9) {
          tiles.push({
            number: num,
            display: ch,
            type: '数字'
          });
        } else {
          invalidTokens.push(ch);
        }
      }
    } else {
      invalidTokens.push(token);
    }
  }

  if (invalidTokens.length > 0) {
    return {
      ok: false,
      tiles: [],
      error: `无法识别的牌面：${invalidTokens.join('、')}`
    };
  }

  return { ok: true, tiles };
}

module.exports = {
  parseHorseInput,
  parseTile
};
