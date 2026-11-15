"""Rebuild standalone/index.html from src/. Run: python3 build.py"""
import pathlib
r=pathlib.Path(__file__).parent; s=r/'src'
html=(s/'head.html').read_text()+'<style>\n'+(s/'styles.css').read_text()+'\n</style>\n</head>\n<body>\n'+(s/'body.html').read_text()+'\n<script>\n'+(s/'app.js').read_text()+'\n</script>\n</body>\n</html>\n'
(r/'standalone'/'index.html').write_text(html); print('wrote standalone/index.html',len(html),'bytes')
