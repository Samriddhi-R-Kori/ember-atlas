import { useEffect,useRef } from 'react'
import Plotly from 'plotly.js-basic-dist-min'
import type { Series } from './api'
export default function ScientificPlot({series,onRecord,overlay=false}:{series:Series;onRecord:(id:string)=>void;overlay?:boolean}){
 const ref=useRef<HTMLDivElement>(null)
 const callback=useRef(onRecord);callback.current=onRecord
 useEffect(()=>{
  const element=ref.current;if(!element)return
  let active=true
  const points=series.points
  const custom=points.map(p=>[p.record_id,p.source_path,p.coordinate||`row ${p.source_row}`,p.scientific_status,p.quality_codes.join(', ')||'No record flags',p.source_sha256])
  const traces=overlay?points.map((p,i)=>({x:[p.label],y:[p.value],customdata:[custom[i]],type:'scatter',mode:'markers',name:p.label,marker:{color:['#23675f','#c87a37','#5079aa','#9a6096','#688d41','#b05c5c','#7770b1','#777777'][i%8],size:12},hovertemplate:'%{x}<br>%{y} '+(series.parameter.unit||'')+'<br>%{customdata[2]}<br>%{customdata[3]}<extra></extra>'})):[{x:points.map(p=>p.source_row),y:points.map(p=>p.value),customdata:custom,type:'scatter',mode:'markers',marker:{color:points.map(p=>p.quality_codes.length?'#c87a37':'#23675f'),size:7,opacity:0.8},hovertemplate:'Source row %{x}<br>%{y} '+(series.parameter.unit||'')+'<br>%{customdata[2]}<br>%{customdata[3]}<br>%{customdata[4]}<extra></extra>'}]
  void Plotly.newPlot(element,traces,{
   autosize:true,height:310,margin:{t:18,r:18,b:48,l:62},paper_bgcolor:'transparent',plot_bgcolor:'transparent',font:{family:'Inter, system-ui, sans-serif',color:'#69716e',size:11},xaxis:{title:{text:overlay?'Selected source records':'Source row'},gridcolor:'#e8ece8',zeroline:false},yaxis:{title:{text:series.parameter.unit||'Source value'},gridcolor:'#e8ece8',zeroline:false},showlegend:overlay,legend:{orientation:'h',y:-0.35},hovermode:'closest'
  },{responsive:true,displaylogo:false,modeBarButtonsToRemove:['toImage'],scrollZoom:false}).then(plot=>{
   if(!active)return
   const clickable=plot as HTMLElement&{on:(event:string,fn:(data:{points:{customdata:string[]}[]})=>void)=>void}
   clickable.on('plotly_click',data=>{const id=data.points[0]?.customdata[0];if(id)callback.current(id)})
  })
  // Plotly owns responsive resize; an extra observer can outlive a purged plot.
  return ()=>{active=false;Plotly.purge(element)}
 },[series,overlay])
 return <div ref={ref} data-testid="scientific-plot" role="img" aria-label={`${series.parameter.heading} ${overlay?'comparison overlay':'by source row'}; provisional measurements`} />
}
