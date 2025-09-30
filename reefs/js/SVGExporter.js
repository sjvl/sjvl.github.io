/**
 * Fonction optimisée pour capturer l'écran et créer un SVG pour plotter
 */
function captureScreenToSVGOptimized(renderer, options = {}) {
    console.log(renderer)
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    const lineColor = options.lineColor || "#000000";
    const threshold = options.threshold || 0.5; // Seuil pour considérer un pixel comme noir
    const simplifyThreshold = 2 * (Math.PI / 180); // Seuil de 2 degrés pour simplifier les chemins
    
    console.log("Capture d'écran et conversion en SVG optimisé pour plotter...");
    
    // Étape 1: Capture d'écran
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(renderer.domElement, 0, 0);
    
    // Étape 2: Analyser les pixels pour identifier les lignes
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Créer une matrice 2D pour stocker les pixels noirs
    const pixelMatrix = Array(height).fill().map(() => Array(width).fill(false));
    
    // Analyser tous les pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Calculer la luminosité
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            
            // Si luminance est faible, marquer comme pixel noir
            if (luminance < threshold) {
                pixelMatrix[y][x] = true;
            }
        }
    }
    
    // Étape 3: Identifier les contours et former des chemins continus
    let allPaths = [];
    
    // Fonction pour vérifier si un pixel n'a pas encore été visité et est noir
    function isUnvisitedBlackPixel(x, y) {
        return x >= 0 && x < width && y >= 0 && y < height && pixelMatrix[y][x];
    }
    
    // Directions pour chercher les pixels voisins (8 directions)
    // const directions = [
    //     [-1, -1], [0, -1], [1, -1],
    //     [-1,  0],          [1,  0],
    //     [-1,  1], [0,  1], [1,  1]
    // ];

    const directions = [
        // Voisins immédiats (distance 1)
        [-1, -1], [0, -1], [1, -1],
        [-1,  0],          [1,  0],
        [-1,  1], [0,  1], [1,  1],
        
        // Seulement les angles à distance 2
        [-2, -2],                  [2, -2],
        
        [-2,  2],                  [2,  2]
    ];
    
    // Pour chaque pixel, essayer de suivre un chemin continu
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isUnvisitedBlackPixel(x, y)) {
                // Commencer un nouveau chemin
                const path = [{x, y}];
                pixelMatrix[y][x] = false; // Marquer comme visité
                
                // Suivre le chemin dans toutes les directions possibles
                let foundNext = true;
                while (foundNext) {
                    foundNext = false;
                    
                    // Obtenir le dernier point ajouté
                    const lastPoint = path[path.length - 1];
                    
                    // Vérifier toutes les directions pour trouver un pixel voisin non visité
                    for (const [dx, dy] of directions) {
                        const newX = lastPoint.x + dx;
                        const newY = lastPoint.y + dy;
                        
                        if (isUnvisitedBlackPixel(newX, newY)) {
                            // Ajouter au chemin et marquer comme visité
                            path.push({x: newX, y: newY});
                            pixelMatrix[newY][newX] = false;
                            foundNext = true;
                            break; // Passer au prochain point
                        }
                    }
                }
                
                // Ajouter le chemin s'il contient plusieurs points
                if (path.length > 1) {
                    allPaths.push(path);
                }
            }
        }
    }
    
    // Étape 4: Simplifier les chemins (réduire le nombre de points)
    function simplifyPath(path) {
        if (path.length <= 2) return path;
        
        const result = [path[0]];
        let lastDirection = null;
        
        for (let i = 1; i < path.length; i++) {
            const prev = path[i-1];
            const current = path[i];
            
            // Calculer la direction actuelle
            const dx = current.x - prev.x;
            const dy = current.y - prev.y;
            const direction = Math.atan2(dy, dx);
            
            // Si c'est le premier point ou si la direction a changé significativement
            if (lastDirection === null || 
                Math.abs(direction - lastDirection) > simplifyThreshold) {
                result.push(current);
                lastDirection = direction;
            }
        }
        
        // Toujours ajouter le dernier point
        if (result[result.length - 1] !== path[path.length - 1]) {
            result.push(path[path.length - 1]);
        }
        
        return result;
    }
    
    // Simplifier tous les chemins
    const simplifiedPaths = allPaths;
    // const simplifiedPaths = allPaths.map(path => simplifyPath(path));
    
    // Étape 5: Optimiser l'ordre des chemins (TSP simplifié)
    function distanceBetweenPaths(path1, path2) {
        const end = path1[path1.length - 1];
        const start = path2[0];
        
        return Math.sqrt(
            Math.pow(end.x - start.x, 2) + 
            Math.pow(end.y - start.y, 2)
        );
    }
    
    function optimizePathOrder(paths) {
        if (paths.length <= 1) return paths;
        
        const optimizedPaths = [paths[0]];
        const remainingPaths = paths.slice(1);
        
        while (remainingPaths.length > 0) {
            const lastPath = optimizedPaths[optimizedPaths.length - 1];
            
            // Trouver le chemin le plus proche
            let minDistance = Infinity;
            let closestIndex = 0;
            
            for (let i = 0; i < remainingPaths.length; i++) {
                const dist = distanceBetweenPaths(lastPath, remainingPaths[i]);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestIndex = i;
                }
            }
            
            // Ajouter le chemin le plus proche
            optimizedPaths.push(remainingPaths[closestIndex]);
            remainingPaths.splice(closestIndex, 1);
        }
        
        return optimizedPaths;
    }
    
    const optimizedPaths = optimizePathOrder(simplifiedPaths);
    
    // Étape 6: Générer le SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
    
    // Ajouter chaque chemin au SVG
    for (const path of optimizedPaths) {
        if (path.length < 2) continue;
        
        let pathData = `M ${path[0].x} ${path[0].y}`;
        for (let i = 1; i < path.length; i++) {
            pathData += ` L ${path[i].x} ${path[i].y}`;
        }
        
        svg += `  <path d="${pathData}" stroke="${lineColor}" stroke-width="1" fill="none" />\n`;
    }
    
    svg += '</svg>';
    
    // Étape 7: Télécharger le SVG
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename || 'plotter-optimized.svg';
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
    
    console.log(`SVG optimisé généré avec ${optimizedPaths.length} chemins`);
    
    canvas.remove();
    return svg;
}

function setupTouchExport(rendererInstance) {
    const canvas = rendererInstance.domElement;
    
    // Variables pour gérer les événements tactiles
    let lastTap = 0;
    let touchTimeout;
    const doubleTapDelay = 300; // millisecondes entre deux taps pour être considéré comme double tap
    
    // Fonction pour exporter en SVG
    function exportSVG() {
        console.log('Export SVG déclenché - génération en cours...');
        
        requestAnimationFrame(() => {
            try {
                captureScreenToSVGOptimized(rendererInstance, {
                    threshold: 0.5,
                    filename: `reef-${seed}.svg` // Utilisez le seed pour nommer le fichier
                });
            } catch (error) {
                console.error("Erreur lors de la génération du SVG:", error);
                alert("Une erreur s'est produite lors de la génération du SVG.");
            }
        });
    }
    
    // Gestionnaire d'événement pour double-clic (desktop)
    canvas.addEventListener('dblclick', function(e) {
        e.preventDefault(); // Éviter le zoom sur certains navigateurs
        exportSVG();
    });
    
    // Gestionnaire d'événement pour toucher (mobile)
    canvas.addEventListener('touchend', function(e) {
        // Éviter les comportements par défaut comme le zoom
        e.preventDefault();
        
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        clearTimeout(touchTimeout);
        
        if (tapLength < doubleTapDelay && tapLength > 0) {
            // Double tap détecté
            exportSVG();
        } else {
            // Premier tap, attendre un potentiel second tap
            touchTimeout = setTimeout(function() {
                // Single tap - ne rien faire ou implémenter une autre fonctionnalité
                clearTimeout(touchTimeout);
            }, doubleTapDelay);
        }
        
        lastTap = currentTime;
    });
    
    // Optionnel: empêcher le comportement par défaut des gestes pour éviter les interférences
    canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault(); // Éviter le zoom pincer par défaut
        }
    }, { passive: false });
}

/**
 * Fonction pour ajouter un bouton d'export SVG optimisé
 * @param {THREE.WebGLRenderer} rendererInstance - L'instance du renderer Three.js
 */
function clickExportOptimized(rendererInstance) { 
    // touche "S" pressée   
    document.addEventListener('keydown', function(event) {
        if (event.key === 's' || event.key === 'S') {
            console.log('Touche S détectée - génération du SVG...');
        
            requestAnimationFrame(() => {
                try {
                    captureScreenToSVGOptimized(rendererInstance, {
                        threshold: 0.5,
                        filename: 'plotter-optimized.svg'
                    });
                } catch (error) {
                    console.error("Erreur lors de la génération du SVG:", error);
                    alert("Une erreur s'est produite lors de la génération du SVG.");
                }
            });
        }
    });

    // ou double-clic
    setupTouchExport(rendererInstance);
    
    return;
}




/**
 * Fonction d'initialisation à appeler à la fin de votre fonction init()
 * @param {THREE.WebGLRenderer} rendererInstance - L'instance du renderer Three.js
 */
function setupOptimizedSVGExport(rendererInstance) {
    // Ajouter le bouton d'export SVG optimisé
    clickExportOptimized(rendererInstance);
}