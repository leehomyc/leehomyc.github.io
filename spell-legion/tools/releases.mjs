import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function mergeReleases(seed,commits){
  const rows=seed.entries.map(r=>({...r})).reverse(),known=new Set(rows.map(r=>r.revision).filter(Boolean));let patch=Math.max(0,...rows.map(r=>Number(r.version.split('.').at(-1))||0));
  for(const c of [...commits].reverse()){
    if(known.has(c.revision))continue;const draft=rows.find(r=>!r.revision&&r.subject===c.subject);
    if(draft){draft.revision=c.revision;draft.at=c.at}else rows.push({...c,version:`0.1.${++patch}`,zh:c.subject,en:c.subject,ja:c.subject,ko:c.subject});known.add(c.revision);
  }
  rows.sort((a,b)=>Number(b.version.split('.').at(-1))-Number(a.version.split('.').at(-1)));
  return {current:rows[0]?.version||'0.1.0',entries:rows};
}
export async function releaseHistory(root){
  const seed=JSON.parse(await readFile(resolve(root,'spell-legion/releases.json'),'utf8'));let commits=[];
  try{const log=execFileSync('git',['log','--first-parent','--no-merges','--since=2026-11-07T00:00:00+08:00','--format=%H%x09%cI%x09%s','--','spell-legion','cloudflare','RELEASE_SOURCE'],{cwd:root,encoding:'utf8'});commits=log.trim().split('\n').filter(Boolean).map(s=>{const [revision,at,...subject]=s.split('\t');return {revision,at,subject:subject.join('\t')}})}catch{/* A source archive retains the checked-in historical records. */}
  return mergeReleases(seed,commits);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=resolve(process.argv[2]||'.'),data=await releaseHistory(root);await writeFile(resolve(root,'spell-legion/releases.json'),JSON.stringify(data,null,2)+'\n');console.log(`${data.entries.length} release records; v${data.current}`);
}
