/* STOCKFLOW OTP PAGE */
document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("#otpForm"), resend=document.querySelector("#resendOtp"), msg=document.querySelector("#message");
  if(!form)return;
  const C=STOCKFLOW_CONFIG;
  const params=new URLSearchParams(location.search);
  const identityInput=form.querySelector('[name="identity"],#identity');
  if(identityInput && !identityInput.value) identityInput.value=sessionStorage.getItem(C.OTP_KEY)||params.get("identity")||"";
  const show=(text,ok=false)=>{if(msg){msg.textContent=text;msg.className=ok?"success":"error"}};
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const identity=identityInput?.value.trim(), otp=form.querySelector('[name="otp"]')?.value.trim();
    if(!identity||!/^\d{6}$/.test(otp||"")) return show("Enter the 6-digit verification code.");
    const btn=form.querySelector("button[type=submit],button"); btn.disabled=true;
    try{
      const r=await StockFlowAPI.verifyOtp({identity,otp});
      if(!r.success) return show(r.message||"Verification failed.");
      show("Account verified successfully. You can now sign in.",true);
      setTimeout(()=>location.href=C.ROUTES.login,900);
    }catch(err){show(err.message)}
    finally{btn.disabled=false}
  });
  resend?.addEventListener("click",async()=>{
    const identity=identityInput?.value.trim(); if(!identity)return show("Enter your username or email first.");
    resend.disabled=true;
    try{const r=await StockFlowAPI.resendOtp({identity});show(r.message||"OTP request completed.",!!r.success)}
    catch(e){show(e.message)}
    finally{setTimeout(()=>resend.disabled=false,60000)}
  });
});
