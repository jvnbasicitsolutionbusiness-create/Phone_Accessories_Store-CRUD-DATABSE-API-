/* STOCKFLOW DASHBOARD */
document.addEventListener("DOMContentLoaded",async()=>{
  const u=await StockFlowAuth.requireAuth(); if(!u)return;
  StockFlowAuth.bindUserUI(u);
  document.querySelector("#logoutBtn")?.addEventListener("click",()=>StockFlowAuth.logout());
  document.querySelector("#mobileMenuBtn")?.addEventListener("click",()=>document.body.classList.toggle("sidebar-open"));
  document.querySelector("#sidebarOverlay")?.addEventListener("click",()=>document.body.classList.remove("sidebar-open"));
  const set=(id,v)=>{const x=document.getElementById(id);if(x)x.textContent=v??0};
  const renderList=(id,items,empty)=>{
    const box=document.getElementById(id); if(!box)return;
    if(!items?.length){box.innerHTML=`<div class="empty-state"><i class="fa-solid fa-inbox"></i><strong>${empty}</strong></div>`;return}
    box.innerHTML=items.slice(0,6).map(x=>`<div class="activity-row"><div><b>${esc(x.PRODUCT_NAME||x.productName||x.NAME||x.name||"Item")}</b><small>${esc(x.TYPE||x.type||x.ACTION||x.action||"Activity")}</small></div><span>${esc(x.DATE||x.date||x.CREATED_AT||"")}</span></div>`).join("");
  };
  try{
    const r=await StockFlowAPI.dashboardStats();
    if(!r.success) throw new Error(r.message||"Unable to load dashboard.");
    const s=r.stats||r.data||r;
    set("productsCount",s.products??s.totalProducts??0);
    set("totalStockCount",s.totalStock??s.stock??0);
    set("lowStockCount",s.lowStock??0);
    set("outOfStockCount",s.outOfStock??0);
    const inv=document.getElementById("inventoryOverview");
    if(inv) inv.innerHTML=`<div class="overview-grid"><div><b>${s.totalStock??0}</b><span>Units on hand</span></div><div><b>${s.lowStock??0}</b><span>Low stock</span></div><div><b>${s.outOfStock??0}</b><span>Out of stock</span></div></div>`;
    renderList("recentTransactions",r.recentTransactions||s.recentTransactions, "No recent transactions");
    renderList("recentActivity",r.recentActivity||s.recentActivity, "No recent activity");
  }catch(e){
    ["productsCount","totalStockCount","lowStockCount","outOfStockCount"].forEach(id=>set(id,"—"));
    document.getElementById("connectionBadge")?.replaceChildren(document.createTextNode("OFFLINE"));
    const m=document.getElementById("connectionMessage");if(m)m.textContent=e.message;
  }
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
});
