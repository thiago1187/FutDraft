// Ordem de escolha em "snake": 1,2,3 | 3,2,1 | 1,2,3 ...
export function snakeOrder(managerIds, rounds) {
  const order = [];
  for (let r = 0; r < rounds; r++) {
    const seq = r % 2 === 0 ? managerIds : [...managerIds].reverse();
    for (const id of seq) order.push(id);
  }
  return order;
}

// Informações úteis sobre a escolha atual.
export function draftInfo(draft, managersCount) {
  const total = draft.order.length;
  const pickIndex = draft.pickIndex;
  const round = Math.floor(pickIndex / managersCount) + 1;
  const rounds = total / managersCount;
  const currentPickerId = draft.order[pickIndex] || null;
  const direction = (round - 1) % 2 === 0 ? "down" : "up";
  return { round, rounds, pick: pickIndex + 1, total, currentPickerId, direction };
}
