const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startStopButton = document.getElementById("startStopButton");
const resetButton = document.getElementById("resetButton");
const configButton = document.getElementById("configButton"); 
const manualButton = document.getElementById("manualButton");
const closeManualButton = document.getElementById("closeManualButton");
const manualModal = document.getElementById("manualModal");
const patternsModal = document.getElementById("patternsModal"); 
const closePatternsButton = document.getElementById("closePatternsButton"); 
const statusMessage = document.getElementById("statusMessage");
const speedSelect = document.getElementById("speedSelect");

// La grille est un Map sparse qui stocke les coordonnées des cellules vivantes
let liveCells = new Map(); 
let simulationInterval = null;
let isRunning = false;
let simulationSpeed = 100; 
let generation = 0;

// CAMÉRA / VUE
let scale = 15; 
let offsetX = 0; 
let offsetY = 0; 

// Panning State
let isPanning = false;
let isDragging = false; 
let lastX = 0;
let lastY = 0;
const DRAG_THRESHOLD = 5; 

/**
 * Définitions des configurations célèbres (coordonnées relatives à (0,0))
 * Chaque cellule est un tableau [x, y]
 */
const PATTERNS = {
  glider: [
    [0, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  blinker: [
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  toad: [
    [1, 2],
    [2, 2],
    [3, 2],
    [0, 3],
    [1, 3],
    [2, 3],
  ],
  beacon: [
    [0, 0],
    [1, 0],
    [0, 1],
    [3, 2],
    [2, 3],
    [3, 3],
  ],
  pulsar: [
    [2, 0],
    [3, 0],
    [4, 0],
    [8, 0],
    [9, 0],
    [10, 0],
    [0, 2],
    [5, 2],
    [7, 2],
    [12, 2],
    [0, 3],
    [5, 3],
    [7, 3],
    [12, 3],
    [0, 4],
    [5, 4],
    [7, 4],
    [12, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [8, 5],
    [9, 5],
    [10, 5],

    [2, 7],
    [3, 7],
    [4, 7],
    [8, 7],
    [9, 7],
    [10, 7],
    [0, 8],
    [5, 8],
    [7, 8],
    [12, 8],
    [0, 9],
    [5, 9],
    [7, 9],
    [12, 9],
    [0, 10],
    [5, 10],
    [7, 10],
    [12, 10],
    [2, 12],
    [3, 12],
    [4, 12],
    [8, 12],
    [9, 12],
    [10, 12],
  ],
  lwss: [
    // Light-weight spaceship
    [1, 0],
    [4, 0],
    [0, 1],
    [0, 2],
    [4, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
  gliderGun: [
    // Gosper Glider Gun
    [24, 0],
    [22, 1],
    [24, 1],
    [12, 2],
    [13, 2],
    [20, 2],
    [21, 2],
    [34, 2],
    [35, 2],
    [11, 3],
    [15, 3],
    [20, 3],
    [21, 3],
    [34, 3],
    [35, 3],
    [0, 4],
    [1, 4],
    [17, 5],
    [22, 5],
    [24, 5],
    [24, 6],
    [10, 4],
    [16, 4],
    [20, 4],
    [21, 4],
    [0, 5],
    [1, 5],
    [10, 5],
    [14, 5],
    [16, 5],
    [10, 6],
    [16, 6],
    [11, 7],
    [15, 7],
    [12, 8],
    [13, 8],
  ],
};

/**
 * Redimensionne et redessine le canvas.
 */
function resizeCanvas() {
  const containerWidth = canvas.clientWidth;
  const containerHeight = canvas.clientHeight;
  canvas.width = containerWidth;
  canvas.height = containerHeight; 
  drawGrid();
}


/**
 * Calcule la prochaine génération en itérant sur les cellules vivantes et leurs voisins.
 */
function nextGeneration() {
  const nextLiveCells = new Map();
  const cellsToEvaluate = new Map(); // Stocke toutes les cellules à vérifier

  // 1. Identifier toutes les cellules à évaluer (vivantes + leurs 8 voisins)
  for (const key of liveCells.keys()) {
    const [cx, cy] = key.split(",").map(Number);

    // Ajouter la cellule elle-même
    cellsToEvaluate.set(key, 1);

    // Ajouter tous les 8 voisins
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const neighborKey = `${cx + i},${cy + j}`;
        cellsToEvaluate.set(neighborKey, 1);
      }
    }
  }

  // 2. Évaluer chaque cellule par rapport aux règles de Conway
  for (const key of cellsToEvaluate.keys()) {
    const [cx, cy] = key.split(",").map(Number);
    const isAlive = liveCells.has(key);
    let aliveNeighbors = 0;

    // Compter les voisins vivants
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue; // Ignorer la cellule elle-même

        const neighborKey = `${cx + i},${cy + j}`;
        if (liveCells.has(neighborKey)) {
          aliveNeighbors++;
        }
      }
    }

    // Appliquer les règles
    if (isAlive) {
      if (aliveNeighbors === 2 || aliveNeighbors === 3) {
        nextLiveCells.set(key, 1); // Survie
      }
    } else {
      if (aliveNeighbors === 3) {
        nextLiveCells.set(key, 1); // Naissance
      }
    }
  }

  liveCells = nextLiveCells;
  generation++; 
  drawGrid();

  if (liveCells.size === 0) {
    stopSimulation();
    statusMessage.textContent = `Statut : Extinction. Génération: ${generation}. La grille est vide.`;
  } else {
    statusMessage.textContent = `Statut : Simulation en cours... Génération: ${generation} (Cellules vivantes: ${liveCells.size})`;
  }
}

/**
 * Dessine l'état actuel des cellules visibles sur le canvas, y compris la grille verte.
 */
function drawGrid() {
  if (canvas.width === 0 || canvas.height === 0) return;

  const CELL_SIZE = scale;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const startX = Math.floor(offsetX);
  const startY = Math.floor(offsetY);
  const COLS = Math.ceil(canvas.width / CELL_SIZE) + 1;
  const ROWS = Math.ceil(canvas.height / CELL_SIZE) + 1;
  ctx.fillStyle = "#ffffff"; 

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Coordonnées monde
      const worldX = startX + c;
      const worldY = startY + r;
      const key = `${worldX},${worldY}`;

      // Coordonnées écran
      const screenX = (worldX - offsetX) * CELL_SIZE;
      const screenY = (worldY - offsetY) * CELL_SIZE;

      if (liveCells.has(key)) {
        ctx.fillRect(screenX, screenY, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // 3. Dessin de la GRILLE VERTE (uniquement si le zoom est supérieur à 10px pour éviter le bruit)
  if (CELL_SIZE > 10) {
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Calculer le décalage de la première ligne visible (alignement avec l'offset)
    const xOffsetScreen = (((-offsetX % 1) + 1) % 1) * CELL_SIZE;
    const yOffsetScreen = (((-offsetY % 1) + 1) % 1) * CELL_SIZE;

    // Lignes verticales
    for (let x = xOffsetScreen; x <= canvas.width; x += CELL_SIZE) {
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, canvas.height);
    }

    // Lignes horizontales
    for (let y = yOffsetScreen; y <= canvas.height; y += CELL_SIZE) {
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(canvas.width, Math.floor(y) + 0.5);
    }

    ctx.stroke();
  }
}

/**
 * Convertit les coordonnées écran (pixel) en coordonnées monde (cellule).
 */
function screenToWorld(screenX, screenY) {
  const rect = canvas.getBoundingClientRect();
  const canvasX = screenX - rect.left;
  const canvasY = screenY - rect.top;

  // Décalage pour le zoom (scale) et l'offset de la caméra
  const worldX = Math.floor(canvasX / scale + offsetX);
  const worldY = Math.floor(canvasY / scale + offsetY);

  return { x: worldX, y: worldY };
}

/**
 * Bascule l'état d'une cellule aux coordonnées données (s'active si ce n'était pas un glissement).
 */
function handleCellToggle(x, y) {
  const worldCoords = screenToWorld(x, y);
  const key = `${worldCoords.x},${worldCoords.y}`;

  if (liveCells.has(key)) {
    liveCells.delete(key);
  } else {
    liveCells.set(key, 1);
  }
  drawGrid();
  if (!isRunning) {
    statusMessage.textContent = `Statut : Prêt. Génération: ${generation}. Cellules vivantes: ${liveCells.size}.`;
  }
}

// --- Fonctions de Panning et Drag ---

function startInteraction(screenX, screenY) {
  isPanning = true;
  isDragging = false;
  lastX = screenX;
  lastY = screenY;
}

function endInteraction(screenX, screenY) {
  isPanning = false;
  if (!isDragging) {
    handleCellToggle(lastX, lastY);
  }
  isDragging = false;
}

function moveInteraction(screenX, screenY) {
  if (!isPanning) return;

  const dx = screenX - lastX;
  const dy = screenY - lastY;

  // Dépasser le seuil pour être considéré comme un glissement
  if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
    isDragging = true;
   
  }

  if (isDragging) {
    // Mettre à jour l'offset de la caméra (en coordonnées monde)
    offsetX -= dx / scale;
    offsetY -= dy / scale;

    lastX = screenX;
    lastY = screenY;
    drawGrid();
  }
}

/**
 * Gère l'événement de molette pour le zoom.
 */
function zoom(event) {
  event.preventDefault();

  // Facteur de zoom
  const zoomDirection = event.deltaY < 0 ? 1.2 : 0.8;
  let newScale = scale * zoomDirection;
  newScale = Math.min(Math.max(newScale, 5), 50);
  const rect = canvas.getBoundingClientRect();
  const mouseCanvasX = event.clientX - rect.left;
  const mouseCanvasY = event.clientY - rect.top;
  const wxBefore = offsetX + mouseCanvasX / scale;
  const wyBefore = offsetY + mouseCanvasY / scale;

  scale = newScale;

  offsetX = wxBefore - mouseCanvasX / scale;
  offsetY = wyBefore - mouseCanvasY / scale;

  drawGrid();
}

// --- Contrôles de Simulation ---

function startSimulation() {
  if (isRunning) return;
  isRunning = true;
  // Utilise la vitesse sélectionnée
  simulationInterval = setInterval(nextGeneration, simulationSpeed);
  startStopButton.textContent = "Arrêter";
  startStopButton.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
  startStopButton.classList.add("bg-orange-500", "hover:bg-orange-600");
  statusMessage.textContent = `Statut : Simulation en cours... Génération: ${generation} (Cellules vivantes: ${liveCells.size})`;
}

function stopSimulation() {
  if (!isRunning) return;
  clearInterval(simulationInterval);
  simulationInterval = null;
  isRunning = false;
  startStopButton.textContent = "Démarrer";
  startStopButton.classList.remove("bg-orange-500", "hover:bg-orange-600");
  startStopButton.classList.add("bg-indigo-600", "hover:bg-indigo-700");
  statusMessage.textContent = `Statut : En pause. Génération: ${generation}. Glissez pour vous déplacer ou Démarrer.`;
}

function toggleSimulation() {
  if (isRunning) {
    stopSimulation();
  } else {
    startSimulation();
  }
}

function resetGame() {
  stopSimulation();
  liveCells.clear(); 
  offsetX = 0; 
  offsetY = 0;
  scale = 15; 
  generation = 0; 
  drawGrid();
  statusMessage.textContent =
    "Statut : Réinitialisé. Génération: 0. Dessinez le prochain modèle !";
}

/**
 * Charge un motif pré-défini sur le canevas, en le centrant.
 * @param {string} patternKey - Clé du motif dans l'objet PATTERNS.
 */
function loadPattern(patternKey) {
  const pattern = PATTERNS[patternKey];
  if (!pattern || pattern.length === 0) return;

  stopSimulation();
  liveCells.clear();

  // Trouver les limites du motif
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;
  pattern.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Centrer le motif sur l'écran visible (ajuste l'offset de la caméra)
  // Calculer la coordonnée monde centrale pour l'écran
  const canvasCenterWorldX = offsetX + canvas.width / 2 / scale;
  const canvasCenterWorldY = offsetY + canvas.height / 2 / scale;
  const patternCenterX = minX + width / 2;
  const patternCenterY = minY + height / 2;

  const shiftX = Math.round(canvasCenterWorldX - patternCenterX);
  const shiftY = Math.round(canvasCenterWorldY - patternCenterY);

  // Appliquer le motif avec le décalage
  pattern.forEach(([x, y]) => {
    const newX = x + shiftX;
    const newY = y + shiftY;
    liveCells.set(`${newX},${newY}`, 1);
  });

 
  if (width > 20 || height > 20) {
    
    const targetScale = Math.min(
      canvas.width / (width + 4),
      canvas.height / (height + 4)
    );
    scale = Math.min(Math.max(targetScale, 15), 50); 
  } else {
    scale = 15; 
  }

  offsetX = canvasCenterWorldX - canvas.width / 2 / scale;
  offsetY = canvasCenterWorldY - canvas.height / 2 / scale;

  generation = 0;
  drawGrid();
  patternsModal.classList.add("hidden"); 
  statusMessage.textContent = `Statut : Prêt. Configuration chargée. Génération: 0.`;
}

/**
 * Gère le changement de vitesse sélectionnée.
 */
function handleSpeedChange() {
  const newSpeed = parseInt(speedSelect.value);
  simulationSpeed = newSpeed;

  if (isRunning) {
    clearInterval(simulationInterval);
    simulationInterval = setInterval(nextGeneration, simulationSpeed);
  }
}


function openManual() {
  manualModal.classList.remove("hidden");
}

function openPatternsModal() {
  patternsModal.classList.remove("hidden");
}

function closePatternsModal() {
  patternsModal.classList.add("hidden");
}

function closeManualModal() {
  manualModal.classList.add("hidden");
}

// --- Écouteurs d'Événements ---

// Panning (Souris)
canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  startInteraction(e.clientX, e.clientY);
  canvas.style.cursor = "grabbing"; 
});

window.addEventListener("mouseup", (e) => {
  if (!isPanning) return; 
  endInteraction(e.clientX, e.clientY);
  canvas.style.cursor = "pointer"; 
});

window.addEventListener("mousemove", (e) =>
  moveInteraction(e.clientX, e.clientY)
);

// Panning (Tactile)
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    startInteraction(e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: false }
);

window.addEventListener("touchend", (e) => {
  endInteraction(lastX, lastY);
});

window.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    moveInteraction(e.touches[0].clientX, e.touches[0].clientY);
  },
  { passive: false }
);

// Zoom (Molette)
canvas.addEventListener("wheel", zoom);

// Événements des Boutons
startStopButton.addEventListener("click", toggleSimulation);
resetButton.addEventListener("click", resetGame);
manualButton.addEventListener("click", openManual);
configButton.addEventListener("click", openPatternsModal); // Nouveau

// Événements des Modals
closeManualButton.addEventListener("click", closeManualModal);
closePatternsButton.addEventListener("click", closePatternsModal); // Nouveau

// Événement de sélection de configuration
document.getElementById("patternList").addEventListener("click", (e) => {
  const patternDiv = e.target.closest(".pattern-link");
  if (patternDiv) {
    const patternKey = patternDiv.getAttribute("data-pattern");
    if (patternKey) {
      loadPattern(patternKey);
    }
  }
});

// Événement de la Vitesse
speedSelect.addEventListener("change", handleSpeedChange);

// Redimensionnement du Canvas
window.addEventListener("resize", resizeCanvas);

// Initialisation
window.onload = function () {
  simulationSpeed = parseInt(speedSelect.value);
  resizeCanvas();
};
