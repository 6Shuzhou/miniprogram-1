/**
 * 地方麻将番数计算引擎
 * 
 * 规则：
 * 1. 自摸：有一番/两番/四番/八番，赢家赢其他三家
 * 2. 点炮：有四番/八番，赢家只赢点炮者
 * 3. 杠（无论是否和牌都结算）：
 *    - 直杠：点杠者给2番，其他两人各给1番
 *    - 加杠：其他三人各给1番
 *    - 暗杠：其他三人各给2番
 * 4. 买马：第五人，每张马牌按数字买到对应玩家，第五人输赢 = 所有买到玩家的输赢之和
 * 
 * 牌面数字映射：
 * - 东南西北 -> 1,2,3,4
 * - 中发白 -> 1,2,3
 * - 万条筒 1-9 -> 对应数字
 * 
 * 买到谁的算法：数字从庄家开始数，庄家=1，下家=2，...
 * 玩家顺序固定：东->南->西->北
 */

// 玩家固定顺序
const PLAYERS = ['东', '南', '西', '北'];
const INDEX = { '东': 0, '南': 1, '西': 2, '北': 3 };

/**
 * 获取某张牌的数字
 * @param {string} tile - 牌面，如 '1万', '东', '中'
 * @returns {number} 数字
 */
function getTileNumber(tile) {
  const windMap = { '东': 1, '南': 2, '西': 3, '北': 4 };
  const wordMap = { '中': 1, '发': 2, '白': 3 };
  
  if (windMap[tile] !== undefined) return windMap[tile];
  if (wordMap[tile] !== undefined) return wordMap[tile];
  
  // 数字牌：1万, 2条, 3筒 等
  const match = tile.match(/^(\d+)/);
  if (match) return parseInt(match[1], 10);
  
  throw new Error(`无法解析牌面: ${tile}`);
}

/**
 * 根据马牌数字和庄家，确定买到谁
 * @param {number} num - 马牌数字
 * @param {string} banker - 庄家
 * @returns {string} 买到的玩家
 */
function getHorseTarget(num, banker) {
  const bankerIdx = INDEX[banker];
  // 数字1对应庄家，2对应下家...
  const offset = (num - 1) % 4;
  const targetIdx = (bankerIdx + offset) % 4;
  return PLAYERS[targetIdx];
}

/**
 * 计算杠的输赢
 * @param {Array} gangs - 杠列表
 * @returns {Object} 各玩家因杠产生的输赢
 */
function calcGangResult(gangs) {
  const result = { '东': 0, '南': 0, '西': 0, '北': 0 };
  
  for (const gang of gangs) {
    const { type, winner, target } = gang;
    // type: 'zhigang'(直杠), 'jiagang'(加杠), 'angang'(暗杠)
    // winner: 杠的玩家
    // target: 直杠时点杠者（被杠的人）
    
    if (type === 'zhigang') {
      // 直杠：target（点杠者/被杠者）给2番，其他两人各给1番
      for (const p of PLAYERS) {
        if (p === winner) continue;
        if (p === target) {
          result[p] -= 2;
          result[winner] += 2;
        } else {
          result[p] -= 1;
          result[winner] += 1;
        }
      }
    } else if (type === 'jiagang') {
      // 加杠：其他三人各给1番
      for (const p of PLAYERS) {
        if (p === winner) continue;
        result[p] -= 1;
        result[winner] += 1;
      }
    } else if (type === 'angang') {
      // 暗杠：其他三人各给2番
      for (const p of PLAYERS) {
        if (p === winner) continue;
        result[p] -= 2;
        result[winner] += 2;
      }
    }
  }
  
  return result;
}

/**
 * 计算和牌的输赢
 * @param {Object} hu - 和牌信息
 * @returns {Object} 各玩家因和牌产生的输赢
 */
function calcHuResult(hu) {
  const result = { '东': 0, '南': 0, '西': 0, '北': 0 };
  
  if (!hu || !hu.type) return result;
  
  const { type, winner, fan, target } = hu;
  
  if (type === 'zimo') {
    // 自摸：其他三家各给 winner fan 番
    for (const p of PLAYERS) {
      if (p === winner) continue;
      result[p] -= fan;
      result[winner] += fan;
    }
  } else if (type === 'dianpao') {
    // 点炮：target 给 winner fan 番
    result[target] -= fan;
    result[winner] += fan;
  }
  
  return result;
}

/**
 * 计算买马结果
 * @param {Array} horses - 马牌数组，如 ['1万', '东', '5筒']
 * @param {string} banker - 庄家
 * @param {Object} playerResult - 四个玩家已计算好的输赢
 * @returns {Object} 包含第五人输赢和每匹马的详情
 */
function calcHorseResult(horses, banker, playerResult) {
  const details = [];
  let fifthWin = 0;
  
  for (const tile of horses) {
    const num = getTileNumber(tile);
    const target = getHorseTarget(num, banker);
    const amount = playerResult[target];
    fifthWin += amount;
    details.push({
      tile,
      number: num,
      target,
      amount
    });
  }
  
  return {
    fifthWin,
    details
  };
}

/**
 * 主计算函数
 * @param {Object} params - 输入参数
 * @returns {Object} 完整结算结果
 */
function calculate(params) {
  const { hu = null, gangs = [], horses = [], banker = '东' } = params;
  
  // 1. 计算和牌
  const huResult = calcHuResult(hu);
  
  // 2. 计算杠
  const gangResult = calcGangResult(gangs);
  
  // 3. 汇总四人基础输赢
  const baseResult = {};
  for (const p of PLAYERS) {
    baseResult[p] = huResult[p] + gangResult[p];
  }
  
  // 4. 计算买马
  const horseResult = calcHorseResult(horses, banker, baseResult);
  
  // 5. 最终输赢（含第五人）
  const finalResult = {
    ...baseResult,
    '买马人': horseResult.fifthWin
  };
  
  return {
    baseResult,        // 四人基础输赢（不含买马影响）
    huResult,          // 和牌分项
    gangResult,        // 杠分项
    horseResult,       // 买马详情
    finalResult        // 最终每人输赢
  };
}

// 导出
module.exports = {
  PLAYERS,
  getTileNumber,
  getHorseTarget,
  calcGangResult,
  calcHuResult,
  calcHorseResult,
  calculate
};
