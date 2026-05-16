/**
 * 麻将算番逻辑测试
 */

const { 
  getTileNumber, 
  getHorseTarget, 
  calcGangResult, 
  calcHuResult, 
  calcHorseResult, 
  calculate 
} = require('./majiang');

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

function assertEqual(actual, expected, msg = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}\n实际: ${JSON.stringify(actual)}\n期望: ${JSON.stringify(expected)}`);
  }
}

// ============ 基础工具函数测试 ============

test('getTileNumber - 字牌', () => {
  assertEqual(getTileNumber('东'), 1);
  assertEqual(getTileNumber('南'), 2);
  assertEqual(getTileNumber('西'), 3);
  assertEqual(getTileNumber('北'), 4);
  assertEqual(getTileNumber('中'), 1);
  assertEqual(getTileNumber('发'), 2);
  assertEqual(getTileNumber('白'), 3);
});

test('getTileNumber - 数字牌', () => {
  assertEqual(getTileNumber('1万'), 1);
  assertEqual(getTileNumber('5条'), 5);
  assertEqual(getTileNumber('9筒'), 9);
  assertEqual(getTileNumber('12万'), 12); // 兼容两位数
});

test('getHorseTarget - 不同庄家', () => {
  // 庄家东：1->东, 2->南, 3->西, 4->北, 5->东
  assertEqual(getHorseTarget(1, '东'), '东');
  assertEqual(getHorseTarget(2, '东'), '南');
  assertEqual(getHorseTarget(3, '东'), '西');
  assertEqual(getHorseTarget(4, '东'), '北');
  assertEqual(getHorseTarget(5, '东'), '东');
  assertEqual(getHorseTarget(6, '东'), '南');
  
  // 庄家南：1->南, 2->西, 3->北, 4->东, 5->南
  assertEqual(getHorseTarget(1, '南'), '南');
  assertEqual(getHorseTarget(2, '南'), '西');
  assertEqual(getHorseTarget(3, '南'), '北');
  assertEqual(getHorseTarget(4, '南'), '东');
  assertEqual(getHorseTarget(5, '南'), '南');
  
  // 庄家西：1->西, 2->北, 3->东, 4->南
  assertEqual(getHorseTarget(1, '西'), '西');
  assertEqual(getHorseTarget(2, '西'), '北');
  assertEqual(getHorseTarget(3, '西'), '东');
  assertEqual(getHorseTarget(4, '西'), '南');
  
  // 庄家北：1->北, 2->东, 3->南, 4->西
  assertEqual(getHorseTarget(1, '北'), '北');
  assertEqual(getHorseTarget(2, '北'), '东');
  assertEqual(getHorseTarget(3, '北'), '南');
  assertEqual(getHorseTarget(4, '北'), '西');
});

// ============ 和牌测试 ============

test('calcHuResult - 自摸一番', () => {
  const r = calcHuResult({ type: 'zimo', winner: '东', fan: 1 });
  assertEqual(r, { '东': 3, '南': -1, '西': -1, '北': -1 });
});

test('calcHuResult - 自摸八番', () => {
  const r = calcHuResult({ type: 'zimo', winner: '南', fan: 8 });
  assertEqual(r, { '东': -8, '南': 24, '西': -8, '北': -8 });
});

test('calcHuResult - 点炮四番', () => {
  const r = calcHuResult({ type: 'dianpao', winner: '东', target: '南', fan: 4 });
  assertEqual(r, { '东': 4, '南': -4, '西': 0, '北': 0 });
});

test('calcHuResult - 点炮八番', () => {
  const r = calcHuResult({ type: 'dianpao', winner: '西', target: '北', fan: 8 });
  assertEqual(r, { '东': 0, '南': 0, '西': 8, '北': -8 });
});

test('calcHuResult - 无人和牌', () => {
  const r = calcHuResult(null);
  assertEqual(r, { '东': 0, '南': 0, '西': 0, '北': 0 });
});

// ============ 杠测试 ============

test('calcGangResult - 直杠（东杠南的牌）', () => {
  // 南被杠，给东2番；西、北各给1番
  const r = calcGangResult([{ type: 'zhigang', winner: '东', target: '南' }]);
  assertEqual(r, { '东': 4, '南': -2, '西': -1, '北': -1 });
});

test('calcGangResult - 直杠（西杠北的牌）', () => {
  const r = calcGangResult([{ type: 'zhigang', winner: '西', target: '北' }]);
  assertEqual(r, { '东': -1, '南': -1, '西': 4, '北': -2 });
});

test('calcGangResult - 加杠', () => {
  const r = calcGangResult([{ type: 'jiagang', winner: '东' }]);
  assertEqual(r, { '东': 3, '南': -1, '西': -1, '北': -1 });
});

test('calcGangResult - 暗杠', () => {
  const r = calcGangResult([{ type: 'angang', winner: '南' }]);
  assertEqual(r, { '东': -2, '南': 6, '西': -2, '北': -2 });
});

test('calcGangResult - 多个杠', () => {
  const r = calcGangResult([
    { type: 'zhigang', winner: '东', target: '南' },
    { type: 'jiagang', winner: '西' }
  ]);
  // 直杠：东+4, 南-2, 西-1, 北-1
  // 加杠：西+3, 东-1, 南-1, 北-1
  assertEqual(r, { '东': 3, '南': -3, '西': 2, '北': -2 });
});

// ============ 买马测试 ============

test('calcHorseResult - 基础买马', () => {
  const playerResult = { '东': 10, '南': -5, '西': 3, '北': -8 };
  const h = calcHorseResult(['1万', '东', '5筒'], '东', playerResult);
  // 1万=1 -> 东(赢10), 东=1 -> 东(赢10), 5筒=5 -> 5%4=1 -> 东(赢10)
  assertEqual(h.fifthWin, 30);
  assertEqual(h.details.length, 3);
  assertEqual(h.details[0], { tile: '1万', number: 1, target: '东', amount: 10 });
});

test('calcHorseResult - 买到输家', () => {
  const playerResult = { '东': 10, '南': -5, '西': 3, '北': -8 };
  const h = calcHorseResult(['2条', '南'], '东', playerResult);
  // 2条=2 -> 南(输5), 南=2 -> 南(输5)
  assertEqual(h.fifthWin, -10);
});

// ============ 综合场景测试 ============

test('综合场景1：自摸+直杠+买马', () => {
  const result = calculate({
    banker: '东',
    hu: { type: 'zimo', winner: '东', fan: 2 },
    gangs: [{ type: 'zhigang', winner: '东', target: '南' }],
    horses: ['1万', '3筒']
  });
  
  // 自摸2番：东+6, 南-2, 西-2, 北-2
  // 直杠：东+4, 南-2, 西-1, 北-1
  // 基础：东=10, 南=-4, 西=-3, 北=-3
  assertEqual(result.baseResult, { '东': 10, '南': -4, '西': -3, '北': -3 });
  
  // 买马：1万=1->东(10), 3筒=3->西(-3)
  assertEqual(result.horseResult.fifthWin, 7);
  assertEqual(result.finalResult, { '东': 10, '南': -4, '西': -3, '北': -3, '买马人': 7 });
});

test('综合场景2：点炮+暗杠+买马', () => {
  const result = calculate({
    banker: '东',
    hu: { type: 'dianpao', winner: '西', target: '北', fan: 4 },
    gangs: [{ type: 'angang', winner: '南' }],
    horses: ['东', '北', '中']
  });
  
  // 点炮4番：西+4, 北-4
  // 暗杠南：南+6, 东-2, 西-2, 北-2
  // 基础：东=-2, 南=6, 西=2, 北=-6
  assertEqual(result.baseResult, { '东': -2, '南': 6, '西': 2, '北': -6 });
  
  // 买马：东=1->东(-2), 北=4->北(-6), 中=1->东(-2)
  assertEqual(result.horseResult.fifthWin, -10);
  assertEqual(result.finalResult, { '东': -2, '南': 6, '西': 2, '北': -6, '买马人': -10 });
});

test('综合场景3：无人和牌，只有杠', () => {
  const result = calculate({
    banker: '南',
    hu: null,
    gangs: [
      { type: 'jiagang', winner: '东' },
      { type: 'zhigang', winner: '西', target: '北' }
    ],
    horses: ['南', '西']
  });
  
  // 加杠东：东+3, 南-1, 西-1, 北-1
  // 直杠西杠北：西+4, 北-2, 东-1, 南-1
  // 基础：东=2, 南=-2, 西=3, 北=-3
  assertEqual(result.baseResult, { '东': 2, '南': -2, '西': 3, '北': -3 });
  
  // 庄家南：1=南, 2=西, 3=北, 4=东
  // 南(字牌=2)->买到西，西赢3番，第五人赢3
  // 西(字牌=3)->买到北，北输3番，第五人输3
  // 合计：3 + (-3) = 0
  assertEqual(result.horseResult.fifthWin, 0);
});

test('综合场景4：自摸八番+多杠+多马', () => {
  const result = calculate({
    banker: '西',
    hu: { type: 'zimo', winner: '北', fan: 8 },
    gangs: [
      { type: 'angang', winner: '东' },
      { type: 'zhigang', winner: '南', target: '东' }
    ],
    horses: ['1万', '5筒', '东', '中']
  });
  
  // 自摸8番北：北+24, 东-8, 南-8, 西-8
  // 暗杠东：东+6, 南-2, 西-2, 北-2
  // 直杠南杠东：南+4, 东-2, 西-1, 北-1
  // 基础：东=-4, 南=-6, 西=-11, 北=21
  assertEqual(result.baseResult, { '东': -4, '南': -6, '西': -11, '北': 21 });
  
  // 庄家西：1=西, 2=北, 3=东, 4=南
  // 1万=1->西(-11), 5筒=5->5%4=1->西(-11), 东=1->西(-11), 中=1->西(-11)
  assertEqual(result.horseResult.fifthWin, -44);
  assertEqual(result.finalResult, { '东': -4, '南': -6, '西': -11, '北': 21, '买马人': -44 });
});

test('综合场景5：买马跨4循环', () => {
  const result = calculate({
    banker: '东',
    hu: { type: 'zimo', winner: '东', fan: 1 },
    gangs: [],
    horses: ['4万', '8条', '北', '9筒']
  });
  
  // 自摸1番：东+3, 南-1, 西-1, 北-1
  // 4万=4->北(-1), 8条=8->8%4=0->北(-1), 北=4->北(-1), 9筒=9->9%4=1->东(+3)
  // 买马人：-1-1-1+3 = 0
  assertEqual(result.horseResult.fifthWin, 0);
});

// 验证总账平衡（四人之间不含买马）
test('总账平衡验证 - 任意场景', () => {
  const scenarios = [
    { hu: { type: 'zimo', winner: '东', fan: 2 }, gangs: [{ type: 'zhigang', winner: '南', target: '西' }] },
    { hu: { type: 'dianpao', winner: '西', target: '北', fan: 8 }, gangs: [{ type: 'angang', winner: '东' }, { type: 'jiagang', winner: '南' }] },
    { hu: null, gangs: [{ type: 'zhigang', winner: '东', target: '南' }, { type: 'zhigang', winner: '西', target: '北' }] },
  ];
  
  for (const s of scenarios) {
    const r = calculate({ ...s, banker: '东', horses: [] });
    const sum = Object.values(r.baseResult).reduce((a, b) => a + b, 0);
    if (sum !== 0) {
      throw new Error(`总账不平衡: ${JSON.stringify(r.baseResult)}, sum=${sum}`);
    }
  }
});

console.log(`\n========== 测试结果 ==========`);
console.log(`通过: ${passed} / ${passed + failed}`);
if (failed > 0) {
  console.log(`失败: ${failed}`);
  process.exit(1);
}
