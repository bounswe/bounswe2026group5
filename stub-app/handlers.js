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

async function onButton3Click() {
  try {
    const response = await fetch("https://api.kanye.rest");
    const result = await response.json();
    const quote = result.quote;

    const newWindow = window.open("", "_blank");
    if (newWindow) {
      const h1 = newWindow.document.createElement("h1");
      h1.textContent = "Random Kanye West Quote";
      const p = newWindow.document.createElement("p");
      p.textContent = `"${quote}"`;
      newWindow.document.body.appendChild(h1);
      newWindow.document.body.appendChild(p);
    } else {
      alert("Popup blocked! Please allow popups for this site.");
    }
  } catch (error) {
    console.error("Error fetching quote:", error);
    alert("Failed to load quote.");
  }
}

/**
 * HANDLER FOR BUTTON 4
 * Opens a new tab to display data from a public API as per Lab 5 requirements.
 */
function onButton4Click() {
  // Step 1: Open a new blank tab
  const newTab = window.open('', '_blank');

  // Step 2: Write the content to the new tab
  newTab.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Cat Fact API Explorer</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background-color: #f4f7f6; 
            }
            .card { 
                background: white; 
                padding: 40px; 
                border-radius: 12px; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
                max-width: 600px; 
                text-align: center; 
            }
            h1 { color: #2c3e50; margin-bottom: 20px; }
            .description { 
                color: #7f8c8d; 
                font-size: 0.9em; 
                margin-bottom: 30px; 
                border-bottom: 1px solid #eee; 
                padding-bottom: 20px; 
            }
            #fact { font-size: 1.2em; color: #34495e; font-style: italic; margin-bottom: 30px; }
            button { 
                background-color: #3498db; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 5px; 
                cursor: pointer; 
            }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Cat Fact API Response</h1>
            
            <div class="description">
                <p><strong>Description:</strong> This page retrieves data from the <strong>Cat Fact API</strong>. 
                The content below represents a "fact" string parsed from the JSON object returned by the API.</p>
            </div>

            <div id="fact">Loading fact...</div>
            
            <button onclick="window.close()">Close This Tab</button>
        </div>

        <script>
            // Fetching data from the public API 
            fetch('https://catfact.ninja/fact')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('fact').innerText = '"' + data.fact + '"';
                })
                .catch(err => {
                    document.getElementById('fact').innerText = "Error: Unable to fetch data.";
                });
        </script>
    </body>
    </html>
  `);
  
  // Necessary to finish loading the content in some browsers
  newTab.document.close();
}

function onButton5Click() {
  console.log("Button 5 clicked -- implement me!");
}

function onButton6Click() {
  const popup = window.open("", "_blank");
  if (!popup) {
    alert("Please allow pop-ups to view API response.");
    return;
  }

  popup.document.title = "Public API Response";
  popup.document.body.innerHTML = "<p>Loading API data...</p>";
  popup.document.body.style.fontFamily = "Arial, sans-serif";
  popup.document.body.style.padding = "24px";

  fetch("https://jsonplaceholder.typicode.com/todos/1")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    })
    .then(function (data) {
      popup.document.body.innerHTML = "";

      const heading = popup.document.createElement("h1");
      heading.textContent = "Public API Response";

      const description = popup.document.createElement("p");
      description.innerHTML =
        "This data comes from JSONPlaceholder, a free mock REST API. " +
        "It represents one todo item: " +
        "<strong>userId</strong> (owner), " +
        "<strong>id</strong> (todo id), " +
        "<strong>title</strong> (task text), " +
        "<strong>completed</strong> (done status).";

      const pre = popup.document.createElement("pre");
      pre.textContent = JSON.stringify(data, null, 2);

      popup.document.body.appendChild(heading);
      popup.document.body.appendChild(description);
      popup.document.body.appendChild(pre);
    })
    .catch(function (error) {
      popup.document.body.innerHTML = "";

      const message = popup.document.createElement("p");
      message.textContent = "Failed to fetch API data: " + error.message;
      popup.document.body.appendChild(message);
    });
}

async function onButton7Click() {
  console.log("Button 7 clicked -- implement me!");
  const id = Math.floor(Math.random() * 1025) + 1;
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const data = await res.json();
  console.log(data);  const newPage = window.open("", "_blank");
  newPage.document.write(`
    <html>
      <head>
        <title>Pokemon Info</title>
      </head>
      <body>
        <h1>${data.name}</h1>
        <p>Height: ${data.height}</p>
        <p>Weight: ${data.weight}</p>
        
        <img style="width: 200px;
  height: auto; image-rendering: pixelated" src="${data.sprites.front_default}"/>
    <p>Api returns random pokemon, I filter height weight and image to display</p>
      </body>
    </html>
  `);
  }
