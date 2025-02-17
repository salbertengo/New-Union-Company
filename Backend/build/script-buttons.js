
/*Carga de los SVG siguiendo algun path*/

  function loadSVG(iconId, filePath) {
    fetch(filePath)
      .then(response => response.text())
      .then(svgContent => {
        document.getElementById(iconId).innerHTML = svgContent;
      })
      .catch(error => console.error(`Error cargando el SVG ${filePath}:`, error));
  }
  
  loadSVG("dashboard-icon", "/images/dashboard-symbol.svg");
  loadSVG("inventory-icon", "/images/inventory-symbol.svg");
  loadSVG("jobsheets-icon", "/images/jobsheets-symbol.svg");
  loadSVG("payments-icon", "/images/payments-symbol.svg");

  