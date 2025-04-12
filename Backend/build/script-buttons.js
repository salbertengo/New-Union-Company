function loadSVG(iconId, filePath) {
  // Comprobar si estamos en el navegador
  if (typeof window === 'undefined') {
    console.log(`[Node] Omitiendo carga de SVG ${filePath} en entorno Node`);
    return;
  }

  // Construir la URL absoluta basada en el origen del sitio
  const baseUrl = window.location.origin;
  const absoluteUrl = new URL(filePath, baseUrl).toString();
  
  fetch(absoluteUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(svgContent => {
      const element = document.getElementById(iconId);
      if (element) {
        element.innerHTML = svgContent;
        console.log(`SVG ${filePath} cargado en el elemento con ID ${iconId}`);
      } else {
        console.error(`Elemento con ID ${iconId} no encontrado. Intentando nuevamente en 500ms.`);
      }
    })
    .catch(error => console.error(`Error cargando el SVG ${filePath}:`, error));
}

// Si estamos en Node, no ejecutar estos comandos
if (typeof window !== 'undefined') {
  // Ahora cargar los SVGs
  loadSVG("dashboard-icon", "/images/dashboard-symbol.svg");
  loadSVG("inventory-icon", "/images/inventory-symbol.svg");
  loadSVG("jobsheets-icon", "/images/jobsheets-symbol.svg");
  loadSVG("payments-icon", "/images/payments-symbol.svg");
  loadSVG("motorbike-icon", "/images/motorbike-symbol.svg");
  loadSVG("customer-icon", "/images/customer-symbol.svg");
}
