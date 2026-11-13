// app.js
// Maneja la pantalla: formularios, pestañas y tarjetas.
// Para hablar con las APIs usa las funciones de api.js.

document.addEventListener("DOMContentLoaded", () => {
  // ------------------------------------------------------------------
  // Elementos de la página
  // ------------------------------------------------------------------
  const formAutores = document.getElementById("formAutores");
  const formObras = document.getElementById("formObras");
  const resultados = document.getElementById("resultados");
  const errorContainer = document.getElementById("errorContainer");
  const infoContainer = document.getElementById("infoContainer");
  const pestanas = document.querySelectorAll(".pestana");

  const dialogo = document.getElementById("detalle");
  const contenidoDetalle = document.getElementById("contenidoDetalle");
  const mensajeDetalle = document.getElementById("mensajeDetalle");

  // ------------------------------------------------------------------
  // Pestañas
  // ------------------------------------------------------------------
  pestanas.forEach((pestana) => {
    pestana.addEventListener("click", () => {
      mostrarPanel(pestana.dataset.panel);
    });
  });

  function mostrarPanel(nombre) {
    // Marcamos como activa solo la pestaña elegida
    pestanas.forEach((p) => {
      p.classList.toggle("activa", p.dataset.panel === nombre);
    });

    // Mostramos solo el formulario que toca
    formAutores.classList.toggle("hidden", nombre !== "autores");
    formObras.classList.toggle("hidden", nombre !== "obras");

    limpiarMensajes();
    limpiarResultados();

    if (nombre === "favoritos") {
      cargarFavoritos();
    }
  }

  // ------------------------------------------------------------------
  // BÚSQUEDA 1: AUTORES (API privada)
  // ------------------------------------------------------------------
  formAutores.addEventListener("submit", async (e) => {
    e.preventDefault();
    limpiarMensajes();
    limpiarResultados();

    const nombre = document.getElementById("nombreInput").value.trim().toLowerCase();
    const lugar = document.getElementById("lugarInput").value.trim().toLowerCase();
    const anoTexto = document.getElementById("anoInput").value.trim();

    // Control de errores del formulario
    let anoMinimo = null;
    if (anoTexto !== "") {
      anoMinimo = Number(anoTexto);
      if (!Number.isInteger(anoMinimo) || anoMinimo < 1800 || anoMinimo > 2000) {
        mostrarError("El año debe ser un número entero entre 1800 y 2000.");
        return;
      }
    }

    try {
      mostrarInfo("Buscando autores...");
      const autores = await obtenerAutores();

      // Filtramos por los 3 parámetros
      const encontrados = autores.filter((autor) => {
        const nombreAutor = (autor.nombre || "").toLowerCase();
        const lugarAutor = (autor.lugar_nacimiento || "").toLowerCase();

        const coincideNombre = nombreAutor.includes(nombre);
        const coincideLugar = lugarAutor.includes(lugar);
        const coincideAno = anoMinimo === null || autor.nacimiento >= anoMinimo;

        return coincideNombre && coincideLugar && coincideAno;
      });

      limpiarMensajes();

      if (encontrados.length === 0) {
        mostrarError("No se encontraron autores con esos criterios.");
        return;
      }
      pintarAutores(encontrados);
    } catch (error) {
      limpiarMensajes();
      mostrarError(error.message);
    }
  });

  // Pinta una tarjeta por autor
  function pintarAutores(autores) {
    autores.forEach((autor) => {
      const tarjeta = crear("div", "tarjeta");

      // Foto del autor: se rellena cuando Wikipedia contesta
      const foto = document.createElement("img");
      foto.className = "foto-autor hidden";
      foto.alt = "Foto de " + (autor.nombre || "autor");
      tarjeta.appendChild(foto);
      if (autor.nombre) {
        obtenerFotoAutor(autor.nombre).then((url) => {
          if (url) {
            foto.src = url;
            foto.classList.remove("hidden");
          }
        });
      }

      tarjeta.appendChild(crear("h3", "", autor.nombre || "Autor sin nombre"));
      tarjeta.appendChild(
        crear("p", "", "Nació en " + (autor.lugar_nacimiento || "lugar desconocido")),
      );
      tarjeta.appendChild(
        crear("p", "", (autor.nacimiento || "?") + " - " + (autor.fallecimiento || "?")),
      );

      // NIVEL 2: cada obra destacada es un botón que lanza OTRA búsqueda (en la API pública)
      const bloque = crear("div", "nivel-anidado");
      bloque.appendChild(crear("h4", "", "Obras destacadas"));

      // Si al autor le faltan las obras, usamos una lista vacía para no romper nada
      const obras = Array.isArray(autor.obras_destacadas) ? autor.obras_destacadas : [];

      if (obras.length === 0) {
        bloque.appendChild(crear("p", "", "Sin obras registradas."));
      }

      obras.forEach((obra) => {
        const boton = crear("button", "etiqueta", obra);
        boton.type = "button";
        boton.title = "Buscar esta obra en Open Library";
        boton.addEventListener("click", () => {
          lanzarBusquedaObras(obra, autor.nombre || "", "");
        });
        bloque.appendChild(boton);
      });

      tarjeta.appendChild(bloque);

      // Botón para buscar TODAS las obras del autor
      const botonTodas = crear("button", "boton-principal", "Ver todas sus obras");
      botonTodas.type = "button";
      botonTodas.addEventListener("click", () => {
        lanzarBusquedaObras("", autor.nombre || "", "");
      });
      tarjeta.appendChild(botonTodas);

      resultados.appendChild(tarjeta);
    });
  }

  // ------------------------------------------------------------------
  // BÚSQUEDA 2: OBRAS (API pública)
  // ------------------------------------------------------------------
  formObras.addEventListener("submit", (e) => {
    e.preventDefault();

    const titulo = document.getElementById("tituloInput").value.trim();
    const autor = document.getElementById("autorInput").value.trim();
    const anoTexto = document.getElementById("anoObraInput").value.trim();

    limpiarMensajes();

    // Control de errores del formulario
    if (titulo === "" && autor === "") {
      mostrarError("Escribe al menos un título o un autor para buscar.");
      return;
    }

    if (anoTexto !== "") {
      const ano = Number(anoTexto);
      if (!Number.isInteger(ano) || ano < 1000 || ano > 2100) {
        mostrarError("El año debe ser un número entero entre 1000 y 2100.");
        return;
      }
    }

    ejecutarBusquedaObras(titulo, autor, anoTexto);
  });

  // Se usa cuando pulsas un botón desde la tarjeta de un autor:
  // cambia a la pestaña Obras, rellena el formulario y busca.
  function lanzarBusquedaObras(titulo, autor, anoTexto) {
    mostrarPanel("obras");
    document.getElementById("tituloInput").value = titulo;
    document.getElementById("autorInput").value = autor;
    document.getElementById("anoObraInput").value = anoTexto;
    ejecutarBusquedaObras(titulo, autor, anoTexto);
  }

  async function ejecutarBusquedaObras(titulo, autor, anoTexto) {
    limpiarMensajes();
    limpiarResultados();

    try {
      mostrarInfo("Buscando obras en Open Library...");
      let obras = await buscarObras(titulo, autor);

      // Filtro por año (si el usuario lo ha puesto). Las obras sin año se descartan.
      if (anoTexto !== "") {
        const ano = Number(anoTexto);
        obras = obras.filter((o) => o.anio !== null && o.anio >= ano);
      }

      limpiarMensajes();

      if (obras.length === 0) {
        mostrarError("No se encontraron obras con esos criterios.");
        return;
      }
      pintarObras(obras);
    } catch (error) {
      limpiarMensajes();
      mostrarError(error.message);
    }
  }

  // Pinta una tarjeta por obra
  function pintarObras(obras) {
    obras.forEach((obra) => {
      const tarjeta = crear("div", "tarjeta tarjeta-obra");

      if (obra.portada) {
        const imagen = document.createElement("img");
        imagen.src = obra.portada;
        imagen.alt = "Portada de " + obra.titulo;
        tarjeta.appendChild(imagen);
      }

      tarjeta.appendChild(crear("h3", "", obra.titulo));
      tarjeta.appendChild(crear("p", "", obra.autores));
      tarjeta.appendChild(
        crear("p", "", obra.anio ? "Primera publicación: " + obra.anio : "Año desconocido"),
      );

      // NIVEL 3: pedir el detalle de la obra
      const botonDetalle = crear("button", "boton-principal", "Ver detalle");
      botonDetalle.type = "button";
      botonDetalle.addEventListener("click", () => abrirDetalle(obra));
      tarjeta.appendChild(botonDetalle);

      // Guardar en la API privada (escritura)
      const botonFav = crear("button", "boton-secundario", "☆ Guardar en favoritos");
      botonFav.type = "button";
      botonFav.addEventListener("click", async () => {
        limpiarMensajes();
        try {
          mostrarInfo(await guardarEnFavoritos(obra));
        } catch (error) {
          limpiarMensajes();
          mostrarError(error.message);
        }
      });
      tarjeta.appendChild(botonFav);

      resultados.appendChild(tarjeta);
    });
  }

  // ------------------------------------------------------------------
  // DETALLE DE UNA OBRA (nivel 3)
  // ------------------------------------------------------------------
  async function abrirDetalle(obra) {
    limpiarMensajes();

    try {
      mostrarInfo("Cargando detalle...");
      const detalle = await obtenerDetalleObra(obra.key);
      limpiarMensajes();

      contenidoDetalle.innerHTML = "";
      mensajeDetalle.textContent = "";

      if (detalle.portada) {
        const imagen = document.createElement("img");
        imagen.src = detalle.portada;
        imagen.alt = "Portada de " + detalle.titulo;
        contenidoDetalle.appendChild(imagen);
      }

      contenidoDetalle.appendChild(crear("h2", "", detalle.titulo));
      contenidoDetalle.appendChild(crear("p", "", obra.autores));
      contenidoDetalle.appendChild(
        crear("p", "", detalle.descripcion || "Esta obra no tiene descripción disponible."),
      );

      if (detalle.temas.length > 0) {
        contenidoDetalle.appendChild(crear("h4", "", "Temas"));
        const lista = crear("ul", "");
        detalle.temas.forEach((tema) => lista.appendChild(crear("li", "", tema)));
        contenidoDetalle.appendChild(lista);
      }

      const botonFav = crear("button", "boton-secundario", "☆ Guardar en favoritos");
      botonFav.type = "button";
      botonFav.addEventListener("click", async () => {
        try {
          mensajeDetalle.textContent = await guardarEnFavoritos(obra);
        } catch (error) {
          mensajeDetalle.textContent = error.message;
        }
      });
      contenidoDetalle.appendChild(botonFav);

      dialogo.showModal();
    } catch (error) {
      limpiarMensajes();
      mostrarError(error.message);
    }
  }

  document.getElementById("cerrarDetalle").addEventListener("click", () => {
    dialogo.close();
  });

  // ------------------------------------------------------------------
  // FAVORITOS (API privada: leer, escribir y borrar)
  // ------------------------------------------------------------------

  // Devuelve el mensaje que hay que enseñar al usuario
  async function guardarEnFavoritos(obra) {
    const favoritos = await obtenerFavoritos();

    // Evitamos guardar la misma obra dos veces
    const yaEsta = favoritos.some((f) => f.key === obra.key);
    if (yaEsta) {
      return "Esa obra ya estaba en tus favoritos.";
    }

    await guardarFavorito(obra);
    return "Obra guardada en favoritos.";
  }

  async function cargarFavoritos() {
    limpiarResultados();

    try {
      mostrarInfo("Cargando tus favoritos...");
      const favoritos = await obtenerFavoritos();
      limpiarMensajes();

      if (favoritos.length === 0) {
        mostrarInfo("Todavía no has guardado ninguna obra en favoritos.");
        return;
      }
      pintarFavoritos(favoritos);
    } catch (error) {
      limpiarMensajes();
      mostrarError(error.message);
    }
  }

  function pintarFavoritos(favoritos) {
    favoritos.forEach((fav) => {
      const tarjeta = crear("div", "tarjeta tarjeta-obra");
      tarjeta.appendChild(crear("h3", "", fav.titulo || "Sin título"));
      tarjeta.appendChild(crear("p", "", fav.autores || "Autor desconocido"));
      tarjeta.appendChild(
        crear("p", "", fav.anio ? "Primera publicación: " + fav.anio : "Año desconocido"),
      );

      const botonDetalle = crear("button", "boton-principal", "Ver detalle");
      botonDetalle.type = "button";
      botonDetalle.addEventListener("click", () => abrirDetalle(fav));
      tarjeta.appendChild(botonDetalle);

      const botonQuitar = crear("button", "boton-secundario", "Quitar de favoritos");
      botonQuitar.type = "button";
      botonQuitar.addEventListener("click", async () => {
        try {
          await borrarFavorito(fav.id);
          cargarFavoritos(); // volvemos a pintar la lista ya sin ese favorito
        } catch (error) {
          limpiarMensajes();
          mostrarError(error.message);
        }
      });
      tarjeta.appendChild(botonQuitar);

      resultados.appendChild(tarjeta);
    });
  }

  // ------------------------------------------------------------------
  // Funciones auxiliares
  // ------------------------------------------------------------------

  // Crea un elemento con clase y texto. Usamos textContent (no innerHTML)
  // para que ningún dato de la API pueda meter HTML en nuestra página.
  function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase !== "") {
      elemento.className = clase;
    }
    if (texto !== undefined) {
      elemento.textContent = texto;
    }
    return elemento;
  }

  function mostrarError(mensaje) {
    errorContainer.textContent = mensaje;
    errorContainer.classList.remove("hidden");
  }

  function mostrarInfo(mensaje) {
    infoContainer.textContent = mensaje;
    infoContainer.classList.remove("hidden");
  }

  function limpiarMensajes() {
    errorContainer.textContent = "";
    errorContainer.classList.add("hidden");
    infoContainer.textContent = "";
    infoContainer.classList.add("hidden");
  }

  function limpiarResultados() {
    resultados.innerHTML = "";
  }

  // Al abrir la página, mostramos todos los autores
  formAutores.requestSubmit();
});