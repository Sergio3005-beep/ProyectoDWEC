1. Antes de empezar: traer lo que han subido los demás

Con la carpeta ProyectoDWEC abierta en VSCode, abre la terminal y ejecuta:

bash
git pull

Si prefieres botones: en el panel de Control de código fuente, pulsa el botón de sincronizar (la flecha circular).

Si dice Already up to date., no había nada nuevo.

2. Trabajar y cambiar cosas

Edita los ficheros como siempre. Guarda con Ctrl+S.

Si usas la API privada, recuerda arrancar el servidor en una terminal aparte y dejarla abierta:

bash
npx json-server --watch db.json
3. Cuando termines: subir tus cambios

Con comandos:

bash
git add -A
git commit -m "Descripción de lo que has hecho"
git push

Con botones:

Panel de Control de código fuente.
Pulsa el + junto a “Cambios” para preparar los ficheros.
Escribe un mensaje y pulsa Confirmación.
Pulsa Sincronizar cambios.
Resumen rápido
Cuándo	Qué haces
Empiezas a trabajar	git pull
Terminas algo	git add -A, git commit -m "...", git push
Reglas para no tener problemas
Haz git pull siempre antes de empezar. Es lo que evita la mayoría de errores.
Haz commits pequeños y con un mensaje claro, por ejemplo “Añado buscador por nombre”. Así se entiende qué cambió cada uno.
Si tú y un compañero tocáis el mismo fichero, puede salir un conflicto. Para evitarlo, repartíos qué ficheros toca cada uno.
Si el push te dice rejected, es que alguien subió algo antes. Haz git pull y vuelve a hacer git push.