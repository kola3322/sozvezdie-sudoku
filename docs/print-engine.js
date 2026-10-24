import {complete,countSolutions} from './engine.js';

export const PRINT_SIZES={
  4:{n:4,rows:2,cols:2,min:4,max:15,defaultClues:9,boardMM:56},
  6:{n:6,rows:2,cols:3,min:12,max:35,defaultClues:18,boardMM:72},
  9:{n:9,rows:3,cols:3,min:24,max:80,defaultClues:31,boardMM:90}
};
export function validatePrintConfig({n,clues,count}){
  const c=PRINT_SIZES[n],errors={};
  if(!c)errors.n='Выбери размер 4×4, 6×6 или 9×9.';
  if(!Number.isInteger(count)||count<1||count>50)errors.count='Введи целое число от 1 до 50.';
  if(c&&(!Number.isInteger(clues)||clues<c.min||clues>c.max))errors.clues=`Введи целое число от ${c.min} до ${c.max}.`;
  return errors;
}
export function generatePrintPuzzle({n,clues},{rng=Math.random,exclude=new Set(),deadline=Date.now()+10000}={}){
  const errors=validatePrintConfig({n,clues,count:1});
  if(Object.keys(errors).length)throw Error(Object.values(errors)[0]);
  const c=PRINT_SIZES[n];
  const check=()=>{if(Date.now()>=deadline)throw Error('Не удалось подготовить набор за отведённое время. Увеличь число исходных клеток или уменьши количество задач и попробуй ещё раз.');};
  for(;;){
    check();const solution=complete(c,rng),givens=[...solution],order=Array.from({length:n*n},(_,i)=>i);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    let remaining=n*n;
    for(const index of order){
      check();if(remaining===clues)break;
      const previous=givens[index];givens[index]=0;
      if(countSolutions(givens,c,2,check)===1)remaining--;else givens[index]=previous;
    }
    const signature=givens.join(',');
    if(remaining===clues&&!exclude.has(signature))return {n,rows:c.rows,cols:c.cols,givens,solution,signature};
  }
}
export function printSizeLimits(n,paper){
  const c=PRINT_SIZES[n];if(!c||!['A4','A5'].includes(paper))throw Error('Неверный формат листа.');
  const width=paper==='A4'?210:148,height=paper==='A4'?297:210;
  return {min:n*9+2,max:Math.min(width-24,height-64),defaultSize:c.boardMM};
}
export function printLayout(n,paper,requestedMM=PRINT_SIZES[n]?.boardMM){
  const limits=printSizeLimits(n,paper);
  if(!Number.isFinite(requestedMM))throw Error('Неверный размер задачи.');
  const boardMM=Math.max(limits.min,Math.min(limits.max,Math.round(requestedMM)));
  const width=paper==='A4'?210:148,height=paper==='A4'?297:210;
  const columns=Math.max(1,Math.floor((width-24+8)/(boardMM+8)));
  const cardHeight=boardMM+20;
  const rows=Math.max(1,Math.floor((height-24-20+8)/(cardHeight+8)));
  return {width,height,columns,rows,perPage:columns*rows,boardMM,cardHeight};
}
