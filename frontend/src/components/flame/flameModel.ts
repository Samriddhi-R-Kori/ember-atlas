// Physically motivated, QUALITATIVE mapping from the scenario controls to flame-rendering parameters.
// Nothing here is a validated combustion model: outputs are dimensionless shape/colour weights used only
// by the renderer and never feed a scientific readout. Each rule cites the source behaviour it imitates
// (spine.flame_evidence, see Resources → Measurement Methods → Flame renderer).
export type Regime = 'droplet' | 'jet' | 'solid' | 'generic' | 'non_flaming'
export type FlameInputs = { gravity: number; flow: number; oxygen: number; pressureKpa: number; materialClass: string | null; materialLabel: string | null }
export type FlameParams = {
  regime: Regime
  buoyancy: number      // 0 = no buoyant rise (orbit) … 1 = Earth gravity
  forced: number        // share of forced flow in the total flow felt by the flame (0…1)
  tilt: number          // radians from vertical toward the downstream (+x) side; cross-flow regimes only
  elongation: number    // envelope length / width
  roundness: number     // 1 = spherical/hemispherical tip, 0 = pointed teardrop
  flickerHz: number     // visual flicker frequency (buoyant puffing); 0 in orbit
  flickerAmp: number
  turbulence: number    // edge wrinkling amplitude
  soot: number          // weight of the yellow-orange luminous soot region (0 = blue only)
  blue: number          // weight of the blue reaction-zone sheet
  brightness: number
  size: number
  sootingTendency: number
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a))

// Relative sooting tendency (qualitative ordering only). Methanol burns with a nearly soot-free blue flame;
// heptane and the SPICE hydrocarbons soot (FLEX p.22/p.46; SPICE smoke points); propane is notably sooty in
// microgravity (SPICE final report p.2). Unknown fuels use a generic sooting hydrocarbon.
const SOOT_BY_LABEL: [RegExp, number][] = [
  [/methanol/i, 0.04], [/methane/i, 0.25], [/ethylene/i, 0.62], [/propane/i, 0.82], [/propylene/i, 0.86],
  [/heptane/i, 0.8], [/dodecane|farnesane/i, 0.78], [/pmma|acrylic|rod/i, 0.6], [/sibal|cotton|fabric/i, 0.55], [/nomex/i, 0.45],
]
export function sootingTendency(label: string | null, cls: string | null): number {
  if (label) for (const [re, v] of SOOT_BY_LABEL) if (re.test(label)) return v
  return cls === 'liquid_droplet' ? 0.55 : cls === 'gaseous_jet' ? 0.65 : cls === 'solid_material' ? 0.58 : 0.6
}

export function regimeFor(cls: string | null): Regime {
  return cls === 'liquid_droplet' ? 'droplet' : cls === 'gaseous_jet' ? 'jet' : cls === 'solid_material' ? 'solid'
    : cls === 'smoke_source_material' ? 'non_flaming' : 'generic'
}

export function flameParams(p: FlameInputs): FlameParams {
  const regime = regimeFor(p.materialClass)
  const g = clamp(p.gravity)
  const buoyancy = Math.sqrt(g)                              // buoyant velocity scales with sqrt(g·L)
  const uBuoy = 0.45 * buoyancy                              // ≈ buoyant velocity of a cm-scale flame at 1 g (m/s)
  const flow = clamp(p.flow, 0, 2)
  const forced = flow / (flow + uBuoy + 0.04)
  const ox = clamp((p.oxygen - 0.15) / 0.25)                 // 15 % … 40 % mapped to 0…1
  const pr = clamp(p.pressureKpa / 101.325, 0.3, 3)
  // Coflow jets (SPICE) are aligned with the flow: coflow shortens the luminous flame instead of tilting it.
  const crossFlow = regime !== 'jet'
  const tilt = crossFlow ? Math.atan2(flow, uBuoy + 0.06) * 0.95 : 0
  const coflowShortening = regime === 'jet' ? 1 - 0.35 * clamp(flow / 0.6) : 1       // SPICE final report p.2
  // Jets: length set mainly by fuel flow (not by gravity here); nonbuoyant jets are drawn wider with rounder tips.
  const elongation = regime === 'jet' ? 2.4 * coflowShortening : (1 + 1.9 * buoyancy + 1.1 * forced)
  const roundness = clamp(1 - 0.85 * buoyancy - 0.5 * forced)                         // spherical in quiescent orbit (FLEX p.8)
  const flickerHz = 11 * Math.sqrt(g)                                                  // buoyant puffing ~10–15 Hz at 1 g, ∝ sqrt(g)
  const flickerAmp = buoyancy * (1 - 0.6 * (regime === 'jet' ? clamp(flow / 0.3) : forced))   // coflow damps flicker (SPICE thesis p.12)
  const turbulence = 0.05 + 0.35 * buoyancy + 0.25 * forced
  const tendency = sootingTendency(p.materialLabel, p.materialClass)
  // Quiescent orbit, low flow: longer residence time → radiative cooling turns solid/candle-like flames blue (BASS p.21;
  // NASA candle tests). Droplet and jet flames of sooting fuels remain luminous in orbit (FLEX p.46, SPICE).
  const quiescent = (1 - buoyancy) * (1 - clamp(flow / 0.05))
  const radiativeDimming = quiescent * (regime === 'solid' || regime === 'generic' ? 0.75 : 0.2)
  const soot = regime === 'non_flaming' ? 0
    : clamp(tendency * (0.55 + 0.35 * ox) * (0.75 + 0.25 * Math.min(pr, 2)) * (1 - radiativeDimming))
  const blue = regime === 'non_flaming' ? 0 : clamp(0.55 + 0.3 * (1 - soot) + 0.15 * ox)
  const brightness = regime === 'non_flaming' ? 0.15 : clamp(0.45 + 0.4 * ox + 0.1 * Math.min(pr, 2) - 0.25 * radiativeDimming, 0.2, 1)
  const size = clamp((0.8 + 0.25 * ox + 0.09 * (1 / Math.max(pr, 0.4) - 1)) * (regime === 'jet' ? 1 + 0.3 * (1 - buoyancy) : 1), 0.6, 1.35)   // lower pressure → larger, dimmer flame
  return { regime, buoyancy, forced, tilt, elongation, roundness, flickerHz, flickerAmp, turbulence, soot, blue, brightness, size, sootingTendency: tendency }
}

export function describeRegime(f: FlameParams): string[] {
  if (f.regime === 'non_flaming') return ['Heated sample · no flame (smoke generation)']
  const out = [f.buoyancy > 0.25 ? 'Buoyant plume' : f.forced > 0.3 ? 'Flow-dominated' : 'Diffusion-dominated']
  out.push(f.soot > 0.45 ? 'Luminous soot' : f.soot > 0.15 ? 'Partly sooting' : 'Low soot · blue')
  if (f.flickerAmp > 0.15) out.push('Flickering')
  return out
}
