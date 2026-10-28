import {useEffect,useRef,useState} from 'react';
import {cloud} from './cloud';

type Critique={id:string;created_at:string;clip_name:string;ride_id:string|null;focus:string;critique:string;model:string};
export function CritiqueHistory({refreshKey}:{refreshKey:number}) {
 const [items,setItems]=useState<Critique[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[more,setMore]=useState(false);
 const generation=useRef(0),loading=useRef(false);
 async function load(offset:number,version:number){
  if(loading.current)return;loading.current=true;setBusy(true);setError('');
  try{
   if(!cloud)throw new Error('Please sign in to load saved critiques.');
   const {data,error}=await cloud.from('saddle_critiques').select('id,created_at,clip_name,ride_id,focus,critique,model').order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+20);
   if(error)throw new Error('Could not load saved critiques. Please retry.');
   if(version===generation.current){const page=(data||[]) as Critique[];setMore(page.length>20);setItems(previous=>offset?[...previous,...page.slice(0,20)].filter((item,i,all)=>all.findIndex(x=>x.id===item.id)===i):page.slice(0,20));}
  }catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'Could not load saved critiques.');}
  finally{if(version===generation.current){loading.current=false;setBusy(false);}}
 }
 useEffect(()=>{const version=++generation.current;loading.current=false;void load(0,version);return()=>{generation.current++;};},[refreshKey]);
 return <section className="panel settings"><div className="section-heading"><h2>Saved critiques</h2><button className="secondary" disabled={busy} onClick={()=>void load(0,generation.current)}>Refresh</button></div>
  <p className="small muted">Private to your account and available on your other devices. Open a critique to read the full feedback.</p>
  {error&&<p className="error-text" role="alert">{error}</p>}
  {!items.length&&!busy&&!error&&<p>No saved critiques yet. Your next successful critique will appear here.</p>}
  {items.map(item=><details key={item.id} className="practice"><summary><strong>{item.clip_name}</strong> · {new Date(item.created_at).toLocaleString()}</summary>{item.focus&&<p className="prewrap"><strong>Your question:</strong> {item.focus}</p>}<div className="prewrap">{item.critique}</div></details>)}
  {busy&&<p role="status">Loading saved critiques…</p>}
  {more&&<button className="secondary" disabled={busy} onClick={()=>void load(items.length,generation.current)}>Load older critiques</button>}
 </section>;
}
