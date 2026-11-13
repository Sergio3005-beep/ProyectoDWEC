// api.js
// Aquí está TODO lo que habla con las APIs. El resto de la app (app.js)
// no sabe nada de URLs ni de fetch: solo llama a estas funciones.

// API privada: el json-server que arrancamos con "npx json-server --watch db.json"
const API_PRIVADA = "http://localhost:3000";

// API pública: Open Library (libros y obras). No necesita clave.
const API_PUBLICA = "https://openlibrary.org";

// ------------------------------------------------------------------
// Función genérica: hace la petición y controla los errores.
// nombreApi solo sirve para escribir mensajes de error claros.
// ------------------------------------------------------------------
async function pedir(url, opciones, nombreApi) {
  let respuesta;

  try {
    respuesta = await fetch(url, opciones);
  } catch (error) {
    // fetch solo falla aquí cuando NO consigue conectar con el servidor
    if (nombreApi === "la API privada") {
      throw new Error(
        "No se pudo conectar con la API privada. ¿Está encendido el json-server? " +
          "(npx json-server --watch db.json)",
      );
    }
    throw new Error(
      "No se pudo conectar con " + nombreApi + ". Comprueba tu conexión a Internet.",
    );
  }

  // Si el servidor contesta, pero con un error (404, 500...)
  if (!respuesta.ok) {
    throw new Error(nombreApi + " respondió con el error " + respuesta.status + ".");
  }

  // Algunas respuestas pueden venir vacías, así que leemos como texto primero
  const texto = await respuesta.text();
  if (texto === "") {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch (error) {
    throw new Error(nombreApi + " devolvió datos que no se pueden leer.");
  }
}

// ------------------------------------------------------------------
// API PRIVADA (json-server): leer y ESCRIBIR
// ------------------------------------------------------------------
async function obtenerAutores() {
  const datos = await pedir(API_PRIVADA + "/autores", undefined, "la API privada");
  if (!Array.isArray(datos)) {
    throw new Error("La API privada devolvió datos inesperados.");
  }
  return datos;
}

async function obtenerFavoritos() {
  const datos = await pedir(API_PRIVADA + "/favoritos", undefined, "la API privada");
  if (!Array.isArray(datos)) {
    throw new Error("La API privada devolvió datos inesperados.");
  }
  return datos;
}

// POST: crea un favorito nuevo en db.json
async function guardarFavorito(obra) {
  const nuevo = {
    key: obra.key,
    titulo: obra.titulo,
    autores: obra.autores,
    anio: obra.anio,
  };
  return pedir(
    API_PRIVADA + "/favoritos",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    },
    "la API privada",
  );
}

// DELETE: borra un favorito de db.json
async function borrarFavorito(id) {
  return pedir(
    API_PRIVADA + "/favoritos/" + encodeURIComponent(id),
    { method: "DELETE" },
    "la API privada",
  );
}

// ------------------------------------------------------------------
// API PÚBLICA (Open Library): solo leer
// ------------------------------------------------------------------

// Busca obras por título y/o autor.
// Devuelve una lista "limpia", con los datos que nos faltan ya rellenados.
async function buscarObras(titulo, autor) {
  const parametros = new URLSearchParams();
  if (titulo !== "") {
    parametros.set("title", titulo);
  }
  if (autor !== "") {
    parametros.set("author", autor);
  }
  parametros.set("fields", "key,title,author_name,first_publish_year,cover_i");
  parametros.set("limit", "20");

  const datos = await pedir(
    API_PUBLICA + "/search.json?" + parametros.toString(),
    undefined,
    "Open Library",
  );

  if (datos === null || !Array.isArray(datos.docs)) {
    throw new Error("Open Library devolvió datos inesperados.");
  }

  // Nos quedamos solo con las obras que tienen "key" (sin ella no se puede pedir el detalle)
  return datos.docs.filter((d) => d.key).map(limpiarObra);
}

// Pide el detalle de UNA obra. "key" tiene esta forma: "/works/OL45804W"
async function obtenerDetalleObra(key) {
  if (typeof key !== "string" || !key.startsWith("/works/")) {
    throw new Error("La obra no tiene un identificador válido.");
  }

  const datos = await pedir(API_PUBLICA + key + ".json", undefined, "Open Library");
  if (datos === null || typeof datos !== "object") {
    throw new Error("Open Library devolvió datos inesperados.");
  }

  // La descripción puede venir como texto o como objeto { value: "..." }
  let descripcion = "";
  if (typeof datos.description === "string") {
    descripcion = datos.description;
  } else if (datos.description && typeof datos.description.value === "string") {
    descripcion = datos.description.value;
  }

  // Portada: la primera de la lista "covers" que sea un número válido
  let portada = null;
  if (Array.isArray(datos.covers)) {
    const idPortada = datos.covers.find((c) => typeof c === "number" && c > 0);
    if (idPortada) {
      portada = urlPortada(idPortada);
    }
  }

  return {
    titulo: datos.title || "Sin título",
    descripcion: descripcion,
    temas: Array.isArray(datos.subjects) ? datos.subjects.slice(0, 8) : [],
    portada: portada,
  };
}

// Foto de un autor: la pedimos a la API de Wikipedia por su nombre.
// Si algo falla (no hay foto, sin internet...) devolvemos null y la tarjeta
// se queda sin foto: no merece la pena enseñar un error por una imagen.
async function obtenerFotoAutor(nombre) {
  try {
    const datos = await pedir(
      "https://es.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(nombre),
      undefined,
      "Wikipedia",
    );
    if (datos && datos.thumbnail && typeof datos.thumbnail.source === "string") {
      return datos.thumbnail.source;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// ------------------------------------------------------------------
// Funciones auxiliares
// ------------------------------------------------------------------
function urlPortada(idPortada) {
  return "https://covers.openlibrary.org/b/id/" + idPortada + "-M.jpg";
}

// Convierte un resultado "en bruto" de la API en un objeto con TODOS los campos
// rellenos, aunque a la API le falten datos (así la app nunca se rompe).
function limpiarObra(doc) {
  return {
    key: doc.key,
    titulo: doc.title || "Sin título",
    autores: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : "Autor desconocido",
    anio: typeof doc.first_publish_year === "number" ? doc.first_publish_year : null,
    portada: doc.cover_i ? urlPortada(doc.cover_i) : null,
  };
}