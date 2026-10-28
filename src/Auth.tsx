import {ThemeControl} from './ThemeControl';
import { useEffect,useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { cloud,configurationError,resetCloudSession } from './cloud';
export function Auth({children}:{children:(user:User)=>ReactNode}) {
 const [user,setUser]=useState<User|null>(null);const [checking,setChecking]=useState(true);
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false),[signup,setSignup]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{if(!cloud){setChecking(false);return;}let active=true;
  cloud.auth.getSession().then(({data,error})=>{if(active){if(error)setError('Could not check sign-in. Try signing in again.');setUser(data.session?.user??null);setChecking(false);}}).catch(()=>{if(active){setChecking(false);setError('Sign-in is unavailable. Check your connection.');}});
  const {data}=cloud.auth.onAuthStateChange((_event,session)=>{if(active){setUser(session?.user??null);setChecking(false);if(!session)resetCloudSession();}});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 if(checking)return <div className="auth-page"><h1>Opening your stable…</h1></div>;
 if(user)return <>{children(user)}</>;
 return <div className="auth-page"><div className="auth-card"><div className="auth-appearance"><ThemeControl/></div><div className="brand"><span className="brandmark">S</span><span>Saddle Up</span></div><p className="eyebrow">YOUR RIDING WORLD</p><h1>{signup?'Come ride with us.':'Welcome back.'}</h1><p>{signup?'Create your free account. Keep your riding journal private and choose what to share with the community.':'Sign in for your horses, rides, trophy room, and riding community.'}</p>{configurationError?<div role="alert" className="message error">{configurationError}</div>:<form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{if(signup){const {data,error}=await cloud!.auth.signUp({email:email.trim(),password});if(error)throw error;if(!data.session){setNotice('Check your email for a confirmation link. After confirming, return here and sign in. If no message arrives, check spam or contact the app owner.');setSignup(false);}}else{const {error}=await cloud!.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;}setPassword('');}catch(e){setError(e instanceof Error?e.message:'Could not sign in. Check your email and password.');}finally{setBusy(false);}}}>
 <label className="field"><span>Email</span><input disabled={busy} type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field"><span>Password{signup?' · at least 10 characters':''}</span><input disabled={busy} type="password" minLength={signup?10:undefined} required autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error-text" role="alert">{error}</p>}{notice&&<p className="message" role="status">{notice}</p>}<button className="primary" disabled={busy}>{busy?'Please wait…':signup?'Create account':'Sign in'}</button></form>}
 <button type="button" disabled={busy} className="text-button" style={{marginTop:20}} onClick={()=>{setSignup(!signup);setError('');setNotice('');setPassword('');}}>{signup?'Already riding with us? Sign in':'New here? Create an account'}</button><p className="small muted">Your email, private ride notes, videos, and AI critiques are not shared with other riders. A community profile is optional.</p></div></div>;
}
