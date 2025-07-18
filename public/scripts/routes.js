// src/utils/routes.js
// Aquí arranca la función que monta todo el tema de encontrar rutas óptimas en el grafo de la red de transporte.
// Si esto deja de funcionar, fue porque alguien (quizás yo mismo) le metió mano sin avisar jeje.

export function setupRouteDetection() {

  // 1) REFERENCIAS DEL DOM
  // Agarro todos los elementos del HTML que voy a estar usando a cada rato, así no tengo que estar buscandolos a mano luego.
  const networkArea       = document.getElementById("networkArea");       // Donde va el texto de la red (matriz de adyacencia o como quieras llamarlo)
  const fileInput         = document.getElementById("fileInput");         // El input invisible pa' subir archivos de red
  const loadNetworkBtn    = document.getElementById("loadNetworkBtn");    // Botón para cargar la red desde archivo
  const clearNetworkBtn   = document.getElementById("clearNetworkBtn");   // Botón pa' limpiar todo y empezar de cero
  const originInput       = document.getElementById("originInput");       // Donde el usuario mete el origen (estación inicial)
  const destInput         = document.getElementById("destInput");         // Donde mete el destino
  const runRouteBtn       = document.getElementById("runRouteBtn");       // El botón grande de "buscar ruta"
  const resultModal       = document.getElementById("resultModal");       // El modal que aparece con el resultado
  const routeOutput       = document.getElementById("routeOutput");       // El textarea donde va la ruta calculada
  const closeModalBtn     = document.getElementById("closeModalBtn");     // Botón para cerrar el modal de resultado
  const downloadRoutesBtn = document.getElementById("downloadRoutesBtn"); // Botón para descargar la ruta resultante

 
  // 2) CARGA DE LA RED (ARCHIVO .txt o lo que sea)
  // Cuando el usuario le da a "cargar red", simulo el click en el input invisible.
  loadNetworkBtn.addEventListener("click", () => fileInput.click());

  // Cuando seleccionan un archivo, lo leo como texto y lo pongo en el textarea de la red. 
  // Si cancela el usuario, pues no hago nada.
  fileInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => (networkArea.value = fr.result);
    fr.readAsText(f);
    fileInput.value = ""; // Truco para que se pueda subir el mismo archivo otra vez si quiere.
  });

  // Botón para limpiar la red y los campos de origen/destino, por si la embarraron.
  clearNetworkBtn.addEventListener("click", () => {
    networkArea.value = "";
    originInput.value = "";
    destInput.value = "";
  });


  // 3) PARSEO DEL TEXTO A UNA LISTA DE ADYACENCIA
  // Esto convierte el texto de la red en un formato que entienda el algoritmo de rutas. Si el formato está mal, reviento de una.
  function parseGraph(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 1) throw new Error("Formato inválido o archivo vacío");
    // Primera línea tiene N (nodos/estaciones) y M (cantidad de conexiones/aristas)
    const [N, M] = lines[0].split(/\s+/).map(Number);
    // Creo la lista de adyacencia vacía (ojo con el +1 porque los nodos empiezan en 1)
    const adj = Array.from({ length: N + 1 }, () => []);
    // Recorro cada línea para llenar la lista de adyacencia
    for (let i = 1; i <= M; i++) {
      const [u, v, c] = lines[i].split(/\s+/).map(Number);
      adj[u].push({ to: v, cost: c }); // De u a v cuesta c
    }
    return { N, adj };
  }


  // 4) ALGORITMO DE DIJKSTRA
  // Aquí hago la magia para buscar la ruta más corta usando el clásico Dijkstra (sin heap, pero bueno, funciona bien para grafos pequeños)
  function dijkstra(N, adj, src) {
    const dist = Array(N + 1).fill(Infinity); // distancias mínimas
    const prev = Array(N + 1).fill(-1);       // para reconstruir la ruta después
    dist[src] = 0;
    const visited = Array(N + 1).fill(false);

    // Voy seleccionando el nodo más cercano no visitado (no es lo más rápido, pero aguanta)
    for (let it = 0; it < N; it++) {
      let u = -1, best = Infinity;
      for (let i = 1; i <= N; i++) {
        if (!visited[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u === -1) break; // Si ya no queda nada, salgo
      visited[u] = true;
      // Reviso a dónde puedo ir desde u y si mejora la distancia, lo actualizo
      for (const e of adj[u]) {
        if (dist[u] + e.cost < dist[e.to]) {
          dist[e.to] = dist[u] + e.cost;
          prev[e.to] = u;
        }
      }
    }
    return { dist, prev };
  }


  // 5) RECONSTRUIR LA RUTA ÓPTIMA
  // Cuando ya sé el camino, lo armo desde el destino hasta el origen (y después lo volteo)
  function buildPath(prev, dest) {
    const path = [];
    for (let u = dest; u !== -1; u = prev[u]) path.push(u);
    return path.reverse(); // Pa' que salga de origen a destino y no al revés
  }


  // 6) BOTÓN DE BUSCAR RUTA
  // Cuando el usuario le da al botón de buscar, aquí se dispara todo el proceso:
  runRouteBtn.addEventListener("click", () => {
    try {
      // Tomo los valores de la red, origen y destino.
      const text = networkArea.value;
      const src  = Number(originInput.value);
      const dst  = Number(destInput.value);
      // Valido que no falte nada, si no, paro de una.
      if (!text) throw new Error("Carga primero la red de transporte");
      if (!src || !dst) throw new Error("Origen y destino requeridos");

      // Parseo la red y corro Dijkstra
      const { N, adj } = parseGraph(text);
      const { dist, prev } = dijkstra(N, adj, src);
      // Si la distancia es infinita, no hay ruta
      if (dist[dst] === Infinity) {
        alert(`No existe ruta de ${src} a ${dst}`);
        return;
      }

      // Armo el texto con el recorrido óptimo y el costo total
      let out = `Ruta óptima de ${src} a ${dst} (Costo total: ${dist[dst]})\n\n`;
      const path = buildPath(prev, dst);
      path.slice(0, -1).forEach((u, i) => {
        const v = path[i + 1];
        const edge = adj[u].find((e) => e.to === v);
        out += `Estación ${u} → Estación ${v} (Costo: ${edge.cost})\n`;
      });

      // Pongo el resultado en el modal y lo muestro
      routeOutput.textContent = out;
      resultModal.classList.remove("hidden");

      // Preparo el archivo de descarga por si el usuario lo quiere bajar
      const blob = new Blob([out], { type: "text/plain" });
      downloadRoutesBtn.href = URL.createObjectURL(blob);
    } catch (err) {
      // Si algo explota, aviso por alert y me ahorro un dolor de cabeza después
      alert(err.message);
    }
  });


  // 7) CERRAR EL MODAL
  // Cuando le dan al botón de cerrar, solo escondo el modal y ya.
  closeModalBtn.addEventListener("click", () => {
    resultModal.classList.add("hidden");
  });
}
