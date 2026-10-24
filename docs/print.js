import {PRINT_SIZES,validatePrintConfig,printLayout,printSizeLimits} from './print-engine.js';
import {shapes} from './symbols.js';

const $=id=>document.getElementById(id);
let batch=null,worker=null,watchdog=null,busy=false,printing=false;
const config=()=>({n:Number($('grid-size').value),count:$('task-count').valueAsNumber,clues:$('clue-count').valueAsNumber,symbols:$('print-symbols').value,color:$('print-symbols').value==='numbers'?'mono':$('print-color').value,paper:$('paper-format').value,boardMM:$('board-size').valueAsNumber});
const isFresh=c=>batch&&['n','count','clues'].every(key=>batch.config[key]===c[key]);

function update(){
  syncBoardSize();
  const c=config(),size=PRINT_SIZES[c.n],errors=validatePrintConfig(c),valid=!Object.keys(errors).length;
  for(const [key,input] of [['count','task-count'],['clues','clue-count']]){
    $(key+'-error').textContent=errors[key]||'';
    $(input).setAttribute('aria-invalid',String(Boolean(errors[key])));
  }
  $('clues-help').textContent=errors.clues?`От ${size.min} до ${size.max} исходных клеток`:`В каждой задаче: ${c.clues} исходных, ${c.n*c.n-c.clues} пустых`;
  $('color-control').hidden=c.symbols==='numbers';
  $('numbers-note').hidden=c.symbols!=='numbers';
  if(c.symbols==='numbers')$('print-color').value='mono';
  $('config-fields').disabled=busy||printing;
  $('generate').disabled=busy||printing||!valid;
  $('generate').textContent=batch?'Сгенерировать заново':'Сгенерировать';
  $('print-button').disabled=busy||printing||!valid||!isFresh(c);
  document.body.classList.toggle('print-ready',!busy&&valid&&Boolean(isFresh(c)));
  $('generation-progress').hidden=!busy;
  $('preview-empty').hidden=Boolean(batch);
  $('preview-status').textContent=busy?'Подготавливаем новый набор. Это может занять немного времени.':batch&&!isFresh(c)?'Параметры изменены. Сгенерируй новый набор перед печатью.':'';
  $('print-help').textContent=`Бумага ${c.paper.replace('A','А')} · масштаб 100% · колонтитулы браузера выключены`;
  $('paper-size').textContent=`@page{size:${c.paper} portrait;margin:0}`;
}

function syncBoardSize(){
  const c=config(),limits=printSizeLimits(c.n,c.paper),input=$('board-size');
  const value=Math.max(limits.min,Math.min(limits.max,c.boardMM));
  input.min=limits.min;input.max=limits.max;input.value=value;
  if(value!==c.boardMM)$('board-size-notice').textContent=`Размер изменён на ${value} мм, чтобы поле помещалось на листе, а клетки оставались удобными для письма.`;
  $('board-size-value').value=`${value} × ${value} мм`;
  input.setAttribute('aria-valuetext',`${value} на ${value} миллиметров`);
  $('board-size-help').textContent=`От ${limits.min} до ${limits.max} мм. Чем крупнее поле, тем меньше задач на листе.`;
}

function symbol(value,mode){
  return mode==='numbers'?`<span>${value}</span>`:`<svg class="print-shape print-v${value}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${shapes[value]}</svg>`;
}
function task(p,index,mode){
  const cells=p.givens.map((v,i)=>{
    const row=Math.floor(i/p.n),col=i%p.n;
    const classes=['print-cell',col===p.n-1?'edge-r':(col+1)%p.cols===0?'block-r':'',row===p.n-1?'edge-b':(row+1)%p.rows===0?'block-b':''].filter(Boolean).join(' ');
    return `<div class="${classes}" data-value="${v}">${v?symbol(v,mode):''}</div>`;
  }).join('');
  return `<article class="print-task"><h3>Судоку ${index+1}</h3><div class="print-grid" style="--n:${p.n}" role="img" aria-label="Судоку ${index+1}, поле ${p.n} на ${p.n}">${cells}</div>${mode==='figures'?`<div class="print-legend" aria-label="Все фигуры этой задачи">${Array.from({length:p.n},(_,i)=>symbol(i+1,mode)).join('')}</div>`:''}</article>`;
}
function renderPages(){
  update();if(!batch)return;
  const c=config(),layout=printLayout(batch.config.n,c.paper,c.boardMM),pages=Math.ceil(batch.puzzles.length/layout.perPage),sheets=$('sheets');
  sheets.style.setProperty('--paper-width',layout.width+'mm');
  sheets.style.setProperty('--paper-height',layout.height+'mm');
  sheets.innerHTML=Array.from({length:pages},(_,page)=>{
    const offset=page*layout.perPage,colored=c.symbols==='figures'&&c.color==='color';
    return `<p class="page-label screen-only">Лист ${page+1} из ${pages}</p><div class="paper-frame"><section class="paper${colored?' color':''}" aria-label="Лист ${page+1}" style="--columns:${layout.columns};--board-mm:${layout.boardMM}mm;--card-height:${layout.cardHeight}mm"><header class="paper-header"><img src="./${colored?'logo':'logo-mono'}.svg" alt="" width="34" height="34"><strong>Созвездие <span>судоку</span></strong></header><div class="paper-tasks">${batch.puzzles.slice(offset,offset+layout.perPage).map((p,i)=>task(p,offset+i,c.symbols)).join('')}</div></section></div>`;
  }).join('');
  $('batch-summary').textContent=`Задач: ${batch.puzzles.length} · листов: ${pages} · ${c.paper.replace('A','А')} · поле ${layout.boardMM} мм`;
  scalePages();
}
function scalePages(){
  if(!batch)return;
  const c=config(),layout=printLayout(batch.config.n,c.paper,c.boardMM),width=layout.width*96/25.4,height=layout.height*96/25.4;
  const scale=Math.min(1,$('sheets').clientWidth/width);
  for(const frame of $('sheets').querySelectorAll('.paper-frame')){
    frame.style.width=width*scale+'px';frame.style.height=height*scale+'px';
    frame.querySelector('.paper').style.transform=`scale(${scale})`;
  }
}
function stop(){clearTimeout(watchdog);worker?.terminate();worker=null;busy=false;}
function fail(message){stop();$('generation-error').textContent=message;update();}
$('print-form').addEventListener('submit',event=>{
  event.preventDefault();if($('generate').disabled)return;
  const requested=config();busy=true;$('generation-error').textContent='';
  $('batch-progress').max=requested.count;$('batch-progress').value=0;$('progress-label').textContent=`Готово 0 из ${requested.count}`;update();
  try{
    worker=new Worker(new URL('./print.worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      if(data.type==='progress'){$('batch-progress').value=data.done;$('progress-label').textContent=`Готово ${data.done} из ${data.total}`;}
      else if(data.type==='complete'){
        stop();batch={config:requested,puzzles:data.puzzles};renderPages();$('preview-status').textContent='Набор готов. Можно печатать или сохранить в PDF через окно печати.';
      }else if(data.type==='error')fail(data.message);
    };
    worker.onerror=()=>fail('Не удалось запустить генерацию. Попробуй ещё раз или обнови страницу.');
    watchdog=setTimeout(()=>fail('Генерация заняла слишком много времени. Уменьши количество задач или добавь исходных клеток и попробуй ещё раз.'),120000);
    worker.postMessage({...requested,previous:batch?.puzzles.map(p=>p.signature)||[]});
  }catch{fail('Не удалось запустить генерацию. Попробуй обновить страницу.');}
});
$('cancel-generation').addEventListener('click',()=>{stop();update();if(!batch||isFresh(config()))$('preview-status').textContent=batch?'Генерация отменена. Предыдущий набор сохранён.':'Генерация отменена.';});
$('print-form').addEventListener('input',event=>{
  if(event.target.id==='board-size'){$('board-size-notice').textContent='';renderPages();}
  if(['task-count','clue-count'].includes(event.target.id)){$('generation-error').textContent='';update();}
});
$('print-form').addEventListener('change',event=>{
  $('generation-error').textContent='';
  if(event.target.id==='grid-size'){
    const size=PRINT_SIZES[config().n],input=$('clue-count');input.min=size.min;input.max=size.max;
    if(!Number.isInteger(input.valueAsNumber)||input.valueAsNumber<size.min||input.valueAsNumber>size.max){input.value=size.defaultClues;$('size-notice').textContent=`Для этого размера выбрано ${size.defaultClues} исходных клеток. Можно изменить.`;}else $('size-notice').textContent='';
  }
  if(['print-symbols','print-color','paper-format','grid-size'].includes(event.target.id))renderPages();else update();
});
$('reset-board-size').addEventListener('click',()=>{$('board-size').value=PRINT_SIZES[config().n].boardMM;$('board-size-notice').textContent='';renderPages();});
$('print-button').addEventListener('click',async()=>{
  if($('print-button').disabled)return;
  printing=true;update();
  try{
    await document.fonts.ready;
    await Promise.all([...$('sheets').querySelectorAll('img')].map(img=>img.decode()));
    if(!isFresh(config())||busy)return;
    window.print();
  }catch{$('generation-error').textContent='Не удалось открыть печать. Попробуй ещё раз.';}
  finally{printing=false;update();}
});
window.addEventListener('beforeprint',update);
window.addEventListener('pagehide',stop);
window.addEventListener('pageshow',update);
new ResizeObserver(scalePages).observe($('sheets'));
update();
