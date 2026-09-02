/* STOCKFLOW AUTHENTICATION */
(function(){
  "use strict";
  const C=window.STOCKFLOW_CONFIG;
  const A={
    saveLogin(r){
      if(r&&r.token) StockFlowAPI.saveToken(r.token);
      if(r&&r.user) sessionStorage.setItem(C.USER_KEY,JSON.stringify(r.user));
    },
    user(){ try{return JSON.parse(sessionStorage.getItem(C.USER_KEY)||"null")}catch(e){return null} },
    clear(){StockFlowAPI.clearToken();sessionStorage.removeItem(C.USER_KEY)},
    async requireAuth(){
      const local=this.user();
      try{
        const r=await StockFlowAPI.session();
        if(!r.success){this.clear();location.href=C.ROUTES.login;return null;}
        if(r.user) sessionStorage.setItem(C.USER_KEY,JSON.stringify(r.user));
        return r.user||local;
      }catch(e){
        if(local) return local;
        this.clear(); location.href=C.ROUTES.login; return null;
      }
    },
    async logout(){try{await StockFlowAPI.logout()}catch(e){} this.clear(); location.href=C.ROUTES.login;},
    isAdmin(){const u=this.user();return !!u&&String(u.role).toLowerCase()==="admin"},
    initials(name){return String(name||"SF").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()},
    bindUserUI(u){
      if(!u)return;
      document.querySelectorAll("[data-user-name]").forEach(x=>x.textContent=u.name||u.username||"StockFlow User");
      document.querySelectorAll("[data-user-role]").forEach(x=>x.textContent=u.role||"Employee");
      document.querySelectorAll("[data-user-email]").forEach(x=>x.textContent=u.gmail||"");
      document.querySelectorAll("[data-user-phone]").forEach(x=>x.textContent=u.phone||"");
      document.querySelectorAll("[data-user-initials]").forEach(x=>x.textContent=this.initials(u.name));
    }
  };
  window.StockFlowAuth=A;
  window.Auth=A;
})();
