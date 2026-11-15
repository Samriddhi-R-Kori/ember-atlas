import { useEffect,useState,useCallback } from 'react'
import { Activity,ArrowUpRight,BookOpen,ChevronLeft,ChevronRight,Database,Flame,FlaskConical,GitCompareArrows,Search,ShieldCheck,TriangleAlert,X } from 'lucide-react'
import { Button } from './components/ui/button'
import { api,type Investigation,type RecordRow,type Detail,type Parameter,type Series,type Baseline } from './api'
import ScientificPlot from './ScientificPlot'
import ResearchWorkbench from './ResearchWorkbench'
const human=(s:string)=>s.replaceAll('_',' ')
const display=(v:unknown)=>v===null||v===undefined||v===''?'—':String(v)
export default function LegacyObservatory(){
 const [investigations,setInvestigations]=useState<Investigation[]>([]),[baseline,setBaseline]=useState<Baseline|null>(null)
 const [selected,setSelected]=useState('PSI-107'),[records,setRecords]=useState<RecordRow[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0)
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[kind,setKind]=useState('csv'),[quality,setQuality]=useState('all')
 const [parameters,setParameters]=useState<Parameter[]>([]),[parameter,setParameter]=useState(''),[series,setSeries]=useState<Series|null>(null)
 const [detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[detailLoading,setDetailLoading]=useState(false)
 const [graphLoading,setGraphLoading]=useState(false)
 const [comparisonSelection,setComparisonSelection]=useState<RecordRow[]>([])
 function toggleComparison(record:RecordRow){setComparisonSelection(current=>current.some(r=>r.id===record.id)?current.filter(r=>r.id!==record.id):current.length<8?[...current,record]:current)}
 const inv=investigations.find(i=>i.id===selected)
 useEffect(()=>{const controller=new AbortController();Promise.all([api<{items:Investigation[]}>('/investigations',controller.signal),api<Baseline>('/baseline',controller.signal)]).then(([r,b])=>{setInvestigations(r.items);setBaseline(b)}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[])
 useEffect(()=>{if(search===query)return;const timer=setTimeout(()=>{setQuery(search);setOffset(0)},250);return()=>clearTimeout(timer)},[search,query])
 useEffect(()=>{
  const controller=new AbortController();setLoading(true)
  api<{items:RecordRow[];total:number}>(`/investigations/${selected}/records?${new URLSearchParams({q:query,source_kind:kind,quality,limit:'12',offset:String(offset)})}`,controller.signal)
  .then(r=>{setRecords(r.items);setTotal(r.total);setError('')}).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[selected,query,kind,quality,offset])
 useEffect(()=>{const controller=new AbortController();setSeries(null);setParameters([]);setParameter('')
  api<{items:Parameter[]}>(`/parameters?investigation_id=${selected}`,controller.signal).then(r=>{setParameters(r.items);setParameter(r.items[0]?.id||'')}).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()
 },[selected])
 useEffect(()=>{if(!parameter){setSeries(null);return}const controller=new AbortController();setGraphLoading(true)
  api<Series>(`/series?parameter_id=${parameter}`,controller.signal).then(setSeries).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setGraphLoading(false)});return()=>controller.abort()
 },[parameter])
 const openRecord=useCallback(async(id:string)=>{setDetailLoading(true);setDetail(null);try{setDetail(await api<Detail>(`/records/detail?record_id=${encodeURIComponent(id)}`))}catch(e){setError((e as Error).message)}finally{setDetailLoading(false)}},[])
 function choose(id:string){setSelected(id);setOffset(0);setSearch('');setQuery('');setDetail(null)}
 return <div className="app-shell">
  <aside className="sidebar"><a href="#" className="brand"><span className="brand-icon"><Flame size={25}/></span><span>Ember Atlas<small>SOURCE-RECORD WORKBENCH</small></span></a>
   <div className="workspace-label">SCIENTIFIC WORKSPACE <span>P1A</span></div>
   <div className="nav-selected"><Database size={17}/> Investigations <span>05</span></div>
   <p className="nav-group-title">INDEXED INVESTIGATIONS</p>
   <nav aria-label="Investigations">{investigations.map(i=><button key={i.id} className={`investigation-nav ${selected===i.id?'active':''}`} onClick={()=>choose(i.id)} aria-current={selected===i.id?'page':undefined}><span className="nav-dot"/><span>{i.name}<small>{i.id}</small></span><span className="nav-count">{i.csv_rows}</span></button>)}</nav>
   <div className="sidebar-note"><ShieldCheck size={22}/><strong>Evidence comes first.</strong><p>Original values retained.<br/>Sources always in view.</p><span>NASA PSI · SOURCE-LINKED DATA</span></div>
   <div className="sidebar-footer"><span className="live-dot"/> Local research workspace</div>
  </aside>
  <main>
   <header className="topbar"><span>Workspace <span className="slash">/</span> Investigations</span><span className="version-label"><span className="live-dot"/>{baseline?.version||'Connecting to evidence…'}</span></header>
   <div className="content">
    <div className="page-heading"><div><div className="eyebrow">THE SCIENTIFIC DATA FOUNDATION</div><h1>Investigation observatory</h1><p>Explore combustion evidence across microgravity investigations.</p></div><div className="heading-icon"><FlaskConical size={27}/></div></div>
    {error&&<div className="error-box" role="alert">{error}<p>Check that PostgreSQL and the API are running and the reviewed data has been ingested.</p></div>}
    <section className="stats" aria-label="Dataset baseline"><div><span>INDEXED INVESTIGATIONS</span><strong>{investigations.length||'—'}<FlaskConical size={19}/></strong><small>NASA Physical Sciences Informatics</small></div><div><span>SOURCE CSV RECORDS</span><strong>{baseline?.summary.csv_rows.toLocaleString()||'—'}<Database size={19}/></strong><small>Records, not unique experiments</small></div><div><span>AUTHENTICATED DATA FILES</span><strong>{baseline?.summary.official_data_files_byte_verified||'—'}<ShieldCheck size={19}/></strong><small>Byte-identical to NASA downloads</small></div><div><span>EXACT REPEATS RETAINED</span><strong>{baseline?.summary.duplicates_retained||'—'}<GitCompareArrows size={19}/></strong><small>Preserved for scientific review</small></div></section>
    <section className="investigation-heading"><div><div className="section-kicker">SELECTED INVESTIGATION <span>{selected}</span></div><h2>{inv?.name||'Loading investigation'} <span className="badge neutral">ISS · microgravity context</span></h2><p>{inv?.title}</p></div>{inv&&<a href={inv.catalog_url} target="_blank" rel="noreferrer" className="source-link">NASA investigation <ArrowUpRight size={15}/></a>}</section>
    <div className="data-grid">
     <section className="panel record-panel"><div className="panel-heading"><div><h3><BookOpen size={17}/> Source records</h3><p>Original identifiers. Complete provenance.</p></div><span className="count-tag">{total} records</span></div>
      <div className="filter-row"><label className="search-box"><Search size={16}/><input aria-label="Search source records" placeholder="Search ID, fuel or source value…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Data quality filter" value={quality} onChange={e=>{setQuality(e.target.value);setOffset(0)}}><option value="all">All quality flags</option><option value="review_required">Review required</option></select></div>
      <div className="record-tabs" role="group" aria-label="Source kind">{[['csv','CSV records'],['workbook','Workbook records'],['all','All sources']].map(([value,label])=><button key={value} className={kind===value?'selected':''} onClick={()=>{setKind(value);setOffset(0)}}>{label}</button>)}</div>
      <div className="table-scroll"><table className="record-table"><thead><tr><th>COMPARE</th><th>RECORD / IDENTIFIER</th><th>SOURCE LOCATION</th><th>DATA QUALITY</th><th/></tr></thead><tbody>{loading?<tr><td colSpan={5} className="empty">Loading source evidence…</td></tr>:records.length===0?<tr><td colSpan={5} className="empty">No source records match these filters.</td></tr>:records.map(r=><tr key={r.id} className={detail?.id===r.id?'row-selected':''}><td><input type="checkbox" aria-label={`Select comparison record ${r.identifier||`row ${r.row}`}`} checked={comparisonSelection.some(item=>item.id===r.id)} disabled={comparisonSelection.length>=8&&!comparisonSelection.some(item=>item.id===r.id)} onChange={()=>toggleComparison(r)}/></td><td><button className="record-button" onClick={()=>void openRecord(r.id)} aria-label={`View source record ${r.identifier||`row ${r.row}`}`}>{r.identifier||`Row ${r.row}`}</button><small>{human(r.scientific_status)} · source record</small></td><td><span className="file-name">{r.source_path.split('/').pop()}</span><small>{r.sheet?`${r.sheet} · `:''}row {r.row} <a href={r.source_url} target="_blank" rel="noreferrer" aria-label={`NASA provenance for row ${r.row}`}><ArrowUpRight size={11}/></a></small></td><td><span className="badge amber">{r.quality_issue_count?'Review required':'Provisional'}</span><small>{r.duplicate_of?'Exact repeat retained':`${r.quality_issue_count} review flags`}</small></td><td><button aria-label={`Inspect row ${r.row}`} onClick={()=>void openRecord(r.id)} className="icon-button"><ArrowUpRight size={16}/></button></td></tr>)}</tbody></table></div>
      <div className="pagination"><span>{total?`${offset+1}–${Math.min(offset+12,total)} of ${total}`:'0 records'}</span><div><Button variant="outline" size="sm" aria-label="Previous records" disabled={!offset||loading} onClick={()=>setOffset(Math.max(0,offset-12))}><ChevronLeft size={15}/></Button><Button variant="outline" size="sm" aria-label="Next records" disabled={offset+12>=total||loading} onClick={()=>setOffset(offset+12)}><ChevronRight size={15}/></Button></div></div>
     </section>
     <section className="panel chart-panel"><div className="panel-heading"><div><h3><Activity size={17}/> Measurement explorer</h3><p>Interactive, source-linked observations.</p></div><span className="chart-live"><span className="live-dot"/>Plotly</span></div>
      <label className="parameter-label" htmlFor="parameter">PARAMETER · SOURCE-SPECIFIC</label><select id="parameter" aria-label="Scientific parameter" value={parameter} onChange={e=>setParameter(e.target.value)}>{parameters.map(p=><option key={p.id} value={p.id}>{p.heading} {p.unit?`(${p.unit})`:''} · {p.source_path.split('/').pop()}</option>)}</select>
      {graphLoading?<div className="plot-placeholder">Loading measurements…</div>:series?.points.length?<ScientificPlot series={series} onRecord={id=>void openRecord(id)}/>:<div className="plot-placeholder">No supported numeric values are available for this parameter.</div>}
      <div className="plot-legend"><span><i className="teal-dot"/>Provisional</span><span><i className="orange-dot"/>Review flags</span><span>{series?.points.length||0} plotted</span></div>
      <div className="chart-note"><TriangleAlert size={14}/><span>Source row is not elapsed time or a unique experiment. {series?.excluded.length||0} missing, unsupported or disputed values omitted. Click a point to inspect its evidence.</span></div>
      {series&&series.excluded.length>0&&<details className="exclusions"><summary>Inspect {series.excluded.length} omitted values</summary><ul>{series.excluded.map((e,i)=><li key={i}><button onClick={()=>void openRecord(e.record_id)}>Row {e.row}</button> · {human(e.reason)}</li>)}</ul></details>}
     </section>
    </div>
    <ResearchWorkbench selection={comparisonSelection} onRemove={id=>setComparisonSelection(current=>current.filter(r=>r.id!==id))} onClear={()=>setComparisonSelection([])} onRecord={id=>void openRecord(id)} investigationId={selected}/>
    {detailLoading&&<div className="panel detail-loading" role="status">Loading record provenance and measurements…</div>}
    {detail&&<section className="panel detail-panel" aria-label="Source record details"><div className="panel-heading"><div><div className="eyebrow">SOURCE RECORD · IDENTITY NOT VERIFIED AS A RUN</div><h3>{detail.investigation_id} / {detail.identifier||`Row ${detail.row}`}</h3></div><Button variant="ghost" size="sm" aria-label="Close record details" onClick={()=>setDetail(null)}><X size={19}/></Button></div>
     <div className="detail-provenance"><div><span>PROVENANCE</span><strong>{human(detail.provenance_status)}</strong><a href={detail.official_download_url||detail.source_url} target="_blank" rel="noreferrer">NASA evidence source <ArrowUpRight size={13}/></a></div><div><span>ORIGINAL LOCATION</span><strong>{detail.sheet||'CSV'} · row {detail.row}</strong><code>{detail.source_path}</code></div><div><span>SCIENTIFIC STATUS</span><strong>{human(detail.scientific_status)}</strong><small>{detail.quality_issue_count} review flags · {detail.license||'Rights under review'}</small></div></div>
     <div className="hash-line"><span>SHA-256</span><code>{detail.source_sha256}</code></div>
     <details className="quality-details"><summary><TriangleAlert size={15}/> Quality issues and review decisions ({detail.issues.length})</summary><ul>{detail.issues.map(q=><li key={q.id}><strong>{human(q.code)}</strong><span className="badge neutral">{q.scope} · {human(q.status)}</span><p>{String(q.detail.review_resolution||q.detail.detail||'Review required')}</p></li>)}</ul></details>
     <div className="table-scroll"><table className="measurement-table"><thead><tr><th>PARAMETER</th><th>ORIGINAL VALUE</th><th>NORMALIZED VALUE</th><th>STATUS / UNCERTAINTY</th><th>EVIDENCE</th></tr></thead><tbody>{detail.observations.map(o=><tr key={o.id}><td>{o.heading}<small>{o.original_unit||'Unit not established'}</small></td><td className="mono">{display(o.original_value)}</td><td className="mono">{o.value_status==='disputed_source_value'?'Withheld — disputed':`${display(o.normalized_value)} ${o.normalized_unit||''}`}</td><td><span className="badge neutral">{human(o.value_status)}</span><small>Uncertainty: {o.uncertainty||human(o.uncertainty_status)}</small>{o.normalization_status&&<small>{human(o.normalization_status)}</small>}</td><td> {o.coordinate||`row ${o.row}, column ${o.column}`} {o.unit_evidence&&<small>{o.unit_evidence}</small>}{o.formula&&<details><summary>Formula</summary><code>{o.formula}</code></details>}</td></tr>)}</tbody></table></div>
     <details className="association-details"><summary>Candidate record associations ({detail.associations.length}) · no scientific merge approved</summary>{detail.associations.map((a,i)=><div key={i}><strong>{human(a.kind)}</strong> · {human(a.status)}<pre>{JSON.stringify(a.evidence,null,2)}</pre></div>)}</details>
    </section>}
    <footer className="content-footer"><span>Ember Atlas · Scientific credibility & provenance</span><span>No scientific sign-off · Local provisional workspace</span></footer>
   </div>
  </main>
 </div>
}
