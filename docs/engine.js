export const LEVELS = [
  {level:1,name:'Первые шаги',n:4,rows:2,cols:2,min:9,max:9,target:9},
  {level:2,name:'Уже умею',n:4,rows:2,cols:2,min:6,max:6,target:6},
  {level:3,name:'Следопыт',n:6,rows:2,cols:3,min:18,max:21,target:18},
  {level:4,name:'Знаток',n:6,rows:2,cols:3,min:10,max:15,target:13},
  {level:5,name:'Мастер',n:9,rows:3,cols:3,min:28,max:35,target:31}
];
export function config(level) {const c=LEVELS[level-1];if(!c)throw Error('Неизвестный уровень');return c;}
export function units(c) {
  const out=[];
  for(let r=0;r<c.n;r++)out.push({kind:'строке',indices:Array.from({length:c.n},(_,col)=>r*c.n+col)});
  for(let col=0;col<c.n;col++)out.push({kind:'столбце',indices:Array.from({length:c.n},(_,r)=>r*c.n+col)});
  for(let r=0;r<c.n;r+=c.rows)for(let col=0;col<c.n;col+=c.cols){const indices=[];for(let dr=0;dr<c.rows;dr++)for(let dc=0;dc<c.cols;dc++)indices.push((r+dr)*c.n+col+dc);out.push({kind:'блоке',indices});}
  return out;
}
export function candidates(board,index,c){
  if(board[index])return [];
  const r=Math.floor(index/c.n),col=index%c.n,used=new Set();
  for(let k=0;k<c.n;k++){used.add(board[r*c.n+k]);used.add(board[k*c.n+col]);}
  const br=Math.floor(r/c.rows)*c.rows,bc=Math.floor(col/c.cols)*c.cols;
  for(let y=0;y<c.rows;y++)for(let x=0;x<c.cols;x++)used.add(board[(br+y)*c.n+bc+x]);
  return Array.from({length:c.n},(_,i)=>i+1).filter(v=>!used.has(v));
}
export function validBoard(board,c){return board.length===c.n*c.n&&board.every(v=>Number.isInteger(v)&&v>=0&&v<=c.n)&&units(c).every(u=>{const v=u.indices.map(i=>board[i]).filter(Boolean);return new Set(v).size===v.length;});}
export function countSolutions(input,c,limit=2,check=()=>{}){
  if(!validBoard(input,c))return 0;
  const b=[...input];let count=0;
  function visit(){check();if(count>=limit)return;let best=-1,opts=[];
    for(let i=0;i<b.length;i++)if(!b[i]){const cs=candidates(b,i,c);if(!cs.length)return;if(best<0||cs.length<opts.length){best=i;opts=cs;if(cs.length===1)break;}}
    if(best<0){count++;return;}
    for(const v of opts){b[best]=v;visit();if(count>=limit)break;}b[best]=0;
  }visit();return count;
}
export function nextMove(board,c){
  const cs=board.map((v,i)=>v?[]:candidates(board,i,c));
  for(let i=0;i<board.length;i++)if(!board[i]&&cs[i].length===1)return {index:i,value:cs[i][0],technique:'single',reason:'После проверки строки, столбца и блока здесь остаётся только один подходящий символ.'};
  for(const u of units(c))for(let v=1;v<=c.n;v++){const available=u.indices.filter(i=>!board[i]&&cs[i].includes(v));if(available.length===1)return {index:available[0],value:v,technique:'hidden',reason:`В этой ${u.kind} для одного из недостающих символов подходит только выделенная клетка.`};}
  return null;
}
export function logicalSolve(input,c){
  const board=[...input],steps=[];if(!validBoard(board,c))return {solved:false,steps,board};
  while(board.includes(0)){const move=nextMove(board,c);if(!move)break;board[move.index]=move.value;steps.push(move);}
  return {solved:!board.includes(0)&&validBoard(board,c),steps,board};
}
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function complete(c,rng){
  const digits=shuffle(Array.from({length:c.n},(_,i)=>i+1),rng);
  const order=(size)=>shuffle(Array.from({length:c.n/size},(_,i)=>i),rng).flatMap(g=>shuffle(Array.from({length:size},(_,i)=>g*size+i),rng));
  const rr=order(c.rows),cc=order(c.cols);
  return rr.flatMap(r=>cc.map(col=>digits[(c.cols*(r%c.rows)+Math.floor(r/c.rows)+col)%c.n]));
}
export function generatePuzzle(level,{rng=Math.random,previous=null}={}){
  const c=config(level);
  for(let attempt=0;attempt<100;attempt++){
    const solution=complete(c,rng),givens=[...solution];
    const order=shuffle(Array.from({length:c.n*c.n},(_,i)=>i),rng);let remaining=givens.length;
    for(const index of order){if(remaining<=c.target)break;const old=givens[index];givens[index]=0;const result=logicalSolve(givens,c);if(!result.solved||(level===1&&result.steps.some(s=>s.technique!=='single')))givens[index]=old;else remaining--;}
    const analysis=logicalSolve(givens,c),signature=givens.join('');
    if(remaining>=c.min&&remaining<=c.max&&signature!==previous&&analysis.solved&&countSolutions(givens,c)===1){
      return {level,n:c.n,rows:c.rows,cols:c.cols,givens,solution,signature,analysis:{givens:remaining,steps:analysis.steps.length,hidden:analysis.steps.filter(s=>s.technique==='hidden').length},generatorVersion:3};
    }
  }
  throw Error('Не получилось подготовить задание. Попробуй ещё раз.');
}
export function createGame(puzzle){return {...puzzle,id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,values:[...puzzle.givens],history:[],errors:[],rewarded:[],penalties:[],revealed:[],completed:false,delta:0,selected:puzzle.givens.indexOf(0)};}
export function checkGame(game,withScore){
  if(game.completed||game.values.includes(0))return {checked:false,delta:0};
  const errors=[];let delta=0;
  game.values.forEach((v,i)=>{if(game.givens[i])return;if(v!==game.solution[i]){errors.push(i);const key=`${i}:${v}`;if(withScore&&!game.penalties.includes(key)){delta--;game.penalties.push(key);}}else if(withScore&&!game.rewarded.includes(i)&&!game.revealed.includes(i)){delta++;game.rewarded.push(i);}});
  game.errors=errors;game.delta+=delta;game.completed=errors.length===0;return {checked:true,delta};
}
export function editGame(game,index,value){if(game.completed||game.givens[index]||value<0||value>game.n||game.values[index]===value)return false;game.history.push([...game.values]);game.values[index]=value;game.errors=game.errors.filter(i=>i!==index);return true;}
export function clearGame(game){if(game.completed||game.values.every((v,i)=>v===game.givens[i]))return false;game.history.push([...game.values]);game.values=[...game.givens];game.errors=[];return true;}
export function undoGame(game){if(game.completed||!game.history.length)return false;game.values=game.history.pop();game.errors=[];return true;}
