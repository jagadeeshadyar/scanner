/*******************************************************
 * CONFIGURATION
 *******************************************************/

const API_URL =
  "https://script.google.com/macros/s/AKfycbw6F1UmtAFB754qMw8QXRZT-h2BFayI4-LQsSyXjQxXeT_CLWiriMaEMGadXTRdB2PD/exec";


let sessionToken =
  localStorage.getItem("entrySessionToken");

let scanner = null;

let scanning = false;

let lastScannedQR = "";

let lastScanTime = 0;


/*******************************************************
 * PAGE LOAD
 *******************************************************/

document.addEventListener(
  "DOMContentLoaded",
  function () {

    if (sessionToken) {

      showScanner();

    } else {

      showLogin();
    }

  }
);


/*******************************************************
 * LOGIN
 *******************************************************/

function login() {

  const email =
    document
      .getElementById("email")
      .value
      .trim();

  const pin =
    document
      .getElementById("pin")
      .value
      .trim();

  const message =
    document.getElementById(
      "loginMessage"
    );

  if (!email || !pin) {

    message.textContent =
      "Please enter email and PIN.";

    return;
  }

  message.textContent =
    "Checking authorization...";


  apiRequest(
    "login",
    {
      email: email,
      pin: pin
    },
    function (response) {

      if (response.success) {

        sessionToken =
          response.token;

        localStorage.setItem(
          "entrySessionToken",
          sessionToken
        );

        localStorage.setItem(
          "entryUserName",
          response.user.name
        );

        localStorage.setItem(
          "entryUserEmail",
          response.user.email
        );

        message.textContent =
          "Login successful.";

        showScanner();

      } else {

        message.textContent =
          response.message ||
          "UNAUTHORIZED USER";

      }

    }
  );
}


/*******************************************************
 * SHOW LOGIN
 *******************************************************/

function showLogin() {

  document
    .getElementById("loginSection")
    .classList.remove("hidden");

  document
    .getElementById("scannerSection")
    .classList.add("hidden");
}


/*******************************************************
 * SHOW SCANNER
 *******************************************************/

function showScanner() {

  document
    .getElementById("loginSection")
    .classList.add("hidden");

  document
    .getElementById("scannerSection")
    .classList.remove("hidden");

  document
    .getElementById("userName")
    .textContent =
      localStorage.getItem(
        "entryUserName"
      ) || "";

  startScanner();
}


/*******************************************************
 * START SCANNER
 *******************************************************/

function startScanner() {

  if (scanner) {
    return;
  }

  scanner =
    new Html5Qrcode("reader");


  const config = {

    fps: 10,

    qrbox: function (
      viewfinderWidth,
      viewfinderHeight
    ) {

      const size =
        Math.min(
          viewfinderWidth,
          viewfinderHeight
        ) * 0.70;

      return {
        width: size,
        height: size
      };
    },

    aspectRatio: 1.0
  };


  scanner
    .start(
      {
        facingMode: "environment"
      },

      config,

      onScanSuccess,

      onScanFailure

    )
    .then(function () {

      scanning = true;

    })
    .catch(function (error) {

      showResult(
        "CAMERA ERROR",
        "📷",
        "Unable to access camera.",
        error,
        "red"
      );

    });
}


/*******************************************************
 * QR SUCCESS
 *******************************************************/

function onScanSuccess(
  decodedText,
  decodedResult
) {

  const now =
    Date.now();


  /*
   * Prevent the same QR from being sent
   * repeatedly while the camera is still
   * seeing it.
   */

  if (
    decodedText === lastScannedQR &&
    now - lastScanTime < 4000
  ) {

    return;
  }


  lastScannedQR =
    decodedText;

  lastScanTime =
    now;


  processQR(decodedText);
}


/*******************************************************
 * QR FAILURE
 *******************************************************/

function onScanFailure(error) {

  /*
   * Do nothing.
   *
   * Scanner continuously attempts
   * to recognize QR codes.
   */
}


/*******************************************************
 * PROCESS QR
 *******************************************************/

function processQR(qr) {

  showResult(
    "PROCESSING...",
    "⏳",
    "Checking entry...",
    "",
    ""
  );


  apiRequest(
    "scan",
    {
      token: sessionToken,
      qr: qr
    },
    function (response) {

      if (
        response.code ===
        "SESSION_EXPIRED"
      ) {

        logout();

        return;
      }


      if (
        response.code ===
        "INVALID_QR"
      ) {

        showResult(
          "INVALID QR CODE",
          "❌",
          "QR code was not found.",
          qr,
          "red"
        );

        return;
      }


      if (
        response.code ===
        "ALREADY_SCANNED"
      ) {

        const scan =
          response.scan;

        showPersonResult(
          "ALREADY SCANNED",
          "⚠️",
          scan,
          "yellow"
        );

        return;
      }


      if (
        response.code ===
        "ENTRY_APPROVED"
      ) {

        showPersonResult(
          "ENTRY APPROVED",
          "✓",
          response.scan,
          "green"
        );

        return;
      }


      if (
        response.code ===
        "REENTRY_APPROVED"
      ) {

        showPersonResult(
          "ENTRY APPROVED - RE-ENTRY",
          "✓",
          response.scan,
          "yellow"
        );

        return;
      }


      showResult(
        "ERROR",
        "❌",
        response.message ||
        "Unknown error.",
        "",
        "red"
      );

    }
  );
}


/*******************************************************
 * DISPLAY PERSON
 *******************************************************/

function showPersonResult(
  title,
  icon,
  scan,
  color
) {

  const card =
    document.getElementById(
      "resultCard"
    );

  card.className =
    "resultCard " + color;


  document
    .getElementById(
      "resultTitle"
    )
    .textContent =
      title;


  document
    .getElementById(
      "resultIcon"
    )
    .textContent =
      icon;


  document
    .getElementById(
      "personName"
    )
    .textContent =
      scan.name || "";


  document
    .getElementById(
      "personDetails"
    )
    .innerHTML =

      "<strong>BN / Mobile:</strong> " +
      escapeHtml(
        scan.mobile || "-"
      ) +

      "<br><strong>Combine:</strong> " +
      escapeHtml(
        scan.combine || "-"
      ) +

      "<br><strong>Multiple Entry:</strong> " +
      escapeHtml(
        scan.multipleEntry || "-"
      );


  document
    .getElementById(
      "scanNumber"
    )
    .textContent =
      scan.scanNumber;


  document
    .getElementById(
      "scanTime"
    )
    .textContent =
      scan.timestamp;


  card.classList.remove(
    "hidden"
  );


  /*
   * Hide result automatically after
   * a few seconds so the next person
   * can scan.
   */

  setTimeout(
    function () {

      card.classList.add(
        "hidden"
      );

    },
    5000
  );
}


/*******************************************************
 * GENERIC RESULT
 *******************************************************/

function showResult(
  title,
  icon,
  person,
  details,
  color
) {

  const card =
    document.getElementById(
      "resultCard"
    );

  card.className =
    "resultCard " + color;


  document
    .getElementById(
      "resultTitle"
    )
    .textContent =
      title;


  document
    .getElementById(
      "resultIcon"
    )
    .textContent =
      icon;


  document
    .getElementById(
      "personName"
    )
    .textContent =
      person;


  document
    .getElementById(
      "personDetails"
    )
    .textContent =
      details;


  document
    .getElementById(
      "scanNumber"
    )
    .textContent =
      "-";


  document
    .getElementById(
      "scanTime"
    )
    .textContent =
      new Date()
        .toLocaleString();


  card.classList.remove(
    "hidden"
  );
}


/*******************************************************
 * API REQUEST
 *
 * JSONP is used so the GitHub Pages site can
 * communicate with the Apps Script web app.
 *******************************************************/

function apiRequest(
  action,
  params,
  callback
) {

  const callbackName =
    "apiCallback_" +
    Date.now() +
    "_" +
    Math.floor(
      Math.random() * 100000
    );


  window[callbackName] =
    function (response) {

      try {

        callback(response);

      } finally {

        delete window[callbackName];

        if (script.parentNode) {

          script.parentNode
            .removeChild(script);
        }
      }
    };


  let url =
    API_URL +
    "?action=" +
    encodeURIComponent(action) +
    "&callback=" +
    encodeURIComponent(callbackName);


  Object.keys(params)
    .forEach(function (key) {

      url +=
        "&" +
        encodeURIComponent(key) +
        "=" +
        encodeURIComponent(
          params[key]
        );

    });


  const script =
    document.createElement(
      "script"
    );

  script.src =
    url;


  script.onerror =
    function () {

      callback({
        success: false,
        code: "API_ERROR",
        message:
          "Unable to connect to Google Sheets."
      });

      delete window[callbackName];

      if (script.parentNode) {

        script.parentNode
          .removeChild(script);
      }
    };


  document
    .body
    .appendChild(script);
}


/*******************************************************
 * LOGOUT
 *******************************************************/

function logout() {

  const token =
    sessionToken;


  if (token) {

    apiRequest(
      "logout",
      {
        token: token
      },
      function () {

        clearSession();

      }
    );

  } else {

    clearSession();
  }
}


function clearSession() {

  sessionToken = null;

  localStorage.removeItem(
    "entrySessionToken"
  );

  localStorage.removeItem(
    "entryUserName"
  );

  localStorage.removeItem(
    "entryUserEmail"
  );


  if (scanner) {

    scanner
      .stop()
      .then(function () {

        scanner.clear();

        scanner = null;

        showLogin();

      })
      .catch(function () {

        scanner = null;

        showLogin();

      });

  } else {

    showLogin();
  }
}


/*******************************************************
 * HTML ESCAPE
 *******************************************************/

function escapeHtml(value) {

  return String(value || "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}
