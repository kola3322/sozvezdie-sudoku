import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,generatePuzzle,countSolutions,logicalSolve,validBoard,createGame,checkGame,editGame,clearGame,undoGame} from '../docs/engine.js';
let seed=672938;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const c of LEVELS)test(`100 puzzles: level ${c.level}`,()=>{let prev=null;for(let k=0;k<100;k++){const p=generatePuzzle(c.level,{rng,previous:prev});assert.notEqual(p.signature,prev);assert.equal(countSolutions(p.givens,c),1);assert.ok(validBoard(p.solution,c));assert.deepEqual(logicalSolve(p.givens,c).board,p.solution);assert.ok(p.analysis.givens>=c.min&&p.analysis.givens<=c.max);prev=p.signature;}});
test('score checks, correction, repeated errors, clear, undo, hints',()=>{
 const g=createGame(generatePuzzle(1,{rng})),empty=g.givens.map((v,i)=>v?-1:i).filter(i=>i>=0),i=empty[0];
 g.values=[...g.solution];g.values[i]=g.solution[i]%g.n+1;
 assert.equal(checkGame(g,true).delta,empty.length-2);assert.equal(checkGame(g,true).delta,0);
 const score=g.delta;clearGame(g);assert.deepEqual(g.values,g.givens);assert.equal(g.delta,score);undoGame(g);assert.equal(checkGame(g,true).delta,0);
 editGame(g,i,g.solution[i]);assert.equal(checkGame(g,true).delta,1);assert.ok(g.completed);assert.equal(checkGame(g,true).delta,0);
 const h=createGame(generatePuzzle(2,{rng}));h.values=[...h.solution];const hEmpty=h.givens.map((v,i)=>v?-1:i).filter(i=>i>=0);h.revealed.push(hEmpty[0]);assert.equal(checkGame(h,true).delta,hEmpty.length-1);
});
test('incomplete board cannot be checked and givens cannot be edited',()=>{const g=createGame(generatePuzzle(1,{rng}));assert.equal(checkGame(g,true).checked,false);const i=g.givens.findIndex(Boolean);assert.equal(editGame(g,i,0),false);});
test('first level leaves seven cells for the player and needs only simple moves',()=>{for(let k=0;k<40;k++){const p=generatePuzzle(1,{rng});assert.equal(p.givens.filter(Boolean).length,9);assert.equal(p.givens.filter(v=>!v).length,7);assert.ok(logicalSolve(p.givens,LEVELS[0]).steps.every(s=>s.technique==='single'));}});
