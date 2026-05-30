(function(){
  var GAME_ID = new URLSearchParams(location.search).get('game') || 'mission-30-mai';
  var KEY = 'brigade30mai';
  var syncing = false;
  var lastPushed = '';

  function emptyBest(){ return { rose:{}, gustave:{}, jacques:{} }; }
  function normalizeBest(best){ return Object.assign(emptyBest(), best || {}); }
  function stateFromBest(best){ return { best: normalizeBest(best) }; }
  function readState(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null') || stateFromBest({}); } catch(e){ return stateFromBest({}); } }
  function readBest(){
    var state = readState();
    if(state.best) return normalizeBest(state.best);
    var best = emptyBest();
    ['rose','gustave','jacques'].forEach(function(p){ if(typeof state[p] === 'number') best[p].legacy = state[p]; });
    return best;
  }
  function hasScores(best){
    return Object.keys(best || {}).some(function(p){ return Object.keys(best[p] || {}).some(function(m){ return Number(best[p][m]) > 0; }); });
  }
  function hash(best){ return JSON.stringify(normalizeBest(best)); }
  function inGame(){ return !!document.querySelector('.gameHead'); }
  function writeBest(best){
    syncing = true;
    localStorage.setItem(KEY, JSON.stringify(stateFromBest(best)));
    syncing = false;
  }
  async function api(method, url, body){
    var opt = { method: method, headers: { 'Content-Type':'application/json' } };
    if(body) opt.body = JSON.stringify(body);
    var r = await fetch(url, opt);
    var j = await r.json();
    if(!r.ok || !j.ok) throw new Error(j.error || 'sync failed');
    return j;
  }
  async function fetchRemote(){
    var j = await api('GET', '/api/scores?gameId=' + encodeURIComponent(GAME_ID));
    return normalizeBest(j.best);
  }
  async function pushBest(best){
    best = normalizeBest(best);
    var h = hash(best);
    if(h === lastPushed) return;
    lastPushed = h;
    var jobs = [];
    Object.keys(best).forEach(function(playerId){
      Object.keys(best[playerId] || {}).forEach(function(missionId){
        var score = Math.max(0, Math.min(120, Math.round(Number(best[playerId][missionId]) || 0)));
        if(score > 0 && missionId !== 'legacy') jobs.push(api('POST','/api/scores',{ gameId:GAME_ID, playerId:playerId, missionId:missionId, score:score }));
      });
    });
    await Promise.all(jobs);
  }
  var originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value){
    originalSetItem(key, value);
    if(key === KEY && !syncing){ setTimeout(function(){ pushBest(readBest()).catch(function(){}); }, 80); }
  };
  document.addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if(btn && /Remettre à zéro/i.test(btn.textContent || '')){
      api('DELETE','/api/scores?gameId=' + encodeURIComponent(GAME_ID)).catch(function(){});
    }
  }, true);
  async function refresh(){
    try{
      var remote = await fetchRemote();
      var local = readBest();
      if(hasScores(remote)){
        if(hash(remote) !== hash(local)){
          writeBest(remote);
          if(!inGame()) location.reload();
        }
      } else if(hasScores(local)) {
        await pushBest(local);
      }
      window.dispatchEvent(new CustomEvent('mission-sync-ok'));
    }catch(e){ window.dispatchEvent(new CustomEvent('mission-sync-error')); }
  }
  refresh();
  setInterval(refresh, 3000);
})();
