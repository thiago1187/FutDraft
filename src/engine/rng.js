// PRNG semeável (mulberry32). Determinístico: mesma seed → mesma sequência de números.
// É a base para reproduzir uma partida pela seed (replay/multiplayer) e para testes
// determinísticos. O motor passa a usar SÓ este gerador (nada de Math.random dentro da
// simulação) — a seed é semeada na criação da partida e persistida na sala.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed aleatória de 32 bits (usada quando ninguém passou uma seed explícita).
export function randomSeed() {
  return (Math.random() * 4294967296) >>> 0;
}

// Normal padrão N(0,1) (Box-Muller) a partir de um rng [0,1).
export function gaussian(rng) {
  let u = 0, v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
