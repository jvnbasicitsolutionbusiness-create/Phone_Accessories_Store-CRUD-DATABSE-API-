// ============================================================
// STOCKFLOW — GOOGLE APPS SCRIPT WEB APP
// File: google-apps-script.gs
//
// Main doGet / doPost handlers.
// ============================================================


// ------------------------------------------------------------
// POST
// ------------------------------------------------------------

function doPost(e) {

  try {

    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {

      return sfJson({

        success: false,

        message:
          "No request data received."

      });

    }


    const data =
      JSON.parse(
        e.postData.contents
      );


    const action =
      sfClean(
        data.action
      );


    if (!action) {

      return sfJson({

        success: false,

        message:
          "Missing API action."

      });

    }


    switch (action) {


      // ======================================================
      // AUTHENTICATION
      // ======================================================

      case "register":

        return sfJson(
          register(
            data,
            "Employee"
          )
        );


      case "registerAdmin":

        if (
          sfClean(
            data.adminRegistrationKey
          ) !==
          sfProp(
            "ADMIN_REGISTRATION_KEY"
          )
        ) {

          return sfJson({

            success: false,

            message:
              "Admin registration is restricted."

          });

        }

        return sfJson(
          register(
            data,
            "Admin"
          )
        );


      case "login":

        return sfJson(
          login(data)
        );


      case "session":

        return sfJson(
          session(data)
        );


      case "logout":

        return sfJson(
          logout(data)
        );


      // ======================================================
      // OTP
      // ======================================================

      case "verifyOtp":

        return sfJson(
          verifyOtp(data)
        );


      case "resendOtp":

      case "requestOtp":

        return sfJson(
          resendOtp(data)
        );


      case "updateOtp":

        return sfJson(
          resendOtp(data)
        );


      // ======================================================
      // USER
      // ======================================================

      case "getUser": {

        const record =
          sfFindUser(
            data.identity ||
            data.uid ||
            data.username ||
            data.email ||
            data.phone
          );


        if (!record) {

          return sfJson({

            success: false,

            message:
              "User not found."

          });

        }


        return sfJson({

          success: true,

          user:
            sfUserObject(
              record.values
            )

        });

      }


      // ======================================================
      // USER STATUS
      // ======================================================

      case "updateStatus": {

        requireSession(data);


        const record =
          sfFindUser(
            data.username
          );


        if (!record) {

          return sfJson({

            success: false,

            message:
              "User not found."

          });

        }


        const newStatus =
          sfClean(
            data.status
          ).toUpperCase();


        record.sheet
          .getRange(
            record.row,
            6
          )
          .setValue(
            newStatus
          );


        sfFirebasePatch(
          "users/" +
          record.values[0],
          {

            accountStatus:
              newStatus

          }
        );


        return sfJson({

          success: true,

          message:
            "Account status updated."

        });

      }


      // ======================================================
      // INVENTORY
      // ======================================================

      default:

        return sfJson(
          sfInventoryDispatch(
            action,
            data
          )
        );

    }


  } catch (error) {

    console.error(
      "STOCKFLOW API ERROR:",
      error
    );


    return sfJson({

      success: false,

      message:
        sfErrorMessage(error)

    });

  }

}


// ------------------------------------------------------------
// GET
// ------------------------------------------------------------

function doGet(e) {

  return sfJson({

    success: true,

    system:
      SF_APP_NAME +
      " Inventory System",

    status:
      "ONLINE",

    demoMode:
      sfDemoMode(),

    timestamp:
      new Date().toISOString()

  });

}
