// ============================================================
// STOCKFLOW - GOOGLE APPS SCRIPT BACKEND
// Authentication + OTP + Password Recovery + Inventory API
// Google Sheets is the primary application datastore.
// Real Gmail uses MailApp. Real SMS uses Twilio via Script Properties.
// ============================================================

const SHEET_ID="1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY";
const APP_NAME="StockFlow";
const USER_SHEET="USER";
const OTP_LENGTH=6, OTP_EXPIRY_MINUTES=10, MAX_OTP_ATTEMPTS=4, OTP_LOCK_MINUTES=30, RESEND_COOLDOWN_SECONDS=60;
const USER_HEADERS=["UID","NAME","USERNAME","PASSWORD","AGE","ACCOUNT_S","GMAIL","PHONE NO.","ROLE","VERIFIED","OTP","OTP EXPIRES","OTP ATTEMPTS","OTP LOCK UNTIL","OTP CHANNEL","CREATED AT","VERIFIED AT","LAST OTP SENT","LAST LOGIN"];
const SESSION_TTL_MINUTES=480;

function json(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)}
function prop(k){return PropertiesService.getScriptProperties().getProperty(k)||""}
function clean(v){return String(v==null?"":v).trim()}
function email(v){return clean(v).toLowerCase()}
function phone(v){let p=clean(v).replace(/[\s\-()]/g,"");if(/^09\d{9}$/.test(p))return "+63"+p.slice(1);if(/^639\d{9}$/.test(p))return "+"+p;if(/^\+639\d{9}$/.test(p))return p;return p}
function validEmail(v){return /^\S+@\S+\.\S+$/.test(email(v))}
function validPhone(v){return /^\+639\d{9}$/.test(phone(v))}
function uid(){return "sf_"+Date.now()+"_"+Math.random().toString(36).slice(2,9)}
function otp(){return String(Math.floor(100000+Math.random()*900000))}
function hashPassword(p){return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(p),Utilities.Charset.UTF_8))}
function escapeHtml(v){return clean(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function sheet(name,headers){const ss=SpreadsheetApp.openById(SHEET_ID);let s=ss.getSheetByName(name)||ss.insertSheet(name);if(s.getMaxColumns()<headers.length)s.insertColumnsAfter(s.getMaxColumns(),headers.length-s.getMaxColumns());s.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight("bold");return s}
function rows(s){if(s.getLastRow()<2)return [];return s.getRange(2,1,s.getLastRow()-1,s.getLastColumn()).getValues()}
function findUser(identity){const s=sheet(USER_SHEET,USER_HEADERS),rs=rows(s),t=clean(identity).toLowerCase();for(let i=0;i<rs.length;i++){const r=rs[i];if([r[0],r[2],email(r[6]),phone(r[7])].some(x=>String(x||"").toLowerCase()===t))return {sheet:s,row:i+2,values:r}}return null}

function sendEmail(to,name,code,subject){
  MailApp.sendEmail({to:email(to),subject:subject||"StockFlow Verification Code",
    body:"Hello "+(name||"StockFlow User")+",\n\nYour StockFlow verification code is "+code+". It expires in "+OTP_EXPIRY_MINUTES+" minutes.\n\nIf you did not request this code, ignore this email.",
    htmlBody:'<div style="font-family:Arial;max-width:560px;margin:auto;padding:30px"><h2 style="color:#1769e0">StockFlow</h2><p>Hello '+escapeHtml(name||"StockFlow User")+',</p><p>Your verification code is:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;background:#f1f5f9;border-radius:12px">'+code+'</div><p>This code expires in <b>'+OTP_EXPIRY_MINUTES+' minutes</b>.</p></div>',
    name:APP_NAME});
}
function sendSms(to,code){
  const sid=prop("TWILIO_ACCOUNT_SID"),token=prop("TWILIO_AUTH_TOKEN"),from=prop("TWILIO_PHONE_NUMBER");
  if(!sid||!token||!from)throw new Error("Twilio SMS is not configured in Apps Script Script Properties.");
  const r=UrlFetchApp.fetch("https://api.twilio.com/2010-04-01/Accounts/"+sid+"/Messages.json",{method:"post",payload:{To:phone(to),From:from,Body:"StockFlow verification code: "+code+". Expires in "+OTP_EXPIRY_MINUTES+" minutes. Do not share this code."},headers:{Authorization:"Basic "+Utilities.base64Encode(sid+":"+token)},muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300)throw new Error("Twilio rejected the SMS request.");
}
function deliverOTP(user,code,subject){
  const result={emailSent:false,smsSent:false,errors:[]};
  try{sendEmail(user.gmail,user.name,code,subject);result.emailSent=true}catch(e){result.errors.push("Email: "+e.message)}
  try{sendSms(user.phone,code);result.smsSent=true}catch(e){result.errors.push("SMS: "+e.message)}
  if(!result.emailSent&&!result.smsSent)throw new Error(result.errors.join(" "));
  return result;
}

function register(data,role){
  const name=clean(data.name),username=clean(data.username),password=String(data.password||""),age=Number(data.age),gmail=email(data.gmail||data.email),ph=phone(data.phone);
  if(!name||!username||!password||!age||!validEmail(gmail)||!validPhone(ph))return {success:false,message:"Complete all required fields using a valid email and Philippine phone number."};
  if(username.length<4||username.length>30)return {success:false,message:"Username must be 4–30 characters."};
  if(age<18||age>100)return {success:false,message:"Age must be between 18 and 100."};
  if(findUser(username)||findUser(gmail)||findUser(ph))return {success:false,message:"Username, email, or phone number is already registered."};
  const s=sheet(USER_SHEET,USER_HEADERS),code=otp(),now=new Date(),expires=new Date(Date.now()+OTP_EXPIRY_MINUTES*60000);
  s.appendRow([uid(),name,username,hashPassword(password),age,"PENDING",gmail,ph,role||"Employee",false,code,expires,0,"","both",now,"",now,""]);
  const u=findUser(username);
  try{const d=deliverOTP({name,gmail,phone:ph},code,"StockFlow - Your verification code");return {success:true,uid:u.values[0],username,role:role||"Employee",verified:false,otpSent:true,emailSent:d.emailSent,smsSent:d.smsSent,message:"Registration successful. Check your registered email and/or phone for the verification code."}}
  catch(e){s.deleteRow(u.row);return {success:false,message:"Registration failed because the verification code could not be delivered: "+e.message}}
}
function login(data){
  const f=findUser(data.identity||data.username||data.email);if(!f)return {success:false,message:"Invalid username/email or password."};
  const supplied=String(data.password||""),saved=String(f.values[3]||"");
  const ok=saved===hashPassword(supplied)||saved===supplied; // legacy plaintext compatibility
  if(!ok)return {success:false,message:"Invalid username/email or password."};
  const status=clean(f.values[5]).toUpperCase(),verified=f.values[9]===true||String(f.values[9]).toUpperCase()==="TRUE";
  if(status==="SUSPENDED"||status==="DISABLED")return {success:false,message:"This account is "+status.toLowerCase()+"."};
  if(!verified)return {success:false,verified:false,identity:f.values[2],message:"Account is not verified. Please verify the OTP sent to your registered contacts."};
  const token=Utilities.getUuid()+"."+Utilities.getUuid();
  CacheService.getScriptCache().put("session_"+token,JSON.stringify({uid:f.values[0],username:f.values[2],role:f.values[8],name:f.values[1]}),SESSION_TTL_MINUTES*60);
  f.sheet.getRange(f.row,19).setValue(new Date());
  return {success:true,token,user:{uid:f.values[0],name:f.values[1],username:f.values[2],age:f.values[4],accountStatus:f.values[5],gmail:f.values[6],phone:f.values[7],role:f.values[8]}};
}
function session(data){const t=clean(data.token),raw=t?CacheService.getScriptCache().get("session_"+t):"";if(!raw)return {success:false,message:"Session expired."};return {success:true,user:JSON.parse(raw)}}
function logout(data){if(data.token)CacheService.getScriptCache().remove("session_"+data.token);return {success:true}}
function verifyOtp(data){
  const f=findUser(data.identity),code=clean(data.otp);if(!f)return {success:false,message:"Account not found."};
  const lock=f.values[13]?new Date(f.values[13]):null;if(lock&&!isNaN(lock)&&Date.now()<lock.getTime())return {success:false,locked:true,message:"OTP verification is temporarily locked."};
  const exp=f.values[11]?new Date(f.values[11]):null;if(exp&&!isNaN(exp)&&Date.now()>exp.getTime())return {success:false,expired:true,message:"This OTP has expired. Request a new code."};
  if(code!==clean(f.values[10])){
    let a=Number(f.values[12])||0;a++;f.sheet.getRange(f.row,13).setValue(a);
    if(a>=MAX_OTP_ATTEMPTS){f.sheet.getRange(f.row,14).setValue(new Date(Date.now()+OTP_LOCK_MINUTES*60000));return {success:false,locked:true,message:"Too many incorrect attempts. Try again later."}}
    return {success:false,remainingAttempts:MAX_OTP_ATTEMPTS-a,message:"Invalid OTP. "+(MAX_OTP_ATTEMPTS-a)+" attempt(s) remaining."};
  }
  f.sheet.getRange(f.row,6,1,9).setValues([["VERIFIED",f.values[6]===f.values[6]?f.values[6]:"",f.values[7],f.values[8],true,"","","",""]]);
  f.sheet.getRange(f.row,11).clearContent();f.sheet.getRange(f.row,12).clearContent();f.sheet.getRange(f.row,13).setValue(0);f.sheet.getRange(f.row,14).clearContent();f.sheet.getRange(f.row,17).setValue(new Date());
  return {success:true,verified:true,message:"Account verified successfully."};
}
function resendOtp(data){const f=findUser(data.identity);if(!f)return {success:false,message:"Account not found."};const last=f.values[17]?new Date(f.values[17]):null;if(last&&Date.now()-last.getTime()<RESEND_COOLDOWN_SECONDS*1000)return {success:false,cooldown:true,message:"Please wait before requesting another OTP."};const code=otp(),exp=new Date(Date.now()+OTP_EXPIRY_MINUTES*60000);f.sheet.getRange(f.row,11).setValue(code);f.sheet.getRange(f.row,12).setValue(exp);f.sheet.getRange(f.row,13).setValue(0);f.sheet.getRange(f.row,14).clearContent();f.sheet.getRange(f.row,15).setValue("both");f.sheet.getRange(f.row,18).setValue(new Date());try{const d=deliverOTP({name:f.values[1],gmail:f.values[6],phone:f.values[7]},code,"StockFlow - New verification code");return {success:true,emailSent:d.emailSent,smsSent:d.smsSent,message:"A new verification code was sent."}}catch(e){return {success:false,message:e.message}}}
function forgotPassword(data){const f=findUser(data.identity);if(!f)return {success:true,message:"If the account exists, a recovery code has been sent."};const code=otp(),exp=new Date(Date.now()+OTP_EXPIRY_MINUTES*60000);f.sheet.getRange(f.row,11).setValue(code);f.sheet.getRange(f.row,12).setValue(exp);f.sheet.getRange(f.row,13).setValue(0);f.sheet.getRange(f.row,14).clearContent();f.sheet.getRange(f.row,15).setValue("both");f.sheet.getRange(f.row,18).setValue(new Date());try{deliverOTP({name:f.values[1],gmail:f.values[6],phone:f.values[7]},code,"StockFlow - Password recovery code")}catch(e){}return {success:true,message:"If the account exists, a recovery code has been sent to the registered email and phone."}}
function verifyRecoveryOtp(data){return verifyOtp(data)}
function resetPassword(data){const f=findUser(data.identity);if(!f)return {success:false,message:"Unable to reset password."};const exp=f.values[11]?new Date(f.values[11]):null;if(!clean(data.otp)||clean(data.otp)!==clean(f.values[10])||!exp||Date.now()>exp.getTime())return {success:false,message:"Invalid or expired recovery code."};const p=String(data.newPassword||"");if(p.length<8)return {success:false,message:"Password must be at least 8 characters."};f.sheet.getRange(f.row,4).setValue(hashPassword(p));f.sheet.getRange(f.row,11).clearContent();f.sheet.getRange(f.row,12).clearContent();f.sheet.getRange(f.row,13).setValue(0);return {success:true,message:"Password reset successfully. You can now sign in."}}

function requireSession(data){const s=session(data);if(!s.success)throw new Error("Unauthorized");return s.user}
function doPost(e){
  try{const d=JSON.parse(e.postData.contents||"{}"),a=clean(d.action);
    switch(a){
      case"register":return json(register(d,"Employee"));case"registerAdmin":if(clean(d.adminRegistrationKey)!==prop("ADMIN_REGISTRATION_KEY"))return json({success:false,message:"Admin registration is restricted."});return json(register(d,"Admin"));
      case"login":return json(login(d));case"session":return json(session(d));case"logout":return json(logout(d));case"verifyOtp":return json(verifyOtp(d));case"resendOtp":case"requestOtp":return json(resendOtp(d));case"forgotPassword":return json(forgotPassword(d));case"verifyRecoveryOtp":return json(verifyRecoveryOtp(d));case"resetPassword":return json(resetPassword(d));
      case"getUser":{const f=findUser(d.identity);return json(f?{success:true,user:{uid:f.values[0],name:f.values[1],username:f.values[2],age:f.values[4],accountStatus:f.values[5],gmail:f.values[6],phone:f.values[7],role:f.values[8],verified:f.values[9]===true}}:{success:false,message:"User not found."})}
      case"updateStatus":requireSession(d);{const f=findUser(d.username);if(!f)return json({success:false,message:"User not found."});f.sheet.getRange(f.row,6).setValue(clean(d.status).toUpperCase());return json({success:true,message:"Account status updated."})}
      case"listUsers":requireSession(d);return json(SFInv_listUsers());
      default:return json(SFInv_dispatch(a,d));
    }
  }catch(err){return json({success:false,message:err.message||"Server error."})}
}
function doGet(e){return json({success:true,system:APP_NAME+" Inventory System",status:"ONLINE"})}
