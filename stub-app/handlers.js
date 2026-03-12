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

function onButton4Click() {
  console.log("Button 4 clicked -- implement me!");
}

function onButton5Click() {
  console.log("Button 5 clicked -- implement me!");
}
function onButton6Click() {
  console.log("Button 6 clicked -- implement me!");
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

