import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('production build embeds direct public Supabase environment variables',async()=>{
 const output=await mkdtemp(path.join(tmpdir(),'saddle-config-test-'));
 const url='https://saddle-config-regression.supabase.co';
 const key='sb_publishable_regression_fixture_only';
 try{
  const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir',output,'--emptyOutDir'],{env:{...process.env,VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:key},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const paths=(await readdir(path.join(output,'assets'))).filter(f=>f.endsWith('.js'));
  const js=(await Promise.all(paths.map(f=>readFile(path.join(output,'assets',f),'utf8')))).join('\n');
  assert.ok(js.includes(url),'configured URL must be in production bundle');
  assert.ok(js.includes(key),'publishable key must be in production bundle');
  assert.ok(!js.includes('.VITE_SUPABASE_URL'),'must not defer Vite env lookup until runtime');
 }finally{await rm(output,{recursive:true,force:true});}
});
