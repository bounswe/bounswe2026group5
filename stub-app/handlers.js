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
  console.log("Button 2 clicked -- implement me!");
}

function onButton3Click() {
  console.log("Button 3 clicked -- implement me!");
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
