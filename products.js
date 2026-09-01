let products=[], categories=[];
const $=id=>document.getElementById(id);
const alertBox=(m,ok=false)=>{const a=$("alert");a.textContent=m;a.className="sf-alert show "+(ok?"ok":"err");setTimeout(()=>a.className="sf-alert",3500)};
async function load(){const [p,c]=await Promise.all([StockFlowInventoryAPI.products.list($("search").value),StockFlowInventoryAPI.categories.list()]);if(!p.success) return alertBox(p.message);products=p.products;categories=c.categories||[];$("categoryId").innerHTML='<option value="">Select category</option>'+categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");render();}
function render(){ $("rows").innerHTML=products.length?products.map(p=>`<tr><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>₱${Number(p.price||0).toFixed(2)}</td><td>${p.stock}</td><td><span class="sf-badge">${esc(p.status)}</span></td><td><button class="sf-btn secondary" onclick='edit(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button> <button class="sf-btn danger" onclick="del('${p.id}')">Delete</button></td></tr>`).join(""):'<tr><td colspan="7" class="sf-empty">No products found.</td></tr>';}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
window.edit=p=>{["id","sku","name","categoryId","supplier","price","cost","reorderLevel","imageUrl","status"].forEach(k=>$(k).value=p[k]??"");$("formCard").style.display="block";$("formTitle").textContent="Edit Product"};
window.del=async id=>{if(!confirm("Delete this product?"))return;const r=await StockFlowInventoryAPI.products.delete(id);r.success?(alertBox(r.message,true),load()):alertBox(r.message)};
$("newBtn").onclick=()=>{$("form").reset();$("id").value="";$("formCard").style.display="block";$("formTitle").textContent="Add Product"};
$("cancel").onclick=()=>$("formCard").style.display="none";$("refresh").onclick=load;$("search").oninput=()=>load();
$("form").onsubmit=async e=>{e.preventDefault();const d={};["id","sku","name","categoryId","supplier","price","cost","reorderLevel","imageUrl","status"].forEach(k=>d[k]=$(k).value);const r=await StockFlowInventoryAPI.products.save(d);r.success?(alertBox("Product saved.",true),$("formCard").style.display="none",load()):alertBox(r.message)};
document.addEventListener("DOMContentLoaded",load);
