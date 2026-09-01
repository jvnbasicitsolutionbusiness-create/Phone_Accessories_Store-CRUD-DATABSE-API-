# StockFlow Connected Modules

1. Put the Apps Script backend in Google Apps Script.
2. Deploy as Web App, Execute as Me, access Anyone.
3. Copy the /exec URL to frontend/config.js.
4. Host the frontend on GitHub Pages/Vercel.
5. Test register -> Gmail OTP -> login -> dashboard -> forgot password -> recovery OTP -> reset.

Security fixes included in the hardened backend version: public users listing removed; getUser/listUsers/updateStatus require a server session; login creates a server-side session; registration is Employee-only; Manager cannot change Admin; logout destroys the session.

Phone SMS remains unconnected; OTP is Gmail-only.

The existing SHA-256 password format is retained for compatibility. For true production security, migrate to a slow password-hashing/auth provider such as Argon2/bcrypt/PBKDF2.
