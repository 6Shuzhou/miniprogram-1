const { parseHorseInput: parseHorseTiles } = require('../../utils/horseParser');

const PLAYERS = ['庄家', '下家', '对家', '上家'];
const ALL_PLAYERS = ['庄家', '下家', '对家', '上家', '买马者'];
const M_INDEX = 4;

const WIN_TYPE_LABELS = ['无人胡牌', '自摸', '点炮'];
const WIN_TYPE_VALUES = ['none', 'self', 'discard'];

const KONG_TYPE_LABELS = ['直杠', '加杠', '暗杠'];
const KONG_TYPE_VALUES = ['direct', 'added', 'concealed'];

function createInitialData() {
  return {
    players: PLAYERS,

    winTypeLabels: WIN_TYPE_LABELS,
    winTypeIndex: 0,
    winType: 'none',

    selfFanOptions: [1, 2, 4, 8],
    selfFanIndex: 0,

    discardFanOptions: [4, 8],
    discardFanIndex: 0,

    winnerIndex: 0,
    discarderIndex: 2,

    kongTypeLabels: KONG_TYPE_LABELS,
    kongs: [],

    horseInput: '',

    horseDetails: [],
    horseCountsText: [0, 0, 0, 0],
    horseError: '',

    baseRows: [],
    resultRows: [],
    finalTransactions: [],
    totalScore: 0
  };
}

Page({
  data: createInitialData(),

  onWinTypeChange(e) {
    const index = Number(e.detail.value);

    this.setData({
      winTypeIndex: index,
      winType: WIN_TYPE_VALUES[index]
    });
  },

  onWinnerChange(e) {
    this.setData({
      winnerIndex: Number(e.detail.value)
    });
  },

  onDiscarderChange(e) {
    this.setData({
      discarderIndex: Number(e.detail.value)
    });
  },

  onSelfFanChange(e) {
    this.setData({
      selfFanIndex: Number(e.detail.value)
    });
  },

  onDiscardFanChange(e) {
    this.setData({
      discardFanIndex: Number(e.detail.value)
    });
  },

  onHorseInput(e) {
    this.setData({
      horseInput: e.detail.value
    });
  },

  addDirectKong() {
    const kongs = this.data.kongs.slice();

    kongs.push({
      id: Date.now() + '_' + Math.random(),
      typeIndex: 0,
      playerIndex: 0,
      fromIndex: 1
    });

    this.setData({ kongs });
  },

  addAddedKong() {
    const kongs = this.data.kongs.slice();

    kongs.push({
      id: Date.now() + '_' + Math.random(),
      typeIndex: 1,
      playerIndex: 0,
      fromIndex: 1
    });

    this.setData({ kongs });
  },

  addConcealedKong() {
    const kongs = this.data.kongs.slice();

    kongs.push({
      id: Date.now() + '_' + Math.random(),
      typeIndex: 2,
      playerIndex: 0,
      fromIndex: 1
    });

    this.setData({ kongs });
  },

  removeKong(e) {
    const index = Number(e.currentTarget.dataset.index);
    const kongs = this.data.kongs.slice();

    kongs.splice(index, 1);

    this.setData({ kongs });
  },

  onKongTypeChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const value = Number(e.detail.value);

    this.setData({
      [`kongs[${index}].typeIndex`]: value
    });
  },

  onKongPlayerChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const value = Number(e.detail.value);

    this.setData({
      [`kongs[${index}].playerIndex`]: value
    });
  },

  onKongFromChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const value = Number(e.detail.value);

    this.setData({
      [`kongs[${index}].fromIndex`]: value
    });
  },

  resetAll() {
    this.setData(createInitialData());
  },

  loadDiscardDemo() {
    this.setData({
      winTypeIndex: 2,
      winType: 'discard',
      winnerIndex: 0,
      discarderIndex: 2,
      discardFanIndex: 1,
      kongs: [],
      horseInput: '1234'
    }, () => {
      this.calculate();
    });
  },

  loadSelfDrawDemo() {
    this.setData({
      winTypeIndex: 1,
      winType: 'self',
      winnerIndex: 2,
      selfFanIndex: 1,
      kongs: [],
      horseInput: '3314'
    }, () => {
      this.calculate();
    });
  },

  calculate() {
    const baseResult = this.buildBaseTransactions();

    if (!baseResult.ok) {
      wx.showModal({
        title: '输入有误',
        content: baseResult.error,
        showCancel: false
      });
      return;
    }

    const horseResult = this.parseHorseInput();

    if (!horseResult.ok) {
      wx.showModal({
        title: '买马输入有误',
        content: horseResult.error,
        showCancel: false
      });
      return;
    }

    const baseTransactions = baseResult.transactions;
    const horseCounts = horseResult.horseCounts;

    const baseSettlement = this.calculateSettlement(baseTransactions, horseCounts, false);
    const finalSettlement = this.calculateSettlement(baseTransactions, horseCounts, true);

    const totalScore = finalSettlement.rows.reduce((sum, row) => {
      return sum + row.score;
    }, 0);

    this.setData({
      horseDetails: horseResult.horseDetails,
      horseCountsText: horseCounts,
      baseRows: baseSettlement.rows.slice(0, 4),
      resultRows: finalSettlement.rows,
      finalTransactions: finalSettlement.transactions,
      totalScore
    });
  },

  buildBaseTransactions() {
    const transactions = [];

    const winType = this.data.winType;
    const winnerIndex = Number(this.data.winnerIndex);
    const discarderIndex = Number(this.data.discarderIndex);

    if (winType === 'self') {
      const fan = Number(this.data.selfFanOptions[this.data.selfFanIndex]);

      for (let i = 0; i < 4; i++) {
        if (i !== winnerIndex) {
          transactions.push({
            payer: i,
            receiver: winnerIndex,
            amount: fan,
            reason: `${PLAYERS[winnerIndex]} 自摸 ${fan} 番，${PLAYERS[i]} 支付 ${fan} 番`
          });
        }
      }
    }

    if (winType === 'discard') {
      if (winnerIndex === discarderIndex) {
        return {
          ok: false,
          error: '点炮时，胡牌玩家和点炮玩家不能是同一个人。'
        };
      }

      const fan = Number(this.data.discardFanOptions[this.data.discardFanIndex]);

      transactions.push({
        payer: discarderIndex,
        receiver: winnerIndex,
        amount: fan,
        reason: `${PLAYERS[winnerIndex]} 胡牌，${PLAYERS[discarderIndex]} 点炮，${fan} 番`
      });
    }

    for (let k = 0; k < this.data.kongs.length; k++) {
      const kong = this.data.kongs[k];

      const typeIndex = Number(kong.typeIndex);
      const type = KONG_TYPE_VALUES[typeIndex];

      const playerIndex = Number(kong.playerIndex);
      const fromIndex = Number(kong.fromIndex);

      if (type === 'direct') {
        if (playerIndex === fromIndex) {
          return {
            ok: false,
            error: `第 ${k + 1} 个直杠中，杠牌者和点杠者不能是同一个人。`
          };
        }

        transactions.push({
          payer: fromIndex,
          receiver: playerIndex,
          amount: 2,
          reason: `${PLAYERS[playerIndex]} 直杠，${PLAYERS[fromIndex]} 点杠，点杠者付 2 番`
        });

        for (let i = 0; i < 4; i++) {
          if (i !== playerIndex && i !== fromIndex) {
            transactions.push({
              payer: i,
              receiver: playerIndex,
              amount: 1,
              reason: `${PLAYERS[playerIndex]} 直杠，${PLAYERS[i]} 作为其他玩家付 1 番`
            });
          }
        }
      }

      if (type === 'added') {
        for (let i = 0; i < 4; i++) {
          if (i !== playerIndex) {
            transactions.push({
              payer: i,
              receiver: playerIndex,
              amount: 1,
              reason: `${PLAYERS[playerIndex]} 加杠，${PLAYERS[i]} 支付 1 番`
            });
          }
        }
      }

      if (type === 'concealed') {
        for (let i = 0; i < 4; i++) {
          if (i !== playerIndex) {
            transactions.push({
              payer: i,
              receiver: playerIndex,
              amount: 2,
              reason: `${PLAYERS[playerIndex]} 暗杠，${PLAYERS[i]} 支付 2 番`
            });
          }
        }
      }
    }

    return {
      ok: true,
      transactions
    };
  },

  parseHorseInput() {
    const raw = String(this.data.horseInput || '').trim();

    const horseCounts = [0, 0, 0, 0];
    const horseDetails = [];

    if (!raw) {
      return {
        ok: true,
        horseCounts,
        horseDetails
      };
    }

    const parsed = parseHorseTiles(raw);

    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error
      };
    }

    for (let i = 0; i < parsed.tiles.length; i++) {
      const tile = parsed.tiles[i];
      const card = tile.number;
      const playerIndex = (card - 1) % 4;

      horseCounts[playerIndex] += 1;

      horseDetails.push({
        card,
        display: tile.display,
        player: PLAYERS[playerIndex]
      });
    }

    return {
      ok: true,
      horseCounts,
      horseDetails
    };
  },

  calculateSettlement(baseTransactions, horseCounts, includeHorse) {
    const income = [0, 0, 0, 0, 0];
    const expense = [0, 0, 0, 0, 0];

    const finalTransactions = [];

    const addPayment = (payer, receiver, amount, reason) => {
      if (!amount || amount <= 0) {
        return;
      }

      expense[payer] += amount;
      income[receiver] += amount;

      finalTransactions.push({
        payer: ALL_PLAYERS[payer],
        receiver: ALL_PLAYERS[receiver],
        amount,
        reason
      });
    };

    for (let i = 0; i < baseTransactions.length; i++) {
      const tx = baseTransactions[i];

      const payer = tx.payer;
      const receiver = tx.receiver;
      const amount = tx.amount;

      addPayment(
        payer,
        receiver,
        amount,
        tx.reason
      );

      if (includeHorse) {
        const receiverHorseCount = horseCounts[receiver] || 0;
        const payerHorseCount = horseCounts[payer] || 0;

        if (receiverHorseCount > 0) {
          addPayment(
            payer,
            M_INDEX,
            amount * receiverHorseCount,
            `买马买中 ${PLAYERS[receiver]} ${receiverHorseCount} 次，${PLAYERS[payer]} 额外付给买马者`
          );
        }

        if (payerHorseCount > 0) {
          addPayment(
            M_INDEX,
            receiver,
            amount * payerHorseCount,
            `买马买中 ${PLAYERS[payer]} ${payerHorseCount} 次，买马者额外付给 ${PLAYERS[receiver]}`
          );
        }
      }
    }

    const rows = [];

    for (let i = 0; i < 5; i++) {
      const score = income[i] - expense[i];

      rows.push({
        name: ALL_PLAYERS[i],
        income: income[i],
        expense: expense[i],
        score,
        scoreText: this.formatScore(score),
        scoreClass: this.getScoreClass(score)
      });
    }

    return {
      rows,
      transactions: finalTransactions
    };
  },

  formatScore(score) {
    if (score > 0) {
      return '+' + score;
    }

    return String(score);
  },

  getScoreClass(score) {
    if (score > 0) {
      return 'win';
    }

    if (score < 0) {
      return 'lose';
    }

    return 'even';
  }
});