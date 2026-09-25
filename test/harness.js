/* Shared harness: loads the built game into Node with a stub DOM so the
   simulation can be driven headlessly. Used by every test script. */
const fs = require('fs');
const path = require('path');

function load(opts) {
  opts = opts || {};
  const file = opts.file || path.join(__dirname, '..', 'dist', 'football-coach.html');
  let js = fs.readFileSync(file, 'utf8')
    .split('<script>')[1].split('</script>')[0]
    .replace(/\(async function\(\)\{[\s\S]*?\}\)\(\);/, '');   // drop the boot call

  const mem = {};
  global.setTimeout = () => 0; global.clearTimeout = () => {};
  global.window = {
    storage: {
      get: async k => mem[k] !== undefined ? {key:k, value:mem[k]} : null,
      set: async (k,v) => { mem[k]=v; return {}; },
      delete: async k => { delete mem[k]; return {}; },
      list: async () => ({keys:Object.keys(mem)})
    },
    addEventListener: () => {},
    innerWidth: opts.width || 390,
    matchMedia: () => ({matches:false})
  };
  const node = () => ({
    innerHTML:'', onclick:null, oninput:null, value:String(opts.seed||1),
    dataset:{}, setAttribute(){}, scrollIntoView(){},
    classList:{toggle(){},add(){},remove(){}}, focus(){}, setSelectionRange(){}
  });
  global.document = {
    getElementById: node, querySelector: node, querySelectorAll: () => [],
    createElement: node, body:{classList:{toggle(){}}}
  };

  const exposed = opts.expose || [];
  // getters, not values: S, U, SEA and live are reassigned with `let`, so a
  // value captured here would be stale (null) forever
  const ret = 'return {' + exposed.map(n => 'get ' + n + '(){return typeof ' + n + '!=="undefined"?' + n + ':undefined}').join(',') + '};';
  return new Function(js + '\n' + ret)();
}

/* A driver that plays the game the way a person would. */
function driver(api) {
  return {
    season(answer) {
      answer = answer || (dp => dp.opts[0][0]);
      let guard = 0;
      while (api.SEA && api.SEA.phase !== 'done' && guard++ < 80) {
        api.doAdvance();
        let g = 0;
        while (api.live && !api.live.done && g++ < 600) {
          const L = api.live;
          if (L.ask) api.answerLive(answer(L.ask.dp, L.ask)); else api.liveTick();
        }
      }
    }
  };
}

module.exports = { load, driver };
