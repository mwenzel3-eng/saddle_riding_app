import {useEffect,useRef,useState} from 'react';
import type {Ride} from './data';
import {cloud,downloadVideo} from './cloud';
import {CritiqueHistory} from './CritiqueHistory';
import {extractFrames} from './videoFrames';

type Usage={limit:number;remaining:number;resetsAt:string;retryAfterSeconds:number};

export function VideoCoach({rides}:{rides:Ride[]}) {
 const [file,setFile]=useState<File|null>(null),[rideId,setRideId]=useState(''),[focus,setFocus]=useState('');
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[result,setResult]=useState('');
 const [historyVersion,setHistoryVersion]=useState(0),[saveMessage,setSaveMessage]=useState('');
 const running=useRef(false);
 const [usage,setUsage]=useState<Usage|null>(null),[nextRequestAt,setNextRequestAt]=useState(0),[now,setNow]=useState(Date.now());
 const [usageError,setUsageError]=useState('');
 function updateUsage(value:Usage){setUsage(value);setNextRequestAt(Date.now()+value.retryAfterSeconds*1000);}
 useEffect(()=>{
  let active=true;
  async function refresh(){
   if(!cloud)return;
   try{const {data,error}=await cloud.functions.invoke('video-critique',{body:{action:'usage'}});
    if(active){if(error||!data?.usage)setUsageError('Your allowance could not be loaded. It will be checked before a critique is requested.');else{updateUsage(data.usage);setUsageError('');}}
   }catch{if(active)setUsageError('Your allowance could not be loaded. It will be checked before a critique is requested.');}
  }
  void refresh();window.addEventListener('focus',refresh);
  const timer=setInterval(()=>setNow(Date.now()),1000);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[]);
 const resetPassed=usage?now>=Date.parse(usage.resetsAt):false;
 const remaining=usage?(resetPassed?usage.limit:usage.remaining):null;
 const waitSeconds=Math.max(0,Math.ceil((nextRequestAt-now)/1000));
 async function critique(){
  if(running.current||!consent||(!file&&!rideId))return;
  running.current=true;setBusy(true);setError('');setResult('');setSaveMessage('');
  try {
   if(!cloud)throw new Error('Sign in to your configured cloud account first.');
   setStatus('Reading your clip…');
   const ride=rides.find(r=>r.id===rideId);
   const blob=file||await downloadVideo(ride!.videoId!);
   const frames=await extractFrames(blob);
   setStatus('Reviewing 12 video frames…');
   const {data,error}=await cloud.functions.invoke('video-critique',{body:{frames,focus,clipName:(file?.name||ride?.videoName||'Ride clip').slice(0,255),rideId:file?null:ride?.id||null}});
   if(error){let message='Could not request a critique. Check your connection and try again.';try{const body=await error.context?.json();if(body?.usage)updateUsage(body.usage);if(body?.error)message=body.error;}catch{}throw new Error(message);}
   if(typeof data?.critique!=='string'||!data.critique)throw new Error('The AI returned no critique. Please retry.');
   if(data.usage)updateUsage(data.usage);
   setResult(data.critique);setStatus('');
   setSaveMessage(data.saved?'Saved to your private critique history.':data.warning||'This critique was not confirmed saved. Copy it before leaving this page.');
   if(data.saved)setHistoryVersion(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:'Critique failed.');setStatus('');}
  finally{running.current=false;setBusy(false);}
 }
 return <><section className="panel coach"><p className="eyebrow">VIDEO CRITIQUE</p><h2>A fresh look at your ride.</h2>
  <p>Upload a short riding clip or choose a saved ride. Get timestamped observations, strengths, and a practice focus to discuss with your instructor.</p>
  <label className="field"><span>Upload video · MP4, MOV or WebM · up to 50 MB / 60 seconds</span><input disabled={busy} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={e=>{setFile(e.target.files?.[0]||null);setRideId('');setResult('');setError('');}}/></label>
  <label className="field"><span>Or choose a saved clip</span><select disabled={busy} value={rideId} onChange={e=>{setRideId(e.target.value);setFile(null);setResult('');setError('');}}><option value="">Choose a ride</option>{rides.filter(r=>r.videoId).map(r=><option key={r.id} value={r.id}>{r.date} · {r.videoName||r.gait}</option>)}</select></label>
  {file&&<p className="small">Selected: {file.name}</p>}
  <label className="field"><span>What would you like feedback on?</span><textarea disabled={busy} maxLength={1000} value={focus} onChange={e=>setFocus(e.target.value)} placeholder="For example: my seat and hand position at trot"/></label>
  <p className="small muted">The AI reviews 12 still frames, so it can miss movement between them. Audio is excluded. This upload is used for the critique and is not added to your ride journal. Successful critiques are automatically saved to your private account history below. Sampled images are not stored in that history.</p>
  <label className="small"><input type="checkbox" disabled={busy} checked={consent} onChange={e=>setConsent(e.target.checked)}/> I agree to send sampled frames and my feedback question to OpenAI for this critique.</label>
  <p className="small" aria-live="polite">{usage?`${remaining} of ${usage.limit} critiques remaining today. Resets at ${new Date(resetPassed?Date.parse(usage.resetsAt)+86400000:usage.resetsAt).toLocaleString()}.`:'Loading daily allowance…'}{waitSeconds>0&&remaining!==0?` Next request in ${waitSeconds}s.`:''}</p>
  {usageError&&<p className="small muted">{usageError}</p>}
  <p className="small muted">Each submitted AI request uses one daily credit, including attempts where the AI service fails or times out.</p>
  <div className="button-row" style={{marginTop:20}}><button className="primary" disabled={busy||!consent||(!file&&!rideId)||remaining===0||waitSeconds>0} onClick={()=>void critique()}>{busy?status:'Critique my video'}</button></div>
  <p className="small muted">Use feedback with your instructor. AI may misread a frame and cannot diagnose soundness, assess saddle fit, or give official scores.</p>
  {error&&<p role="alert" className="error-text">{error}</p>}
  {result&&<div className="practice" aria-live="polite"><h3>Your riding critique</h3><p className="small" role="status">{saveMessage}</p><div className="prewrap">{result}</div></div>}
 </section><CritiqueHistory refreshKey={historyVersion}/></>;
}
