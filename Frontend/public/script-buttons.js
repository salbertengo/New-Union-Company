function loadSVG(iconId, filePath) {
  fetch(filePath)
      .then(response => response.text())
      .then(svgContent => {
          const element = document.getElementById(iconId);
          if (element) {
              element.innerHTML = svgContent;
          } else {
            console.error(`Elemento con ID ${iconId} no encontrado. Intentando nuevamente en 500ms.`);
            setTimeout(() => loadSVG(iconId, filePath), 500);
          }
      })
      .catch(error => console.error(`Error cargando el SVG ${filePath}:`, error));
}

loadSVG("dashboard-icon", "/images/dashboard-symbol.svg");
loadSVG("inventory-icon", "/images/inventory-symbol.svg");
loadSVG("jobsheets-icon", "/images/jobsheets-symbol.svg");
loadSVG("payments-icon", "/images/payments-symbol.svg");


