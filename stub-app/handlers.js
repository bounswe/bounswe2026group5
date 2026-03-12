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

function onButton4Click() {
  console.log("Button 4 clicked -- implement me!");
}

function onButton5Click() {
  console.log("Button 5 clicked -- implement me!");
}

function onButton6Click() {
  console.log("Button 6 clicked -- implement me!");
}

function onButton7Click() {
  console.log("Button 7 clicked -- implement me!");
}
