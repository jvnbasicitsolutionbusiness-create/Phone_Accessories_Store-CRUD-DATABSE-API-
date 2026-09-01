const $=id=>document.getElementById(id);
async function load(){const r=await StockFlowInventoryAPI.stats();if(!r.success)return;Object.entries(r.stats).forEach(([k,v])=>{if($(k))$(k).textContent=v})}
$("refresh").onclick=load;document.addEventListener("DOMContentLoaded",load);
