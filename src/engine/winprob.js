// Probabilidade de vitória AO VIVO via Skellam (convolução de dois Poisson).
// Backend: não é exibida na tela; serve para o motor "saber" quem está por cima e para
// PROVAR (nos testes) que cada overall/tática/cartão muda a chance de ganhar.

function poissonPmf(lambda, K) {
  const p = [];
  let v = Math.exp(-lambda);
  for (let k = 0; k <= K; k++) {
    p.push(v);
    v = (v * lambda) / (k + 1);
  }
  return p;
}

// a,b = placar atual; lamA90,lamB90 = λ por 90'; minute = minuto atual.
// knockout: empate vai a prorrogação/pênaltis (versão simples: divide o empate).
export function winProb(a, b, lamA90, lamB90, minute, { knockout = false } = {}) {
  const tau = Math.max(0, 90 - minute);
  const muA = (lamA90 * tau) / 90;
  const muB = (lamB90 * tau) / 90;
  const K = 14;
  const pA = poissonPmf(muA, K);
  const pB = poissonPmf(muB, K);
  let win = 0, draw = 0, loss = 0;
  for (let i = 0; i <= K; i++) {
    for (let j = 0; j <= K; j++) {
      const d = a + i - (b + j);
      const pr = pA[i] * pB[j];
      if (d > 0) win += pr;
      else if (d === 0) draw += pr;
      else loss += pr;
    }
  }
  const s = win + draw + loss || 1;
  win /= s; draw /= s; loss /= s;
  if (knockout) {
    // empate → pênaltis ~50/50 (campo neutro: sem viés)
    win += draw * 0.5;
    loss += draw * 0.5;
    draw = 0;
  }
  return { win, draw, loss };
}
