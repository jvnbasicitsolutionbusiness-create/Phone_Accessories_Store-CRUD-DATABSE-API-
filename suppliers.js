let data=[];
const $=id=>document.getElementById(id), alertBox=(m,ok=false)=>{const a=$("alert");a.textContent=m;a.className="sf-alert show "+(ok?"ok":"err");setTimeout(()=>a.className="sf-alert",3000)};
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function load(){const r=await StockFlowInventoryAPI.suppliers.list();if(!r.success)return alertBox(r.message);data=r.suppliers;render()}
function render(){$("rows").innerHTML=data.length?data.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.contactPerson)}</td><td>${esc(x.phone)}</td><td>${esc(x.email)}</td><td>${esc(x.status)}</td><td><button class="sf-btn secondary" onclick='edit(${JSON.stringify(x)})'>Edit</button> <button class="sf-btn danger" onclick="del('${x.id}')">Delete</button></td></tr>`).join(""):'<tr><td colspan="6" class="sf-empty">No suppliers.</td></tr>'}
window.edit=x=>{["id","name","contactPerson","phone","email","address","status"].forEach(k=>$(k).value=x[k]??"");$("formCard").style.display="block"};
window.del=async id=>{if(!confirm("Delete supplier?"))return;const r=await StockFlowInventoryAPI.suppliers.delete(id);r.success?(alertBox(r.message,true),load()):alertBox(r.message)};
$("newBtn").onclick=()=>{$("form").reset();$("id").value="";$("formCard").style.display="block"};$("cancel").onclick=()=>$("formCard").style.display="none";
$("form").onsubmit=async e=>{e.preventDefault();const d={};["id","name","contactPerson","phone","email","address","status"].forEach(k=>d[k]=$(k).value);const r=await StockFlowInventoryAPI.suppliers.save(d);r.success?(alertBox("Supplier saved.",true),$("formCard").style.display="none",load()):alertBox(r.message)};
document.addEventListener("DOMContentLoaded",load);
