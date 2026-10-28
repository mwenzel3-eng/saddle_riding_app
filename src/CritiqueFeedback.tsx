import type {ReactNode} from 'react';

function emphasis(text:string):ReactNode {
 return text.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part);
}

// Render a small, safe Markdown subset without interpreting HTML or links.
export function CritiqueFeedback({text}:{text:string}) {
 const blocks:ReactNode[]=[];
 const lines=text.replace(/\r\n/g,'\n').split('\n');
 const legacyHeading=/^(What is visible|Strengths|Things to discuss with your instructor|One practice focus|Limitations|Working well|Main focus|Next ride|Visibility):?$/i;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line)continue;
  const heading=line.replace(/^#{1,6}\s+/,'').replace(/^\*\*(.*?)\*\*:?$/,'$1').replace(/:$/,'');
  if(/^#{1,6}\s+/.test(line)||/^\*\*[^*]+\*\*:?$/.test(line)||legacyHeading.test(line)){
   blocks.push(<h4 key={i}>{heading}</h4>);
  }else if(/^[-*•]\s+|^\d+[.)]\s+/.test(line)){
   const start=i,items:ReactNode[]=[];
   while(i<lines.length&&/^[-*•]\s+|^\d+[.)]\s+/.test(lines[i].trim())){
    items.push(<li key={i}>{emphasis(lines[i].trim().replace(/^(?:[-*•]|\d+[.)])\s+/,''))}</li>);i++;
   }
   i--;blocks.push(<ul key={start}>{items}</ul>);
  }else blocks.push(<p key={i}>{emphasis(line)}</p>);
 }
 return <div className="critique-feedback">{blocks}</div>;
}
