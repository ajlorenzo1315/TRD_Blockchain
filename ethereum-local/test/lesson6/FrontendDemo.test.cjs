const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const demo = require('../../frontend/lesson-06/demo-core.js');
const root = path.resolve(__dirname, '../../frontend/lesson-06');
describe('Lección 6 extendida — simulación frontend', () => {
  it('01. dispone de un ejército ficticio', () => assert.ok(demo.enemies.length >= 4));
  it('02. tiene héroes de prueba sin MetaMask', () => assert.ok(demo.heroes.length >= 2));
  it('03. todos los personajes tienen ADN válido', () => {
    for (const z of [...demo.heroes, ...demo.enemies]) assert.match(z.dna, /^\d{16}$/);
  });
  it('04. convierte enemigos a tupla compatible con renderZombie', () => {
    const tuple = demo.toTuple(demo.enemies[0]);
    assert.equal(tuple[0], demo.enemies[0].name);
    assert.equal(tuple.length, 6);
  });
  it('05. simulación determinista para los mismos luchadores', () => {
    const a = demo.simulateBattle(demo.heroes[0], demo.enemies[0]);
    const b = demo.simulateBattle(demo.heroes[0], demo.enemies[0]);
    assert.deepEqual(a, b);
  });
  it('06. cada golpe conserva vida no negativa', () => {
    const battle = demo.simulateBattle(demo.heroes[0], demo.enemies[0]);
    for (const t of battle.turns) assert.ok(t.heroHp >= 0 && t.enemyHp >= 0);
  });
  it('07. solo gana un luchador', () => assert.match(demo.simulateBattle(demo.heroes[0], demo.enemies[0]).winner, /^(hero|enemy)$/));
  it('08. no hay llamadas blockchain en motor de simulación', () => {
    const code = fs.readFileSync(path.join(root, 'demo-core.js'), 'utf8');
    assert.doesNotMatch(code, /ethereum\.request|\.send\(|writeContract|eth_sendTransaction/);
  });
  it('09. existe arena y botones de simulación', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    for (const id of ['demoFight', 'demoHero', 'demoEnemy', 'demoArmy', 'demoHeroHp', 'demoEnemyHp']) assert.ok(html.includes(`id="${id}"`));
  });
  it('10. manifest de imágenes no contiene URLs externas', () => {
    const code = fs.readFileSync(path.join(root, 'zombie-assets.js'), 'utf8');
    assert.doesNotMatch(code, /https?:\/\//);
  });
});
