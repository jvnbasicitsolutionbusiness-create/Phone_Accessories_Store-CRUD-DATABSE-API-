/* STOCKFLOW SHARED UI */
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("[data-year]").forEach(x=>x.textContent=new Date().getFullYear());
  document.querySelectorAll("[data-logout]").forEach(x=>x.addEventListener("click",()=>StockFlowAuth.logout()));
  const side=document.querySelector(".sf-side"),toggle=document.querySelector("[data-menu]");
  toggle?.addEventListener("click",()=>document.body.classList.toggle("sf-menu-open"));
  document.querySelectorAll(".sf-side a").forEach(a=>a.addEventListener("click",()=>document.body.classList.remove("sf-menu-open")));
});
