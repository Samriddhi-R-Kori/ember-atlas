"""Build the embedded Earth Applications module from the untouched original sources.

    python3 earth-module/build_earth.py      (run from frontend/)

Inputs : earth-module/original/src/{head.html,styles.css,body.html,app.js}  (copied unchanged from
         ~/Desktop/ember-atlas-earth.zip; hashes in ORIGINAL_SHA256SUMS)
         earth-module/embed.css, earth-module/bridge.js
Output : public/earth/index.html and public/earth/fonts/*.woff2

Every content change is an explicit, asserted replacement below (CORRECTIONS), so the build fails loudly if
the original changes. Corrections: sources for the four previously unverified references (n8-n11),
NASA-tested labels limited to what the PSI-25 data shows, the BRE statement linked to its NASA source,
the candle statement qualified for sooty fuels, Google Fonts replaced by local fonts.
"""
import hashlib
import pathlib
import shutil

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / 'original' / 'src'
OUT = HERE.parent / 'public' / 'earth'
FONTS = HERE.parent / 'node_modules' / '@fontsource'


def verify_original():
    for line in (HERE / 'ORIGINAL_SHA256SUMS').read_text().splitlines():
        digest, rel = line.split(maxsplit=1)
        actual = hashlib.sha256((HERE / 'original' / rel).read_bytes()).hexdigest()
        assert actual == digest, f'original file changed: {rel}'


def sub(text, old, new, label):
    assert text.count(old) == 1, f'{label}: expected exactly one match'
    return text.replace(old, new)


JS = [
    ('n8 source', """ n8:['Rothermel, R.C. (1972). A mathematical model for predicting fire spread in wildland fuels. USDA Forest Service Research Paper INT-115. Used for the moisture-damping curve. Textbook source, not in the provided files.',null],""",
     """ n8:['Rothermel, R.C. (1972). A mathematical model for predicting fire spread in wildland fuels. USDA Forest Service Research Paper INT-115. Moisture damping coefficient 1 - 2.59 r + 5.11 r^2 - 3.52 r^3 (Summary of Basic Fire Spread Equations).','https://research.fs.usda.gov/treesearch/32533'],"""),
    ('n9 source', """ n9:['Limiting oxygen index test method (ASTM D2863 / ISO 4589-2). The oxygen-index values on this page are typical handbook figures supplied by the team, not taken from the provided files. Check the supplier data sheet.',null],""",
     """ n9:['Limiting oxygen index, ASTM D2863 / ISO 4589-2 (method of Fenimore and Martin, Combustion and Flame 10, 1966). Values are typical published figures, rounded; grades vary, so use the supplier data sheet for design.','https://omnexus.specialchem.com/polymer-property/fire-resistance-loi'],"""),
    ('n10 source', """ n10:['Ideal Otto cycle, efficiency = 1 - r^(1-gamma): standard thermodynamics textbook result. Knock and lean-limit thresholds are typical petrol-engine values, not from the provided files.',null],""",
     """ n10:['NASA Glenn, Otto Cycle Thermodynamic Analysis: T3/T2 = r^(gamma-1) for isentropic compression, from which the ideal efficiency 1 - r^(1-gamma) follows. Knock and lean thresholds in this demo are illustrative.','https://www.grc.nasa.gov/WWW/K-12/airplane/ottoa.html'],"""),
    ('n11 source', """ n11:['Wildland fire rules of thumb (spread roughly proportional to wind; roughly doubling per 10 degrees of uphill slope). Common field guidance, not from the provided files.',null],""",
     """ n11:['CSIRO, Slope effects: spread rate x 2^(slope/10) upslope (McArthur 1967; Noble et al. 1980), not fully validated. The linear wind factor in this demo is illustrative.','https://research.csiro.au/spark/resources/model-library/slope-effects'],"""),
    ('BRE source', """ n12:['NASA Scientific Visualization Studio, NASA Studies Fire in Microgravity (6 May 2026)','https://svs.gsfc.nasa.gov/31394/']};""",
     """ n12:['NASA Scientific Visualization Studio, NASA Studies Fire in Microgravity (6 May 2026)','https://svs.gsfc.nasa.gov/31394/'],
 n13:['Stocker, D.P., Recent Research on Flames of Gaseous Fuel Aboard the ISS (ACME, NTRS 20210022542), slide 4: BRE flames burned for minutes without airflow at elevated oxygen and self-extinguished below ~25% O2.','https://ntrs.nasa.gov/citations/20210022542'],
 n14:['Ferkul et al., Lunar Combustion Investigation: Flammability Results from a Rotating Sounding Rocket (NTRS 20250010653, 2025).','https://ntrs.nasa.gov/citations/20250010653'],
 n15:['Dietrich, Ferkul, Bryg, Nayagam, Hicks, Williams, Detailed Results from the Flame Extinguishment Experiment (FLEX), NASA/TP-2015-216046, PDF p.46.','https://ntrs.nasa.gov/citations/20150023456']};"""),
    ('no unverified markers', "const REFN=Object.keys(REFS),UNSRC=['n8','n9','n10','n11'];", "const REFN=Object.keys(REFS),UNSRC=[];"),
    ('BRE card source', "'On Earth: extra oxygen changes the rules. Oxygen-enriched rooms, such as medical or industrial settings, need stricter material choices.','PSI-20'],",
     "'On Earth: extra oxygen changes the rules. Oxygen-enriched rooms, such as medical or industrial settings, need stricter material choices.','PSI-20, NASA ACME BRE results'],"),
    ('BRE link label', "const m={'NASA candle comparison':'n2','NASA Earth Observatory':'n5'}[t];", "const m={'NASA candle comparison':'n2','NASA Earth Observatory':'n5','NASA ACME BRE results':'n13','NASA FLEX report':'n15'}[t];"),
    ('candle insight', "['A flame without gravity is round, blue and soot-free','On Earth hot gas rises, pulls the flame into a teardrop and carries soot to the tip, which glows yellow. In microgravity that flow is absent.','On Earth: yellow means soot. A yellow, flickering flame is burning less completely than a steady blue one.','NASA candle comparison'],",
     "['A candle flame without gravity is round and dim blue','On Earth hot gas rises, pulls the flame into a teardrop and carries soot to the tip, which glows yellow. In microgravity that flow is absent. Sootier fuels can still glow yellow in orbit: FLEX reported a very luminous, yellow heptane droplet flame.','On Earth: yellow means soot. A yellow, flickering flame is burning less completely than a steady blue one.','NASA candle comparison, NASA FLEX report'],"),
    ('PMMA tested', "['Acrylic (PMMA)',17,'glazing, panels','BASS-II, Saffire-II'],", "['Acrylic (PMMA)',17,'glazing, panels','BASS-II (PSI-25)'],"),
    ('cotton tested', "['Cotton fabric',18,'clothing, furnishings','BASS, Saffire'],", "['Cotton fabric',18,'clothing, furnishings','BASS-II, as cotton-fiberglass SIBAL'],"),
    ('nylon tested', "['Nylon',22,'carpet, fasteners','BRE emulates it'],", "['Nylon',22,'carpet, fasteners',''],"),
    ('silicone tested', "['Silicone rubber',28,'seals, sheets','Saffire-II'],", "['Silicone rubber',28,'seals, sheets',''],"),
    ('nomex tested', "['Nomex',29,'protective fabric','BASS, Saffire-II'],", "['Nomex',29,'protective fabric','BASS-II (PSI-25)'],"),
    ('ultem tested', "['Ultem (PEI)',47,'aircraft interiors','BASS'],", "['Ultem (PEI)',47,'aircraft interiors',''],"),
    ('wildfire gap card', "['The scenarios are textbook models','The wildfire and engine scenarios and the material oxygen-index values come from standard references, not from NASA measurements. They show why the research matters; they do not test it.'],",
     "['The scenarios are textbook models','The wildfire and engine scenarios and the material oxygen-index values come from published references (cited where they appear), not from NASA measurements. They show why the research matters; they do not test it.'],"),
    ('lunar gap card', "['Two records are off-topic',", "['Lunar gravity is barely tested','The only flown flame data at simulated lunar gravity is NASA LUCI (2025): fabric and acrylic kept burning, spreading more slowly than at 1 g. FM2 on the lunar surface has no results yet.'],\n ['Two records are off-topic',"),
    ('knock label', 'font-size="9" fill="#F08A74">knock-prone</text>', 'font-size="9" fill="#F49AB8">knock-prone (illustrative)</text>'),
    ('knock flag', "a.textContent='Above about 12 : 1 a petrol engine is prone to knock. Predicting it needs low-temperature chemistry.';",
     "a.textContent='At high compression a petrol engine becomes prone to knock (12 : 1 is an illustrative threshold). Predicting it needs low-temperature chemistry.';"),
    ('lean flag', "b.textContent='Leaner than about 0.6 an ordinary spark flame struggles to ignite and stay lit.';",
     "b.textContent='Very lean mixes (below about 0.6 in this illustration) make an ordinary spark flame hard to ignite and keep lit.';"),
]

BODY = [
    ('fonts note', '<p>Page 3 of Ember Atlas. Built from 25 NASA investigation records.</p>', '<p>Built from 25 NASA investigation records.</p>'),
    ('lunar gap source', '<div class="srcs" data-s="n1,n2,n12,n3,n4,n5,n6,n7"></div>', '<div class="srcs" data-s="n1,n2,n12,n3,n4,n5,n6,n7,n13,n14,n15"></div>'),
    ('safety sources', '<div class="srcs" data-s="n4,n2,n12,n3,PSI-10,', '<div class="srcs" data-s="n4,n2,n12,n13,n15,n3,PSI-10,'),
    ('footer sources', '<p>The material oxygen-index values, the wildfire rules of thumb and the engine cycle model are standard textbook material added by the team, and are labelled where they appear.</p>\n  <p>NASA Space Apps Challenge 2026, Flame in Free Fall. A research reference, not an operational fire safety tool.</p>',
     '<p>The material oxygen-index values, the wildfire spread rules and the engine cycle model come from published references cited where they appear; the demonstrations are illustrations, not NASA measurements.</p>\n  <p>NASA Space Apps Challenge 2026, Flame in Free Fall.</p>'),
    ('wildfire note', 'Textbook rules of thumb: spread roughly proportional to wind, doubling for every 10° of slope, Rothermel\'s moisture damping.',
     'Published spread rules: doubling for every 10° of upslope (McArthur; CSIRO), Rothermel\'s moisture damping, and an illustrative linear wind factor.'),
]

HEAD_OLD = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">"""


def main():
    verify_original()
    head = sub((SRC / 'head.html').read_text(), HEAD_OLD, '', 'google fonts')
    head = sub(head, '<title>Ember Atlas: Earth Applications</title>', '<title>Earth Applications · Ember Atlas</title>', 'title')
    js = (SRC / 'app.js').read_text()
    for label, old, new in JS:
        js = sub(js, old, new, label)
    body = (SRC / 'body.html').read_text()
    for label, old, new in BODY:
        body = sub(body, old, new, label)
    css = (SRC / 'styles.css').read_text() + '\n' + (HERE / 'embed.css').read_text()
    html = (head + '<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body + '\n<script>\n' + js + '\n'
            + (HERE / 'bridge.js').read_text() + '\n</script>\n</body>\n</html>\n')
    assert 'googleapis' not in html
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'index.html').write_text(html)
    (OUT / 'fonts').mkdir(exist_ok=True)
    for pkg, name in [('inter', 'inter-latin-400-normal.woff2'), ('inter', 'inter-latin-600-normal.woff2'),
                      ('space-grotesk', 'space-grotesk-latin-500-normal.woff2'), ('space-grotesk', 'space-grotesk-latin-700-normal.woff2'),
                      ('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2')]:
        shutil.copyfile(FONTS / pkg / 'files' / name, OUT / 'fonts' / name)
    # SIL Open Font License 1.1: the licence text must accompany redistributed font files.
    for pkg in ('inter', 'space-grotesk', 'jetbrains-mono'):
        shutil.copyfile(FONTS / pkg / 'LICENSE', OUT / 'fonts' / f'LICENSE-{pkg}.txt')
    print(f'wrote {OUT / "index.html"} ({len(html)} bytes); {len(JS) + len(BODY) + 2} corrections applied')


if __name__ == '__main__':
    main()
