STOCKFLOW FIXED PACKAGE
========================

FILES
-----
Code.gs
config.js
auth.js
dashboard.html
dashboard.js
dashboard.css
verify.html

IMPORTANT SETUP
---------------

1. Google Apps Script
   - Open the Google Sheet:
     1w3j0sV9rDiBvS4cpHU31iGb4KIeyUPoALZf5vLH2ivY
   - Open Extensions > Apps Script.
   - Replace the existing Apps Script code with Code.gs.
   - Save.
   - Run any function once (for example getSheet_) from the Apps Script editor.
   - Google will ask for authorization. Approve the spreadsheet and MailApp permissions.
   - Deploy > Manage deployments.
   - Edit the existing Web App deployment, or create a new Web App deployment.
   - Execute as: Me.
   - Who has access: Anyone.
   - Deploy.
   - Keep the /exec URL in config.js.
   - If Google gives you a NEW /exec URL, replace the URL in config.js.

2. Gmail OTP
   - The Apps Script sends the REAL OTP using MailApp.
   - The real OTP is stored only in the Google Sheet server-side.
   - The browser NEVER receives the real OTP.
   - Gmail notifications depend on the user's Gmail notification settings.
   - Check Inbox, Spam, Promotions, and Gmail notifications.

3. DEMO OTP
   - 123456 is DEMO ONLY.
   - It never changes an account to Active/Verified.
   - Demo users may enter the dashboard.
   - Dashboard displays:
       ACCOUNT IS JUST A DEMO
   - Profile contains a Re-verify account button.
   - Re-verify sends a new real OTP.
   - Only the real OTP activates the account.

4. Firebase
   - URL used:
     https://midtermexamproject-default-rtdb.firebaseio.com/
   - Registration data is written under:
     /users/<uid>
   - The real OTP is NOT written to Firebase.
   - For this school prototype, Firebase REST access must permit the required reads/writes.
   - Do NOT leave public Firebase rules enabled for a production system.

5. Dashboard
   - Real inventory is intentionally NOT CONNECTED.
   - No fake inventory numbers are shown.
   - Products, Categories, Suppliers, Stock In, Stock Out and Reports show NOT CONNECTED.
   - MIT App Inventor integration can be added later without changing the authentication flow.

6. Google/Facebook login
   - Not activated in this package yet.
   - When added later, the same verification rule should remain:
       OAuth login -> registered contact -> real OTP -> Active account.
   - Phone/SMS OTP can also be added later.

SECURITY NOTE
-------------
This is still a school/prototype architecture. Passwords are currently stored in the Sheet/Firebase because your existing project uses direct password comparison. For a production application, use Firebase Authentication or a proper backend with password hashing, server-side authorization and protected database rules.
