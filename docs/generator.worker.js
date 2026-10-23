import {generatePuzzle} from './engine.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,puzzle:generatePuzzle(data.level,{previous:data.previous})});}catch(error){self.postMessage({id:data.id,error:error.message});}};
