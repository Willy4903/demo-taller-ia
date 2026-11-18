/* Cartelera peruana. Las fechas corresponden a funciones informadas por las cadenas. */
(function () {
  "use strict";

  var diaFormato = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", day: "numeric", month: "short"
  });
  var diaISO = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Lima" });
  var corteFormato = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima", dateStyle: "long", timeStyle: "short"
  });
  var fuente = "https://github.com/jhannfrank/cartelera-cine";

  function elemento(tipo, texto, clase) {
    var nodo = document.createElement(tipo);
    if (texto) nodo.textContent = texto;
    if (clase) nodo.className = clase;
    return nodo;
  }

  function enlace(texto, url) {
    var a = elemento("a", texto);
    if (/^https:\/\//i.test(url || "")) a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  function hoyLima() {
    return diaISO.format(new Date());
  }

  function fechas(pelicula, ciudad) {
    return Array.from(new Set(pelicula.cines.flatMap(function (cine) {
      return Object.keys(cine.dias).filter(function (dia) {
        return !ciudad || cine.dias[dia].includes(ciudad);
      });
    }))).sort();
  }

  function ficha(pelicula, dias, ciudad, hoy) {
    var card = elemento("article", "", "cine-card");
    if (pelicula.poster) {
      var imagen = elemento("img", "", "cine-poster");
      imagen.alt = "";
      imagen.loading = "lazy";
      imagen.decoding = "async";
      imagen.referrerPolicy = "no-referrer";
      if (/^https:\/\//i.test(pelicula.poster)) imagen.src = pelicula.poster;
      imagen.addEventListener("error", function () { imagen.remove(); });
      card.append(imagen);
    }
    var contenido = elemento("div", "", "cine-card-body");
    var metadatos = [pelicula.origen === "Perú" ? "Cine peruano" : pelicula.origen].concat(pelicula.generos).filter(Boolean);
    if (metadatos.length) contenido.append(elemento("p", metadatos.join(" · "), "cine-meta"));
    contenido.append(elemento("h2", pelicula.titulo));
    var estreno = pelicula.estreno;
    if (estreno) {
      contenido.append(elemento("p", "Estreno en Perú: " + diaFormato.format(new Date(estreno + "T12:00:00-05:00")), "cine-meta"));
    }
    contenido.append(elemento("p", "Funciones " +
      (dias.includes(hoy) ? "para hoy" : "desde " + diaFormato.format(new Date(dias[0] + "T12:00:00-05:00"))), "cine-meta"));
    if (pelicula.nueva_desde) contenido.append(elemento("p", "Novedad en la cartelera", "cine-meta"));
    if (pelicula.recomendada) contenido.append(elemento("p", pelicula.recomendada, "cine-recomendacion"));
    contenido.append(elemento("p", pelicula.sinopsis || "Sinopsis pendiente de confirmación."));
    if (pelicula.fuente_sinopsis) contenido.append(elemento("p", "Sinopsis: " + pelicula.fuente_sinopsis, "cine-meta"));
    contenido.append(elemento("p", pelicula.reparto.length ? "Reparto: " + pelicula.reparto.join(", ") : "Reparto pendiente de confirmación.", "cine-reparto"));
    var cines = elemento("ul", "", "cine-links");
    pelicula.cines.forEach(function (cine) {
      if (!dias.some(function (dia) { return cine.dias[dia] && (!ciudad || cine.dias[dia].includes(ciudad)); })) return;
      var item = elemento("li");
      item.append(enlace(cine.cadena, cine.url));
      cines.append(item);
    });
    contenido.append(cines);
    if (pelicula.ficha_tmdb) contenido.append(enlace("Ficha en TMDB", pelicula.ficha_tmdb));
    card.append(contenido);
    return card;
  }

  function norm(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function opciones(select, valores) {
    Array.from(new Set(valores)).sort(function (a, b) { return a.localeCompare(b, "es"); })
      .forEach(function (valor) { select.add(new Option(valor, valor)); });
  }

  function pintar(vista, datos) {
    var busca = vista.querySelector("#cine-buscar");
    var origen = vista.querySelector("#cine-origen");
    var genero = vista.querySelector("#cine-genero");
    var ciudad = vista.querySelector("#cine-ciudad");
    var fecha = vista.querySelector("#cine-fecha");
    var lista = vista.querySelector("#cine-lista");
    var estado = vista.querySelector("#cine-estado");
    var vigentes = vista.querySelector("#cine-corte");
    var corte = new Date(datos.corte);
    var semana = diaISO.format(new Date(Date.now() - 6 * 86400e3));
    var hoy = hoyLima();
    var antiguedad = Date.now() - +corte;
    var activos = datos.peliculas.filter(function (pelicula) {
      return fechas(pelicula, "").some(function (dia) { return dia >= hoy; });
    });
    vigentes.textContent = "Cartelera del " + corteFormato.format(corte) + " (hora de Lima). Confirma los horarios con el cine.";
    if (antiguedad > 48 * 3600e3) vigentes.textContent += " La fuente no se ha actualizado en más de dos días.";
    opciones(genero, activos.flatMap(function (p) { return p.generos; }));
    opciones(ciudad, activos.flatMap(function (p) {
      return p.cines.flatMap(function (c) {
        return Object.keys(c.dias).filter(function (dia) { return dia >= hoy; }).flatMap(function (dia) { return c.dias[dia]; });
      });
    }));

    function filtrar() {
      var termino = norm(busca.value.trim());
      var peliculas = activos.map(function (p) {
        return { p: p, dias: fechas(p, ciudad.value).filter(function (dia) { return dia >= hoy; }) };
      }).filter(function (item) {
        var p = item.p;
        return item.dias.length &&
          (!termino || norm([p.titulo].concat(p.reparto).join(" ")).includes(termino)) &&
          (!origen.value || p.origen === origen.value) &&
          (!genero.value || p.generos.includes(genero.value)) &&
          (fecha.value !== "hoy" || item.dias.includes(hoy)) &&
          (fecha.value !== "estrenos" || p.estreno >= semana || p.nueva_desde >= semana) &&
          (fecha.value !== "recomendadas" || p.recomendada);
      });
      peliculas.sort(function (a, b) {
        return Number(!!b.p.recomendada) - Number(!!a.p.recomendada) ||
          a.dias[0].localeCompare(b.dias[0]) || a.p.titulo.localeCompare(b.p.titulo, "es");
      });
      estado.textContent = peliculas.length ? peliculas.length + (peliculas.length === 1 ? " película" : " películas") :
        (activos.length ? "No hay películas que coincidan con estos filtros." : "La cartelera guardada no tiene funciones vigentes.");
      lista.replaceChildren.apply(lista, peliculas.map(function (item) {
        return ficha(item.p, item.dias, ciudad.value, hoy);
      }));
    }

    if (datos.peliculas.some(function (p) { return p.ficha_tmdb; })) {
      vista.append(elemento("p", "Este producto usa la API de TMDB y no está respaldado ni certificado por TMDB.", "cine-corte"));
    }
    busca.addEventListener("input", filtrar);
    [origen, genero, ciudad, fecha].forEach(function (campo) { campo.addEventListener("change", filtrar); });
    vista.querySelector("#cine-filtros").hidden = false;
    filtrar();
  }

  window.PERU_CINES = {
    vista: '<section class="cine-page" aria-labelledby="cine-titulo"><header class="cine-portada">' +
      '<div><a href="#/noticias">← Noticias</a><h1 id="cine-titulo">Cines</h1><p>Cartelera, estrenos y recomendaciones en Perú</p></div>' +
      '<img class="cine-logo" src="assets/logo-cines.webp" alt="" width="540" height="360" decoding="async"></header>' +
      '<p id="cine-corte" class="cine-corte"></p><div class="cine-filtros" id="cine-filtros" hidden>' +
      '<label>Buscar película o actor<input type="search" id="cine-buscar"></label>' +
      '<label>Cartelera<select id="cine-fecha"><option value="">Todas las funciones</option><option value="hoy">Hoy</option><option value="estrenos">Estrenos y novedades</option><option value="recomendadas">Recomendadas</option></select></label>' +
      '<label>Origen<select id="cine-origen"><option value="">Todos</option><option>Perú</option><option>Internacional</option></select></label>' +
      '<label>Género<select id="cine-genero"><option value="">Todos</option></select></label>' +
      '<label>Ciudad<select id="cine-ciudad"><option value="">Todas</option></select></label></div>' +
      '<p class="cine-estado" id="cine-estado" role="status">Cargando cartelera…</p><div id="cine-lista" class="cine-grid"></div>' +
      '<p class="cine-corte">Datos de <a href="' + fuente + '" target="_blank" rel="noopener noreferrer">CineScope Perú</a> y enlaces de las cadenas. Las novedades son títulos añadidos a la cartelera. Las recomendaciones son de Contexto Perú.</p></section>',
    iniciar: function (vista) {
      fetch("data/cines.json", { cache: "no-cache" }).then(function (res) {
        if (!res.ok) throw new Error("Cartelera no disponible");
        return res.json();
      }).then(function (datos) {
        if (vista.isConnected) pintar(vista, datos);
      }).catch(function () {
        vista.querySelector("#cine-estado").textContent = "No se pudo cargar la cartelera. Vuelve a abrir Cines para intentarlo de nuevo.";
      });
    }
  };
})();
