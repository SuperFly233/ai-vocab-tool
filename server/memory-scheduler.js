import * as library from 'ts-fsrs';
import '../memory-algorithm.js';
export const {MEMORY_ALGORITHM,MEMORY_PARAMETERS,MemoryConflict,learningDay,enroll,preview,score,undoScore,confirmContent,memoryCurve,reviewQueue}=globalThis.MemoryAlgorithm.create(library);
export async function contentFingerprint(scene,target){
 const value={quote:scene.quote||'',translation:scene.translation||'',media:(scene.media||[]).map(v=>v.id),target:{id:target.id,phrase:target.phrase||'',meaning:target.meaning||''}};
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
