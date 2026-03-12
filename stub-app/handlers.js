/**
 * BUTTON CLICK HANDLERS
 *
 * Each button on the homepage has its own handler function below.
 * Replace the placeholder console.log with your own implementation.
 */

function onButton1Click() {
  console.log("Button 1 clicked -- implement me!");
}

function onButton2Click() {
  const newTab = window.open("", "_blank");

  if (!newTab) {
    alert("Popup blocked. Please allow popups for this site.");
    return;
  }

  newTab.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Turgut's Crypto Page</title>
      <style>
        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc, #e2e8f0);
          padding: 24px;
          margin: 0;
        }

        .card {
          width: 100%;
          max-width: 640px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          padding: 40px;
        }

        h1 {
          text-align: center;
          color: #1e293b;
          margin-bottom: 12px;
        }

        p {
          text-align: center;
          color: #64748b;
          line-height: 1.6;
        }

        #crypto-data {
          margin-top: 24px;
          margin-bottom: 28px;
          padding: 18px;
          border-radius: 12px;
          background: #f8fafc;
          color: #1e293b;
          text-align: center;
        }

        button {
          display: block;
          margin: 0 auto;
          padding: 12px 24px;
          border: none;
          border-radius: 12px;
          background-color: #4f46e5;
          color: white;
          font-size: 1rem;
          cursor: pointer;
        }

        button:hover {
          background-color: #4338ca;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Turgut's Crypto Page</h1>

        <p>
          This page shows live cryptocurrency prices fetched from the CoinGecko public API.
        </p>

        <p>
          The values below represent the current prices of Bitcoin and Ethereum in USD.
        </p>

        <div id="crypto-data">Loading crypto prices...</div>

        <button onclick="window.close()">Close Tab</button>
      </div>
    </body>
    </html>
  `);

  newTab.document.close();

  fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("API request failed");
      }
      return response.json();
    })
    .then(function (data) {
      var bitcoinPrice = data.bitcoin.usd;
      var ethereumPrice = data.ethereum.usd;

      newTab.document.getElementById("crypto-data").innerHTML =
        "<p><strong>Bitcoin (BTC):</strong> $" + bitcoinPrice + "</p>" +
        "<p><strong>Ethereum (ETH):</strong> $" + ethereumPrice + "</p>";
    })
    .catch(function (error) {
      console.error("Error fetching crypto prices:", error);
      newTab.document.getElementById("crypto-data").innerHTML =
        "<p>Failed to fetch crypto prices.</p>";
    });
}

function onButton3Click() {
  console.log("Button 3 clicked -- implement me!");
}

function onButton4Click() {
  console.log("Button 4 clicked -- implement me!");
}

function onButton5Click() {
  console.log("Button 5 clicked -- implement me!");
}
