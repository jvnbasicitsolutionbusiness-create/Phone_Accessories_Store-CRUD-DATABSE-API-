/* STOCKFLOW PASSWORD RECOVERY */
document.addEventListener("DOMContentLoaded",()=>{
 const form=document.querySelector("#forgotForm"),msg=document.querySelector("#message"),identity=document.querySelector("#identity");
 const otpForm=document.querySelector("#recoveryOtpForm"),resetForm=document.querySelector("#resetForm");
 const steps={request:document.querySelector("#requestStep"),otp:document.querySelector("#otpStep"),reset:document.querySelector("#resetStep")};
 let savedIdentity="",savedOtp="";
 const show=(t,ok=false)=>{msg.textContent=t;msg.className=ok?"success":"error"};
 form?.addEventListener("submit",async e=>{e.preventDefault();savedIdentity=identity.value.trim();if(!savedIdentity)return;const b=form.querySelector("button");b.disabled=true;try{const r=await StockFlowAPI.forgotPassword({identity:savedIdentity});show(r.message||"Recovery code sent.",true);steps.request.classList.add("hidden");steps.otp.classList.remove("hidden")}catch(x){show(x.message)}finally{b.disabled=false}});
 otpForm?.addEventListener("submit",async e=>{e.preventDefault();savedOtp=otpForm.querySelector("[name=otp]").value.trim();if(!/^\d{6}$/.test(savedOtp))return show("Enter the 6-digit recovery code.");const b=otpForm.querySelector("button");b.disabled=true;try{const r=await StockFlowAPI.verifyRecoveryOtp({identity:savedIdentity,otp:savedOtp});if(!r.success)throw new Error(r.message);show("Code verified. Create a new password.",true);steps.otp.classList.add("hidden");steps.reset.classList.remove("hidden")}catch(x){show(x.message)}finally{b.disabled=false}});
 resetForm?.addEventListener("submit",async e=>{e.preventDefault();const p=resetForm.newPassword.value,c=resetForm.confirmPassword.value;if(p.length<8)return show("Password must be at least 8 characters.");if(p!==c)return show("Passwords do not match.");const b=resetForm.querySelector("button");b.disabled=true;try{const r=await StockFlowAPI.resetPassword({identity:savedIdentity,otp:savedOtp,newPassword:p});if(!r.success)throw new Error(r.message);show(r.message,true);setTimeout(()=>location.href='auth.html',1000)}catch(x){show(x.message)}finally{b.disabled=false}});
});
