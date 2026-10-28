import {useEffect,useState} from 'react';
import {SunMoon} from 'lucide-react';

export function ThemeControl(){
 const [preference,setPreference]=useState(()=>document.documentElement.dataset.themePreference||'system');
 useEffect(()=>{
  const sync=()=>setPreference(document.documentElement.dataset.themePreference||'system');
  window.addEventListener('saddle-theme-change',sync);
  return()=>window.removeEventListener('saddle-theme-change',sync);
 },[]);
 return <label className="theme-control"><SunMoon size={17} aria-hidden="true"/><span className="sr-only">Appearance</span><select aria-label="Appearance" value={preference} onChange={e=>window.dispatchEvent(new CustomEvent('saddle-theme-change',{detail:e.target.value}))}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
