document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("searchForm");
    const resultadosContainer = document.getElementById("resultadosContainer");
    const errorContainer = document.getElementById("errorContainer");

    // URL de tu API (puede ser tu json-server local o el archivo JSON mockeado)
    const API_URL = "http://localhost:3000/autores"; // o la ruta de tu json

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        limpiarMensajes();

        // Recogemos los valores de los 3 parámetros de búsqueda
        const nombreBuscado = document.getElementById("nombreInput").value.trim();
        const epocaBuscada = document.getElementById("epocaInput").value.trim();
        const anoMinimo = document.getElementById("anoInput").value.trim();

        try {
            // Control de errores de petición HTTP
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Error en el servidor: ${response.status} ${response.statusText}`);
            }

            const autores = await response.json();

            // Nivel 1: Filtrar por los 3 parámetros
            const resultadosFiltrados = autores.filter(autor => {
                const coincideNombre = autor.nombre.toLowerCase().includes(nombreBuscado.toLowerCase());
                const coincideEpoca = autor.epoca.toLowerCase().includes(epocaBuscada.toLowerCase());
                const coincideAno = anoMinimo === "" || autor.nacimiento >= parseInt(anoMinimo);
                
                return coincideNombre && coincideEpoca && coincideAno;
            });

            if (resultadosFiltrados.length === 0) {
                mostrarError("No se encontraron autores con los criterios indicados.");
                return;
            }

            // Renderizar resultados en pantalla (Nivel 1 y Nivel 2 de anidamiento)
            renderizarAutores(resultadosFiltrados);

        } catch (error) {
            // Control de errores si falla el fetch o la conexión
            mostrarError(`Fallo al conectar con la API: ${error.message}`);
        }
    });

    function renderizarAutores(autores) {
        resultadosContainer.innerHTML = "";

        autores.forEach(autor => {
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-autor");

            // Nivel 1: Datos del autor
            let htmlObras = `
                <h3>${autor.nombre}</h3>
                <p><strong>Época:</strong> ${autor.epoca}</p>
                <p><strong>Años:</strong> ${autor.nacimiento} - ${autor.fallecimiento}</p>
                <div class="nivel-anidado">
                    <h4>Obras destacadas (Nivel 2):</h4>
                    <ul>
            `;

            // Nivel 2 de anidamiento: Listar las obras destacadas de cada autor
            autor.obras_destacadas.forEach(obra => {
                htmlObras += `<li>${obra}</li>`;
            });

            htmlObras += `</ul></div>`;
            tarjeta.innerHTML = htmlObras;
            resultadosContainer.appendChild(tarjeta);
        });
    }

    function mostrarError(mensaje) {
        errorContainer.textContent = mensaje;
        errorContainer.classList.remove("hidden");
    }

    function limpiarMensajes() {
        errorContainer.textContent = "";
        errorContainer.classList.add("hidden");
        resultadosContainer.innerHTML = "";
    }
});