import {
  register,
  range,
  random,
  shuffle,
  stones,
  neighbors,
  orth,
  diag,
  seats,
} from './ww-core.js';
const hexDirections = [...orth, [1, -1], [-1, 1]];
function connected(board, start, w, h, directions, player) {
  const seen = new Set(start.filter((i) => board[i] === player)),
    queue = [...seen];
  for (let n = 0; n < queue.length; n++)
    for (const j of neighbors(queue[n], w, h, directions)) {
      if (board[j] === player && !seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
    }
  return queue;
}
for (const [id, w, h, k] of [
  [4, 7, 6, 4],
  [7, 9, 9, 0],
  [10, 15, 15, 5],
]) {
  register(
    id,
    k
      ? (id === 4 ? '열을 눌러 아래로 돌을 떨어뜨리세요. ' : '빈 교차점에 돌을 놓으세요. ') +
          k +
          '개를 가로·세로·대각선으로 이으면 승리합니다.'
      : '나는 위와 아래, 상대는 왼쪽과 오른쪽 가장자리를 연속된 돌로 연결합니다.',
    (ui) => {
      const board = Array(w * h).fill(0);
      function line(i, p) {
        return Math.max(
          ...[
            [1, 0],
            [0, 1],
            [1, 1],
            [1, -1],
          ].map(([dx, dy]) => {
            let length = 1;
            for (const sign of [-1, 1]) {
              let at = i;
              while (true) {
                const [j] = neighbors(at, w, h, [[dx * sign, dy * sign]]);
                if (j === undefined || board[j] !== p) break;
                length++;
                at = j;
              }
            }
            return length;
          }),
        );
      }
      function wins(i, p) {
        if (k) return line(i, p) >= k;
        const start = range(w).map((n) => (p === 1 ? n : n * w));
        return connected(board, start, w, h, hexDirections, p).some((j) =>
          p === 1 ? j >= w * (h - 1) : j % w === w - 1,
        );
      }
      return () => {
        const p = ui.turn + 1,
          actions = new Map();
        board.forEach((v, i) => {
          if (v) return;
          let landing = i;
          if (id === 4) while (landing + w < w * h && !board[landing + w]) landing += w;
          actions.set(i, {
            weight:
              line(landing, p) * 2 +
              line(landing, 3 - p) +
              (line(landing, 3 - p) >= k && k ? 80 : 0) +
              (line(landing, p) >= k && k ? 100 : 0) -
              Math.abs((landing % w) - (w - 1) / 2) * 0.1,
            play: () => {
              board[landing] = p;
              const win = wins(landing, p);
              ui.paint(win ? ui.turn : 1 - ui.turn);
              if (win) ui.victor(p - 1);
              else if (board.every(Boolean)) ui.victor(-1);
            },
          });
        });
        stones(ui, board, w, actions, id === 7 ? 'hex' : id === 4 ? 'drop' : 'goban');
        if (id === 7) ui.score('흑 · 위 ↕ 아래　 백 · 왼쪽 ↔ 오른쪽');
      };
    },
  );
}
register(
  15,
  '자신의 돌 사이에 상대 돌이 끼도록 놓으면 그 줄을 뒤집습니다. 양쪽 모두 둘 수 없으면 돌이 많은 쪽이 승리합니다.',
  (ui) => {
    const b = Array(64).fill(0);
    b[27] = b[36] = 2;
    b[28] = b[35] = 1;
    function moves(p) {
      const result = new Map();
      for (const i of range(64)) {
        if (b[i]) continue;
        const flips = [];
        for (const d of [...orth, ...diag]) {
          let at = i,
            ray = [];
          while (true) {
            const [j] = neighbors(at, 8, 8, [d]);
            if (j === undefined || !b[j]) break;
            if (b[j] === p) {
              flips.push(...ray);
              break;
            }
            ray.push(j);
            at = j;
          }
        }
        if (flips.length) result.set(i, flips);
      }
      return result;
    }
    return () => {
      const p = ui.turn + 1,
        actions = new Map();
      for (const [i, flips] of moves(p))
        actions.set(i, {
          weight: flips.length + ([0, 7, 56, 63].includes(i) ? 30 : 0),
          play: () => {
            for (const j of [i, ...flips]) b[j] = p;
            const next = moves(3 - p).size ? 3 - p : p;
            ui.paint(next - 1);
            if (!moves(next).size) {
              const a = b.filter((v) => v === 1).length,
                c = b.filter((v) => v === 2).length;
              ui.victor(a === c ? -1 : a > c ? 0 : 1);
            }
          },
        });
      ui.score(
        '흑 ' + b.filter((v) => v === 1).length + '  ·  백 ' + b.filter((v) => v === 2).length,
      );
      stones(ui, b, 8, actions, 'reversi');
    };
  },
);
register(
  1,
  '내 쪽 구덩이를 골라 반시계 방향으로 씨앗을 한 알씩 놓습니다. 내 창고에서 끝나면 한 번 더 둡니다. 내 빈 구덩이에서 끝나면 맞은편 씨앗을 잡습니다.',
  (ui) => {
    const pits = Array(14).fill(4);
    pits[6] = pits[13] = 0;
    return () => {
      const p = ui.turn,
        offset = p * 7,
        store = offset + 6;
      ui.score('내 창고 ' + pits[6] + '  ·  상대 창고 ' + pits[13]);
      const grid = ui.grid(6, 'mancala');
      for (const i of [...range(6).map((n) => 12 - n), ...range(6)]) {
        const legal = i >= offset && i < store && pits[i] > 0;
        const el = ui.button(
          grid,
          pits[i],
          legal
            ? () => {
                let n = pits[i],
                  at = i;
                pits[i] = 0;
                while (n) {
                  at = (at + 1) % 14;
                  if (at === (store + 7) % 14) continue;
                  pits[at]++;
                  n--;
                }
                if (at >= offset && at < store && pits[at] === 1 && pits[12 - at]) {
                  pits[store] += 1 + pits[12 - at];
                  pits[12 - at] = pits[at] = 0;
                }
                const over = [0, 7].some((o) => pits.slice(o, o + 6).every((v) => !v));
                if (over)
                  for (const o of [0, 7])
                    for (let j = o; j < o + 6; j++) {
                      pits[o + 6] += pits[j];
                      pits[j] = 0;
                    }
                ui.paint(at === store ? p : 1 - p);
                if (over) ui.victor(pits[6] === pits[13] ? -1 : pits[6] > pits[13] ? 0 : 1);
              }
            : null,
          'pit',
          (i + pits[i]) % 14 === store ? 10 : 0,
          '씨앗 ' + pits[i] + '개',
        );
        const count = document.createElement('b');
        count.textContent = pits[i];
        el.replaceChildren(count);
        const colors = ['#deb875', '#58978b', '#db8e66', '#87aeb3'];
        for (let n = 0; n < Math.min(9, pits[i]); n++) {
          const seed = document.createElement('i'),
            angle = n * 2.4;
          const radius = 12 * Math.sqrt(n);
          seed.style.left = 48 + Math.cos(angle) * radius + '%';
          seed.style.top = 52 + Math.sin(angle) * radius + '%';
          seed.style.backgroundColor = colors[(n + i) % 4];
          el.append(seed);
        }
      }
    };
  },
);
register(
  2,
  '점 사이에 선을 그으세요. 상자의 네 번째 변을 그은 사람이 한 점을 얻고 다시 둡니다.',
  (ui) => {
    const side = 7,
      edges = new Set(),
      owners = new Map(),
      scores = [0, 0];
    const edgesOf = (i) => [i - 1, i + 1, i - side, i + side];
    return () => {
      ui.score('나 ' + scores[0] + '  ·  상대 ' + scores[1]);
      const grid = ui.grid(side, 'dots');
      for (const i of range(side * side)) {
        const x = i % side,
          y = Math.floor(i / side);
        if (x % 2 === y % 2) {
          ui.button(
            grid,
            x % 2 ? (owners.has(i) ? (owners.get(i) ? '○' : '●') : '') : '•',
            null,
            x % 2 ? 'box' : 'dot',
          );
          continue;
        }
        const boxes = (x % 2 ? [i - side, i + side] : [i - 1, i + 1]).filter(
          (j) => j >= 0 && j < 49 && (j % side) % 2 === 1,
        );
        const counts = boxes.map((j) => edgesOf(j).filter((k) => edges.has(k)).length);
        ui.button(
          grid,
          x % 2 ? '━' : '┃',
          edges.has(i)
            ? null
            : () => {
                const p = ui.turn;
                edges.add(i);
                let got = 0;
                for (const j of boxes)
                  if (edgesOf(j).every((k) => edges.has(k))) {
                    owners.set(j, p);
                    scores[p]++;
                    got++;
                  }
                ui.paint(got ? p : 1 - p);
                if (owners.size === 9) ui.victor(scores[0] > scores[1] ? 0 : 1);
              },
          edges.has(i) ? 'ink' : 'guide',
          counts.includes(3) ? 4 : counts.includes(2) ? -1 : 1,
          '선 ' + (i + 1),
        );
      }
    };
  },
);
const dice = '⚀⚁⚂⚃⚄⚅';
register(
  3,
  '주사위 다섯 개를 최대 세 번 굴립니다. 보관할 주사위를 누른 뒤 다시 굴리거나 이번 점수를 기록할 항목을 선택하세요. 모든 항목을 채워 총점을 겨룹니다.',
  (ui) => {
    const names = [
      '에이스',
      '듀스',
      '트레이',
      '포',
      '파이브',
      '식스',
      '초이스',
      '포 다이스',
      '풀하우스',
      '스몰 스트레이트',
      '라지 스트레이트',
      '요트',
    ];
    const sheets = [{}, {}];
    let rolls = 0,
      values = [],
      hold = new Set();
    function value(i) {
      const counts = range(6).map((n) => values.filter((v) => v === n + 1).length),
        sum = values.reduce((a, b) => a + b, 0);
      if (i < 6) return counts[i] * (i + 1);
      if (i === 6) return sum;
      if (i === 7) return Math.max(...counts) >= 4 ? sum : 0;
      if (i === 8) return counts.includes(3) && counts.includes(2) ? sum : 0;
      if (i === 9 || i === 10)
        return counts
          .map((x) => (x ? '1' : '0'))
          .join('')
          .includes('1'.repeat(i - 5))
          ? i === 9
            ? 15
            : 30
          : 0;
      return counts.includes(5) ? 50 : 0;
    }
    const total = (s) =>
      Object.values(s).reduce((a, b) => a + b, 0) +
      (range(6).reduce((a, i) => a + (s[i] || 0), 0) >= 63 ? 35 : 0);
    return () => {
      const p = ui.turn;
      ui.score('나 ' + total(sheets[0]) + '  ·  상대 ' + total(sheets[1]));
      const row = ui.row();
      values.forEach((v, i) =>
        ui.button(
          row,
          dice[v - 1],
          rolls < 3 && !p
            ? () => {
                hold.has(i) ? hold.delete(i) : hold.add(i);
                ui.paint();
              }
            : null,
          'die ' + (hold.has(i) ? 'selected' : ''),
        ),
      );
      if (rolls < 3)
        ui.button(
          ui.row(),
          '굴리기 ' + (3 - rolls) + '회',
          () => {
            values = range(5).map((i) => (hold.has(i) ? values[i] : 1 + random(6)));
            rolls++;
            ui.paint();
          },
          'primary',
          rolls ? 1 : 100,
        );
      const grid = ui.grid(3);
      names.forEach((n, i) =>
        ui.button(
          grid,
          n + ' ' + (sheets[p][i] ?? (rolls ? value(i) : '–')),
          rolls && sheets[p][i] === undefined
            ? () => {
                sheets[p][i] = value(i);
                rolls = 0;
                values = [];
                hold = new Set();
                ui.paint(1 - p);
                if (Object.keys(sheets[1]).length === names.length) {
                  const a = total(sheets[0]),
                    b = total(sheets[1]);
                  ui.victor(a === b ? -1 : a > b ? 0 : 1);
                }
              }
            : null,
          'score-cell',
          rolls ? value(i) : 0,
        ),
      );
    };
  },
);
register(
  5,
  '서로 다른 네 색의 암호를 맞혀 보세요. 히트는 색과 자리가 모두 맞은 수, 블로는 색만 맞은 수입니다. 기회는 열 번입니다.',
  (ui) => {
    const colors = ['진주', '산호', '호박', '비취', '청옥', '자수정'],
      answer = shuffle(range(6)).slice(0, 4),
      history = [];
    let guess = [];
    return () => {
      ui.score(Math.min(10, history.length + 1) + ' / 10');
      const entry = ui.grid(4);
      for (const i of range(4))
        ui.button(
          entry,
          colors[guess[i]] || '·',
          guess[i] !== undefined
            ? () => {
                guess.splice(i, 1);
                ui.paint();
              }
            : null,
          'gem gem' + guess[i],
        );
      const palette = ui.grid(3);
      colors.forEach((c, i) =>
        ui.button(
          palette,
          c,
          guess.length < 4 && !guess.includes(i)
            ? () => {
                guess.push(i);
                ui.paint();
              }
            : null,
          'gem gem' + i,
        ),
      );
      if (guess.length === 4)
        ui.button(
          ui.row(),
          '정답 확인',
          () => {
            const hit = guess.filter((x, i) => answer[i] === x).length,
              blow = guess.filter((x) => answer.includes(x)).length - hit;
            history.unshift(
              guess.map((x) => colors[x]).join(' · ') + '　 ' + hit + 'H ' + blow + 'B',
            );
            guess = [];
            ui.paint();
            if (hit === 4) ui.finish('암호 해독 성공');
            else if (history.length === 10)
              ui.finish('정답　' + answer.map((x) => colors[x]).join(' · '));
          },
          'primary',
        );
      for (const line of history) ui.section(line);
    };
  },
);
