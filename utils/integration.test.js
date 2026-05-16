/**
 * 集成测试：验证 index.js 计算逻辑与 majiang.js 结果一致
 */

const fs = require('fs');
const path = require('path');

// 模拟小程序环境
const wx = {
  showModal: () => {}
};

let pageInstance = null;

function Page(config) {
  pageInstance = {
    data: config.data || {},
    setData(obj) {
      Object.assign(this.data, obj);
    },
    ...config
  };
  // 绑定this
  for (const key of Object.keys(config)) {
    if (typeof config[key] === 'function') {
      pageInstance[key] = config[key].bind(pageInstance);
    }
  }
}

// 加载 index.js（修正 require 路径）
const indexPath = path.join(__dirname, '../pages/index/index.js');
let indexCode = fs.readFileSync(indexPath, 'utf8');
// 把 index.js 里的相对路径改成当前目录下的路径
indexCode = indexCode.replace("require('../../utils/horseParser')", "require('./horseParser')");
eval(indexCode);

// 辅助断言
function assertEqual(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg}\n实际: ${a}\n期望: ${e}`);
  }
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

// ============ 基础交易测试 ============

test('buildBaseTransactions - 自摸一番', () => {
  pageInstance.resetAll();
  pageInstance.setData({
    winTypeIndex: 1,
    winType: 'self',
    winnerIndex: 0,
    selfFanIndex: 0
  });
  const r = pageInstance.buildBaseTransactions();
  assertEqual(r.ok, true);
  assertEqual(r.transactions.length, 3);
  // 自摸1番，庄家赢，其余三家各付1
  assertEqual(r.transactions[0].amount, 1);
  assertEqual(r.transactions[0].receiver, 0);
});

test('buildBaseTransactions - 点炮八番', () => {
  pageInstance.resetAll();
  pageInstance.setData({
    winTypeIndex: 2,
    winType: 'discard',
    winnerIndex: 2,
    discarderIndex: 3,
    discardFanIndex: 1
  });
  const r = pageInstance.buildBaseTransactions();
  assertEqual(r.ok, true);
  assertEqual(r.transactions.length, 1);
  assertEqual(r.transactions[0].amount, 8);
  assertEqual(r.transactions[0].payer, 3);
  assertEqual(r.transactions[0].receiver, 2);
});

test('buildBaseTransactions - 直杠+加杠', () => {
  pageInstance.resetAll();
  pageInstance.setData({
    kongs: [
      { typeIndex: 0, playerIndex: 0, fromIndex: 1 },
      { typeIndex: 1, playerIndex: 2 }
    ]
  });
  const r = pageInstance.buildBaseTransactions();
  assertEqual(r.ok, true);
  // 直杠庄家杠下家：下家付2，对家付1，上家付1
  // 加杠对家：庄家付1，下家付1，上家付1
  const tx = r.transactions;
  assertEqual(tx.length, 6);
});

// ============ 买马解析测试 ============

test('parseHorseInput - 纯数字', () => {
  pageInstance.resetAll();
  pageInstance.setData({ horseInput: '1234' });
  const r = pageInstance.parseHorseInput();
  assertEqual(r.ok, true);
  assertEqual(r.horseDetails.length, 4);
  assertEqual(r.horseCounts, [1, 1, 1, 1]);
});

test('parseHorseInput - 牌面输入', () => {
  pageInstance.resetAll();
  pageInstance.setData({ horseInput: '1万,东,5筒,中' });
  const r = pageInstance.parseHorseInput();
  assertEqual(r.ok, true);
  assertEqual(r.horseDetails.length, 4);
  // 1万=1->庄家, 东=1->庄家, 5筒=5->庄家(5%4=1), 中=1->庄家
  assertEqual(r.horseCounts, [4, 0, 0, 0]);
  assertEqual(r.horseDetails[0].display, '1万');
  assertEqual(r.horseDetails[1].display, '东');
});

test('parseHorseInput - 混合输入', () => {
  pageInstance.resetAll();
  pageInstance.setData({ horseInput: '南,3条,白,8筒' });
  const r = pageInstance.parseHorseInput();
  assertEqual(r.ok, true);
  // 南=2->下家, 3条=3->对家, 白=3->对家, 8筒=8->上家(8%4=0->上家?)
  // 等等：(8-1)%4=7%4=3 -> 上家
  assertEqual(r.horseCounts, [0, 1, 2, 1]);
});

test('parseHorseInput - 无效牌面', () => {
  pageInstance.resetAll();
  pageInstance.setData({ horseInput: '1万,春,东' });
  const r = pageInstance.parseHorseInput();
  assertEqual(r.ok, false);
});

// ============ 结算测试（与majiang.js对比） ============

function calcWithMajiang(hu, gangs, horses, banker) {
  const { calculate } = require('./majiang');
  return calculate({ hu, gangs, horses, banker });
}

function playerNameToIndex(name) {
  const map = { '东': 0, '南': 1, '西': 2, '北': 3 };
  return map[name];
}

function kongTypeToIndex(type) {
  const map = { 'zhigang': 0, 'jiagang': 1, 'angang': 2 };
  return map[type];
}

function calcWithPage(hu, gangs, horses, banker) {
  pageInstance.resetAll();
  
  // 设置和牌
  if (hu) {
    if (hu.type === 'zimo') {
      pageInstance.setData({
        winTypeIndex: 1, winType: 'self',
        winnerIndex: playerNameToIndex(hu.winner),
        selfFanIndex: [1, 2, 4, 8].indexOf(hu.fan)
      });
    } else if (hu.type === 'dianpao') {
      pageInstance.setData({
        winTypeIndex: 2, winType: 'discard',
        winnerIndex: playerNameToIndex(hu.winner),
        discarderIndex: playerNameToIndex(hu.target),
        discardFanIndex: [4, 8].indexOf(hu.fan)
      });
    }
  }
  
  // 设置杠（庄家固定为东=0，所以playerIndex直接对应）
  const kongs = gangs.map(g => ({
    typeIndex: kongTypeToIndex(g.type),
    playerIndex: playerNameToIndex(g.winner),
    fromIndex: playerNameToIndex(g.target || '南')
  }));
  pageInstance.setData({ kongs });
  
  // 设置买马（输入牌面字符串）
  pageInstance.setData({ horseInput: horses.join(',') });
  
  // 执行计算
  const baseResult = pageInstance.buildBaseTransactions();
  if (!baseResult.ok) throw new Error(baseResult.error);
  
  const horseResult = pageInstance.parseHorseInput();
  if (!horseResult.ok) throw new Error(horseResult.error);
  
  const baseSettlement = pageInstance.calculateSettlement(baseResult.transactions, horseResult.horseCounts, false);
  const finalSettlement = pageInstance.calculateSettlement(baseResult.transactions, horseResult.horseCounts, true);
  
  return {
    base: baseSettlement.rows.slice(0, 4).map(r => r.score),
    final: finalSettlement.rows.map(r => r.score)
  };
}

test('对比测试1：自摸+直杠', () => {
  const hu = { type: 'zimo', winner: '东', fan: 2 };
  const gangs = [{ type: 'zhigang', winner: '东', target: '南' }];
  const horses = ['1万', '3筒'];
  
  const mj = calcWithMajiang(hu, gangs, horses, '东');
  const pg = calcWithPage(hu, gangs, horses, '东');
  
  // majiang.js 返回东=10, 南=-4, 西=-3, 北=-3, 买马人=7
  assertEqual(pg.base, [10, -4, -3, -3], '基础结算对比');
  assertEqual(pg.final[4], 7, '买马人对比');
});

test('对比测试2：点炮+暗杠', () => {
  const hu = { type: 'dianpao', winner: '西', target: '北', fan: 4 };
  const gangs = [{ type: 'angang', winner: '南' }];
  const horses = ['东', '北', '中'];
  
  const mj = calcWithMajiang(hu, gangs, horses, '东');
  const pg = calcWithPage(hu, gangs, horses, '东');
  
  assertEqual(pg.base, [-2, 6, 2, -6], '基础结算对比');
  assertEqual(pg.final[4], -10, '买马人对比');
});

test('对比测试3：无人和牌多杠', () => {
  const hu = null;
  const gangs = [
    { type: 'jiagang', winner: '东' },
    { type: 'zhigang', winner: '西', target: '北' }
  ];
  const horses = ['南', '西'];
  
  // 小程序中庄家固定为东，所以 banker 必须='东' 才能直接对比
  const mj = calcWithMajiang(hu, gangs, horses, '东');
  const pg = calcWithPage(hu, gangs, horses, '东');
  
  // 基础：加杠东 +3-1-1-1 = 东+3 南-1 西-1 北-1
  //       直杠西杠北 +4-2-1-1 = 西+4 北-2 东-1 南-1
  //       合计：东+2 南-2 西+3 北-3
  assertEqual(pg.base, [2, -2, 3, -3], '基础结算对比');
  
  // 买马：南=2->下家(南=-2), 西=3->对家(西=3)
  // 第五人：-2 + 3 = 1
  assertEqual(pg.final[4], 1, '买马人对比');
});

test('对比测试4：自摸八番多杠多马', () => {
  const hu = { type: 'zimo', winner: '北', fan: 8 };
  const gangs = [
    { type: 'angang', winner: '东' },
    { type: 'zhigang', winner: '南', target: '东' }
  ];
  const horses = ['1万', '5筒', '东', '中'];
  
  const mj = calcWithMajiang(hu, gangs, horses, '东');
  const pg = calcWithPage(hu, gangs, horses, '东');
  
  // 自摸8番北：北+24, 东-8, 南-8, 西-8
  // 暗杠东：东+6, 南-2, 西-2, 北-2
  // 直杠南杠东：南+4, 东-2, 西-1, 北-1
  // 基础：东=-4, 南=-6, 西=-11, 北=21
  assertEqual(pg.base, [-4, -6, -11, 21], '基础结算对比');
  
  // 买马：1万=1->东(-4), 5筒=5->东(-4), 东=1->东(-4), 中=1->东(-4)
  // 第五人：-4*4 = -16
  assertEqual(pg.final[4], -16, '买马人对比');
});

console.log(`\n========== 集成测试结果 ==========`);
console.log(`通过: ${passed} / ${passed + failed}`);
if (failed > 0) {
  console.log(`失败: ${failed}`);
  process.exit(1);
}
