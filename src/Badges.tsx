import {milestones} from './stableData';
export function Badges({rides,shows,ribbons}:{rides:number;shows:number;ribbons:number}){
 const badges=milestones(rides,shows,ribbons);
 return <section className="badge-section"><div className="section-heading"><h2>Your milestones</h2><span>{badges.filter(b=>b.earned).length} earned</span></div><p className="small muted">Based on logged rides and self-reported show results. Future events do not earn badges.</p><div className="badge-grid">{badges.map(b=><div className={`earned-badge ${b.earned?'':'locked'}`} key={b.id}><span aria-hidden="true">{b.icon}</span><strong>{b.label}</strong><small>{b.earned?'Earned':b.progress}</small></div>)}</div></section>;
}
