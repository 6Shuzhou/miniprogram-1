const { parseHorseInput, parseTile } = require('./horseParser');

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

// 字牌解析
test('parseTile - 风牌', () => {
  assertEqual(parseTile('东').number, 1);
  assertEqual(parseTile('南').number, 2);
  assertEqual(parseTile('西').number, 3);
  assertEqual(parseTile('北').number, 4);
});

test('parseTile - 箭牌', () => {
  assertEqual(parseTile('中').number, 1);
  assertEqual(parseTile('发').number, 2);
  assertEqual(parseTile('白').number, 3);
});

// 数字牌解析
test('parseTile - 数牌', () => {
  assertEqual(parseTile('1万').number, 1);
  assertEqual(parseTile('5筒').number, 5);
  assertEqual(parseTile('9条').number, 9);
  assertEqual(parseTile('3萬').number, 3);
});

// 纯数字
test('parseTile - 纯数字', () => {
  assertEqual(parseTile('1').number, 1);
  assertEqual(parseTile('5').number, 5);
  assertEqual(parseTile('9').number, 9);
});

// 无效输入
test('parseTile - 无效输入', () => {
  assertEqual(parseTile(''), null);
  assertEqual(parseTile('春'), null);
  assertEqual(parseTile('0万'), null);
  assertEqual(parseTile('10万'), null);
});

// 完整输入解析
test('parseHorseInput - 完整输入', () => {
  const r = parseHorseInput('1万,东,5筒,中,白,9条');
  assertEqual(r.ok, true);
  assertEqual(r.tiles.length, 6);
  assertEqual(r.tiles[0], { number: 1, display: '1万', type: '数牌' });
  assertEqual(r.tiles[1], { number: 1, display: '东', type: '风牌' });
  assertEqual(r.tiles[2], { number: 5, display: '5筒', type: '数牌' });
  assertEqual(r.tiles[3], { number: 1, display: '中', type: '箭牌' });
  assertEqual(r.tiles[4], { number: 3, display: '白', type: '箭牌' });
  assertEqual(r.tiles[5], { number: 9, display: '9条', type: '数牌' });
});

test('parseHorseInput - 多种分隔符', () => {
  const r = parseHorseInput('1万 东，5筒；中|白');
  assertEqual(r.ok, true);
  assertEqual(r.tiles.length, 5);
});

test('parseHorseInput - 空输入', () => {
  const r = parseHorseInput('');
  assertEqual(r.ok, true);
  assertEqual(r.tiles.length, 0);
});

test('parseHorseInput - 含无效牌', () => {
  const r = parseHorseInput('1万,春,东');
  assertEqual(r.ok, false);
  assertEqual(r.error.includes('春'), true);
});

console.log(`\n========== 测试结果 ==========`);
console.log(`通过: ${passed} / ${passed + failed}`);
if (failed > 0) {
  console.log(`失败: ${failed}`);
  process.exit(1);
}
