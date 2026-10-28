import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const open=process.argv.includes('--open');
if(open&&process.platform!=='darwin')throw new Error('Opening Xcode requires a Mac. Run npm run ios:sync to prepare the project on this computer.');
const publicConfig=JSON.parse(await readFile(new URL('../config/public-cloud.json',import.meta.url),'utf8'));
const env={...process.env,VITE_SUPABASE_URL:process.env.VITE_SUPABASE_URL||publicConfig.url,VITE_SUPABASE_PUBLISHABLE_KEY:process.env.VITE_SUPABASE_PUBLISHABLE_KEY||publicConfig.publishableKey};
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(env.VITE_SUPABASE_URL)||!env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_'))throw new Error('Invalid public cloud configuration. Never supply privileged server keys to this build.');
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,env,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
run(['node_modules/typescript/bin/tsc','--noEmit']);run(['node_modules/vite/bin/vite.js','build']);
const files=(await readdir(path.join(root,'dist/assets'))).filter(f=>f.endsWith('.js'));
const output=(await Promise.all(files.map(f=>readFile(path.join(root,'dist/assets',f),'utf8')))).join('\n');
if(!output.includes(env.VITE_SUPABASE_URL)||!output.includes(env.VITE_SUPABASE_PUBLISHABLE_KEY))throw new Error('Cloud configuration was not embedded; refusing to sync an unconfigured app.');
run(['node_modules/@capacitor/cli/bin/capacitor','sync','ios']);
if(open)run(['node_modules/@capacitor/cli/bin/capacitor','open','ios']);
else console.log('iPhone project prepared with the configured cloud account. Open ios/App/App.xcodeproj on a Mac to sign and run.');
