const form = document.getElementById("dati-form");
const popup = document.getElementById("popup-conferma");
const btnConferma = document.getElementById("btn-conferma");
const btnAnnulla = document.getElementById("btn-annulla");

form.addEventListener("submit", function(event) {
  event.preventDefault();
  popup.style.display = "flex";
});

btnConferma.addEventListener("click", () => {
  popup.style.display = "none";
  form.submit(); // invio effettivo
});

btnAnnulla.addEventListener("click", () => {
  popup.style.display = "none";
});
