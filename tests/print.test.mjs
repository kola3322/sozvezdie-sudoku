import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINT_SIZES,validatePrintConfig,generatePrintPuzzle,printLayout,printSizeLimits} from '../docs/print-engine.js';
import {countSolutions,validBoard} from '../docs/engine.js';
let seed=783146;
const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const c of Object.values(PRINT_SIZES))test(`print ${c.n}×${c.n}: exact givens, unique solutions and different tasks`,()=>{
  const seen=new Set();
  for(const clues of [c.min,c.defaultClues,c.max])for(let i=0;i<10;i++){
    const p=generatePrintPuzzle({n:c.n,clues},{rng,exclude:seen});
    assert.equal(p.givens.filter(Boolean).length,clues);
    assert.equal(countSolutions(p.givens,c),1);
    assert.ok(validBoard(p.solution,c));
    assert.ok(p.givens.every((v,j)=>!v||v===p.solution[j]));
    assert.ok(!seen.has(p.signature));seen.add(p.signature);
  }
});
test('invalid print settings and timeouts never return a partial puzzle',()=>{
  for(const count of [0,51,1.5,NaN])assert.ok(validatePrintConfig({n:4,clues:9,count}).count);
  for(const clues of [3,16,9.5,NaN])assert.ok(validatePrintConfig({n:4,clues,count:1}).clues);
  assert.ok(validatePrintConfig({n:5,clues:9,count:1}).n);
  assert.throws(()=>generatePrintPuzzle({n:4,clues:3}),/целое число/);
  assert.throws(()=>generatePrintPuzzle({n:9,clues:24},{deadline:Date.now()-1}),/отведённое время/);
  for(const count of [1,50])assert.deepEqual(validatePrintConfig({n:4,clues:9,count}),{});
});
test('A4/A5 layouts fit margins and keep every cell at least 9 mm',()=>{
  const expected={A4:{4:9,6:4,9:2},A5:{4:4,6:1,9:1}};
  for(const paper of ['A4','A5'])for(const n of [4,6,9]){
    const l=printLayout(n,paper);
    assert.equal(l.perPage,expected[paper][n]);
    assert.ok(l.columns*l.boardMM+(l.columns-1)*8<=l.width-24);
    assert.ok(l.rows*l.cardHeight+(l.rows-1)*8+20<=l.height-24);
    assert.ok(l.boardMM/n>=9);
  }
});
test('resizing stays inside the sheet at every slider position',()=>{
  for(const paper of ['A4','A5'])for(const n of [4,6,9]){
    const limits=printSizeLimits(n,paper);let previous=Infinity;
    for(let mm=limits.min;mm<=limits.max;mm++){
      const l=printLayout(n,paper,mm);
      assert.equal(l.boardMM,mm);
      assert.ok(l.perPage<=previous);previous=l.perPage;
      assert.ok(l.columns*mm+(l.columns-1)*8<=l.width-24);
      assert.ok(l.rows*l.cardHeight+(l.rows-1)*8+20<=l.height-24);
      assert.ok((mm-2)/n>=9);
    }
    assert.equal(printLayout(n,paper,1).boardMM,limits.min);
    assert.equal(printLayout(n,paper,999).boardMM,limits.max);
  }
  assert.throws(()=>printLayout(4,'A4',NaN),/размер задачи/);
});
