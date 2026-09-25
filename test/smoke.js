/* Cold start, a full career, and a check that the save survives. */
const { load } = require('./harness');
const api = load({ expose:[
  'newDynasty','doAdvance','live','liveTick','answerLive','openOffseason',
  'commitOffseason','budgetLeft','S','SEA','render','NAMES','CONF'
]});
console.log('game loaded, teams:', api.NAMES.length);
