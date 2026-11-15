const R=[
 ['PSI-10','ACME Flame Design','Flame Design: a novel approach to clean, efficient diffusion flames','f','1999–2025','10.60555/w4zy-bt45',['clean'],208,'1.98 TB',
  'Soot-inception and extinction limits of spherical and coflow diffusion flames of ethylene and methane, across flow rate, inert gas and pressure.',
  'Aims at more efficient, lower-emission combustors on Earth; the record cites input to future coal power plant designs.'],
 ['PSI-20','ACME BRE','Burning Rate Emulator','f','','10.60555/vb93-3y72',['safety'],19,'1.85 TB',
  'Gas burners that imitate burning solids and liquids, tested in still air at spacecraft atmospheres from 21% to 34% oxygen.',
  'Preliminary: flames kept burning with no airflow in oxygen-enriched atmospheres, while those at 21% oxygen went out quickly. Supports wider use of cone-calorimeter material testing.'],
 ['PSI-21','ACME CLD Flame','Coflow Laminar Diffusion Flame','f','','10.60555/23e1-9950',['models','clean','safety'],33,'1.82 TB',
  'Weak and heavily sooting coflow flames of methane and ethylene: shape, lift-off, temperature, soot and extinction, as benchmark data for models.',
  'Diffusion flames are the type in most practical devices. Better prediction of soot, radiation and extinction helps fire suppression and engine efficiency.'],
 ['PSI-22','ACME E-FIELD Flames','Electric-field effects on laminar diffusion flames','f','2016–2020','10.60555/se5a-8c73',['clean'],33,'884.95 GB',
  'How an electric field changes ion current, flame stability and soot in laminar diffusion flames.',
  'Electric-field control could cut pollutants and fuel use in terrestrial combustion. The record says it serves no direct space application.'],
 ['PSI-23','ACME s-Flame','Structure and response of spherical diffusion flames','f','2015–2019','10.60555/k57n-p030',['models','engines','clean'],0,'728.45 GB',
  'Transient structure and extinction limits of spherical flames, soot-free and sooty, compared with detailed simulation.',
  'Diffusion flames underlie many engines and devices; cleaner data improves prediction of power, efficiency, emissions and reliability.'],
 ['PSI-25','BASS-II','Burning and Suppression of Solids II','f','2010–2022','10.60555/4qc4-de67',['safety','wildfire','models'],0,'255.77 GB',
  'Ignition, flame growth, spread and extinction limits of thicker solid fuels in slow forced airflow, and how they relate to the 1 g material test.',
  'Evaluates fuel-burning models that can then be used on Earth for wildfires, building fires and energy recovery from waste.'],
 ['PSI-26','BASS','Burning and Suppression of Solids','f','2009–2013','10.60555/58h4-dy80',['safety','models'],123,'152.32 GB',
  'Solid fuels in realistic shapes, including wake flames, and how well nitrogen puts them out.',
  'Models validated in the simple microgravity flow are then built up to capture flames in normal gravity, with wide use across terrestrial combustion problems.'],
 ['PSI-39','CFI','Cool Flames Investigation','f','2020–2021','10.60555/m6pj-a914',['engines','models'],88,'669.52 GB',
  'Droplets of n-dodecane and blends at 0.25 to 5 atm: cool-flame behaviour, helium dilution, extinction and soot.',
  'Cool flames matter for ignition of practical fuels, HCCI engine design, and how octane and cetane ratings arise.'],
 ['PSI-60','SPICE data analysis','Computational and experimental analysis of SPICE data sets','g','2019–2022','10.60555/mzjm-yv57',['clean','models'],null,'7.56 KB',
  'Re-analysis of over 1,600 SPICE flame images with soot modelling, to explain why soot differs so much between 1 g and 0 g.',
  'Better soot and radiation models for cleaner energy and industrial systems.'],
 ['PSI-62','Flame spread modelling vs BASS','Concurrent flame spread modelling with flamelet generated manifolds, compared with BASS','g','','10.60555/e9xp-ex83',['safety','models'],null,'9.47 KB',
  'A new modelling method for flame spread along a solid in the direction of airflow, checked against BASS measurements.',
  'Predictive screening of material flammability limits; the record says it could improve fire modelling and safety standards on Earth.'],
 ['PSI-68','FLEX-2','Flame Extinguishment Experiment 2','f','','10.60555/byp8-h018',['engines','clean','models'],9,'1.11 TB',
  'Two-component fuel droplets under conditions closer to real combustors: mixing, extinction and benchmark data for simulation.',
  'Liquid fuels power transport. The data supports surrogate fuels and validation of jet-engine combustion models.'],
 ['PSI-69','FLEX','Flame Extinguishment Experiment','f','2007–2016','10.60555/mbq8-0451',['safety','engines','models'],275,'860.39 GB',
  'Flammability limits of burning liquid droplets and the effect of the suppressants CO2, helium and SF6.',
  'Informs suppression in confined settings such as submarines and high-altitude aircraft; its cool-flame findings feed engine design.'],
 ['PSI-98','Saffire-I','Spacecraft Fire Safety Experiment I','f','','10.60555/0t15-1z43',['safety'],5,'11.41 GB',
  'How fast a large fire grows in low gravity, and how low-gravity flammability limits compare with the 1 g screening test.',
  'Fire in a small sealed vehicle is a stand-in for mines, aircraft and submarines.'],
 ['PSI-99','Saffire-II','Spacecraft Fire Experiment II','f','2016–2017','10.60555/2chp-m469',['safety'],16,'15.77 GB',
  'Large-scale fire growth and flammability limits for several spacecraft materials in low gravity.',
  'Same Earth link as Saffire-I: fire safety in sealed spaces such as mines, aircraft and submarines.'],
 ['PSI-100','Saffire-III','Spacecraft Fire Experiment III','f','','10.60555/040q-4h36',['safety'],3,'32.79 GB',
  'Large-scale fire growth in low gravity, continuing the Saffire series.',
  'Same Earth link as Saffire-I: fire safety in sealed spaces such as mines, aircraft and submarines.'],
 ['PSI-101','SAME-R','Smoke Aerosol Measurement Experiment, reflight','f','2010','10.60555/2np7-jv14',['safety'],110,'5.87 GB',
  'Sizes of smoke particles from overheated materials in low gravity, repeated after sample contamination in the first run.',
  'Better detectors for extreme environments on Earth such as submarines and underwater laboratories.'],
 ['PSI-102','SAME','Smoke and Aerosol Measurement Experiment','f','2001–2008','10.60555/gd4k-8h62',['safety'],9,'627.14 MB',
  'Smoke droplet size in low gravity, linked to how the smoke was made and carried, with a growth model.',
  'Baseline data for judging smoke detectors; useful for submarines and underwater laboratories.'],
 ['PSI-106','SLICE','Structure and Liftoff in Combustion Experiment','f','','10.60555/pm12-rg61',['clean','models','engines'],13,'67.91 GB',
  'Structure and stability of laminar diffusion flames: lift-off limits, nitrogen dilution, soot and radiative loss.',
  'Better numerical models for efficient combustion, low-emission systems and cleaner engines and industrial burners.'],
 ['PSI-107','SPICE','Smoke Point in Co-flow Experiment','f','','10.60555/9kbh-e962',['clean','models'],0,'6.47 GB',
  'The smoke point of non-buoyant jet flames: how burner size, coflow speed and fuel change the flame length at which soot escapes.',
  'Better soot models; the record says it could inform fuel formulation and combustion processes.'],
 ['PSI-108','STDCE-1','Surface Tension Driven Convection Experiment 1','f','','10.60555/j1z3-bw42',[],38,'22.57 GB',
  'Flows driven by surface tension in a heated liquid. A fluid physics experiment, not a flame study.',
  'Its infrared imaging and particle velocimetry methods are now used to study combustion and other flows on Earth.'],
 ['PSI-115','SAME data modelling','Using SAME data for simulation of smoke generation in microgravity','g','2017–2019','10.60555/q0v5-1v28',['safety','models'],null,'252.16 MB',
  'Simulation of how gravity changes smoke particle growth from overheated materials.',
  'Tools that predict smoke character from temperature, gravity and material, leading to better smoke detectors.'],
 ['PSI-117','Cool flame CFD','Effect of external thermo-convective perturbation on cool flame dynamics','g','','10.60555/gz0q-b577',['engines','models'],null,'67.54 MB',
  'Simulations using FLEX flight data to explain how heating and drift change cool-flame ignition, oscillation and extinction.',
  'Low-temperature combustion knowledge for engine knock, efficiency and emissions, with validated CFD tools.'],
 ['PSI-142','Cool flame transitions','Cool flame transitions at radiation and stretch extinction using counterflow flames','g','2016–2021','10.60555/80qf-vj95',['engines','models'],9,'730.58 KB',
  'Ground experiments and simulations, starting from FLEX data, mapping when hot flames turn into cool or warm flames.',
  'Cool and warm flame regions widen at higher pressure, which matters because many engines run at 20 to 40 atm.'],
 ['PSI-159','ACME CFI-G','Cool Flames Investigation with Gases','f','','10.60555/cyt1-kh64',['engines','models'],1016,'1.90 TB',
  'Conditions under which cool diffusion flames of propane, butane and pentane exist on a spherical burner, with CFD support.',
  'Tests cool-flame chemistry needed for ultra-lean engines; the record says efficiency could rise from 38% or lower toward 60%.'],
 ['PSI-181','Solder study','Pb-Sn and Pb-free solders made in terrestrial vs microgravity conditions','g','','10.60555/td9e-cz97',[],9,'487.38 GB',
  'Solder joint structure and strength when made in orbit versus on Earth. A materials study, not a flame study.',
  'No combustion application. Included because it appeared in the repository search.']
];

const VIEWS=[['data','Data and background','DB'],['materials','Building materials','BM'],['safety','Fire safety','FS'],['burners','Cleaner burners','CB'],['wildfire','Wildfire spread','WF'],['soot','Soot and air pollution','SA'],['engines','Engine efficiency','EE']];
const META={materials:['Check which building materials keep burning at a given oxygen level.','s','Well supported for sealed spaces'],
 safety:['The fire triangle and six plain findings for Earth.','s','Well supported for sealed spaces'],
 burners:['Six design principles for less soot and steadier flames.','s','Well supported'],
 wildfire:['Explore how wind, slope and moisture change fire spread.','w','Weak link'],
 soot:['What a flame gives off and which products this research addresses.','s','Well supported for soot'],
 engines:['See how compression and lean burning raise efficiency, and what limits them.','m','Supported through models']};
const MODS=[
 {k:'materials',n:'Building materials',ids:['PSI-20','PSI-25','PSI-26','PSI-62','PSI-98','PSI-99','PSI-100']},
 {k:'safety',n:'Fire safety',tag:'safety'},
 {k:'burners',n:'Cleaner burners',tag:'clean'},
 {k:'wildfire',n:'Wildfire',tag:'wildfire'},
 {k:'soot',n:'Soot and air pollution',tag:'clean',ids:['PSI-101','PSI-102','PSI-115']},
 {k:'engines',n:'Engines',tag:'engines'}
];
const INS=[
 ['A flame without gravity is round, blue and soot-free','On Earth hot gas rises, pulls the flame into a teardrop and carries soot to the tip, which glows yellow. In microgravity that flow is absent.','On Earth: yellow means soot. A yellow, flickering flame is burning less completely than a steady blue one.','NASA candle comparison'],
 ['Cutting the airflow does not always put a fire out','Stopping ventilation is a standard step against a spacecraft fire. In preliminary BRE results, flames kept burning without airflow when oxygen was enriched, but went out quickly at 21% oxygen.','On Earth: extra oxygen changes the rules. Oxygen-enriched rooms, such as medical or industrial settings, need stricter material choices.','PSI-20'],
 ['Passing a test at 1 g is not proof of safety elsewhere','BASS tests the hypothesis that a ventilated material burns as well in microgravity as in normal gravity, or better. NASA screens materials with a 1 g test.','On Earth: a flammability rating holds for the conditions it was tested in. Change airflow, oxygen or pressure and the rating may not hold.','PSI-25, PSI-26'],
 ['Smoke is not the same everywhere','Without buoyancy, smoke particles spend a different time at a different temperature and grow differently. SAME measured this so detectors can be judged against real data.','On Earth: detectors must match the smoke they will meet. This matters most in sealed places such as submarines.','PSI-101, PSI-102, PSI-115'],
 ['The suppressant has to fit the fire','FLEX measured how well CO2, helium and SF6 put out burning droplets. BASS did the same for nitrogen on solids.','On Earth: the data supports gas suppression systems that work in confined spaces with fewer harmful by-products.','PSI-69, PSI-26'],
 ['Some flames burn cool and are easy to miss','Cool diffusion flames peak at roughly 500 to 1,000 K, far below an ordinary flame. They were discovered in 2012 and FLEX observed them in microgravity.','On Earth: this chemistry sets how fuels ignite in engines. As a safety point, no visible flame does not always mean no reaction.','PSI-69, PSI-159']
];
const TIPS=[
 ['Soot needs three things at once','Flame Design works from the hypothesis that soot forms only where the mix is carbon-rich, the temperature is high and the gas is not being stretched quickly. Break any one and soot does not start.','PSI-10'],
 ['Dilute to move the soot limit','Adding an inert gas such as nitrogen or CO2, or shifting where fuel and oxygen meet, changes the point at which soot first appears. Flame Design and SLICE map those limits.','PSI-10, PSI-106'],
 ['Shorten the time hot fuel lingers','Long residence times make flames sootier. SPICE links flame shape and smoke point to residence time, and coflow speed is one of the handles.','PSI-21, PSI-107'],
 ['Know the lift-off limit before leaning out','Flame stability depends on burner diameter, coflow velocity and fuel composition. SLICE measured the velocities at which flames lift off the burner.','PSI-106'],
 ['Check your model on a simple flame first','The coflow experiments exist to give simulation codes benchmark data at the dilute and sooty extremes. A burner model that cannot match them should not be trusted on a furnace.','PSI-21, PSI-60'],
 ['Electric fields are a research-stage control','E-FIELD Flames studies steering a flame and its soot with a voltage. The record presents this as a possible route to lower pollutants, not a proven product.','PSI-22']
];
const PROD=[
 ['Soot and fine particles','Carbon that did not finish burning, released as solid particles.','Particles of 0.1 to 2 micrometres settle deep in the lungs and are linked to heart and lung disease. Soot on snow makes it melt sooner.','y','Yes, directly','Flame Design, CLD Flame, SPICE and SLICE measure when soot starts to form and what shifts that point.'],
 ['Carbon dioxide','The main product whenever carbon burns. Carbon is 60 to 90% of fuel mass.','A greenhouse gas that stays in the atmosphere for decades to centuries.','p','Partly','Only by burning less fuel. The cool-flame and droplet records aim at more efficient engines.'],
 ['Carbon monoxide','Carbon in the fuel that burned incompletely.','Colourless and odourless. Blood takes it up about 240 times more readily than oxygen.','p','Partly','The records aim at complete, low-emission combustion in general. None names carbon monoxide as an Earth target.'],
 ['Nitrogen oxides','Nitrogen and oxygen from the air combining at high flame temperature.','Form smog, ground-level ozone, fine particles and acid rain.','n','Not in these records','No record in this set claims a nitrogen oxide benefit, so this page does not either.'],
 ['Sulfur dioxide','Sulfur already present in coal and oil.','Triggers breathing difficulty, forms acid rain and fine particles.','n','No','It depends on what is in the fuel, not on how the flame behaves.']
];
const SOOT=[
 ['Soot behaves differently without gravity','One ground study exists to explain the large gap between soot in 1 g and 0 g flames. Its hypothesis: microgravity flames are longer, cooler and sootier.','So what: soot amounts measured in orbit cannot be copied to Earth. The soot model can, once it matches both.','PSI-60'],
 ['Every fuel has a smoke point','SPICE measures the flame length at which soot starts to escape, for ethylene, propane and propylene mixes, and how burner size and coflow move it.','So what: a ranking of fuels by sooting tendency, free of buoyancy effects, is a direct input to cleaner fuel and burner choices.','PSI-107'],
 ['Smouldering is worse than flaming','Field measurements found that smouldering peat gives off more gas and particles per unit area than burning vegetation. The 1997 fires in south-east Asia caused over 20 million smog-related health cases.','So what: this is Earth field science, not microgravity. It shows the scale of the particle problem the flame research is trying to reduce at source.','NASA Earth Observatory'],
 ['Smoke particles are measured, not assumed','SAME sized smoke droplets from overheated materials so that detectors can be judged against real particle data.','So what: the same sizing methods apply to detector design for sealed spaces on Earth.','PSI-101, PSI-102']
];
const GAPS=[
 ['Descriptions, not measurements','The files hold each investigation\'s record page. The numbers sit in the PSI datasets, from a few kilobytes to nearly 2 TB each, and still need to be downloaded and standardised.'],
 ['The scenarios are textbook models','The wildfire and engine scenarios and the material oxygen-index values come from standard references, not from NASA measurements. They show why the research matters; they do not test it.'],
 ['No paired 1 g data','Judging how well a finding transfers needs the same fuel and conditions measured at normal gravity. Only a few ground studies here attempt that comparison.'],
 ['Benefits are stated as potential','The Earth-benefit sections use words such as "could" and "has the potential". They describe intended use, not a demonstrated outcome.'],
 ['Wildfire rests on one sentence','A single record names wildfires and building fires, and only as a use for validated models. NASA\'s wildfire knowledge in these files comes from aircraft and satellites.'],
 ['Two records are off-topic','STDCE-1 is fluid physics and the solder study is materials science. They are listed for completeness and excluded from every module.']
];
// name, typical oxygen index at 1 g (% O2), note, named in NASA records?
const MAT=[
 ['Acrylic (PMMA)',17,'glazing, panels','BASS-II, Saffire-II'],
 ['Polyethylene',17.5,'cable sheath, film',''],
 ['Cotton fabric',18,'clothing, furnishings','BASS, Saffire'],
 ['Nylon',22,'carpet, fasteners','BRE emulates it'],
 ['Wool',25,'furnishings',''],
 ['Polycarbonate',26,'windows, housings',''],
 ['Silicone rubber',28,'seals, sheets','Saffire-II'],
 ['Nomex',29,'protective fabric','BASS, Saffire-II'],
 ['Rigid PVC',45,'pipe, cladding',''],
 ['Ultem (PEI)',47,'aircraft interiors','BASS'],
 ['PTFE (Teflon)',95,'wire insulation','']
];
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s), esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rec=R.map(r=>({id:r[0],short:r[1],title:r[2],type:r[3],years:r[4],doi:r[5],areas:r[6],rows:r[7],size:r[8],study:r[9],earth:r[10]}));
const inMod=(m,r)=>(m.tag&&r.areas.includes(m.tag))||(m.ids&&m.ids.includes(r.id));
const modRecs=k=>{const m=MODS.find(x=>x.k===k);return rec.filter(r=>inMod(m,r));};

/* ---------- citations ---------- */
const REFS={
 n1:['NASA Glenn Research Center, Combustion Science','https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/'],
 n2:['NASA, Candle Flame: 1g vs Microgravity (30 April 2020)','https://www.nasa.gov/image-article/candle-flame-1g-vs-microgravity/'],
 n3:["NASA, A Researcher's Guide to Combustion Science (2015 edition)",'https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/'],
 n4:["NASA Glenn, Beginner's Guide to Aeronautics: Combustion",'https://www.grc.nasa.gov/www/k-12/airplane/combst1.html'],
 n5:['NASA Earth Observatory, Biomass Burning (2001)','https://science.nasa.gov/earth/earth-observatory/biomass-burning/'],
 n6:['Engineering LibreTexts (Pisupati), 4.1 Fossil Fuels and Products of Combustion','https://eng.libretexts.org/Bookshelves/Environmental_Engineering_(Sustainability_and_Conservation)/Energy_Conservation_for_Environmental_Protection_(Pisupati)/04%3A_Energy_and_the_Environment/4.01%3A_New_Page'],
 n7:['UC Museum of Paleontology, Understanding Global Change: Burning of fossil fuels','https://ugc.berkeley.edu/background-content/burning-of-fossil-fuels/'],
 n8:['Rothermel, R.C. (1972). A mathematical model for predicting fire spread in wildland fuels. USDA Forest Service Research Paper INT-115. Used for the moisture-damping curve. Textbook source, not in the provided files.',null],
 n9:['Limiting oxygen index test method (ASTM D2863 / ISO 4589-2). The oxygen-index values on this page are typical handbook figures supplied by the team, not taken from the provided files. Check the supplier data sheet.',null],
 n10:['Ideal Otto cycle, efficiency = 1 - r^(1-gamma): standard thermodynamics textbook result. Knock and lean-limit thresholds are typical petrol-engine values, not from the provided files.',null],
 n11:['Wildland fire rules of thumb (spread roughly proportional to wind; roughly doubling per 10 degrees of uphill slope). Common field guidance, not from the provided files.',null],
 n12:['NASA Scientific Visualization Studio, NASA Studies Fire in Microgravity (6 May 2026)','https://svs.gsfc.nasa.gov/31394/']};
const REFN=Object.keys(REFS),UNSRC=['n8','n9','n10','n11'];
const RECBY=Object.fromEntries(R.map(r=>[r[0],r]));
function cite(tok){
  if(tok.startsWith('PSI-')){const r=RECBY[tok];if(!r)return '';return `<a class="cite lbl" href="https://doi.org/${r[5]}" target="_blank" rel="noopener" title="${esc(r[1]+': '+r[2]+' (DOI '+r[5]+')')}">${tok}</a>`;}
  const n=REFN.indexOf(tok)+1,d=REFS[tok];if(!d)return '';const un=UNSRC.includes(tok);
  return d[1]?`<a class="cite${un?' un':''}" href="${d[1]}" target="_blank" rel="noopener" title="${esc(d[0])}">[${n}]</a>`:`<span class="cite${un?' un':''}" title="${esc(d[0])}">[${n}]</span>`;}
const citeAll=(str,lbl)=>str.split(',').map(t=>t.trim()).filter(Boolean).map(cite).join('');
function srcLinks(str){return str.split(',').map(t=>t.trim()).map(t=>{if(/^PSI-\d+$/.test(t))return cite(t);const m={'NASA candle comparison':'n2','NASA Earth Observatory':'n5'}[t];return m?`<a class="cite lbl" href="${REFS[m][1]}" target="_blank" rel="noopener">${t}</a>`:t;}).join('');}
function fillCites(){
  $$('.cs').forEach(el=>{el.innerHTML=citeAll(el.dataset.c);});
  $$('.srcs').forEach(el=>{const toks=el.dataset.s.split(',');let h='<b>Sources for this tab</b><ol>';
    toks.forEach(t=>{if(t.startsWith('PSI-')){const r=RECBY[t];if(r)h+=`<li><i>${t}</i>${esc(r[2])}. NASA PSI record, <a href="https://doi.org/${r[5]}" target="_blank" rel="noopener">doi.org/${r[5]}</a></li>`;}
      else{const n=REFN.indexOf(t)+1,d=REFS[t];h+=`<li><i>[${n}]</i>${d[1]?`<a href="${d[1]}" target="_blank" rel="noopener">${esc(d[0])}</a>`:esc(d[0])}</li>`;}});
    h+='</ol>';if(toks.some(t=>UNSRC.includes(t)))h+='<p class="note">Red markers are standard textbook or handbook material added by the team. They are not from your NASA files and have not been checked against a primary source.</p>';
    el.innerHTML=h;});}
/* ---------- shared rendering core ---------- */
const DPR=Math.min(2,window.devicePixelRatio||1);
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,f)=>a+(b-a)*f, sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const gauss=()=>(Math.random()+Math.random()+Math.random()-1.5)/.75;
function fitCanvas(c,w,h){c.width=Math.round(w*DPR);c.height=Math.round(h*DPR);c.style.aspectRatio=w+'/'+h;c._w=w;c._h=h;const x=c.getContext('2d');x.setTransform(DPR,0,0,DPR,0,0);return x;}
const RAMP=[[0,[30,130,255]],[.12,[120,205,255]],[.22,[255,238,176]],[.4,[255,204,76]],[.65,[255,130,26]],[.85,[196,46,10]],[1,[86,18,8]]];
function rampColor(t){for(let i=1;i<RAMP.length;i++){if(t<=RAMP[i][0]){const a=RAMP[i-1],b=RAMP[i],f=(t-a[0])/(b[0]-a[0]);return a[1].map((v,k)=>v+(b[1][k]-v)*f);}}return RAMP[RAMP.length-1][1];}
const SPR=[];(function(){for(let i=0;i<40;i++){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),col=rampColor(i/39).map(Math.round),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,`rgba(${col},1)`);g.addColorStop(.35,`rgba(${col},.55)`);g.addColorStop(1,`rgba(${col},0)`);x.fillStyle=g;x.fillRect(0,0,64,64);SPR.push(c);}})();
const SMK=(function(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(170,165,155,.55)');g.addColorStop(1,'rgba(170,165,155,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return c;})();
const sprAt=t=>SPR[clamp(Math.round(t*39),0,39)];

/* particle flame: buoyant plume, non-buoyant sphere shell, jets, smoke */
class Fire{
  constructor(){this.p=[];this.t=0;this.acc={r:0,s:0,k:0};}
  rise(n,x,y,o){const s=o.scale||1;for(let i=0;i<n;i++){
    const life=(.5+Math.random()*.35)*(.75+.25*s),jet=o.jet?-(120+60*o.g)*s:-30*s;
    this.p.push({k:0,x:x+gauss()*(o.spread||9)*s*(.4+Math.random()*.6),y:y-Math.random()*5*s,vx:0,vy:jet,life,age:0,sz:(13+Math.random()*9)*s,cx:x,g:o.g,s,a:o.power==null?1:o.power,ph:Math.random()*6.28,sf:o.sf==null?1:o.sf,jet:!!o.jet});}}
  shell(n,cx,cy,R,o){for(let i=0;i<n;i++){const u=Math.random()*2-1,th=Math.random()*6.283,r=Math.sqrt(1-u*u);
    const rr=Math.random()<.45?Math.cbrt(Math.random()):1;this.p.push({k:1,x:cx+rr*R*r*Math.cos(th),y:cy+rr*R*r*Math.sin(th),vx:gauss()*1.2,vy:gauss()*1.2,life:.9+Math.random()*.3,age:0,sz:(8+Math.random()*4)*(o.sz||1),a:o.power==null?1:o.power,tm:.0+Math.random()*.07});}}
  smoke(n,x,y,o){for(let i=0;i<n;i++)this.p.push({k:2,x:x+gauss()*4,y,vx:gauss()*6,vy:-(18+Math.random()*14)*(o.rise||1),life:2+Math.random()*1.6,age:0,sz:8+Math.random()*7,a:o.power==null?1:o.power,ph:Math.random()*6.28});}
  step(dt){this.t+=dt;const t=this.t;
    for(let i=this.p.length-1;i>=0;i--){const q=this.p[i];q.age+=dt;if(q.age>=q.life){this.p.splice(i,1);continue;}const u=q.age/q.life;
      if(q.k===0){const g=q.g;q.vy-=g*430*q.s*dt;q.vy=Math.max(q.vy,-(q.jet?330:230)*(g*.75+.25)*q.s);
        const kc=2.3*g-(q.jet?.8*(1-g):0);q.x+=-(q.x-q.cx)*kc*dt;
        q.x+=(Math.sin(t*7-q.y*.045)*10+Math.sin(t*13.7+q.ph)*4)*g*u*u*dt*3.2*q.s;q.y+=q.vy*dt;}
      else if(q.k===1){q.vx+=gauss()*8*dt;q.vy+=gauss()*8*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;}
      else{q.x+=q.vx*dt+Math.sin(t*1.7+q.ph)*10*dt;q.y+=q.vy*dt;q.sz+=9*dt;}}}
  settle(fn,n){for(let i=0;i<n;i++){fn(1/60);this.step(1/60);}}
  draw(ctx){const P=this.p;
    ctx.globalCompositeOperation='source-over';
    for(const q of P){if(q.k!==2)continue;const u=q.age/q.life,a=Math.min(1,u*5)*(1-u)*.34*q.a;if(a<.01)continue;ctx.globalAlpha=a;ctx.drawImage(SMK,q.x-q.sz,q.y-q.sz,q.sz*2,q.sz*2);}
    ctx.globalCompositeOperation='lighter';
    for(const q of P){if(q.k===2)continue;const u=q.age/q.life;let a,t,r;
      if(q.k===0){t=clamp(u*(.42+.58*q.sf),0,1);a=Math.min(1,u/.08)*Math.pow(1-u,1.35)*.3*q.a;r=q.sz*(1-.55*u)*(.7+.5*q.g);}
      else{t=q.tm;a=Math.min(1,u/.25)*Math.min(1,(1-u)/.25)*.03*q.a;r=q.sz;}
      if(a<.008)continue;ctx.globalAlpha=a;ctx.drawImage(sprAt(t),q.x-r,q.y-r,r*2,r*2);}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
}
/* scene registry: one loop, only visible scenes tick */
const SCENES=[];let lastT=0;
function addScene(el,tick){SCENES.push({el,tick});}
function loop(ts){const dt=Math.min(.04,(ts-lastT)/1000||.016);lastT=ts;
  if(!document.hidden)for(const s of SCENES){if(s.el.offsetParent!==null)s.tick(dt);}
  requestAnimationFrame(loop);}
requestAnimationFrame(loop);
const wrapAcc=(o,k,rate,dt)=>{o.acc[k]+=rate*dt;const n=Math.floor(o.acc[k]);o.acc[k]-=n;return n;};
/* ---------- hero candle ---------- */
const hc=$('#hero'),hx=fitCanvas(hc,400,340),HF=new Fire();let G=0;
const WICK_Y=236,CX=200;
function candle(ctx,g,t){
  const gl=ctx.createRadialGradient(CX,WICK_Y-60*g,10,CX,WICK_Y-40,230);gl.addColorStop(0,`rgba(255,170,70,${.22*g})`);gl.addColorStop(1,'rgba(255,170,70,0)');
  ctx.globalCompositeOperation='lighter';ctx.fillStyle=gl;ctx.fillRect(0,0,400,340);ctx.globalCompositeOperation='source-over';
  const wx=ctx.createLinearGradient(168,0,232,0);const warm=.35+.5*g;
  wx.addColorStop(0,'#A59C86');wx.addColorStop(.3,`rgb(${Math.round(240+15*g)},${Math.round(232-14*g)},${Math.round(210-40*g)})`);wx.addColorStop(.7,`rgb(${Math.round(226+15*g)},${Math.round(216-8*g)},${Math.round(192-34*g)})`);wx.addColorStop(1,'#8E8570');
  ctx.fillStyle=wx;ctx.beginPath();ctx.moveTo(168,252);ctx.lineTo(168,336);ctx.quadraticCurveTo(200,342,232,336);ctx.lineTo(232,252);ctx.fill();
  const pool=ctx.createRadialGradient(CX,252,2,CX,252,34);pool.addColorStop(0,`rgba(255,${Math.round(214+20*g)},${Math.round(150+10*g)},1)`);pool.addColorStop(1,'rgba(236,224,196,1)');
  ctx.fillStyle=pool;ctx.beginPath();ctx.ellipse(CX,252,32,7,0,0,6.283);ctx.fill();
  const sh=ctx.createLinearGradient(0,252,0,300);sh.addColorStop(0,`rgba(255,190,100,${.35*g})`);sh.addColorStop(1,'rgba(255,190,100,0)');ctx.fillStyle=sh;ctx.fillRect(168,258,64,44);
  ctx.strokeStyle='#17130F';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(CX,252);ctx.bezierCurveTo(CX,244,CX-1,240,CX+1,WICK_Y-2);ctx.stroke();
  ctx.fillStyle=`rgba(255,${Math.round(120+60*Math.sin(t*9)*g)},50,${.45+.5*g})`;ctx.beginPath();ctx.arc(CX+1,WICK_Y-2,2.1,0,6.283);ctx.fill();
}
function heroEmit(dt){const g=G,R=(44-14*g);
  const shA=Math.max(0,1-g*1.9);
  if(shA>0)HF.shell(wrapAcc(HF,'s',shA*1500,dt),CX,254-R*(1+.4*g),R*(1+.015*Math.sin(HF.t*3)),{power:shA});
  if(g>.02)HF.rise(wrapAcc(HF,'r',g*640,dt),CX,WICK_Y-2,{g,scale:1,spread:8,sf:clamp(g*1.25,0,1),power:Math.min(1,g*1.6)});
  if(g>.6)HF.smoke(wrapAcc(HF,'k',(g-.55)*3.2,dt),CX+Math.sin(HF.t*5)*3,WICK_Y-118*g,{power:1});}
function heroDraw(){hx.clearRect(0,0,400,340);candle(hx,G,HF.t);HF.draw(hx);}
addScene(hc,dt=>{if(REDUCE)return;heroEmit(dt);HF.step(dt);heroDraw();});
function setG(v){G=v/100;const g=G;
  $('#gv').textContent=g===0?'0 g (free fall)':g.toFixed(2)+' g';
  const z=g<.06?0:g<.6?1:2;
  $('#rShape').textContent=['Dome around the wick','Stretching upward','Teardrop, flickering'][z];
  $('#rCol').textContent=['Dim blue','Blue base, yellowing tip','Yellow with a blue base'][z];
  $('#rSoot').textContent=['None visible','Starting to form','Carried to the tip, glows yellow'][z];
  $('#rFlow').textContent=['Diffusion only','Weak rising flow','Buoyant convection'][z];
  if(REDUCE){HF.p=[];HF.settle(heroEmit,100);heroDraw();}}
$('#g').addEventListener('input',e=>setG(+e.target.value));setG(0);
/* ---------- materials + burn test ---------- */
const ATM=[['Normal air, 21%',21],['Oxygen-enriched, 23.5%',23.5],['Heavily enriched, 30%',30]];
const MCOL={'Acrylic (PMMA)':['#D9E6EE','#8FB6CC'],'Polyethylene':['#E8E4DA','#C9C3B3'],'Cotton fabric':['#EFE7D2','#D3C7A4'],'Nylon':['#D8D2C0','#B3AB93'],'Wool':['#B9A58A','#8C7A62'],'Polycarbonate':['#C6D8D6','#8FA9A6'],'Silicone rubber':['#C7503C','#8E3426'],'Nomex':['#B39A5A','#8A7440'],'Rigid PVC':['#CFCFC8','#A6A69E'],'Ultem (PEI)':['#C9923A','#9A6C22'],'PTFE (Teflon)':['#F2F2EE','#CFCFC9']};
const SOOTY={'Acrylic (PMMA)':.3,'Polyethylene':.75,'Cotton fabric':.35,'Nylon':.7,'Wool':.5,'Polycarbonate':.8,'Silicone rubber':.15,'Nomex':.4,'Rigid PVC':.9,'Ultem (PEI)':.5,'PTFE (Teflon)':.1};
let selMat=0;
$('#atm').innerHTML=ATM.map(a=>`<button type="button" data-o="${a[1]}">${a[0]}</button>`).join('');
$('#atm').addEventListener('click',e=>{const b=e.target.closest('button');if(b){$('#o2').value=b.dataset.o;mats();}});
function verdict(i){const d=MAT[i][1]-(+$('#o2').value);return d<=0?'burn':d<4?'marg':'ext';}
function mats(){
  const o=+$('#o2').value;$('#o2v').textContent=o+'%';
  $$('#atm button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.o===o));
  let nb=0;
  $('#mlist').innerHTML=MAT.map((m,i)=>{const d=m[1]-o,st=d<=0?['b','Keeps burning']:d<4?['m','Marginal']:['s','Self-extinguishes'];if(d<=0)nb++;
    return `<div class="mrow${i===selMat?' sel':''}" data-i="${i}" role="button" tabindex="0" aria-pressed="${i===selMat}"><div><b>${m[0]}</b>${m[3]?`<small>NASA tested: ${m[3]}</small>`:`<small style="color:var(--ink2)">${m[2]}</small>`}</div>
    <div class="track" title="Needs about ${m[1]}% oxygen"><i style="width:${m[1]}%;background:${d<=0?'var(--weak)':d<4?'var(--earth)':'var(--ok)'}"></i><u style="left:${o}%"></u></div>
    <span class="st ${st[0]}">${st[1]}</span></div>`;}).join('');
  $('#msum').textContent=`At ${o}% oxygen, ${nb} of ${MAT.length} materials keep burning once lit. Bars show the oxygen each material needs; the line is the room. Select a row to watch a burn test.`;
  const n=$('#gnote');
  if(o<=21.5){n.className='flag';n.textContent='Normal air. These verdicts match how the oxygen index is measured.';}
  else if(o<23.5){n.className='flag warn';n.textContent='Slightly enriched. Materials near the line lose their safety margin.';}
  else{n.className='flag warn';n.textContent='Oxygen-enriched, as can happen around medical or industrial oxygen. In NASA\'s BRE tests, flames in enriched oxygen kept burning even with no airflow.';}
  btReset();
}
const pickMat=e=>{const r=e.target.closest('.mrow');if(r){selMat=+r.dataset.i;mats();}};
$('#mlist').addEventListener('click',pickMat);
$('#mlist').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickMat(e);const r=$('#mlist .mrow.sel');if(r)r.focus();}});

const bc=$('#bt'),bx=fitCanvas(bc,640,190),BF=new Fire();
let bt={f:0,t:0,mode:'burn',hold:0,dead:false};
function btReset(){bt={f:0,t:0,mode:verdict(selMat),hold:0,dead:false,fl:1};BF.p=[];
  const m=MAT[selMat],v={burn:'keeps burning along the whole sample',marg:'spreads slowly, then goes out partway',ext:'the igniter flame dies and the sample goes out'}[bt.mode];
  $('#btnote').textContent=`${m[0]} at ${$('#o2').value}% oxygen: ${v}. Animation of the verdict above, not footage of a real test.`;}
const SX0=50,SX1=590,SY=150;
function btTick(dt){
  bt.t+=dt;const m=MAT[selMat],spd={burn:.11,marg:.065,ext:.03}[bt.mode];
  const stopAt={burn:1.01,marg:.56,ext:.07}[bt.mode];
  if(bt.hold>0){bt.hold-=dt;if(bt.hold<=0)btReset();}
  else if(!bt.dead){bt.f+=spd*dt;
    if(bt.f>=stopAt){if(bt.mode==='burn'){bt.dead=true;bt.fl=0;bt.hold=1.6;}else{bt.dying=true;}}
    if(bt.dying){bt.fl-=dt*(bt.mode==='ext'?.9:.55);if(bt.fl<=0){bt.fl=0;bt.dead=true;bt.hold=2.4;}}}
  const fx=SX0+(SX1-SX0)*Math.min(bt.f,1),sooty=SOOTY[m[0]];
  if(!bt.dead||bt.fl>0){const sc=.62*(bt.mode==='ext'?.7:1)*Math.max(.05,bt.fl);
    BF.rise(wrapAcc(BF,'r',360*Math.max(.05,bt.fl),dt),fx,SY-8,{g:1,scale:sc,spread:10,sf:.5+.5*sooty,power:Math.max(.08,bt.fl)});
    if(sooty>.55&&bt.fl>.3)BF.smoke(wrapAcc(BF,'k',sooty*3,dt),fx+Math.sin(BF.t*4)*4,SY-8-70*sc,{power:.7});}
  else if(bt.hold>0&&sooty>.2)BF.smoke(wrapAcc(BF,'k',1.2,dt),fx,SY-14,{power:.5,rise:.8});
  BF.step(dt);
  const ctx=bx;ctx.clearRect(0,0,640,190);
  const g0=ctx.createLinearGradient(0,0,0,190);g0.addColorStop(0,'#0A1124');g0.addColorStop(1,'#141C33');ctx.fillStyle=g0;ctx.fillRect(0,0,640,190);
  ctx.fillStyle='#232C47';ctx.fillRect(0,SY+9,640,6);ctx.fillStyle='#39425F';[70,320,570].forEach(x=>ctx.fillRect(x,SY+9,10,30));
  const c=MCOL[m[0]],T=12,x1=SX0+(SX1-SX0)*Math.min(bt.f,1);
  const gr=ctx.createLinearGradient(0,SY-T/2,0,SY+T/2);gr.addColorStop(0,c[0]);gr.addColorStop(1,c[1]);ctx.fillStyle=gr;ctx.fillRect(x1,SY-T/2,SX1-x1,T);
  const ch=ctx.createLinearGradient(SX0,0,x1,0);ch.addColorStop(0,'#15110E');ch.addColorStop(.85,'#2A201A');ch.addColorStop(1,'#4A3626');ctx.fillStyle=ch;ctx.fillRect(SX0,SY-T/2,Math.max(0,x1-SX0),T);
  if(!bt.dead||bt.fl>0){ctx.globalCompositeOperation='lighter';const gl=ctx.createRadialGradient(x1,SY,0,x1,SY,26);gl.addColorStop(0,`rgba(255,150,40,${.7*Math.max(0,bt.fl)})`);gl.addColorStop(1,'rgba(255,150,40,0)');ctx.fillStyle=gl;ctx.fillRect(x1-30,SY-30,60,60);ctx.globalCompositeOperation='source-over';}
  ctx.fillStyle='#8A94AE';ctx.font='600 11px Figtree,sans-serif';ctx.fillText('sample, flame spreads left to right',SX0,SY+34);
  ctx.fillStyle='#39425F';ctx.fillRect(SX0-8,SY-14,8,28);
  BF.draw(ctx);
}
addScene(bc,dt=>{if(REDUCE){return;}btTick(dt);});
$('#o2').addEventListener('input',mats);mats();
/* ---------- fire triangle demo ---------- */
const tc=$('#tri'),tx=fitCanvas(tc,380,300),TF=new Fire();
let ts={mode:null,t:0};
const TRI=[['fuel','Remove the fuel','The wick is trimmed away and the flame starves.'],['oxygen','Remove the oxygen','A jar cuts off the air; the flame shrinks and gutters out.'],['heat','Remove the heat','Cooling pulls heat from the flame faster than it makes it; it goes out.']];
$('#trib').innerHTML=TRI.map(t=>`<button type="button" data-m="${t[0]}">${t[1]}</button>`).join('')+'<button type="button" data-m="">Relight</button>';
$('#trib').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ts={mode:b.dataset.m||null,t:0};
  $$('#trib button').forEach(x=>x.setAttribute('aria-pressed',x===b&&!!b.dataset.m));
  const n=$('#trin');if(ts.mode){n.className='flag warn';n.textContent=TRI.find(t=>t[0]===ts.mode)[2];}else{n.className='flag';n.textContent='All three present: fuel, oxygen and heat. The fire keeps itself going.';}});
$('#trin').className='flag';$('#trin').textContent='All three present: fuel, oxygen and heat. The fire keeps itself going.';
function triTick(dt){ts.t+=dt;const m=ts.mode,D={fuel:1.6,oxygen:3.2,heat:.9}[m]||1,p=m?clamp(ts.t/D,0,1):0;
  let pw=1-p,sc=1-.8*p;if(m==='oxygen')sc=1-.7*sstep(0,1,p)+Math.sin(ts.t*18)*.05*p;
  const WY=250,X=190;
  if(pw>.03)TF.rise(wrapAcc(TF,'r',620*pw,dt),X,WY-2,{g:1,scale:Math.max(.15,sc),spread:8,sf:1,power:pw});
  if(m&&p>.4)TF.smoke(wrapAcc(TF,'k',(p<1?1.5:2.5),dt),X+Math.sin(TF.t*3)*3,WY-14-30*(1-p),{power:.8});
  if(!m&&TF.t>0&&Math.random()<dt*2)TF.smoke(1,X,WY-110,{power:.5});
  TF.step(dt);const ctx=tx;ctx.clearRect(0,0,380,300);
  const bg=ctx.createLinearGradient(0,0,0,300);bg.addColorStop(0,'#0A1124');bg.addColorStop(1,'#151D36');ctx.fillStyle=bg;ctx.fillRect(0,0,380,300);
  ctx.globalCompositeOperation='lighter';const gl=ctx.createRadialGradient(X,WY-50,5,X,WY-40,200);gl.addColorStop(0,`rgba(255,170,70,${.28*pw})`);gl.addColorStop(1,'rgba(255,170,70,0)');ctx.fillStyle=gl;ctx.fillRect(0,0,380,300);ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#2A3350';ctx.fillRect(0,278,380,22);
  const trimmed=m==='fuel'&&p>.6,wickH=trimmed?2:10;
  const wx=ctx.createLinearGradient(160,0,220,0);wx.addColorStop(0,'#A59C86');wx.addColorStop(.3,'#F2E7CE');wx.addColorStop(.7,'#E2D6B8');wx.addColorStop(1,'#8E8570');
  ctx.fillStyle=wx;ctx.fillRect(160,252,60,28);ctx.fillStyle='#EFD7A4';ctx.beginPath();ctx.ellipse(190,252,30,6,0,0,6.283);ctx.fill();
  ctx.strokeStyle='#17130F';ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(190,252);ctx.lineTo(190,252-wickH);ctx.stroke();
  TF.draw(ctx);
  if(m==='oxygen'){const dy=-120*(1-sstep(0,.5,Math.min(1,ts.t/1.2)));ctx.fillStyle='rgba(170,200,230,.16)';ctx.strokeStyle='rgba(200,225,250,.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(138,278+dy*0);ctx.lineTo(138,150+dy);ctx.quadraticCurveTo(138,120+dy,190,120+dy);ctx.quadraticCurveTo(242,120+dy,242,150+dy);ctx.lineTo(242,278);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(150,140+dy,6,120);}
  if(m==='heat'){ctx.globalAlpha=.5*(1-p*.5);for(let i=0;i<26;i++){const a=Math.random()*6.283,r=30+Math.random()*60;ctx.fillStyle='rgba(150,200,255,.5)';ctx.beginPath();ctx.arc(190+Math.cos(a)*r,205+Math.sin(a)*r*.8,1.4+Math.random()*1.6,0,6.283);ctx.fill();}ctx.globalAlpha=1;}
  ctx.fillStyle='#8A94AE';ctx.font='600 11px Figtree,sans-serif';ctx.textAlign='center';ctx.fillText(m?{fuel:'no fuel',oxygen:'no oxygen',heat:'heat removed'}[m]:'fuel + oxygen + heat',190,296);ctx.textAlign='left';}
addScene(tc,dt=>{if(REDUCE)return;triTick(dt);});
/* ---------- burner soot demo ---------- */
const bnc=$('#bn'),nx=fitCanvas(bnc,640,330),NF=[new Fire(),new Fire(),new Fire()];
const FUELS=[['Methane',.14],['Propane',.5],['Ethylene',.86]];
function sootOf(i){const dil=+$('#bd').value/100;return clamp(FUELS[i][1]*(1-1.15*dil),0,1);}
function bnLab(){const d=+$('#bd').value;$('#bdv').textContent=d+'%';const mg=$('#bgr').value==='0';
  $('#bnt').innerHTML=FUELS.map((f,i)=>{const s=sootOf(i),smoke=s>.55;return `<div class="fbar"><span>${f[0]}</span><div class="track"><i style="width:${s*100}%;background:${smoke?'var(--weak)':'var(--earth)'}"></i></div><span style="width:auto;white-space:nowrap">${smoke?'smokes':s>.3?'sooty tip':'clean'}</span></div>`;}).join('')+
  `<p class="src" style="margin-top:8px">${mg?'Microgravity: the same fuel flow gives a longer, wider flame and soot escapes sooner (the hypothesis of PSI-60).':'Earth gravity: buoyancy lifts and narrows the flame.'} Ranking of fuels and the effect of dilution are qualitative, not measured values.</p>`;}
['bd','bgr'].forEach(i=>$('#'+i).addEventListener('input',bnLab));bnLab();
function bnTick(dt){const mg=$('#bgr').value==='0',g=mg?0:1,ctx=nx;
  ctx.clearRect(0,0,640,330);const bg=ctx.createLinearGradient(0,0,0,330);bg.addColorStop(0,'#090F20');bg.addColorStop(1,'#141B33');ctx.fillStyle=bg;ctx.fillRect(0,0,640,330);
  FUELS.forEach((f,i)=>{const F=NF[i],X=120+i*200,BY=270,s=sootOf(i),sc=mg?(1.05+.35*s):(.9+.2*s);
    F.rise(wrapAcc(F,'r',520,dt),X,BY,{g,scale:sc*.85,spread:mg?9:5,jet:true,sf:.25+.75*s,power:mg?.8:1});
    if(s>.45)F.smoke(wrapAcc(F,'k',(s-.4)*10,dt),X+(mg?0:Math.sin(F.t*5)*3),BY-(mg?190:150)*sc*.8,{power:.35+s*.65,rise:mg?.5:1.3});
    F.step(dt);
    ctx.globalCompositeOperation='lighter';const gl=ctx.createRadialGradient(X,BY-80,5,X,BY-60,170);gl.addColorStop(0,`rgba(255,160,60,${.12+.12*s})`);gl.addColorStop(1,'rgba(255,160,60,0)');ctx.fillStyle=gl;ctx.fillRect(X-170,0,340,330);ctx.globalCompositeOperation='source-over';
    const nz=ctx.createLinearGradient(X-9,0,X+9,0);nz.addColorStop(0,'#59627C');nz.addColorStop(.5,'#B7BED0');nz.addColorStop(1,'#59627C');ctx.fillStyle=nz;ctx.fillRect(X-8,BY+3,16,50);ctx.fillRect(X-22,BY+50,44,6);
    ctx.fillStyle='#232C47';ctx.fillRect(X-24,BY+56,48,24);F.draw(ctx);
    ctx.fillStyle='#C9D6F2';ctx.font='600 13px Figtree,sans-serif';ctx.textAlign='center';ctx.fillText(f[0],X,BY+74);ctx.textAlign='left';});}
addScene(bnc,dt=>{if(REDUCE)return;bnTick(dt);});
/* ---------- static lists ---------- */
const card=i=>`<article><h3>${i[0]}</h3><p>${i[1]}</p><p class="e">${i[2]}</p><p class="src">Source: ${srcLinks(i[3])}</p></article>`;
$('#ins').innerHTML=INS.map(card).join('');
$('#sootins').innerHTML=SOOT.map(card).join('');
$('#tips').innerHTML=TIPS.map(t=>`<li><b>${t[0]}</b><p>${t[1]}</p><p class="src">Source: ${srcLinks(t[2])}</p></li>`).join('');
const PCITE={'Soot and fine particles':'n6,PSI-10,PSI-107','Carbon dioxide':'n6,n7','Carbon monoxide':'n6','Nitrogen oxides':'n6,n7','Sulfur dioxide':'n6,n7'};
$('#prod').innerHTML=PROD.map(r=>`<tr><td>${r[0]}<div class="src" style="font-family:var(--body);font-weight:400">${citeAll(PCITE[r[0]]||'',true)}</div></td><td>${r[1]}</td><td>${r[2]}</td><td><span class="ans ${r[3]}">${r[4]}</span><br>${r[5]}</td></tr>`).join('');
$('#gapl').innerHTML=GAPS.map(g=>`<li><b>${g[0]}</b><span>${g[1]}</span></li>`).join('');
$$('.ev').forEach(el=>{el.innerHTML='Evidence: '+modRecs(el.dataset.m).map(r=>`<button class="chip" data-id="${r.id}">${esc(r.short)}</button>`).join('');
  el.addEventListener('click',e=>{const c=e.target.closest('.chip');if(c)openRec(c.dataset.id);});});

/* ---------- wildfire cellular simulation ---------- */
const WW=176,WH=112,CELL=30,wc=$('#wcv'),wx=fitCanvas(wc,704,448);
const off=document.createElement('canvas');off.width=WW;off.height=WH;const ox=off.getContext('2d'),oimg=ox.createImageData(WW,WH);
const glw=document.createElement('canvas');glw.width=WW;glw.height=WH;const gx=glw.getContext('2d'),gimg=gx.createImageData(WW,WH);
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeNoise(seed){const r=rng(seed),L=64,v=new Float32Array(L*L);for(let i=0;i<v.length;i++)v[i]=r();
  const n=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),w=yf*yf*(3-2*yf),a=v[(yi&63)*L+(xi&63)],b=v[(yi&63)*L+((xi+1)&63)],c=v[((yi+1)&63)*L+(xi&63)],d=v[((yi+1)&63)*L+((xi+1)&63)];return lerp(lerp(a,b,u),lerp(c,d,u),w);};
  return(x,y)=>{let s=0,a=.5,f=1;for(let o=0;o<4;o++){s+=a*n(x*f,y*f);a/=2;f*=2;}return s/.9375;};}
const FUELCFG={15:{name:'grass',base:[154,150,78],alt:[176,164,92],rate:1,burn:.6},20:{name:'shrub',base:[104,120,66],alt:[128,132,74],rate:.65,burn:.9},25:{name:'forest',base:[44,80,50],alt:[62,98,58],rate:.45,burn:1.5}};
let W={st:null,tm:null,h:null,den:null,base:null,shade:null,t:0,run:true,smoke:[],noise:makeNoise(7),flam:0,burnt:0,burning:0,params:null,head:0};
function wBuild(p){
  const N=W.noise,N2=makeNoise(21),h=new Float32Array(WW*WH),den=new Float32Array(WW*WH),st=new Uint8Array(WW*WH),base=new Uint8ClampedArray(WW*WH*3),shade=new Float32Array(WW*WH);
  const tan=Math.tan(p.slope*Math.PI/180),cfg=FUELCFG[p.mx];
  for(let y=0;y<WH;y++)for(let x=0;x<WW;x++){h[y*WW+x]=x*CELL*tan+(N(x*.035,y*.035)-.5)*220+(N2(x*.12,y*.12)-.5)*18;den[y*WW+x]=.65+.7*N2(x*.06+9,y*.06+3);}
  let flam=0;
  for(let y=0;y<WH;y++)for(let x=0;x<WW;x++){const i=y*WW+x;
    const road=Math.abs(x-(108+9*Math.sin(y*.07)))<1.6,lake=((x-136)/15)**2+((y-84)/9.5)**2<1;
    const gx=((h[y*WW+Math.min(WW-1,x+1)]-h[y*WW+Math.max(0,x-1)])/(2*CELL)),gy=((h[Math.min(WH-1,y+1)*WW+x]-h[Math.max(0,y-1)*WW+x])/(2*CELL));
    const sh=clamp(1+(-(gx*.7+gy*.7))*2.4,.62,1.32);shade[i]=sh;
    let c;if(lake){st[i]=3;c=[40,84,120];}else if(road){st[i]=3;c=[150,140,125];}else{st[i]=0;flam++;const k=clamp((den[i]-.65)/.7,0,1),n3=N2(x*.3,y*.3);c=cfg.base.map((v,j)=>lerp(v,cfg.alt[j],k)*(.9+.2*n3));}
    base[i*3]=c[0]*sh;base[i*3+1]=c[1]*sh;base[i*3+2]=c[2]*sh;}
  W.h=h;W.den=den;W.st=st;W.tm=new Float32Array(WW*WH);W.base=base;W.shade=shade;W.flam=flam;W.burnt=0;W.t=0;W.smoke=[];W.params=p;W.cfg=cfg;W.head=0;W.burning=21;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const i=(56+dy)*WW+(18+dx);if(dx*dx+dy*dy<=5&&st[i]===0){st[i]=1;W.tm[i]=cfg.burn;}}
}
const WN=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function wStep(dt){const p=W.params,wn=Math.max(p.w,2)/20,flank=.22*Math.sqrt(wn),head=Math.max(wn,flank),back=.05*Math.sqrt(wn),cfg=W.cfg;
  const st=W.st,tm=W.tm,h=W.h,den=W.den,fm=damp(p.m,p.mx)/damp(5,p.mx),R0=5*cfg.rate;
  const ign=[];let burning=0;
  for(let y=1;y<WH-1;y++)for(let x=1;x<WW-1;x++){const i=y*WW+x;if(st[i]!==1)continue;burning++;tm[i]-=dt;
    for(const [dx,dy] of WN){const j=i+dy*WW+dx;if(st[j]!==0)continue;const dist=dx&&dy?1.414:1,c=dx/dist;
      const wd=c>=0?lerp(flank,head,Math.pow(c,1.5)):lerp(flank,back,-c);
      const sl=Math.atan((h[j]-h[i])/(CELL*dist))*180/Math.PI,sf=clamp(Math.pow(2,sl/10),.25,8);
      const rate=R0*wd*sf*fm*den[j];if(Math.random()<1-Math.exp(-rate*dt/dist))ign.push(j);}
    if(wn>1.2&&Math.random()<.00009*(wn-1.2)*fm*5){const d=(4+Math.random()*10)*wn,xx=Math.round(x+d),yy=Math.round(y+gauss()*3);if(xx>1&&xx<WW-1&&yy>1&&yy<WH-1&&st[yy*WW+xx]===0)ign.push(yy*WW+xx);}
    if(tm[i]<=0){st[i]=2;W.burnt++;}}
  for(const j of ign)if(st[j]===0){st[j]=1;tm[j]=cfg.burn*(.8+Math.random()*.5);}
  W.burning=burning;W.t+=dt;
  if(burning>0){let mx=0;for(let k=0;k<30;k++){const i=(Math.random()*WW*WH)|0;if(st[i]===1)mx=Math.max(mx,i%WW);}W.head=Math.max(W.head,mx);}
}
function wDraw(dt){const st=W.st,tm=W.tm,b=W.base,d=oimg.data,gd=gimg.data,cfg=W.cfg,N2=W.noise;gd.fill(0);
  for(let i=0;i<WW*WH;i++){const s=st[i],o=i*4;
    if(s===1){const f=clamp(tm[i]/cfg.burn,0,1),fl=.5+.5*Math.sin(W.t*18+i*1.7);d[o]=255;d[o+1]=lerp(70,190,f*.6+fl*.25);d[o+2]=lerp(14,50,f*fl);d[o+3]=255;gd[o]=255;gd[o+1]=100+60*fl;gd[o+2]=30;gd[o+3]=150;}
    else if(s===2){const a=.5+.5*N2((i%WW)*.5,((i/WW)|0)*.5),k=lerp(26,52,a);d[o]=k;d[o+1]=k*.93;d[o+2]=k*.88;d[o+3]=255;}
    else{d[o]=b[i*3];d[o+1]=b[i*3+1];d[o+2]=b[i*3+2];d[o+3]=255;}}
  ox.putImageData(oimg,0,0);gx.putImageData(gimg,0,0);
  wx.imageSmoothingEnabled=true;wx.imageSmoothingQuality='high';wx.drawImage(off,0,0,704,448);
  try{wx.globalCompositeOperation='lighter';wx.filter='blur(6px)';wx.globalAlpha=.42;wx.drawImage(glw,0,0,704,448);wx.filter='none';wx.globalAlpha=1;wx.globalCompositeOperation='source-over';}catch(e){}
  const p=W.params,wn=Math.max(p.w,2)/20,k=4;
  if(W.burning>0&&W.run){let tries=0;while(W.smoke.length<260&&tries++<10){const i=(Math.random()*WW*WH)|0;if(st[i]===1)W.smoke.push({x:(i%WW+.5)*k,y:((i/WW|0)+.5)*k,age:0,life:3+Math.random()*2,sz:6+Math.random()*6});}}
  if(W.run)for(let i=W.smoke.length-1;i>=0;i--){const q=W.smoke[i];q.age+=dt;if(q.age>q.life){W.smoke.splice(i,1);continue;}q.x+=(14+wn*34)*dt;q.y-=(6+4*Math.sin(q.age*2+i))*dt;q.sz+=10*dt;}
  for(const q of W.smoke){const u=q.age/q.life;wx.globalAlpha=Math.min(1,u*4)*(1-u)*.2;wx.drawImage(SMK,q.x-q.sz,q.y-q.sz,q.sz*2,q.sz*2);}wx.globalAlpha=1;
  wx.fillStyle='rgba(10,17,36,.7)';wx.fillRect(10,10,150,24);wx.fillStyle='#fff';wx.font='600 12px Figtree,sans-serif';wx.fillText('wind '+p.w+' km/h  →',20,26);
  wx.fillStyle='rgba(255,255,255,.85)';wx.font='600 11px Figtree,sans-serif';wx.fillText('road (firebreak)',386,70);wx.fillText('lake',552,372);
  const left=W.flam-W.burnt;
}
let wAcc=0;
addScene(wc,dt=>{if(REDUCE)return;if(W.run&&W.burning>0){wAcc+=dt;while(wAcc>=1/30){wStep(1/30);wAcc-=1/30;}}wDraw(dt);wStat();});
function wStat(){const el=$('#wstat');if(!el)return;const pct=Math.round(100*(W.burnt+W.burning)/W.flam);
  el.textContent=W.burning>0?`Simulated time ${W.t.toFixed(0)} s. ${pct}% of the burnable ground has burned or is burning.`:`Fire out after ${W.t.toFixed(0)} s. ${pct}% of the burnable ground burned.`+(W.head>108?' It crossed the road.':' It did not cross the road.');}
function wRestart(){wBuild({mx:+$('#wf').value,w:+$('#ww').value,slope:+$('#ws').value,m:+$('#wm').value});W.run=true;$('#wpl').textContent='Pause';}
$('#wpl').addEventListener('click',()=>{W.run=!W.run;$('#wpl').textContent=W.run?'Pause':'Resume';});
$('#wrs').addEventListener('click',wRestart);
const damp=(m,mx)=>{const r=Math.min(1,m/mx);return Math.max(0,1-2.59*r+5.11*r*r-3.52*r*r*r);};
function wild(restart){
  const mx=+$('#wf').value,w=+$('#ww').value,s=+$('#ws').value,m=+$('#wm').value;
  $('#wwv').textContent=w+' km/h';$('#wsv').textContent=s+'°';$('#wmv').textContent=m+'%';
  const fw=Math.max(w,2)/20,fs=Math.pow(2,s/10),fm=damp(m,mx)/damp(5,mx),tot=fw*fs*fm;
  $('#wout').innerHTML=tot<.005?'No spread':`${tot<10?tot.toFixed(1):Math.round(tot)}× <small>the baseline spread rate</small>`;
  const f=$('#wflag');
  if(tot<.005){f.className='flag';f.textContent='The fuel is too damp to carry fire in this model.';}
  else if(tot>=4){f.className='flag warn';f.textContent='Far faster than the baseline of 20 km/h wind, flat ground and 5% moisture.';}
  else{f.className='flag';f.textContent='Baseline: 20 km/h wind, flat ground, 5% fuel moisture.';}
  const bar=(id,v,max)=>{$('#'+id).style.width=Math.min(100,v/max*100)+'%';$('#'+id+'v').textContent='×'+(v<10?v.toFixed(2):v.toFixed(1));};
  bar('fw',fw,3);bar('fs',fs,8);bar('fm',fm,1.2);
  if(restart!==false)wRestart();
}
['wf','ww','ws','wm'].forEach(i=>$('#'+i).addEventListener('input',()=>wild()));wild();
/* ---------- engine cutaway ---------- */
const gam=p=>1.40-.10*p, eta=(r,p)=>1-Math.pow(r,1-gam(p));
const ec=$('#ecv'),ex=fitCanvas(ec,300,350);
let E={phi:300,run:true,knockT:-1,lastKnock:0};
const BORE=96,EX0=102,EX1=198,CR_ROD=150,CR_R=48,HEAD=44;
function metal(ctx,x,y,w,h,c0,c1,c2){const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,c0);g.addColorStop(.35,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);}
function engDraw(dt){
  const r=+$('#er').value,p=+$('#ep').value,ctx=ex;
  if(E.run)E.phi=(E.phi+dt*110)%720;const phi=E.phi,th=(phi%360)*Math.PI/180;
  const hc=(2*CR_R)/(r-1),ytdc=HEAD+hc+22,yc=ytdc+CR_R+CR_ROD;
  const yp=yc-(CR_R*Math.cos(th)+Math.sqrt(CR_ROD*CR_ROD-Math.pow(CR_R*Math.sin(th),2))),top=yp-22;
  const cpx=150+CR_R*Math.sin(th),cpy=yc-CR_R*Math.cos(th);
  const knock=r>12&&p>=.8,ign=345,burnLen=70,since=((phi-ign)+720)%720;
  const burning=since<burnLen+30&&since>=0&&(phi>=ign||phi<75),prog=clamp(since/burnLen,0,1);
  let shake=0;if(knock&&since>burnLen*.75&&since<burnLen+30){shake=1.6;}
  ctx.clearRect(0,0,300,350);ctx.save();ctx.translate((Math.random()-.5)*shake*2,(Math.random()-.5)*shake*2);
  const bg=ctx.createLinearGradient(0,0,0,350);bg.addColorStop(0,'#0B1226');bg.addColorStop(1,'#151D36');ctx.fillStyle=bg;ctx.fillRect(-4,-4,308,358);
  /* block and jacket */
  metal(ctx,EX0-18,HEAD,18,252,'#4B5570','#7B86A3','#3D4660');metal(ctx,EX1,HEAD,18,252,'#3D4660','#7B86A3','#4B5570');
  ctx.fillStyle='#233A5A';ctx.fillRect(EX0-30,HEAD+10,12,150);ctx.fillRect(EX1+18,HEAD+10,12,150);
  /* head */
  const hg=ctx.createLinearGradient(0,0,0,HEAD);hg.addColorStop(0,'#6E7894');hg.addColorStop(1,'#444D68');ctx.fillStyle=hg;ctx.fillRect(EX0-30,8,BORE+60,HEAD-8);
  /* ports */
  const ivl=Math.sin(clamp((phi-10)/190,0,1)*Math.PI),evl=Math.sin(clamp((phi-520)/190,0,1)*Math.PI);
  ctx.fillStyle='#1B2340';ctx.fillRect(112,0,24,10);ctx.fillRect(166,0,24,10);
  ctx.fillStyle='#8FB6D8';if(ivl>.05){ctx.globalAlpha=.5;ctx.fillRect(114,0,20,10);ctx.globalAlpha=1;}
  ctx.fillStyle='#E0A06A';if(evl>.05){ctx.globalAlpha=.5;ctx.fillRect(168,0,20,10);ctx.globalAlpha=1;}
  /* gas in chamber */
  ctx.save();ctx.beginPath();ctx.rect(EX0,HEAD,BORE,Math.max(1,top-HEAD));ctx.clip();
  const ph=phi;let gcol;
  if(ph<180)gcol='rgba(120,190,235,.34)';else if(ph<360)gcol=`rgba(${120+Math.round(60*(ph-180)/180)},${190-Math.round(40*(ph-180)/180)},235,${.34+.16*(ph-180)/180})`;else if(ph<540)gcol='rgba(230,140,70,.22)';else gcol='rgba(150,150,150,.25)';
  ctx.fillStyle=gcol;ctx.fillRect(EX0,HEAD,BORE,top-HEAD);
  if(burning){const lean=p<.6?.35+.65*(p-.4)/.2:1,fr=Math.min(1,prog*1.0)*lean,rad=fr*Math.hypot(BORE,top-HEAD)*.95,pw=.35+.65*p,fade=since>burnLen?1-(since-burnLen)/30:1,sx=150,sy=HEAD+2;
    ctx.globalCompositeOperation='lighter';
    const kg=ctx.createRadialGradient(sx,sy,0,sx,sy,Math.max(4,rad));kg.addColorStop(0,`rgba(255,${Math.round(150+90*p)},${Math.round(90+50*p)},${.55*pw*fade})`);kg.addColorStop(.8,`rgba(255,130,40,${.3*pw*fade})`);kg.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=kg;ctx.fillRect(EX0,HEAD,BORE,top-HEAD);
    for(let i=0;i<70;i++){const a=Math.random()*3.1416,rr=rad*(.8+Math.random()*.22),x=sx+Math.cos(a)*rr,y=sy+Math.sin(a)*rr;ctx.globalAlpha=.5*pw*fade;const t=lean<1?.1+Math.random()*.15:.2+Math.random()*.25,s=7+Math.random()*7;ctx.drawImage(sprAt(t),x-s,y-s,s*2,s*2);}
    ctx.globalAlpha=1;
    if(knock&&since>burnLen*.75&&since<burnLen+12){const k=Math.sin((since-burnLen*.75)/(burnLen*.25+12)*Math.PI);for(let i=0;i<14;i++){const s=16+Math.random()*16;ctx.globalAlpha=.8*k;ctx.drawImage(sprAt(.15),175+gauss()*8-s,top-14+gauss()*6-s,s*2,s*2);}ctx.globalAlpha=1;}
    ctx.globalCompositeOperation='source-over';}
  ctx.restore();
  /* valves */
  ctx.fillStyle='#C9D0E0';ctx.fillRect(122,HEAD-4+ivl*8,3,6);ctx.fillRect(116,HEAD+2+ivl*8,16,3);ctx.fillRect(175,HEAD-4+evl*8,3,6);ctx.fillRect(169,HEAD+2+evl*8,16,3);
  ctx.fillStyle='#EDEFF5';ctx.fillRect(148,HEAD-16,4,16);ctx.fillStyle='#FFD36A';if(burning&&since<6)ctx.fillRect(147,HEAD-1,6,3);
  /* piston */
  const pg=ctx.createLinearGradient(EX0,0,EX1,0);pg.addColorStop(0,'#8B93A8');pg.addColorStop(.3,'#E3E7F0');pg.addColorStop(.7,'#BEC5D6');pg.addColorStop(1,'#7A8298');ctx.fillStyle=pg;ctx.fillRect(EX0+2,top,BORE-4,46);
  ctx.fillStyle='#2D3550';[6,13,20].forEach(d=>ctx.fillRect(EX0+2,top+d,BORE-4,2.4));ctx.fillStyle='#2D3550';ctx.beginPath();ctx.arc(150,yp,6,0,6.283);ctx.fill();
  /* rod and crank */
  ctx.strokeStyle='#7E88A4';ctx.lineWidth=9;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(150,yp);ctx.lineTo(cpx,cpy);ctx.stroke();ctx.strokeStyle='#A9B2C9';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(150,yp);ctx.lineTo(cpx,cpy);ctx.stroke();
  const cg=ctx.createRadialGradient(150,yc,4,150,yc,CR_R+16);cg.addColorStop(0,'#59627E');cg.addColorStop(1,'#323A55');ctx.fillStyle=cg;ctx.beginPath();ctx.arc(150,yc,CR_R+14,0,6.283);ctx.fill();
  ctx.strokeStyle='#7E88A4';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#1B2340';ctx.beginPath();ctx.arc(150,yc,8,0,6.283);ctx.fill();ctx.fillStyle='#C9D0E0';ctx.beginPath();ctx.arc(cpx,cpy,6.5,0,6.283);ctx.fill();
  ctx.restore();
  const names=['Intake','Compression','Power','Exhaust'],stage=Math.floor(phi/180);
  ctx.fillStyle='#C9D6F2';ctx.font='700 13px Figtree,sans-serif';ctx.fillText(names[stage],12,24);ctx.font='500 11px Figtree,sans-serif';ctx.fillStyle='#8A94AE';ctx.fillText(r+' : 1',12,40);
  if(knock&&since>burnLen*.75&&since<burnLen+20){ctx.fillStyle='#FF6A4D';ctx.font='800 14px Figtree,sans-serif';ctx.fillText('KNOCK',228,24);}
  if(p<.6&&burning){ctx.fillStyle='#FFB020';ctx.font='700 12px Figtree,sans-serif';ctx.fillText('weak, unstable flame',160,342);}
}
addScene(ec,dt=>{if(REDUCE)return;engDraw(dt);});
$('#epl').addEventListener('click',()=>{E.run=!E.run;$('#epl').textContent=E.run?'Pause':'Resume';});
function eng(){
  const r=+$('#er').value,p=+$('#ep').value,e=eta(r,p),e0=eta(10,1);
  $('#erv').textContent=r+' : 1';$('#epv').textContent=p.toFixed(2)+(p>=1?' (exact)':p>=.7?' (lean)':' (ultra-lean)');
  $('#eout').innerHTML=`${(e*100).toFixed(1)}% <small>ideal cycle efficiency</small>`;
  const sv=(1-e0/e)*100;
  $('#esave').textContent=Math.abs(sv)<.05?'This is the baseline: 10 : 1 with an exact mix.':`${Math.abs(sv).toFixed(0)}% ${sv>0?'less':'more'} fuel and CO2 for the same work than the baseline, in the ideal cycle.`;
  const a=$('#ef1'),b=$('#ef2');
  if(r>12){a.className='flag warn';a.textContent='Above about 12 : 1 a petrol engine is prone to knock. Predicting it needs low-temperature chemistry.';}
  else{a.className='flag';a.textContent='Compression is within the usual knock-free range for petrol.';}
  if(p<.6){b.className='flag warn';b.textContent='Leaner than about 0.6 an ordinary spark flame struggles to ignite and stay lit.';}
  else{b.className='flag';b.textContent='The mix is rich enough for a stable spark-ignited flame.';}
  const X=v=>36+(v-8)/12*250,Y=v=>180-(v-.4)/.3*160;
  const line=ph=>{let d='';for(let c=8;c<=20;c+=.5)d+=(d?'L':'M')+X(c).toFixed(1)+' '+Y(eta(c,ph)).toFixed(1);return d;};
  $('#esvg').innerHTML=`<rect x="${X(12)}" y="20" width="${X(20)-X(12)}" height="160" fill="#3A1D1A" opacity=".6"/><text x="${X(12)+6}" y="32" font-size="9" fill="#F08A74">knock-prone</text>
   ${[.4,.5,.6,.7].map(v=>`<line x1="36" x2="286" y1="${Y(v)}" y2="${Y(v)}" stroke="#222B3D"/><text x="30" y="${Y(v)+3}" font-size="9" text-anchor="end" fill="#98A2B8">${v*100}%</text>`).join('')}
   ${[8,12,16,20].map(v=>`<text x="${X(v)}" y="194" font-size="9" text-anchor="middle" fill="#98A2B8">${v}</text>`).join('')}
   <path d="${line(1)}" stroke="#9AA7BD" stroke-width="2" fill="none" stroke-dasharray="4 3"/><text x="${X(20)}" y="${Y(eta(20,1))+12}" font-size="9" text-anchor="end" fill="#98A2B8">exact mix</text>
   <path d="${line(p)}" stroke="#2F6FED" stroke-width="2.5" fill="none"/>
   <circle cx="${X(r)}" cy="${Y(e)}" r="6" fill="#E8960C" stroke="#fff" stroke-width="2"/>
   <text x="161" y="12" font-size="9" text-anchor="middle" fill="#98A2B8">ideal efficiency against compression ratio</text>`;
}
['er','ep'].forEach(i=>$('#'+i).addEventListener('input',eng));eng();
/* ---------- particle size and the lung ---------- */
(function(){const X=v=>40+(Math.log10(v)+2)/4*560,B=[[.01,.1,'#14234A','Below 0.1 µm','Deposit in the tracheobronchial tree and are removed when exhaling'],[.1,2,'#3A1D1A','0.1 to 2 µm','Penetrate deep and settle in the bronchioles and air sacs'],[2,100,'#1A2233','Above 2 µm','Do not get beyond the nasal cavity or trachea']];
  let s='<rect x="0" y="0" width="640" height="190" fill="#0D1320"/>';
  B.forEach((b,i)=>{s+=`<rect x="${X(b[0])}" y="34" width="${X(b[1])-X(b[0])}" height="64" fill="${b[2]}"/><text x="${(X(b[0])+X(b[1]))/2}" y="54" font-size="12" font-weight="700" text-anchor="middle" fill="#E6EAF2">${b[3]}</text>`;});
  s+=`<text x="${(X(.01)+X(.1))/2}" y="74" font-size="10" text-anchor="middle" fill="#98A2B8">removed on exhaling</text><text x="${(X(.1)+X(2))/2}" y="74" font-size="10" text-anchor="middle" fill="#FF9A85" font-weight="700">reach deep lung</text><text x="${(X(2)+X(100))/2}" y="74" font-size="10" text-anchor="middle" fill="#98A2B8">stopped in the nose and throat</text>`;
  s+=`<line x1="40" x2="600" y1="130" y2="130" stroke="#E6EAF2" stroke-width="2"/>`;
  [.01,.1,1,10,100].forEach(v=>{s+=`<line x1="${X(v)}" x2="${X(v)}" y1="126" y2="134" stroke="#E6EAF2"/><text x="${X(v)}" y="148" font-size="11" text-anchor="middle" fill="#98A2B8">${v} µm</text>`;});
  [[2.5,'PM2.5'],[10,'PM10'],[70,'human hair']].forEach(m=>{s+=`<path d="M${X(m[0])} 126 v-24" stroke="#E8960C" stroke-width="2"/><circle cx="${X(m[0])}" cy="100" r="4" fill="#E8960C"/><text x="${X(m[0])}" y="${m[0]===70?172:164}" font-size="11" font-weight="700" text-anchor="middle" fill="#F0C27A">${m[1]}</text>`;});
  $('#psvg').innerHTML=s;})();
/* ---------- tabs ---------- */
$('#tabs').innerHTML=VIEWS.map(v=>`<button role="tab" id="t-${v[0]}" class="${v[0]==='materials'?'sep':''}" data-v="${v[0]}" title="${v[1]}" aria-label="${v[1]}"><span class="ic" aria-hidden="true">${v[2]}</span><span class="lab">${v[1]}</span></button>`).join('');
function show(v,push){
  if(!VIEWS.some(x=>x[0]===v))v='data';
  $$('.view').forEach(el=>el.classList.toggle('on',(el.dataset.v||el.id)===v));
  $$('#tabs [role=tab]').forEach(t=>{const on=t.dataset.v===v;t.setAttribute('aria-selected',on);t.tabIndex=on?0:-1;if(on)t.scrollIntoView({block:'nearest',inline:'nearest'});});
  if(push){try{history.replaceState(null,'','#'+v);}catch(e){location.hash=v;}}
  if(push)$('#main').scrollTo(0,0);
}
$('#tabs').addEventListener('click',e=>{const t=e.target.closest('[role=tab]');if(t)show(t.dataset.v,true);});
$('#tabs').addEventListener('keydown',e=>{const i=VIEWS.findIndex(v=>v[0]===document.activeElement.dataset.v);if(i<0)return;
  const d=['ArrowRight','ArrowDown'].includes(e.key)?1:['ArrowLeft','ArrowUp'].includes(e.key)?-1:0;if(!d)return;e.preventDefault();const n=VIEWS[(i+d+VIEWS.length)%VIEWS.length][0];show(n,true);$('#t-'+n).focus();});
addEventListener('hashchange',()=>show(location.hash.slice(1)));
const nf=rec.filter(r=>r.type==='f').length,nc=rec.filter(r=>r.areas.length).length;
$('#kpis').innerHTML=[[25,'NASA investigation records read'],[nf,'flew in microgravity; '+(25-nf)+' were ground studies'],[nc,'are combustion studies; '+(25-nc)+' are off-topic'],[6,'Earth modules built on them']].map(k=>`<div class="kpi"><b>${k[0]}</b><span>${k[1]}</span></div>`).join('');
$('#cards').innerHTML=MODS.map(m=>{const x=META[m.k];return `<button class="mcard" data-v="${m.k}"><b>${m.n}</b><p>${x[0]}</p><p>${modRecs(m.k).length} supporting records</p><span class="lv ${x[1]}">${x[2]}</span></button>`;}).join('');
$('#cards').addEventListener('click',e=>{const c=e.target.closest('.mcard');if(c)show(c.dataset.v,true);});
show(location.hash.slice(1)||'data');
fillCites();
const shell=document.querySelector('.shell'),cb=$('#collapse');
let pref=null;try{pref=localStorage.getItem('ea-side');}catch(e){}
function applySide(){const narrow=innerWidth<=560,m=!narrow&&(pref?pref==='min':innerWidth<=860);shell.classList.toggle('min',m);cb.setAttribute('aria-expanded',!m);const t=m?'Expand sidebar':'Collapse sidebar';cb.setAttribute('aria-label',t);cb.title=t;}
cb.addEventListener('click',()=>{pref=shell.classList.contains('min')?'full':'min';try{localStorage.setItem('ea-side',pref);}catch(e){}applySide();});
addEventListener('resize',applySide);applySide();

/* ---------- evidence ---------- */
const cols=rec.filter(r=>r.areas.length);
$('#mx').innerHTML='<tr><th></th>'+cols.map(r=>`<th title="${esc(r.short)}">${r.id.slice(4)}</th>`).join('')+'</tr>'+
 MODS.map(m=>`<tr><th class="r">${m.n}</th>`+cols.map(r=>`<td>${inMod(m,r)?`<i class="dot ${r.type}" title="${esc(r.short)}"></i>`:'<i class="dot x"></i>'}</td>`).join('')+'</tr>').join('');
$('#fa').innerHTML='<option value="">All modules</option>'+MODS.map(m=>`<option value="${m.k}">${m.n}</option>`).join('')+'<option value="none">Outside combustion</option>';
function draw(openId){
  const q=$('#q').value.trim().toLowerCase(),fa=$('#fa').value,ft=$('#ft').value,fm=MODS.find(m=>m.k===fa);
  const rs=rec.filter(r=>(!ft||r.type===ft)&&(!fa||(fa==='none'?!r.areas.length:inMod(fm,r)))&&(!q||(r.id+' '+r.short+' '+r.title+' '+r.study+' '+r.earth).toLowerCase().includes(q)));
  $('#count').textContent=`Showing ${rs.length} of 25 investigations`;
  $('#list').innerHTML=rs.length?rs.map(r=>{const ms=MODS.filter(m=>inMod(m,r)).map(m=>m.n);return `<details class="rec" id="r-${r.id}" ${r.id===openId?'open':''}>
    <summary><span class="id">${r.id}</span><span class="t">${esc(r.short)}<small>${esc(r.title)}</small></span><span class="tag ${r.areas.length?(r.type==='g'?'g':''):'o'}">${r.areas.length?(r.type==='f'?'Flight':'Ground'):'Outside combustion'}</span></summary>
    <div class="body"><dl>
      <dt>What it studied</dt><dd>${esc(r.study)}</dd>
      <dt>Stated Earth benefit</dt><dd>${esc(r.earth)}</dd>
      <dt>Supports</dt><dd>${ms.length?ms.join(', '):'No module'}</dd>
      <dt>Type and dates</dt><dd>${r.type==='f'?'Microgravity investigation':'Ground investigation'}${r.years?', '+r.years:''}</dd>
      <dt>Data in PSI</dt><dd>${r.size}${r.rows===null?', no experimental table':r.rows===0?', experimental table shows no rows':', experimental table with '+r.rows+' rows'}</dd>
      <dt>Cite as</dt><dd><a href="https://doi.org/${r.doi}">doi.org/${r.doi}</a></dd>
    </dl></div></details>`;}).join(''):'<div class="empty">No investigation matches. Clear the search or choose "All modules".</div>';
}
function openRec(id){show('data',true);$('#q').value='';$('#fa').value='';$('#ft').value='';draw(id);const el=document.getElementById('r-'+id);if(el){el.scrollIntoView({block:'center'});el.querySelector('summary').focus();}}
['q','fa','ft'].forEach(i=>$('#'+i).addEventListener('input',()=>draw()));
draw();
