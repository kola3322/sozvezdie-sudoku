import {generatePrintPuzzle,validatePrintConfig} from './print-engine.js';
self.onmessage=({data:config})=>{
  try{
    const errors=validatePrintConfig(config);if(Object.keys(errors).length)throw Error(Object.values(errors)[0]);
    const batchDeadline=Date.now()+120000,puzzles=[],seen=new Set(config.previous||[]);
    for(let i=0;i<config.count;i++){
      const puzzle=generatePrintPuzzle(config,{exclude:seen,deadline:Math.min(batchDeadline,Date.now()+10000)});
      puzzles.push(puzzle);seen.add(puzzle.signature);self.postMessage({type:'progress',done:i+1,total:config.count});
    }
    self.postMessage({type:'complete',puzzles});
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
