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

function onButton7Click() {
  console.log("Button 7 clicked -- implement me!");
}
