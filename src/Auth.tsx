import { useEffect,useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { cloud,configurationError,resetCloudSession } from './cloud';
export function Auth({children}:{children:(user:User)=>ReactNode}) {
 const [user,setUser]=useState<User|null>(null);const [checking,setChecking]=useState(true);
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!cloud){setChecking(false);return;}let active=true;
  cloud.auth.getSession().then(({data,error})=>{if(active){if(error)setError('Could not check sign-in. Try signing in again.');setUser(data.session?.user??null);setChecking(false);}}).catch(()=>{if(active){setChecking(false);setError('Sign-in is unavailable. Check your connection.');}});
  const {data}=cloud.auth.onAuthStateChange((_event,session)=>{if(active){setUser(session?.user??null);setChecking(false);if(!session)resetCloudSession();}});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 if(checking)return <div className="auth-page"><h1>Opening your private stable…</h1></div>;
 if(user)return <>{children(user)}</>;
 return <div className="auth-page"><div className="auth-card"><div className="brand"><span className="brandmark">S</span><span>SaddleSchool</span></div><p className="eyebrow">YOUR PRIVATE RIDING SPACE</p><h1>Welcome back.</h1><p>Sign in to your invited account to access your horses, photos, and rides across devices.</p>{configurationError?<div role="alert" className="message error">{configurationError}</div>:<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const {error}=await cloud!.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;setPassword('');}catch{setError('Sign-in failed. Check your email and password, or ask the owner to create your account.');}finally{setBusy(false);}}}>
 <label className="field"><span>Email</span><input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field"><span>Password</span><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error-text" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form>}
 <p className="small muted">Invite-only. Contact the app owner for a new account or password help. The app cannot display another rider’s records.</p></div></div>;
}
