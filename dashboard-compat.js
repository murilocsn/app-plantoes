// Compatibility layer: the main dashboard no longer renders Finance/Expenses/Reports cards,
// but the legacy app renderer still updates their target nodes. Keep invisible targets so
// those updates cannot crash the dashboard during the transition.
(function(){
  const ids=['receivableList','expenseList','reportSummary'];
  ids.forEach(id=>{
    if(!document.getElementById(id)){
      const el=document.createElement('div');
      el.id=id;
      el.hidden=true;
      el.style.display='none';
      document.body.appendChild(el);
    }
  });
})();
