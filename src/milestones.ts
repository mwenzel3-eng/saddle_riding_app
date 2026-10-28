import {localDate} from './data.ts';
import type {Ride} from './data.ts';
type ShowResult={show_name:string;show_date:string;venue?:string};
export function showCount(results:ShowResult[],today=localDate()){
 return new Set(results.filter(s=>s.show_date<=today).map(s=>`${s.show_date}|${s.show_name.trim().toLowerCase()}|${(s.venue||'').trim().toLowerCase()}`)).size;
}
export function milestones(rides:number,shows:number,ribbonCount:number){
 return [
  ...[1,10,25,50,100].map(n=>({id:`rides-${n}`,label:n===1?'First ride':`${n} rides`,icon:'🐎',earned:rides>=n,progress:`${Math.min(rides,n)} / ${n} rides`})),
  ...[1,5,10].map(n=>({id:`shows-${n}`,label:n===1?'Show debut':`${n} shows`,icon:'🏆',earned:shows>=n,progress:`${Math.min(shows,n)} / ${n} shows`})),
  ...[1,5,10].map(n=>({id:`ribbons-${n}`,label:n===1?'First ribbon':`${n} ribbons`,icon:'🎗️',earned:ribbonCount>=n,progress:`${Math.min(ribbonCount,n)} / ${n} ribbons`}))
 ];
}
export function completedRides(rides:Ride[],horseId?:string){return rides.filter(r=>(!horseId||r.horseId===horseId)&&r.date<=localDate()).length;}
