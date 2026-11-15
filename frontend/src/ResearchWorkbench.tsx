import { useEffect,useState,useMemo } from 'react'
import { GitCompareArrows,Grid2X2,TriangleAlert,X } from 'lucide-react'
import { api,type RecordRow,type Comparison,type Coverage,type CoverageField,type Series } from './api'
import { Button } from './components/ui/button'
import ScientificPlot from './ScientificPlot'
const human=(s:string)=>s.replaceAll('_',' ')
const shown=(v:unknown)=>v===null||v===undefined||v===''?'Not reported':String(v)
export default function ResearchWorkbench({selection,onRemove,onClear,onRecord,investigationId}:{selection:RecordRow[];onRemove:(id:string)=>void;onClear:()=>void;onRecord:(id:string)=>void;investigationId:string}){
 const [comparison,setComparison]=useState<Comparison|null>(null),[comparisonError,setComparisonError]=useState(''),[comparing,setComparing]=useState(false),[groupId,setGroupId]=useState('')
 const [fields,setFields]=useState<CoverageField[]>([]),[x,setX]=useState(''),[y,setY]=useState(''),[bins,setBins]=useState('4'),[threshold,setThreshold]=useState('3')
 const [coverage,setCoverage]=useState<Coverage|null>(null),[coverageError,setCoverageError]=useState(''),[covering,setCovering]=useState(false),[cellIndex,setCellIndex]=useState<number|null>(null)
 useEffect(()=>{
  setComparison(null);setComparisonError('');setGroupId('')
  if(selection.length<2){setComparing(false);return}
  const controller=new AbortController();setComparing(true)
  const query=new URLSearchParams();selection.forEach(r=>query.append('record_ids',r.id))
  api<Comparison>(`/comparison?${query}`,controller.signal).then(result=>{setComparison(result);setGroupId(result.groups.find(g=>g.status==='compatible_provisional')?.id||'')}).catch(e=>{if(e.name!=='AbortError')setComparisonError(e.message)}).finally(()=>{if(!controller.signal.aborted)setComparing(false)})
  return()=>controller.abort()
 },[selection])
 useEffect(()=>{
  const controller=new AbortController();setFields([]);setCoverage(null);setCoverageError('');setX('');setY('');setCellIndex(null)
  api<{items:CoverageField[]}>(`/coverage/fields?investigation_id=${investigationId}`,controller.signal).then(result=>{
   setFields(result.items)
   const first=result.items.find(f=>['Fuel','Sample Type','Fuel '].includes(f.heading))||result.items.find(f=>f.kind==='numeric')||result.items[0]
   const second=result.items.find(f=>f.id!==first?.id&&['Nozzle (mm)','Droplet initial diameter; mm','Inlet velocity (cm/s)','Pressure','Calibrated  initial O2 % by vol '].includes(f.heading))||result.items.find(f=>f.id!==first?.id&&f.kind==='numeric')
   setX(first?.id||'');setY(second?.id||'')
  }).catch(e=>{if(e.name!=='AbortError')setCoverageError(e.message)})
  return()=>controller.abort()
 },[investigationId])
 useEffect(()=>{
  if(!x||!y){setCoverage(null);setCovering(false);return}
  const controller=new AbortController();setCovering(true);setCoverageError('');setCoverage(null);setCellIndex(null)
  api<Coverage>(`/coverage?${new URLSearchParams({investigation_id:investigationId,x_parameter_id:x,y_parameter_id:y,bins,sparse_below:threshold})}`,controller.signal).then(setCoverage).catch(e=>{if(e.name!=='AbortError')setCoverageError(e.message)}).finally(()=>{if(!controller.signal.aborted)setCovering(false)})
  return()=>controller.abort()
 },[investigationId,x,y,bins,threshold])
 const group=comparison?.groups.find(g=>g.id===groupId)
 const overlay=useMemo<Series|null>(()=>group?{parameter:{id:group.id,heading:group.heading,unit:group.unit},points:group.points,excluded:[],axis_note:'Each point is a selected source record.',notice:comparison!.notice}:null,[group,comparison?.notice])
 const selectedCell=coverage&&cellIndex!==null?coverage.cells[cellIndex]:null
 return <section className="research-workbench" aria-label="Comparison and research coverage">
  <section className="panel comparison-panel" aria-label="Source record comparison"><div className="panel-heading"><div><h3><GitCompareArrows size={17}/> Experiment comparison</h3><p>Compare source records without assuming unique run identities.</p></div><span className="count-tag">{selection.length}/8 selected</span></div>
   <div className="workbench-body"><div className="selection-tray">{selection.map((r,i)=><div key={r.id} className="selection-chip"><button onClick={()=>onRecord(r.id)}>{i+1}. {r.investigation_id} / {r.identifier||`row ${r.row}`}</button><button aria-label={`Remove comparison record ${i+1}`} onClick={()=>onRemove(r.id)}><X size={12}/></button><small>{r.source_path.split('/').pop()} · {r.sheet||'CSV'} · row {r.row}<br/>Provisional · {r.quality_issue_count} review flags</small></div>)}{selection.length>0&&<Button variant="ghost" size="sm" onClick={onClear}>Clear selection</Button>}</div>
    {selection.length<2&&<p className="workbench-empty">Select 2–8 records using the checkboxes in Source records. Selection is retained across pages and investigations.</p>}
    {comparing&&<p role="status">Comparing actual PostgreSQL observations…</p>}
    {comparisonError&&<div role="alert" className="error-box">{comparisonError}</div>}
    {comparison&&<><div className="chart-note"><TriangleAlert size={14}/><span>Provisional comparison. Matching units alone do not establish equal methods. Missing and disputed values are never imputed. Exact repeats are retained, not independent experiments.</span></div>
     <label className="parameter-label" htmlFor="comparison-parameter">COMPARABLE PARAMETER · OVERLAY</label><select id="comparison-parameter" aria-label="Comparison parameter" value={groupId} onChange={e=>setGroupId(e.target.value)}><option value="">Select a comparable parameter</option>{comparison.groups.filter(g=>g.status==='compatible_provisional').map(g=><option value={g.id} key={g.id}>{g.heading} ({g.unit})</option>)}</select>
     {overlay&&overlay.points.length>0?<ScientificPlot series={overlay} onRecord={onRecord} overlay/>:<p className="workbench-empty">No selected parameter can be safely overlaid under the current unit/method rules.</p>}
     {group&&<p className="coverage-description">{group.method_note} {group.excluded_count} unavailable values excluded.</p>}
     <div className="table-scroll"><table className="measurement-table comparison-table"><thead><tr><th>PARAMETER / COMPATIBILITY</th>{comparison.records.map((r,i)=><th key={r.id}>RECORD {i+1}<small>{r.investigation_id} / {r.identifier||`row ${r.row}`}</small></th>)}</tr></thead><tbody>{comparison.groups.map(g=><tr key={g.id}><td>{g.heading}<small className={g.status.startsWith('incompatible')?'incompatible-label':''}>{human(g.status)}</small></td>{comparison.records.map(r=>{const v=g.values[r.id];return <td key={r.id}>{v?<><strong>{shown(v.original_value)}</strong><small>Original unit: {v.original_unit||'not established'}</small><small>{v.plot_eligible?`${v.normalized_value} ${v.normalized_unit}`:`Not plotted · ${human(v.exclusion_reason||'unsupported value')}`}</small><a href={v.source_url} target="_blank" rel="noreferrer">{v.coordinate||`row ${v.row}, col ${v.column}`}</a><small>Provisional · uncertainty {human(v.uncertainty_status)}</small><details><summary>Source / method</summary><code>{v.source_path}<br/>SHA-256 {v.source_sha256}</code><p>{v.formula||'Same source column; physical method equivalence unverified.'}</p></details></>:<span>Not reported in this source</span>}</td>})}</tr>)}</tbody></table></div></>}
   </div>
  </section>
  <section className="panel coverage-panel" aria-label="Research gap explorer"><div className="panel-heading"><div><h3><Grid2X2 size={17}/> Research gap explorer</h3><p>Deterministic indexed coverage · {investigationId} CSV records</p></div><span className="badge amber">Provisional</span></div>
   <div className="workbench-body"><div className="coverage-controls"><label>Horizontal parameter<select aria-label="Coverage horizontal parameter" value={x} onChange={e=>setX(e.target.value)}>{fields.map(f=><option value={f.id} key={f.id}>{f.heading}{f.unit?` (${f.unit})`:''}</option>)}</select></label><label>Vertical parameter<select aria-label="Coverage vertical parameter" value={y} onChange={e=>setY(e.target.value)}>{fields.map(f=><option value={f.id} key={f.id}>{f.heading}{f.unit?` (${f.unit})`:''}</option>)}</select></label><label>Numeric bins<select aria-label="Coverage numeric bins" value={bins} onChange={e=>setBins(e.target.value)}>{[2,3,4,5,6,8].map(n=><option key={n}>{n}</option>)}</select></label><label>Sparse if count below<select aria-label="Coverage sparse threshold" value={threshold} onChange={e=>setThreshold(e.target.value)}>{[2,3,5,10].map(n=><option key={n}>{n}</option>)}</select></label></div>
    {covering&&<p role="status">Calculating indexed parameter combinations…</p>}
    {coverageError&&<div className="error-box" role="alert">{coverageError}</div>}
    {coverage&&<><div className="coverage-summary"><span><strong>{coverage.total_records}</strong> source records</span><span><strong>{coverage.complete_records}</strong> complete combinations</span><span><strong>{coverage.missing_metadata_records}</strong> missing metadata</span><span><strong>{coverage.unusable_metadata_records}</strong> unusable metadata</span></div>
     <p className="coverage-description">{coverage.duplicate_rows_retained} exact repeats retained. {coverage.x.heading}: {coverage.x.min===null?'observed categories':`${coverage.x.min}–${coverage.x.max} ${coverage.x.unit||''}`}. {coverage.y.heading}: {coverage.y.min===null?'observed categories':`${coverage.y.min}–${coverage.y.max} ${coverage.y.unit||''}`}.</p>
     {[coverage.x,coverage.y].flatMap(axis=>(axis.label_variant_groups||[]).map((labels,i)=><div className="chart-note" key={`${axis.id}-${i}`}><TriangleAlert size={14}/><span>Potential category label variants in {axis.heading}: {labels.join(' / ')}. Kept separate; apparent sparsity may reflect inconsistent source labels.</span></div>))}
     <div className="table-scroll"><table className="coverage-grid" aria-label="Indexed coverage matrix"><caption>{coverage.y.heading} {coverage.y.unit?`(${coverage.y.unit})`:''} × {coverage.x.heading} {coverage.x.unit?`(${coverage.x.unit})`:''}</caption><thead><tr><th>Vertical / horizontal</th>{coverage.x.levels.map((level,i)=><th key={i}>{level}</th>)}</tr></thead><tbody>{coverage.y.levels.map((level,yi)=><tr key={yi}><th>{level}</th>{coverage.x.levels.map((_,xi)=>{const index=coverage.cells.findIndex(c=>c.x===xi&&c.y===yi);const cell=coverage.cells[index];return <td key={xi}><button className={`coverage-cell ${cell.status}`} aria-label={`Coverage ${level} / ${coverage.x.levels[xi]}: ${cell.count} records`} onClick={()=>setCellIndex(index)}><strong>{cell.count}</strong><small>{cell.count===0?'Unobserved in index':cell.status==='sparse'?'Sparse':'Observed'}</small></button></td>})}</tr>)}</tbody></table></div>
     {selectedCell&&<div className="coverage-cell-detail"><strong>{selectedCell.count} complete source records · {human(selectedCell.status)}</strong>{selectedCell.absence_uncertain_due_to_metadata&&<p>Incomplete/unusable metadata could affect this apparent absence; those records were not assigned to cells.</p>}<div>{selectedCell.record_ids.map((id,i)=><Button key={id} variant="outline" size="sm" onClick={()=>onRecord(id)}>Inspect source {i+1}</Button>)}</div>{selectedCell.sample_truncated&&<small>First 10 source links shown.</small>}</div>}
     <div className="chart-note"><TriangleAlert size={14}/><span>{coverage.notice} Missing/unusable metadata is excluded from the grid and reported separately. A zero does not establish physical feasibility or scientific novelty.</span></div>
     <details className="coverage-description"><summary>Method and evidence</summary><p>{coverage.method}</p><a href={coverage.provenance.source_url} target="_blank" rel="noreferrer">NASA source</a><code>{coverage.provenance.source_path}<br/>SHA-256 {coverage.provenance.source_sha256}</code><p>Version: {coverage.dataset_version}. Numeric bin upper bounds are exclusive except the final bin; ≤8 distinct numeric values use exact levels.</p><p>Unassigned metadata samples: {[...coverage.missing_record_ids,...coverage.unusable_record_ids].map((id,i)=><button className="inline-link" key={id} onClick={()=>onRecord(id)}>record {i+1} </button>)}</p></details>
    </>}
   </div>
  </section>
 </section>
}
