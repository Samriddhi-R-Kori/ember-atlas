/* Embed bridge (appended after the original app.js). Runs only when the page is inside the dashboard iframe.
   Host → module: {type:'earth:show', view}. Module → host: {type:'earth:view', view} and {type:'earth:height', h}.
   Messages are accepted only from the same origin. */
;(function () {
  if (window.parent === window) return
  document.documentElement.classList.add('embedded')
  var origin = location.origin
  var post = function (msg) { try { window.parent.postMessage(msg, origin) } catch (e) { /* host unavailable */ } }
  var origShow = show
  show = function (v, push) {
    var view = VIEWS.some(function (x) { return x[0] === v }) ? v : 'data'
    origShow(view, false)
    post({ type: 'earth:view', view: view })
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== origin || !e.data || e.data.type !== 'earth:show') return
    show(String(e.data.view || 'data'))
  })
  var last = 0
  var report = function () {
    // Measure the content, not the document: documentElement.scrollHeight never drops below the iframe height.
    var shell = document.querySelector('.shell')
    var h = Math.ceil(shell ? shell.getBoundingClientRect().height : document.body.scrollHeight)
    if (Math.abs(h - last) > 1) { last = h; post({ type: 'earth:height', h: h }) }
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(report).observe(document.querySelector('.shell') || document.body)
  window.addEventListener('load', report)
  setTimeout(report, 50)
  post({ type: 'earth:view', view: (document.querySelector('#tabs [aria-selected=true]') || { dataset: { v: 'data' } }).dataset.v })
})()
