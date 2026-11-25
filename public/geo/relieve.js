/* Content for the 1º ESO Geografía revision "Relieve y aguas" (slides 4-5, 7-8, 10-11, 13-16, 19, 22-26, 28-32, 34-37, 41).
   Marked ✎ = added from standard textbook knowledge because the slide only asks the question; check against the book. */
const ADD = '<span class="add" title="Añadido: no está en las diapositivas">✎</span>';
const fig = (img, cap) => `<figure><img src="/geo/${img}" alt="" loading="lazy"><figcaption>${cap}</figcaption></figure>`;

const TERMS = [
  // [term, definition, group]
  ['montaña', 'elevación natural del terreno', 'tierra'],
  ['sierra', 'conjunto de montañas', 'tierra'],
  ['cordillera', 'conjunto de varias sierras', 'tierra'],
  ['meseta', 'extensa zona llana y elevada', 'tierra'],
  ['páramo', 'llanura situada a una altitud considerable', 'tierra'],
  ['valle', 'depresión del relieve entre dos montañas, que puede tener varias formas: cañón, cuenca…', 'tierra'],
  ['cañón', 'valle de paso estrecho y profundo entre dos montañas', 'tierra'],
  ['cuenca', 'valle rodeado de zonas altas, más ancho que un cañón', 'tierra'],
  ['llanura', 'zona al pie de las montañas con superficie plana o escasamente ondulada', 'tierra'],
  ['depresión', 'zona más o menos extensa a una altitud inferior a las formaciones de relieve que la rodean', 'tierra'],
  ['playa', 'franja de arena o de piedras pequeñas junto al mar', 'costa'],
  ['acantilado', 'costa alta y casi vertical, cortada por la acción del mar', 'costa'],
  ['península', 'tierra rodeada de agua por todas partes menos por una', 'costa'],
  ['istmo', 'franja estrecha de tierra que une una península con el continente', 'costa'],
  ['isla', 'porción de tierra rodeada de agua por todas partes', 'costa'],
  ['archipiélago', 'conjunto de islas próximas entre sí', 'costa'],
  ['cabo', 'punta de tierra que se adentra en el mar', 'costa'],
  ['golfo', 'gran entrada del mar en la costa', 'costa'],
  ['bahía', 'entrada del mar en la costa, más pequeña que un golfo', 'costa'],
  ['cala', 'bahía pequeña y de poca profundidad', 'costa'],
  ['plataforma continental', 'continuación submarina de los continentes, que llega hasta unos 400 m de profundidad', 'mar'],
  ['talud continental', 'escalón que, de forma abrupta, da paso a las zonas más profundas de los océanos', 'mar'],
  ['llanura abisal', 'gran planicie en la zona más profunda de los mares y océanos', 'mar'],
  ['dorsal oceánica', 'cadena de montañas submarinas que surcan la llanura abisal; pueden alcanzar alturas de entre 2000 y 3000 m', 'mar'],
  ['fosa marina', 'gran depresión de los fondos oceánicos', 'mar'],
];
const GLOSS = TERMS.map((t) => [t[0], t[1]]).concat([
  ['erosión', 'desgaste, fragmentación o disolución de las rocas'],
  ['transporte', 'arrastre de los materiales erosionados'],
  ['sedimentación', 'depósito de los materiales que arrastra el agua, el viento o el hielo'],
  ['pliegue', 'deformación de las rocas blandas, que se doblan sin romperse'],
  ['falla', 'rotura de las rocas duras, con desplazamiento de un bloque'],
  ['cráter', 'abertura en la parte superior del volcán por donde sale el magma'],
  ['chimenea volcánica', 'conducto por donde sube el magma desde el interior de la Tierra'],
  ['magma', 'roca fundida que está bajo la superficie terrestre'],
  ['lava', 'magma que sale por el volcán y corre por la superficie'],
  ['piroclastos', 'fragmentos sólidos de roca que lanza el volcán'],
  ['cenizas', 'partículas muy pequeñas de roca que el volcán lanza al aire'],
  ['paisaje kárstico', 'relieve formado cuando el agua disuelve rocas como la caliza (cuevas, estalactitas)'],
  ['afluente', 'río que desemboca en otro río más grande'],
  ['nacimiento', 'lugar donde empieza un río'],
  ['divisoria de aguas', 'línea que separa las aguas que van a cuencas distintas'],
  ['llanura aluvial', 'terreno llano junto al río, formado por los sedimentos que este deposita'],
  ['meandro', 'curva muy cerrada que hace un río en su curso medio'],
  ['vega', 'terreno llano y fértil que hay junto al río en el curso bajo'],
  ['delta', 'desembocadura de un río en la que los sedimentos forman un terreno en forma de abanico con varios brazos'],
  ['estuario', 'desembocadura ancha, en forma de embudo, donde el río se mezcla con el mar'],
  ['densidad de población', 'número de habitantes que hay por cada kilómetro cuadrado (hab/km²)'],
]);

const NUM = { 'montaña': '1', 'llanura': '3', 'valle': '5', 'playa': '6', 'plataforma continental': '11', 'talud continental': '12', 'llanura abisal': '13', 'dorsal oceánica': '14', 'fosa marina': '15', 'meseta': '4?', 'cabo': '8?', 'península': '9', 'archipiélago': '10?' };
const dt = (t) => `<dt>${t[0]}${NUM[t[0]] ? ` <span class="nn">nº ${NUM[t[0]]}</span>` : ''}</dt><dd>${t[1]}</dd>`;
/* ---------- reading pages ---------- */
const READ = [
  { id: 'esquema', title: 'El mapa del tema', pg: '13', body: `
    <p>El relieve de la Tierra cambia por dos tipos de fuerzas: los <b>agentes internos</b>, que vienen de dentro de la Tierra, y los <b>agentes externos</b>, que actúan sobre la superficie.</p>
    <table class="t"><tr><th>Agentes internos</th><th>Agentes externos</th></tr>
    <tr><td><ul><li>Volcanes</li><li>Terremotos</li><li>Tsunami</li></ul><p class="note">Tectónica de placas, pliegues y fallas explican por qué ocurren.</p></td>
    <td><ul><li><b>Proceso:</b> erosión → transporte → sedimentación</li><li>Temperatura</li><li>Viento</li><li>Agua</li><li>Seres vivos</li></ul></td></tr></table>
    <p class="note">Diapositiva 13: «Realizar esquema». Estos son los apartados que pide. Hazlo tú en papel con ejemplos de cada uno; después practica en «Completa el esquema».</p>` },

  { id: 'relieve', title: 'Las formas del relieve', pg: '4-5', body: `
    <p>Tienes que saber qué es cada forma del relieve (ejercicio de la página 35 del libro).</p>
    ${fig('relieve.jpg', 'Diapositiva 4. Los números del dibujo son los del ejercicio de la página 35 del libro.')}
    <table class="t"><tr><th style="white-space:nowrap">Nº</th><th>Qué es</th></tr><tr><td><b>1</b></td><td>montaña</td></tr><tr><td><b>2</b></td><td>sin identificar</td></tr><tr><td><b>3</b></td><td>llanura</td></tr><tr><td><b>4</b></td><td>meseta (probable)</td></tr><tr><td><b>5</b></td><td>valle</td></tr><tr><td><b>6</b></td><td>playa</td></tr><tr><td><b>7</b></td><td>sin identificar (¿bahía, golfo o cala?)</td></tr><tr><td><b>8</b></td><td>cabo (probable)</td></tr><tr><td><b>9</b></td><td>península</td></tr><tr><td><b>10</b></td><td>archipiélago (probable)</td></tr><tr><td><b>11</b></td><td>plataforma continental</td></tr><tr><td><b>12</b></td><td>talud continental</td></tr><tr><td><b>13</b></td><td>llanura abisal</td></tr><tr><td><b>14</b></td><td>dorsal oceánica</td></tr><tr><td><b>15</b></td><td>fosa marina</td></tr></table>
    <p class="note">Esta clave la he deducido yo comparando el dibujo con el del libro (pp. 16-17), que trae los nombres pero no los números. Los números sin «probable» los veo claros (el 9 está confirmado). Los «probable» son por la posición en el dibujo. El 2 y el 7 no los he podido identificar. Compruébalo con tu libro o tu cuaderno.</p>
    <p class="note">Las definiciones son las de tu libro (Tema 1, apartado 4, páginas 16-17); las diapositivas solo dan la lista de términos.</p>
    <h3>En tierra</h3><dl>${TERMS.filter((t) => t[2] === 'tierra').map(dt).join('')}</dl>
    <h3>En la costa</h3><dl>${TERMS.filter((t) => t[2] === 'costa').map(dt).join('')}</dl>
    <h3>Bajo el mar</h3><dl>${TERMS.filter((t) => t[2] === 'mar').map(dt).join('')}</dl>` },

  { id: 'placas', title: 'Placas tectónicas, pliegues y fallas', pg: '7-8, 10-11', body: `
    <h3>Tectónica de placas (7-8)</h3>
    <p>La parte rígida de la Tierra está rota en trozos llamados <b>placas tectónicas</b> que se mueven despacio. ${ADD}</p>
    ${fig('placas.jpg', 'Diapositiva 7. Las flechas rojas indican hacia dónde se mueve cada placa. <b>No hace falta saber los nombres de las placas</b>: solo que la corteza está rota en placas que se mueven.')}
    <h3>Tres tipos de límite entre placas (10)</h3>
    <p class="note">No hace falta saber los dibujos complicados de las placas moviéndose unas bajo otras (diapositivas 8 y 10): solo qué hacen las placas en cada tipo de límite.</p>
    <table class="t"><tr><th>Límite</th><th>Qué pasa</th><th>Qué se forma</th></tr>
    <tr><td><b>Convergente</b></td><td>las placas se <b>acercan</b> y chocan</td><td>cordilleras (por ejemplo, el Himalaya), fosas y volcanes</td></tr>
    <tr><td><b>Divergente</b></td><td>las placas se <b>separan</b> y sube magma</td><td>dorsales oceánicas y valles de rift</td></tr>
    <tr><td><b>Transformante</b></td><td>las placas se <b>deslizan</b> una junto a otra, en sentidos contrarios</td><td>fallas transformantes y terremotos</td></tr></table>
    <h3>Deformaciones (11)</h3>
    <p><b>Si los materiales son blandos ⇒ pliegue.</b> <b>Si los materiales son duros ⇒ falla.</b></p>
    <div class="two">${fig('pliegue.jpg', 'Pliegue: las capas de roca se doblan. Se ve el plano de pliegue.')}${fig('falla.jpg', 'Falla: la roca se rompe. Hay un labio levantado y otro hundido.')}</div>` },

  { id: 'volcanes', title: 'Volcanes y tsunamis', pg: '14-16, 19', body: `
    <h3>Los volcanes (14)</h3>
    <p class="note">La diapositiva 14 solo pone las preguntas. Estas son las respuestas habituales ${ADD}: compruébalas con el libro.</p>
    <ul><li><b>¿Qué son?</b> Aberturas de la corteza terrestre por las que sale magma desde el interior de la Tierra. ${ADD}</li>
    <li><b>¿Dónde se localizan?</b> La mayoría están en los bordes de las placas tectónicas, sobre todo alrededor del océano Pacífico (el «Cinturón de Fuego»). ${ADD}</li>
    <li><b>Materiales que expulsan:</b> lava, cenizas y piroclastos (y gases).</li>
    <li><b>Consecuencias:</b> destrucción de poblados y cultivos, nubes de ceniza y víctimas. También crean suelos fértiles e islas volcánicas. ${ADD}</li></ul>
    <h3>Partes de un volcán (15)</h3>
    ${fig('volcan.jpg', 'Diapositiva 15. <b>Magma</b> (bajo tierra) → <b>chimenea volcánica</b> → <b>cráter</b>. Fuera salen <b>lava</b>, <b>cenizas</b> y <b>piroclastos</b>. El <b>cono volcánico</b> es la montaña que forman los materiales acumulados.')}
    <h3>Tipos de volcanes (16)</h3>
    <table class="t"><tr><th>Tipo</th><th>Cómo es</th></tr>
    <tr><td><b>Activo</b></td><td>ha entrado en erupción en los últimos 10 000 años</td></tr>
    <tr><td><b>En erupción</b></td><td>volcán activo que está teniendo una erupción ahora</td></tr>
    <tr><td><b>Inactivo / dormido</b></td><td>tiene una probabilidad baja de entrar en erupción</td></tr>
    <tr><td><b>Extinto</b></td><td>no ha entrado en erupción en los últimos 10 000 años</td></tr></table>
    <h3>El tsunami (19)</h3>
    ${fig('tsunami.jpg', 'Diapositiva 19.')}
    <ol class="steps"><li>Una <b>ruptura en el fondo marino</b> (por ejemplo, un terremoto) empuja el agua hacia arriba y empieza la ola.</li>
    <li>La ola <b>se mueve a gran velocidad</b> por mar abierto.</li>
    <li>Al llegar a la costa, la ola <b>pierde velocidad pero gana altura</b>.</li>
    <li>La ola <b>destruye todo a su paso</b>.</li></ol>
    <p class="note">Solo hay que saber estas ideas generales; no hace falta recordar las velocidades.</p>` },

  { id: 'externos', title: 'Agentes externos: erosión, viento, agua y seres vivos', pg: '22-26, 28-32', body: `
    <h3>Cómo cambian el relieve (22)</h3>
    ${fig('erosion.jpg', 'Diapositiva 22.')}
    <ul><li><b>Erosión:</b> desgaste, fragmentación o disolución.</li><li><b>Transporte:</b> arrastre de lo erosionado.</li><li><b>Sedimentación:</b> depósito de los materiales.</li></ul>
    <h3>Temperatura (23)</h3>
    <p>Los cambios bruscos de temperatura hacen que las rocas se <b>dilaten y se contraigan</b>, y se fragmentan. Si entra agua en una grieta y luego se congela, el hielo ocupa más espacio y rompe la roca. ${ADD}</p>
    <p class="note">«¿Qué hacer con los puentes?»: la diapositiva deja la pregunta abierta. ${ADD} Los puentes llevan juntas de dilatación, unos huecos que dejan espacio para que el material se dilate sin romperse.</p>
    <h3>Viento (24)</h3>
    <p>Desgasta las rocas y <b>transporta</b> materiales. Forma <b>dunas</b>.</p>
    <h3>Agua (25-26)</h3>
    <ul><li><b>Disolución de rocas</b> ⇒ <b>paisaje kárstico</b> (cuevas, estalactitas).</li>
    <li><b>Ríos:</b> erosión, transporte y sedimentación. Forman <b>valles</b> fluviales o glaciares, <b>deltas</b> y <b>estuarios</b>.</li></ul>
    ${fig('karst.jpg', 'Diapositiva 25. Con vegetación hay poca erosión, mucha infiltración y los acuíferos están llenos. Sin vegetación hay mucha erosión, mucha escorrentía, inundaciones y acuíferos secos.')}
    ${fig('valle.jpg', 'Diapositiva 26. Un río en sus tres cursos: <b>curso alto</b> (valle estrecho), <b>curso medio</b> (valle ancho, meandros), <b>curso bajo</b> (vega y desembocadura).')}
    <p class="note">En el dibujo de tu libro «Los cursos de un río» aparecen también: <b>nacimiento, divisoria de aguas, lago, torrente, afluente, llanura aluvial, meandro, desembocadura y delta</b>.</p>
    <h3>Valles, delta y estuario (28-30)</h3>
    <p class="note">Estas diapositivas solo tienen fotos (en una de ellas se ve un estuario). ${ADD} Ideas básicas:</p>
    <ul><li><b>Valle fluvial:</b> lo excava un río; suele tener forma de V. <b>Valle glaciar:</b> lo excava un glaciar; tiene forma de U.</li>
    <li><b>Delta:</b> el río deposita sedimentos en la desembocadura y forma terreno en abanico con varios brazos.</li>
    <li><b>Estuario:</b> la desembocadura se ensancha en forma de embudo y el agua del río se mezcla con la del mar.</li></ul>
    <h3>El mar (31)</h3>
    <p>Cómo se forman las olas (libro): con poca profundidad el oleaje pierde energía pero crece su altura, y la parte posterior de la ola se mueve más rápido que el frente, así que la ola crece y rompe. La forma y el tamaño de las olas dependen sobre todo del viento y de la forma de la costa.</p>
    <p>Las <b>olas y las corrientes marinas</b> forman <b>acantilados</b> y <b>playas</b>.</p>
    ${fig('acantilado.jpg', 'Diapositiva 31. Cómo retrocede un acantilado: 1 erosión debida al oleaje · 2 socavamiento de las rocas · 3 rocas a punto de desplomarse · 4 plataforma de abrasión.')}
    <h3>Seres vivos (32)</h3>
    <p>Los árboles (con sus raíces) y los animales (con sus túneles) cambian un poco el relieve, <b>pero sobre todo lo cambia el ser humano</b>.</p>` },

  { id: 'humano', title: 'El ser humano y el relieve', pg: '34-37', body: `
    <h3>Densidad de población</h3>
    <p class="def"><b>Densidad de población</b> = número de habitantes por cada kilómetro cuadrado (<b>hab/km²</b>).</p>
    <p>Alta densidad = muchos habitantes en poco espacio. Baja densidad = pocos habitantes en mucho espacio.</p>
    <h3>¿Dónde vive la gente? (34-35)</h3>
    <table class="t"><tr><th>Muchos humanos (alta densidad)</th><th>Pocos humanos (baja densidad)</th></tr>
    <tr><td><ul><li>Ríos</li><li>Llanuras (terreno plano)</li><li>Suelo fértil</li><li>Costa</li></ul></td><td><ul><li>Montañas</li></ul></td></tr></table>
    <p class="note">En la diapositiva 34 también aparecen selva, desierto y polo, pero no los clasifican. ${ADD} Son lugares de pocos habitantes por el clima.</p>
    <h3>Clima, relieve y agua (36)</h3>
    <ul><li>La mayoría de la gente vive en la <b>costa (80%)</b>, a <b>menos de 500 m de altitud</b>, en <b>valles y llanuras</b> (agricultura).</li>
    <li>Con la tecnología nos adaptamos a medios más duros. Ejemplos: <b>terrazas</b> de cultivo, turismo.</li>
    <li>La acción humana modifica la naturaleza.</li></ul>
    <h3>La acción humana (37)</h3>
    <ul><li><b>Extracción de recursos naturales:</b> minas, agricultura (deforestación), ganadería…</li>
    <li>«Somos mucho más rápidos y violentos que los agentes erosivos naturales.»</li>
    <li>Construimos puertos, túneles, minas, etc.</li></ul>` },

  { id: 'ciclo', title: 'El ciclo del agua (esquema)', pg: '41', body: `
    <p>La diapositiva 41 pide: «Realiza un esquema sobre el ciclo del agua. Incluir: temperaturas, estados del agua, acciones…». Lo siguiente es del libro (Tema 2, «El ciclo del agua»).</p>
    <p class="note">Más detalle en las diapositivas 42-45. Para el esquema, practica en «Completa el esquema».</p>
    <p>El agua no tiene principio ni fin: circula entre los océanos, la atmósfera, los ríos, los lagos, las aguas subterráneas y los seres vivos. Cambia de estado (<b>sólido, líquido y gaseoso</b>) por estos procesos:</p>
    <dl><dt>evaporación</dt><dd>paso de líquido a gas. Por el calor del Sol, el agua de mares, ríos y lagos se evapora.</dd>
    <dt>condensación</dt><dd>paso de gas a líquido. El vapor de agua se enfría y se condensa, formando nubes.</dd>
    <dt>precipitación</dt><dd>el agua cae sobre la superficie en forma de nieve, lluvia o granizo.</dd>
    <dt>transpiración</dt><dd>animales, humanos y plantas expulsan agua que vuelve a la atmósfera como vapor.</dd>
    <dt>escorrentía</dt><dd>el agua de los ríos o de la lluvia circula libremente sobre la superficie del terreno.</dd>
    <dt>infiltración</dt><dd>parte del agua penetra en el suelo y se transforma en agua subterránea, que se almacena bajo tierra o en acuíferos.</dd>
    <dt>sublimación</dt><dd>paso de sólido a gas sin pasar por líquido. Los copos de nieve también se convierten en vapor de agua.</dd></dl>
    <p>Al desembocar, los ríos devuelven el agua al mar, y el viento arrastra las nubes.</p>
    <p class="note">Las temperaturas no vienen en el libro: lo que se dice es que el calor evapora y que el frío condensa.</p>` },
];

/* ---------- questions ---------- */
// [question, correct, [wrong,...], why, topic, slide]
const MCQ = [
  ['¿Cómo se llama un conjunto grande de sierras y montañas alineadas?', 'cordillera', ['meseta', 'istmo', 'golfo'], 'Una cordillera es un conjunto muy extenso de sierras o montañas alineadas.', 'rel', '5'],
  ['¿Qué franja de tierra une una península con el continente?', 'istmo', ['cabo', 'bahía', 'cala'], 'El istmo es una franja estrecha de tierra que une una península con el continente.', 'rel', '5'],
  ['¿Cómo se llama un conjunto de islas próximas?', 'archipiélago', ['península', 'cabo', 'golfo'], 'Un archipiélago es un grupo de islas cercanas entre sí.', 'rel', '5'],
  ['¿Cómo se llama una costa alta y casi vertical?', 'acantilado', ['playa', 'cala', 'bahía'], 'El acantilado está cortado por el mar.', 'rel', '5'],
  ['¿Qué es una meseta?', 'un terreno llano y extenso a mucha altura', ['un terreno llano a nivel del mar', 'una montaña con la cima plana', 'un valle entre sierras'], 'La meseta es llana, pero está elevada sobre el nivel del mar. La llanura es llana y baja.', 'rel', '5'],
  ['¿Cómo se llama la zona más profunda del océano, estrecha y alargada?', 'fosa marina', ['dorsal oceánica', 'talud continental', 'llanura abisal'], 'Las fosas marinas son las zonas más profundas del océano.', 'rel', '5'],
  ['¿Qué es la plataforma continental?', 'la parte del continente cubierta por el mar cerca de la costa', ['la parte más profunda del océano', 'una cadena de montañas submarinas', 'una playa muy grande'], 'La plataforma continental es poco profunda; después viene el talud.', 'rel', '5'],
  ['¿Qué es una dorsal oceánica?', 'una cadena de montañas submarinas', ['una fosa muy profunda', 'una isla volcánica', 'una llanura del fondo del mar'], 'En las dorsales sale magma y se forma nueva corteza.', 'rel', '5'],
  ['¿Cómo se llama la pendiente entre la plataforma continental y el fondo del océano?', 'talud continental', ['dorsal oceánica', 'fosa marina', 'cabo'], 'El talud es la pendiente que baja desde la plataforma.', 'rel', '5'],
  ['¿Qué es una cala?', 'una bahía pequeña', ['un tipo de volcán', 'una montaña muy alta', 'un río corto'], 'Una cala es una bahía pequeña y de poca profundidad.', 'rel', '5'],
  ['En el dibujo de la diapositiva 4, ¿qué es el número 15?', 'fosa marina', ['dorsal oceánica', 'playa', 'llanura'], 'El número 15 señala la zona más honda del fondo del mar. (Mi lectura del dibujo: compruébala con el libro.)', 'rel', '4'],
  ['¿Sobre qué se mueven las placas tectónicas?', 'sobre el manto', ['sobre el núcleo interno', 'sobre el mar', 'sobre la atmósfera'], 'Las placas se desplazan lentamente sobre el manto. (Añadido: no está en las diapositivas.)', 'pla', '7'],
  ['En un límite convergente, las placas…', 'se acercan y chocan', ['se separan', 'se deslizan una junto a otra', 'no se mueven'], 'Convergente = se acercan.', 'pla', '10'],
  ['En un límite divergente, las placas…', 'se separan y sube magma', ['chocan', 'se deslizan lateralmente', 'se funden'], 'Divergente = se separan.', 'pla', '10'],
  ['En un límite transformante, las placas…', 'se deslizan lateralmente', ['se acercan', 'se separan', 'se hunden'], 'Transformante = se deslizan una junto a otra.', 'pla', '10'],
  ['El Himalaya es un ejemplo de lo que se forma cuando chocan dos placas. ¿Qué es?', 'una cordillera', ['una fosa oceánica', 'una dorsal', 'un delta'], 'El choque de dos placas levanta cordilleras.', 'pla', '9'],
  ['¿Qué pasa si los materiales que se deforman son blandos?', 'se forma un pliegue', ['se forma una falla', 'se forma un volcán', 'no pasa nada'], 'Blandos ⇒ pliegue. Duros ⇒ falla.', 'def', '11'],
  ['¿Qué pasa si los materiales que se deforman son duros?', 'se forma una falla', ['se forma un pliegue', 'se forma un delta', 'se disuelven'], 'Duros ⇒ falla (se rompen).', 'def', '11'],
  ['En una falla, ¿cómo se llaman las dos partes de la roca rota?', 'labio levantado y labio hundido', ['plano y cumbre', 'cráter y cono', 'cauce y vega'], 'Hay un labio de falla levantado y otro hundido.', 'def', '11'],
  ['¿Por dónde sale el magma al exterior en la parte alta del volcán?', 'por el cráter', ['por la chimenea volcánica', 'por el cono', 'por la lava'], 'El cráter es la abertura de arriba.', 'vol', '15'],
  ['¿Cómo se llama el conducto por donde sube el magma?', 'chimenea volcánica', ['cráter', 'cono volcánico', 'piroclasto'], 'La chimenea comunica el magma con el cráter.', 'vol', '15'],
  ['¿Cómo se llama el magma cuando sale y corre por la superficie?', 'lava', ['ceniza', 'piroclasto', 'sedimento'], 'Magma está bajo tierra; lava, fuera.', 'vol', '15'],
  ['¿Qué son los piroclastos?', 'fragmentos sólidos de roca que lanza el volcán', ['la roca fundida bajo tierra', 'el agua de un cráter', 'las nubes de vapor'], 'Piroclastos = fragmentos sólidos.', 'vol', '15'],
  ['¿Cuál de estos NO es un material que expulsa un volcán?', 'sedimentos de río', ['lava', 'cenizas', 'piroclastos'], 'Un volcán expulsa lava, cenizas y piroclastos.', 'vol', '14'],
  ['¿Qué es un volcán activo?', 'el que ha entrado en erupción en los últimos 10 000 años', ['el que está dormido hace millones de años', 'el que nunca ha entrado en erupción', 'el que solo tiene humo'], 'Según la diapositiva 16.', 'vol', '16'],
  ['¿Qué es un volcán extinto?', 'el que no ha entrado en erupción en los últimos 10 000 años', ['el que está en erupción ahora', 'el que erupciona cada año', 'el que está bajo el mar'], 'Según la diapositiva 16.', 'vol', '16'],
  ['¿Qué es un volcán en erupción?', 'un volcán activo que está en erupción ahora', ['un volcán que no tiene cráter', 'un volcán que nunca ha erupcionado', 'un volcán de otro planeta'], 'Según la diapositiva 16.', 'vol', '16'],
  ['¿Cómo es un volcán inactivo o dormido?', 'tiene una probabilidad baja de erupcionar', ['está expulsando lava', 'está siempre cubierto de nieve', 'no existe magma bajo él'], 'Según la diapositiva 16.', 'vol', '16'],
  ['¿Dónde están la mayoría de los volcanes?', 'en los bordes de las placas tectónicas', ['en el centro de las llanuras', 'en los desiertos', 'en los polos'], 'La diapositiva 14 pregunta dónde; la respuesta habitual es: en los bordes de las placas (por ejemplo, alrededor del Pacífico). (Añadido.)', 'vol', '14'],
  ['¿Cómo empieza un tsunami?', 'una ruptura en el fondo marino empuja el agua hacia arriba', ['el viento agita la superficie del mar', 'la Luna atrae el agua', 'un río desemboca en el mar'], 'Diapositiva 19.', 'vol', '19'],
  ['¿Qué le pasa a la ola de un tsunami al acercarse a la costa?', 'pierde velocidad pero gana altura', ['gana velocidad y pierde altura', 'desaparece', 'se queda igual'], 'Diapositiva 19.', 'vol', '19'],
  ['¿Qué es la erosión?', 'el desgaste, la fragmentación o la disolución de las rocas', ['el depósito de los materiales', 'el arrastre de los materiales', 'la formación de un volcán'], 'Erosión desgasta. Transporte arrastra. Sedimentación deposita.', 'ext', '22'],
  ['¿Qué es el transporte?', 'el arrastre de lo erosionado', ['el depósito de los materiales', 'la rotura de las rocas', 'la subida del magma'], 'Diapositiva 22.', 'ext', '22'],
  ['¿Qué es la sedimentación?', 'el depósito de los materiales', ['el desgaste de la roca', 'el arrastre de los materiales', 'la deformación de las rocas'], 'Diapositiva 22.', 'ext', '22'],
  ['¿Cuál es el orden correcto de los procesos?', 'erosión, transporte, sedimentación', ['sedimentación, transporte, erosión', 'transporte, erosión, sedimentación', 'erosión, sedimentación, transporte'], 'Primero se desgasta, luego se arrastra y al final se deposita.', 'ext', '22'],
  ['¿Cómo fragmentan las rocas los cambios bruscos de temperatura?', 'por dilatación y contracción', ['disolviéndolas', 'arrastrándolas', 'enterrándolas'], 'Las rocas se dilatan con el calor y se contraen con el frío.', 'ext', '23'],
  ['¿Por qué rompe una roca el agua que se congela en una grieta?', 'porque el hielo ocupa más espacio', ['porque el hielo la disuelve', 'porque el hielo la quema', 'porque el hielo la arrastra'], 'El agua congelada aumenta de volumen y empuja las paredes de la grieta.', 'ext', '23'],
  ['¿Qué forma el viento al depositar arena?', 'dunas', ['deltas', 'estuarios', 'cráteres'], 'Diapositiva 24: el viento desgasta, transporta y forma dunas.', 'ext', '24'],
  ['¿Cómo se llama el paisaje que forma el agua al disolver rocas como la caliza?', 'paisaje kárstico', ['paisaje volcánico', 'delta', 'duna'], 'Diapositiva 25.', 'ext', '25'],
  ['¿Qué pasa en una ladera con vegetación?', 'hay poca erosión y mucha infiltración', ['hay mucha erosión e inundaciones', 'los acuíferos están secos', 'no llueve nunca'], 'La vegetación protege el suelo (diapositiva 25).', 'ext', '25'],
  ['¿Qué pasa en una ladera sin vegetación?', 'hay mucha erosión y mucha escorrentía', ['hay poca erosión y acuíferos llenos', 'la lluvia se infiltra toda', 'se forman volcanes'], 'Diapositiva 25: sin vegetación, mucha escorrentía, inundaciones y acuíferos secos.', 'ext', '25'],
  ['¿Cómo es el valle en el curso alto de un río?', 'estrecho', ['ancho', 'llano con meandros', 'un delta'], 'En el curso alto el río baja por las montañas.', 'ext', '26'],
  ['¿Qué aparece en el curso medio de un río?', 'meandros y un valle ancho', ['un valle muy estrecho', 'solo hielo', 'una fosa'], 'Diapositiva 26.', 'ext', '26'],
  ['¿Qué hay en el curso bajo de un río?', 'la vega y la desembocadura', ['el nacimiento', 'un torrente', 'una cordillera'], 'Cerca de la desembocadura el terreno es llano y fértil.', 'ext', '26'],
  ['¿Qué es un delta?', 'una desembocadura donde los sedimentos forman terreno con varios brazos', ['una desembocadura ancha en forma de embudo', 'un valle de montaña', 'una cueva'], 'Delta = depósito de sedimentos. (Añadido.)', 'ext', '29'],
  ['¿Qué es un estuario?', 'una desembocadura ancha en forma de embudo', ['un lago de montaña', 'una duna', 'una isla'], 'Diapositiva 30. (Definición añadida.)', 'ext', '30'],
  ['¿Qué forman las olas y las corrientes marinas en la costa?', 'acantilados y playas', ['volcanes', 'dunas', 'cordilleras'], 'Diapositiva 31.', 'ext', '31'],
  ['¿Qué ocurre justo antes de que caiga un trozo de acantilado?', 'el mar socava la base y las rocas quedan a punto de desplomarse', ['el río lo cubre de arena', 'sube el magma', 'se forma un pliegue'], 'Pasos: oleaje, socavamiento, desplome, plataforma de abrasión.', 'ext', '31'],
  ['¿Quién modifica más el relieve entre los seres vivos?', 'el ser humano', ['los árboles', 'los animales', 'las algas'], 'Diapositiva 32.', 'ext', '32'],
  ['¿Qué es la densidad de población?', 'los habitantes que hay por kilómetro cuadrado', ['el número total de habitantes de un país', 'la altura media del terreno', 'los kilómetros de costa'], 'Se mide en hab/km².', 'hum', '35'],
  ['¿En qué unidades se mide la densidad de población?', 'habitantes por km²', ['kilómetros por hora', 'metros de altitud', 'litros por segundo'], 'Hab/km².', 'hum', '33'],
  ['¿Qué lugares tienen mucha densidad de población?', 'ríos, llanuras, suelo fértil y costa', ['montañas', 'desiertos y polos', 'solo las cumbres'], 'Diapositiva 35.', 'hum', '35'],
  ['¿Qué lugares tienen poca densidad de población?', 'las montañas', ['las llanuras', 'las costas', 'los valles de ríos'], 'Diapositiva 35.', 'hum', '35'],
  ['¿Qué porcentaje de la población vive en la costa, según la diapositiva 36?', '80%', ['20%', '50%', '10%'], 'La mayoría vive en la costa (80%).', 'hum', '36'],
  ['¿A qué altitud vive la mayoría de la población?', 'a menos de 500 m', ['a más de 3000 m', 'a más de 1500 m', 'solo a nivel del mar exacto'], 'Diapositiva 36.', 'hum', '36'],
  ['¿Para qué sirven las terrazas de cultivo?', 'para adaptarse a un relieve difícil', ['para producir tsunamis', 'para generar volcanes', 'para formar dunas'], 'Son una adaptación tecnológica (diapositiva 36).', 'hum', '36'],
  ['¿Cuál de estos NO es un ejemplo de extracción de recursos naturales?', 'una duna', ['una mina', 'la deforestación para agricultura', 'la ganadería'], 'Diapositiva 37: minas, agricultura (deforestación), ganadería.', 'hum', '37'],
  ['¿Por qué el ser humano modifica el relieve más que los agentes naturales?', 'porque es mucho más rápido y violento', ['porque es más lento', 'porque no usa máquinas', 'porque solo actúa en el mar'], 'Diapositiva 37.', 'hum', '37'],
  ['¿En qué estado está el vapor de agua?', 'gaseoso', ['sólido', 'líquido', 'plasma'], 'Los tres estados del agua son sólido, líquido y gaseoso.', 'cic', '41'],
  ['¿Qué hace el calor del Sol con el agua del mar en el ciclo del agua?', 'la evapora', ['la congela', 'la condensa', 'la sedimenta'], 'Evaporación: de líquido a gas. (Idea básica añadida.)', 'cic', '41'],
];

// [statement, true?, why, topic, slide]
const TF = [
  ['Una meseta es un terreno llano que está elevado.', true, 'Meseta = llana y alta.', 'rel', '5'],
  ['Un istmo es una isla muy pequeña.', false, 'Un istmo es una franja de tierra que une una península con el continente.', 'rel', '5'],
  ['La dorsal oceánica es una cadena de montañas submarinas.', true, 'Es una cadena submarina donde se forma nueva corteza.', 'rel', '5'],
  ['La fosa marina es la parte más profunda del océano.', true, 'Fosa = zona más profunda, estrecha y alargada.', 'rel', '5'],
  ['Una península está rodeada de agua por todas partes.', false, 'Está rodeada de agua por todas partes menos por una (eso sería una isla).', 'rel', '5'],
  ['El Himalaya se formó por el choque de dos placas.', true, 'Choque de placas ⇒ cordillera.', 'pla', '9'],
  ['En un límite divergente las placas se acercan.', false, 'Divergente = se separan. Las que se acercan son las convergentes.', 'pla', '10'],
  ['En un límite transformante las placas se deslizan lateralmente.', true, 'Se deslizan una junto a otra.', 'pla', '10'],
  ['Los materiales duros se doblan y forman pliegues.', false, 'Los duros se rompen (falla). Los blandos se pliegan.', 'def', '11'],
  ['Una falla es una rotura de la roca.', true, 'Falla = rotura con labio levantado y labio hundido.', 'def', '11'],
  ['La lava es magma que ha salido al exterior.', true, 'Magma bajo tierra; lava en la superficie.', 'vol', '15'],
  ['Los piroclastos son líquidos que salen del cráter.', false, 'Son fragmentos sólidos de roca.', 'vol', '15'],
  ['Un volcán extinto es el que no ha entrado en erupción en los últimos 10 000 años.', true, 'Diapositiva 16.', 'vol', '16'],
  ['Un volcán en erupción es un volcán inactivo.', false, 'En erupción es un volcán activo que está erupcionando ahora.', 'vol', '16'],
  ['Un tsunami empieza por una ruptura en el fondo marino.', true, 'Diapositiva 19.', 'vol', '19'],
  ['La ola de un tsunami gana velocidad al llegar a la costa.', false, 'Pierde velocidad, pero gana altura.', 'vol', '19'],
  ['La erosión, el transporte y la sedimentación son procesos de los agentes externos.', true, 'Diapositiva 22.', 'ext', '22'],
  ['La sedimentación es el desgaste de las rocas.', false, 'Eso es la erosión. La sedimentación es el depósito de materiales.', 'ext', '22'],
  ['El viento puede formar dunas.', true, 'Diapositiva 24.', 'ext', '24'],
  ['El paisaje kárstico se forma por la disolución de rocas.', true, 'Diapositiva 25.', 'ext', '25'],
  ['Con vegetación hay más erosión que sin ella.', false, 'La vegetación protege el suelo y reduce la erosión.', 'ext', '25'],
  ['En el curso alto de un río el valle es ancho.', false, 'Es estrecho. El valle ancho está en el curso medio.', 'ext', '26'],
  ['En el curso bajo de un río está la desembocadura.', true, 'Diapositiva 26.', 'ext', '26'],
  ['Las olas y las corrientes marinas forman acantilados y playas.', true, 'Diapositiva 31.', 'ext', '31'],
  ['Las raíces de los árboles nunca modifican el relieve.', false, 'Las raíces y los túneles de animales lo modifican un poco, aunque lo hace sobre todo el ser humano.', 'ext', '32'],
  ['La densidad de población se mide en habitantes por kilómetro cuadrado.', true, 'Hab/km².', 'hum', '33'],
  ['Las montañas tienen mucha densidad de población.', false, 'Tienen poca densidad. Los ríos, las llanuras y las costas tienen mucha.', 'hum', '35'],
  ['La mayoría de la población vive en la costa.', true, 'Según la diapositiva 36, el 80%.', 'hum', '36'],
  ['El ser humano modifica la naturaleza más despacio que los agentes erosivos.', false, 'Somos mucho más rápidos y violentos.', 'hum', '37'],
  ['El hielo ocupa más espacio que el agua líquida, por eso rompe las rocas.', true, 'Por eso el agua helada de una grieta la ensancha.', 'ext', '23'],
];

/* label-the-picture sets: x,y are pixels in the picture; the picture's own text is hidden */
const PICS = {
  relieve: { img: '/geo/relieve.jpg', w: 474, h: 309, own: true, slide: '4', topic: 'rel', title: 'Dibujo de la diapositiva 4. Pregunta por el número que ya trae el dibujo.',
    pins: [[1, 'montaña', 315, 36], [3, 'llanura', 282, 161], [5, 'valle', 290, 78], [6, 'playa', 378, 209], [11, 'plataforma continental', 327, 206], [12, 'talud continental', 273, 220], [13, 'llanura abisal', 169, 214], [14, 'dorsal oceánica', 40, 189], [15, 'fosa marina', 161, 253]] },
  volcan: { img: '/geo/volcan-q.jpg', w: 900, h: 651, slide: '15', topic: 'vol', title: 'Partes de un volcán (diapositiva 15)',
    pins: [['cráter', 288, 178], ['piroclastos', 346, 136], ['cono volcánico', 354, 236], ['chimenea volcánica', 285, 352], ['lava', 524, 382], ['cenizas', 612, 264], ['magma', 282, 520]] },
  valle: { img: '/geo/valle-q.jpg', w: 500, h: 1194, slide: '26', topic: 'ext', title: 'Un río y su valle (diapositiva 26)',
    pins: [['valle estrecho', 165, 180], ['valle ancho', 225, 500], ['meandro', 195, 700], ['vega', 215, 870], ['desembocadura', 330, 985]] },
};
const PIC_OPTS = { relieve: ['montaña', 'meseta', 'llanura', 'valle', 'playa', 'plataforma continental', 'talud continental', 'llanura abisal', 'dorsal oceánica', 'fosa marina', 'acantilado', 'cabo', 'istmo'],
  volcan: ['cráter', 'piroclastos', 'cono volcánico', 'chimenea volcánica', 'lava', 'cenizas', 'magma'],
  valle: ['valle estrecho', 'valle ancho', 'meandro', 'vega', 'desembocadura', 'delta', 'nacimiento'] };

/* put in order: [title, items in the right order, slide, why] */
const ORD = [
  ['Los tres procesos de los agentes externos', ['erosión', 'transporte', 'sedimentación'], '22', 'Primero se desgasta la roca, luego se arrastra y al final se deposita.'],
  ['Cómo empieza y termina un tsunami', ['ruptura en el fondo marino', 'el agua sube y empieza la ola', 'la ola viaja a gran velocidad', 'en la costa pierde velocidad y gana altura', 'destruye todo a su paso'], '19', 'Diapositiva 19.'],
  ['Cómo retrocede un acantilado', ['erosión debida al oleaje', 'socavamiento de las rocas', 'rocas a punto de desplomarse', 'plataforma de abrasión'], '31', 'Diapositiva 31, dibujos 1 a 4.'],
  ['Los cursos de un río, de arriba abajo', ['curso alto (valle estrecho)', 'curso medio (meandros)', 'curso bajo (vega y desembocadura)'], '26', 'Del nacimiento a la desembocadura.'],
  ['Las capas de un volcán, de abajo arriba', ['magma', 'chimenea volcánica', 'cráter', 'lava y cenizas'], '15', 'El magma sube por la chimenea, sale por el cráter y se expande como lava y cenizas.'],
];

/* ---------- where to look in the textbook (Vicens Vives, Tema 1 «Los cimientos del planeta Tierra», pp. 8-33; Tema 2 «Cada gota cuenta» starts p. 34) ---------- */
const BOOK = {
  esquema: ['p. 30: «Resumo lo esencial» y el mapa conceptual (ejercicio 64).', 'Los apartados 5 y 6 (pp. 18-21) tienen todos los agentes internos y externos.'],
  relieve: ['pp. 16-17: apartado 4, «¿Qué formas tiene la corteza terrestre?». Tiene el dibujo con todos los nombres escritos y las definiciones.', 'Ejercicios 20-25 de la p. 17.'],
  placas: ['p. 13: mapa de las placas tectónicas y ejercicios 6-9.', 'p. 18: pliegues y fallas.', 'No he encontrado en estas páginas los tres tipos de límite (convergente, divergente, transformante). Pueden venir de otro tema o de la clase.'],
  volcanes: ['p. 18: los volcanes (magma, lava, cenizas, piroclastos).', 'p. 19: terremotos y maremotos, y el tsunami. Ejercicios 26-31.', 'No he encontrado volcán activo / inactivo / extinto en estas páginas.'],
  externos: ['pp. 20-21: apartado 6, «¿Cómo se transforma el relieve?»: agua (ríos, delta, estuario, mar, glaciares), viento y seres vivos.', 'Cursos de un río y cómo se forman las olas: están en el Tema 2 (desde la p. 34).', 'No he encontrado en estas páginas el paisaje kárstico, los acantilados ni la temperatura.'],
  humano: ['pp. 26-27: apartado 9, «¿Quién puede más: el ser humano o la Tierra?».', 'p. 29: «¡Resuelvo el reto!», cómo el relieve condiciona nuestras vidas.', 'No he encontrado la densidad de población ni las terrazas en estas páginas.'],
  ciclo: ['Tema 2, apartado 1, «¿Es la Tierra un planeta de agua?» (desde la p. 34), con el dibujo «El ciclo del agua».'],
};

/* ================= Slides 42-64 ================= */
GLOSS.push(
  ['océano', 'gran masa de agua salada'],
  ['mar', 'prolongación de los océanos en las zonas próximas al continente'],
  ['corriente marina', 'gran río de agua que discurre por el mar, sin mezclarse con el agua de alrededor por diferencias de temperatura, salinidad y densidad'],
  ['marea', 'subida y bajada del nivel del agua del mar, provocada por la atracción de la Luna'],
  ['ola', 'ondulación del agua del mar provocada por el viento, que rompe cuando toca el fondo'],
  ['cauce', 'canal por donde circula el agua de un río'],
  ['caudal', 'cantidad de agua que lleva un río'],
  ['curso de un río', 'recorrido que hace el río desde su nacimiento hasta su desembocadura'],
  ['cuenca hidrográfica', 'territorio cuyas aguas van a parar todas a un mismo río'],
  ['acuífero', 'zona subterránea donde se acumula el agua, sobre una roca impermeable'],
  ['agua subterránea', 'agua de la lluvia que se filtra en el suelo y queda bajo tierra'],
  ['régimen fluvial', 'cómo cambia el caudal de un río a lo largo del año'],
  ['vertiente', 'conjunto de ríos que desembocan en un mismo mar u océano'],
);
const rsample = (a, n) => [...a].sort(() => Math.random() - 0.5).slice(0, n);

READ.push(
{ id: 'ciclo2', title: 'El ciclo natural del agua y cuánta agua hay', pg: '42-45', body: `
  <h3>El ciclo del agua (42-43)</h3>
  ${fig('ciclo.jpg', 'Diapositiva 42. Fíjate en los nombres: precipitación, agua contenida en la atmósfera, agua contenida en la nieve, sublimación, transpiración, condensación, evaporación, filtración, agua contenida en los océanos y agua subterránea almacenada.')}
  <p>El agua circula siempre entre los océanos, la atmósfera, los ríos, los lagos, las aguas subterráneas y los seres vivos. Cambia de estado (sólido, líquido y gaseoso) por la <b>evaporación, condensación, precipitación, transpiración, escorrentía, infiltración y sublimación</b> (las definiciones están en «El ciclo del agua» de más arriba). Toda el agua continental, subterránea y superficial viene de las precipitaciones.</p>
  <h3>¿Cuánta agua hay en la Tierra? (44)</h3>
  ${fig('aguatierra.jpg', 'Diapositiva 44.')}
  <ul><li>Del agua del planeta: <b>96,5% es salada</b> (mares y océanos) y <b>2,5% es dulce</b>. ${ADD} <span class="note">(La diapositiva da esas cifras; el resto lo pone en el gráfico. Compruébalas.)</span></li>
  <li>Volumen de agua en mares y océanos: 1385 millones de km³. Agua dulce: solo 10,6 millones de km³, y de ella solo 93 113 km³ están en ríos y lagos.</li>
  <li>La mayor parte del agua dulce está en las <b>capas de hielo y glaciares</b>; el resto es sobre todo agua subterránea, y en ríos y lagos hay muy poca.</li></ul>
  <h3>Aguas oceánicas (45)</h3>
  <ul><li><b>Océano:</b> gran masa de agua. <b>Mar:</b> prolongación de los océanos cerca del continente.</li>
  <li>El agua es <b>salada</b> por la disolución de rocas que traen los ríos.</li>
  <li><b>Salinidad:</b> cuanto más cerrado es el mar y más calor hace, más evaporación y <b>más salinidad</b>.</li>
  <li>El agua de mar contiene agua y <b>sal marina</b>; la sal más abundante es el <b>cloro</b>, seguida del sodio.</li></ul>
  <p class="note">La diapositiva 45 dice «97%» en el texto y 96,5% en el gráfico: para el examen usa el gráfico (96,5%).</p>` },

{ id: 'oceanos', title: 'Océanos y mares: corrientes, mareas, olas y usos', pg: '46-50', body: `
  <h3>Corrientes marinas (46)</h3>
  ${fig('corrientes.jpg', 'Diapositiva 46. En rojo, corrientes cálidas; en azul, corrientes frías.')}
  <p>Son <b>grandes ríos que discurren bajo el agua</b>. No se mezclan con el agua de alrededor por diferencias de <b>temperatura, salinidad y densidad</b>. Pueden ser <b>cálidas o frías</b>.</p>
  <h3>Mareas y olas (47)</h3>
  <ul><li><b>Mareas:</b> subidas y bajadas del nivel del agua del mar provocadas por la <b>atracción de la Luna</b>. Hay <b>marea alta</b> y <b>marea baja</b>.</li>
  <li><b>Olas:</b> las provoca el <b>viento</b> al agitar la superficie. El agua se «riza» y empuja a la de alrededor, con un movimiento circular. La ola rompe y se deforma cuando toca el fondo. Las olas modelan la costa.</li></ul>
  ${fig('olas.jpg', 'Diapositiva 47. Al acercarse a la costa y tocar el fondo, la velocidad de la ola disminuye y su altura aumenta.')}
  <h3>¿Para qué aprovechamos los océanos? (48-50)</h3>
  <table class="t"><tr><th>Recurso</th><th>Cómo lo aprovechamos</th></tr>
  <tr><td>Alimentos</td><td>pesca y piscifactorías</td></tr>
  <tr><td>Energía</td><td>mareomotriz (también eólica y solar; petróleo y gas)</td></tr>
  <tr><td>Vía de comunicación</td><td>transporte de mercancías, personas y telecomunicaciones</td></tr>
  <tr><td>Recurso económico</td><td>turismo y comercio internacional</td></tr>
  <tr><td>Agua potable</td><td>plantas desalinizadoras</td></tr>
  <tr><td>Clima y aire</td><td>absorben dióxido de carbono, dan oxígeno, regulan la temperatura del planeta y frenan el calentamiento global</td></tr></table>` },

{ id: 'rios', title: 'Los ríos', pg: '51-59, 64', body: `
  <h3>Aguas continentales (51)</h3>
  <ul><li><b>Líquida:</b> ríos, lagos, aguas subterráneas.</li><li><b>Sólida:</b> icebergs y glaciares.</li><li><b>Gaseosa:</b> agua atmosférica (vapor de agua).</li></ul>
  <h3>Vocabulario de los ríos (52)</h3>
  <p class="note">La diapositiva solo pone las preguntas. ${ADD} Estas son las definiciones habituales: compáralas con tu libro.</p>
  <dl><dt>río</dt><dd>corriente continua de agua que va de un lugar alto a otro más bajo. Su agua viene de la lluvia, de la nieve o del deshielo, y de manantiales.</dd>
  <dt>nacimiento</dt><dd>lugar donde empieza el río</dd>
  <dt>cauce</dt><dd>canal por donde circula el agua</dd>
  <dt>caudal</dt><dd>cantidad de agua que lleva el río</dd>
  <dt>afluente</dt><dd>río que desemboca en otro río más grande</dd>
  <dt>desembocadura</dt><dd>donde el río termina (en el mar, en un lago o en otro río)</dd>
  <dt>cuenca hidrográfica</dt><dd>territorio cuyas aguas van todas a un mismo río.</dd></dl>
  <h3>Los cursos de un río (54-55)</h3>
  ${fig('cursos.jpg', 'Diapositiva 54. Curso alto: nacimiento, divisoria de aguas, lago, torrente, afluente. Curso medio: meandro, margen derecho, margen izquierdo. Curso bajo: desembocadura, delta.')}
  <p><b>El curso</b> es el recorrido que hace un río desde su nacimiento hasta su desembocadura.</p>
  <ul><li><b>Curso alto:</b> cerca del nacimiento, con mucha pendiente porque discurre entre montañas.</li>
  <li><b>Curso medio:</b> en zonas más llanas, con menos pendiente y menos erosión. El río transporta materiales y aumenta el ancho de su cauce.</li>
  <li><b>Curso bajo:</b> cerca de la desembocadura, que puede ser en forma de <b>delta</b> o <b>estuario</b>.</li></ul>
  <p>La diapositiva 55 pide completar esta tabla. Lo de <b>acción</b> y <b>relieve</b> sale de las diapositivas 26 y 54; lo demás lo he deducido ${ADD}.</p>
  <table class="t"><tr><th></th><th>Curso alto</th><th>Curso medio</th><th>Curso bajo</th></tr>
  <tr><td>Altitud</td><td>alta (montañas) ${ADD}</td><td>media ${ADD}</td><td>baja, cerca del mar ${ADD}</td></tr>
  <tr><td>Cauce</td><td>estrecho ${ADD}</td><td>más ancho</td><td>muy ancho ${ADD}</td></tr>
  <tr><td>Caudal</td><td>pequeño ${ADD}</td><td>mayor ${ADD}</td><td>el mayor ${ADD}</td></tr>
  <tr><td>Acción</td><td>erosión</td><td>transporte</td><td>sedimentación</td></tr>
  <tr><td>Velocidad</td><td>rápida (mucha pendiente)</td><td>media ${ADD}</td><td>lenta ${ADD}</td></tr>
  <tr><td>Relieve</td><td>valle estrecho, torrentes</td><td>valle ancho, meandros</td><td>vega, delta, estuario</td></tr></table>
  <h3>Regímenes fluviales (56)</h3>
  ${fig('regimenes.jpg', 'Diapositiva 56. Coeficiente de caudal de cada mes, de enero a diciembre.')}
  <p>Muestra <b>cómo cambia el caudal de un río a lo largo del año</b> (su régimen).</p>
  <ul><li>Un río de montaña alimentado por el <b>deshielo</b>: más caudal en <b>mayo y junio</b>, menos al final del verano y en otoño.</li>
  <li>Un río atlántico alimentado por la <b>lluvia</b>: más caudal en <b>invierno</b> (diciembre a marzo), menos en <b>verano</b> (julio a septiembre).</li></ul>
  <p class="note">Los meses los he leído a ojo en el gráfico. Compruébalos en tu libro.</p>
  <h3>Los ríos de España (57)</h3>
  ${fig('vertientes.jpg', 'Diapositiva 57. Cada color es una vertiente.')}
  <p>Una <b>vertiente</b> agrupa los ríos que desembocan en el mismo mar u océano. En España hay tres:</p>
  <table class="t"><tr><th>Vertiente</th><th>Los ríos desembocan en</th></tr>
  <tr><td><b>Cantábrica</b> (verde)</td><td>el mar Cantábrico (ríos cortos del norte)</td></tr>
  <tr><td><b>Atlántica</b> (amarillo)</td><td>el océano Atlántico</td></tr>
  <tr><td><b>Mediterránea</b> (rosa)</td><td>el mar Mediterráneo</td></tr></table>
  <h3>¿Para qué nos sirven los ríos? (58-59)</h3>
  <ol><li><b>Delimitan territorios</b> (fronteras naturales).</li><li><b>Energía:</b> el agua de los embalses produce electricidad.</li><li><b>Ocio y deporte:</b> turismo y actividades acuáticas.</li><li><b>Vías de comunicación y transporte</b> de personas y mercancías.</li><li><b>Agua para riego</b> (agrícola).</li><li><b>Agua de uso doméstico</b> (potabilizada).</li><li><b>Agua de uso industrial</b> (por ejemplo, refrigeración).</li></ol>
  <p class="note">Los ríos no son sitios para tirar residuos sólidos ni líquidos.</p>
  <p class="note">El texto de la diapositiva 53 (voluntaria) pide buscar los cinco ríos más caudalosos y los más largos del mundo, y el más largo y el más caudaloso de España. No lo incluyo porque es una búsqueda tuya.</p>` },

{ id: 'subt', title: 'Aguas subterráneas y ahorro de agua', pg: '60-62', body: `
  <h3>Aguas subterráneas (60-61)</h3>
  <ul><li>El agua de la lluvia <b>se filtra</b> hasta encontrar una <b>roca impermeable</b>, y ahí se forma un <b>acuífero</b>.</li>
  <li>Hay ríos y lagos subterráneos.</li>
  <li>Protegen la <b>humedad del suelo</b> y <b>alimentan ríos y lagos</b>.</li>
  <li>Son muy <b>vulnerables</b> a la <b>extracción excesiva</b> y a la <b>contaminación</b>.</li></ul>
  <p class="note">Diapositiva 61: foto de un lago subterráneo en una cueva y mapa del <b>Acuífero Guaraní</b>, bajo Brasil, Paraguay, Argentina y Uruguay.</p>
  <h3>¿Falta agua o sobra desigualdad? (62)</h3>
  <p>Hay niños que tienen que caminar para conseguir agua y otros que juegan con ella. Por eso hay que <b>ahorrar</b>. Litros que se ahorran:</p>
  <table class="t"><tr><th>Gesto</th><th>Litros</th></tr>
  <tr><td>Usar un vaso de agua para enjuagarse los dientes</td><td>19</td></tr>
  <tr><td>Ducharse en vez de bañarse</td><td>60</td></tr>
  <tr><td>Cerrar el grifo al enjabonarse las manos</td><td>12</td></tr>
  <tr><td>Cisterna inteligente (ahorro por uso)</td><td>6</td></tr>
  <tr><td>Electrodomésticos con la carga completa</td><td>200</td></tr>
  <tr><td>Lavar frutas y verduras en un bol</td><td>10</td></tr></table>
  <p><b>¡Evita el mal uso del agua!</b></p>` },
);
READ.find((r) => r.id === 'ciclo').pg = '41';
const MQ = (q, c, w, why, t, s) => MCQ.push([q, c, w, why, t, s]);
MQ('Del agua del planeta, ¿qué porcentaje es agua salada?', '96,5%', ['2,5%', '50%', '10%'], 'El 96,5% es salada y el 2,5% dulce (diapositiva 44).', 'agu', '44');
MQ('¿Dónde está la mayor parte del agua dulce?', 'en las capas de hielo y los glaciares', ['en los ríos y lagos', 'en el agua subterránea', 'en la atmósfera'], 'Casi toda está en el hielo y los glaciares; en ríos y lagos hay muy poca (diapositiva 44).', 'agu', '44');
MQ('¿Qué es el mar, según las diapositivas?', 'una prolongación de los océanos cerca del continente', ['una masa de agua dulce', 'un río muy grande', 'un lago salado'], 'Diapositiva 45.', 'agu', '45');
MQ('¿Por qué el agua del mar es salada?', 'por la disolución de rocas que traen los ríos', ['porque el Sol le echa sal', 'porque llueve poco', 'por las mareas'], 'Diapositiva 45.', 'agu', '45');
MQ('¿Qué pasa con la salinidad cuando el mar es más cerrado y hace más calor?', 'aumenta, porque hay más evaporación', ['disminuye', 'no cambia', 'se convierte en agua dulce'], 'Más evaporación = más sal en el agua que queda (diapositiva 45).', 'agu', '45');
MQ('¿Cuál es la sal más abundante en el agua del mar?', 'cloro', ['sodio', 'calcio', 'magnesio'], 'El cloro es la sal más abundante, después el sodio (diapositiva 45).', 'agu', '45');
MQ('¿Qué son las corrientes marinas?', 'grandes ríos que discurren bajo el agua del mar', ['olas muy altas', 'subidas del nivel del mar', 'ríos que desembocan en un delta'], 'Diapositiva 46.', 'oce', '46');
MQ('¿Por qué las corrientes marinas no se mezclan con el agua de alrededor?', 'por diferencias de temperatura, salinidad y densidad', ['por el viento', 'por la Luna', 'por las olas'], 'Diapositiva 46.', 'oce', '46');
MQ('¿Qué provoca las mareas?', 'la atracción de la Luna', ['el viento', 'los ríos', 'los volcanes'], 'Diapositiva 47.', 'oce', '47');
MQ('¿Qué provoca las olas?', 'el viento que agita la superficie del agua', ['la atracción de la Luna', 'las corrientes marinas', 'los terremotos'], 'Diapositiva 47. (Los terremotos provocan tsunamis, no las olas normales.)', 'oce', '47');
MQ('¿Qué le pasa a una ola cuando toca el fondo cerca de la costa?', 'disminuye su velocidad y aumenta su altura, y rompe', ['aumenta su velocidad y baja su altura', 'desaparece', 'se convierte en corriente'], 'Diapositiva 47.', 'oce', '47');
MQ('«Las plantas desalinizadoras transforman el agua del mar.» ¿Para qué beneficio de los océanos sirve?', 'para proporcionar agua para el uso humano', ['para el turismo', 'para generar energía', 'para el transporte'], 'Es el beneficio 4 de la diapositiva 49.', 'oce', '49');
MQ('«El mar tiene una gran riqueza pesquera.» ¿A qué beneficio se refiere?', 'a los alimentos', ['a la energía', 'al clima', 'al transporte'], 'Beneficio 7: proporcionan alimentos (pesca y piscifactorías).', 'oce', '49');
MQ('«Los mares y océanos regulan la temperatura del planeta.» ¿A qué beneficio se refiere?', 'a su influencia en el clima', ['a los recursos energéticos', 'al turismo', 'a las vías de comunicación'], 'Beneficio 2: influyen en el clima y frenan el calentamiento global.', 'oce', '49');
MQ('¿Qué tipo de energía se obtiene de las mareas?', 'mareomotriz', ['eólica', 'nuclear', 'geotérmica'], 'Diapositiva 50.', 'oce', '50');
MQ('¿Qué es el cauce de un río?', 'el canal por donde circula el agua', ['la cantidad de agua que lleva', 'el lugar donde termina', 'un río más pequeño'], 'Cauce = canal. Caudal = cantidad de agua. (Definiciones añadidas.)', 'rio', '52');
MQ('¿Qué es el caudal de un río?', 'la cantidad de agua que lleva', ['el canal por donde va el agua', 'la forma del valle', 'la velocidad del viento'], 'Caudal = cantidad de agua. No lo confundas con cauce. (Definición añadida.)', 'rio', '52');
MQ('¿Qué es un afluente?', 'un río que desemboca en otro río', ['el lugar donde nace un río', 'el lugar donde un río llega al mar', 'un lago pequeño'], 'Definición añadida; el libro también pone «afluente» en el dibujo de los cursos.', 'rio', '52');
MQ('¿Qué es la cuenca hidrográfica?', 'el territorio cuyas aguas van a un mismo río', ['la parte más profunda de un lago', 'un tipo de valle de montaña', 'el agua de un acuífero'], 'Por ejemplo, la cuenca del Ebro. (Definición añadida.)', 'rio', '52');
MQ('¿Qué es el curso de un río?', 'el recorrido desde su nacimiento hasta su desembocadura', ['la cantidad de agua que lleva', 'el canal del río', 'los afluentes'], 'Diapositiva 54.', 'rio', '54');
MQ('¿Qué pendiente tiene el río en el curso alto?', 'mucha, porque discurre entre montañas', ['muy poca, porque es llano', 'ninguna', 'es lo mismo en todo el río'], 'Diapositiva 54.', 'rio', '54');
MQ('¿Qué hace el río en el curso medio?', 'transporta materiales y ensancha su cauce', ['solo erosiona', 'solo sedimenta', 'se seca'], 'Diapositiva 54.', 'rio', '54');
MQ('¿Qué acción predomina en el curso alto?', 'la erosión', ['el transporte', 'la sedimentación', 'la evaporación'], 'Alto = erosión; medio = transporte; bajo = sedimentación.', 'rio', '54');
MQ('¿Qué acción predomina en el curso bajo?', 'la sedimentación', ['la erosión', 'el transporte', 'la infiltración'], 'Alto = erosión; medio = transporte; bajo = sedimentación.', 'rio', '54');
MQ('¿Cómo puede ser la desembocadura de un río?', 'en delta o en estuario', ['solo en delta', 'solo en lago', 'en meandro'], 'Diapositiva 54.', 'rio', '54');
MQ('¿Qué muestra un régimen fluvial?', 'cómo cambia el caudal del río a lo largo del año', ['la longitud del río', 'la altura del nacimiento', 'los afluentes del río'], 'Diapositiva 56.', 'rio', '56');
MQ('Según la diapositiva 56, ¿cuándo lleva más caudal un río de montaña alimentado por el deshielo?', 'en mayo y junio', ['en diciembre y enero', 'en agosto', 'en octubre'], 'El deshielo alcanza su máximo en mayo-junio (diapositiva 56).', 'rio', '56');
MQ('Según la diapositiva 56, ¿cuándo lleva menos caudal un río atlántico alimentado por la lluvia?', 'en verano', ['en invierno', 'en marzo', 'en diciembre'], 'Lleva más agua en invierno y menos en verano (diapositiva 56).', 'rio', '56');
MQ('¿Cuántas vertientes tienen los ríos de España, según la diapositiva 57?', 'tres', ['dos', 'cuatro', 'cinco'], 'Cantábrica, Atlántica y Mediterránea.', 'rio', '57');
MQ('¿Cuál de estos NO es un uso de los ríos?', 'recoger vertidos sólidos y líquidos', ['producir electricidad', 'regar los campos', 'transportar mercancías'], 'La diapositiva 59 avisa: los ríos no son espacios para recoger vertidos.', 'rio', '59');
MQ('¿Cómo producen electricidad los ríos?', 'con el agua de los embalses', ['con las mareas', 'con la lava', 'con el viento del río'], 'Diapositiva 59: recursos energéticos.', 'rio', '59');
MQ('¿Qué puede ser un río para dos países?', 'una frontera natural', ['un volcán', 'una duna', 'un acuífero'], 'Los ríos delimitan territorios (diapositiva 59).', 'rio', '59');
MQ('¿Cuántos usos de los ríos hay en la diapositiva 59?', 'siete', ['tres', 'cinco', 'diez'], 'Delimitan territorios, energía, ocio y deporte, comunicación y transporte, riego, uso doméstico y uso industrial.', 'rio', '59');
MQ('¿Cómo se forma un acuífero?', 'el agua de lluvia se filtra hasta una roca impermeable', ['el agua del mar sube por la tierra', 'el río se seca', 'la nieve se evapora'], 'Diapositiva 60.', 'sub', '60');
MQ('¿Qué amenaza más a las aguas subterráneas?', 'la extracción excesiva y la contaminación', ['las mareas', 'las olas', 'el delta'], 'Diapositiva 60.', 'sub', '60');
MQ('¿Qué hacen las aguas subterráneas por el suelo y los ríos?', 'protegen la humedad del suelo y alimentan ríos y lagos', ['destruyen el suelo', 'evaporan los ríos', 'forman los volcanes'], 'Diapositiva 60.', 'sub', '60');
MQ('¿Qué acuífero se ve en la diapositiva 61?', 'el Acuífero Guaraní', ['el Acuífero Ibérico', 'el Acuífero Andino', 'el Acuífero Mediterráneo'], 'Está bajo Brasil, Paraguay, Argentina y Uruguay.', 'sub', '61');
const TQ = (s, v, why, t, sl) => TF.push([s, v, why, t, sl]);
TQ('El 96,5% del agua de la Tierra es agua salada.', true, 'Diapositiva 44.', 'agu', '44');
TQ('La mayor parte del agua dulce está en los ríos y lagos.', false, 'Está en las capas de hielo y glaciares. En ríos y lagos hay muy poco.', 'agu', '44');
TQ('Cuanto más cerrado es un mar y más calor hace, más salinidad tiene.', true, 'Hay más evaporación y queda más sal.', 'agu', '45');
TQ('Las corrientes marinas son siempre frías.', false, 'Pueden ser cálidas o frías.', 'oce', '46');
TQ('Las mareas las provoca el viento.', false, 'Las provoca la atracción de la Luna. El viento provoca las olas.', 'oce', '47');
TQ('Las olas rompen cuando tocan el fondo.', true, 'Diapositiva 47.', 'oce', '47');
TQ('Las olas no tienen efecto sobre la costa.', false, 'Modelan la costa.', 'oce', '47');
TQ('Los océanos absorben dióxido de carbono y proporcionan oxígeno.', true, 'Beneficio 1 de la diapositiva 49.', 'oce', '49');
TQ('Las desalinizadoras convierten el agua del mar en agua potable.', true, 'Diapositiva 50.', 'oce', '50');
TQ('El hielo de los glaciares es agua continental sólida.', true, 'Diapositiva 51.', 'rio', '51');
TQ('El curso alto de un río tiene poca pendiente.', false, 'Tiene mucha pendiente, porque va entre montañas.', 'rio', '54');
TQ('En el curso bajo hay más sedimentación.', true, 'Diapositiva 54.', 'rio', '54');
TQ('Las tres vertientes de España son la Cantábrica, la Atlántica y la Mediterránea.', true, 'Mapa de la diapositiva 57.', 'rio', '57');
TQ('Los ríos de la vertiente atlántica desembocan en el océano Atlántico.', true, 'Diapositiva 57.', 'rio', '57');
TQ('Los ríos sirven para delimitar territorios.', true, 'Pueden ser fronteras naturales (diapositiva 59).', 'rio', '59');
TQ('Los ríos son un buen lugar para tirar residuos.', false, 'La diapositiva 59 lo advierte.', 'rio', '59');
TQ('Los acuíferos se forman sobre una roca impermeable.', true, 'El agua filtrada se detiene en la roca impermeable (diapositiva 60).', 'sub', '60');
TQ('Las aguas subterráneas no se pueden contaminar.', false, 'Son muy vulnerables a la contaminación.', 'sub', '60');
TQ('Ducharse gasta menos agua que bañarse.', true, 'Se ahorran unos 60 litros (diapositiva 62).', 'sub', '62');
ORD.push(
  ['El ciclo del agua, paso a paso', ['evaporación del agua del mar', 'condensación y formación de nubes', 'precipitación', 'escorrentía e infiltración', 'los ríos devuelven el agua al mar'], '43', 'El agua sube, se enfría, cae y vuelve al mar.'],
  ['Las acciones del río, de arriba abajo', ['curso alto: erosión', 'curso medio: transporte', 'curso bajo: sedimentación'], '54', 'Alto = erosión; medio = transporte; bajo = sedimentación.'],
  ['Cómo se forma un acuífero', ['llueve', 'el agua se filtra en el suelo', 'llega a una roca impermeable', 'el agua se acumula en un acuífero'], '60', 'Diapositiva 60.'],
  ['Qué le pasa a una ola', ['el viento agita la superficie', 'el agua se riza y empuja a la de alrededor', 'la ola se acerca a la costa y toca el fondo', 'disminuye su velocidad y aumenta su altura', 'la ola rompe'], '47', 'Diapositiva 47.'],
);
BOOK.rios = ['Tema 2 «Cada gota cuenta» (desde la p. 34): apartado 4, «¿De qué modo conocemos el funcionamiento de los ríos?», y apartados 5 y 6 (ríos del mundo y de Europa).', 'Los ríos de España: según el índice, en la unidad «Entre montañas y humedales. El medio físico de España» (desde la p. 104).'];
BOOK.ciclo2 = ['Tema 2 (desde la p. 34): apartado 1, «¿Es la Tierra un planeta de agua?», y apartado 7, «¿Es el agua un bien escaso?».'];
BOOK.oceanos = ['Tema 2: apartado 2, «¿Cómo funcionan los océanos y los mares?», y apartado 3, «¿Cuántos océanos hay en el mundo?».'];
BOOK.subt = ['Tema 2: apartados 7 y 8, «¿Es el agua un bien escaso?» y «¿Habrá suficiente agua en el futuro?», y el reto «¿Cómo utilizas el agua en tu vida diaria?» del final del tema.'];

READ.forEach((r) => { const b = BOOK[r.id]; if (b) r.body += `<div class="def" style="margin-top:6px"><b>📖 Si necesitas ayuda, mira en el libro:</b><ul style="margin:6px 0 0">${b.map((x) => `<li>${x}</li>`).join('')}</ul></div>`; });

/* ---------- extra questions for the per-section tests (7th item = section id) ---------- */
const SM = (sec, q, c, w, why, t, s) => MCQ.push([q, c, w, why, t, s, sec]);
const ST = (sec, s, v, why, t, sl) => TF.push([s, v, why, t, sl, sec]);
// sections whose tests use the existing question bank (by topic tag); new items above are added via the 7th field
const SECTAGS = { esquema: [], relieve: ['rel'], placas: ['pla', 'def'], volcanes: ['vol'], externos: ['ext'], humano: ['hum'], ciclo: ['cic'], ciclo2: ['agu'], oceanos: ['oce'], rios: ['rio'], subt: ['sub'] };
SM('esquema', '¿De dónde vienen los agentes internos que cambian el relieve?', 'de dentro de la Tierra', ['del viento y la lluvia', 'del Sol', 'de los seres vivos'], 'Los internos vienen del interior de la Tierra; los externos actúan sobre la superficie.', 'rel', '13');
SM('esquema', '¿Cuál de estos es un agente interno?', 'los volcanes', ['el viento', 'el agua', 'los seres vivos'], 'Volcanes, terremotos y tsunamis son internos.', 'rel', '13');
SM('esquema', '¿Cuál de estos es un agente externo?', 'el viento', ['los terremotos', 'los volcanes', 'el tsunami'], 'Externos: temperatura, viento, agua y seres vivos.', 'rel', '13');
SM('esquema', '¿Cuál es el orden del proceso de los agentes externos?', 'erosión, transporte y sedimentación', ['sedimentación, erosión y transporte', 'transporte, sedimentación y erosión', 'erosión, sedimentación y transporte'], 'Primero se desgasta la roca, luego se lleva el material y por último se deposita.', 'rel', '13');
SM('esquema', '¿Qué explican la tectónica de placas, los pliegues y las fallas?', 'por qué ocurren los volcanes, terremotos y tsunamis', ['por qué llueve', 'por qué sopla el viento', 'por qué hay mareas'], 'Son la explicación de los agentes internos.', 'rel', '13');
ST('esquema', 'La erosión es un agente interno.', false, 'La erosión es un proceso de los agentes externos.', 'rel', '13');
ST('esquema', 'Los seres vivos pueden cambiar el relieve.', true, 'Son uno de los agentes externos.', 'rel', '13');
ST('esquema', 'Los terremotos son un agente externo.', false, 'Son un agente interno.', 'rel', '13');
SM('ciclo', '¿Cómo se llama el paso de agua líquida a gas?', 'evaporación', ['condensación', 'precipitación', 'infiltración'], 'El calor del Sol evapora el agua de mares, ríos y lagos.', 'cic', '41');
SM('ciclo', '¿Cómo se llama el paso de vapor de agua a líquido, que forma las nubes?', 'condensación', ['evaporación', 'sublimación', 'escorrentía'], 'El vapor se enfría y se condensa.', 'cic', '41');
SM('ciclo', '¿Cómo se llama la caída del agua en forma de lluvia, nieve o granizo?', 'precipitación', ['transpiración', 'infiltración', 'condensación'], 'Precipitación.', 'cic', '41');
SM('ciclo', '¿Qué es la infiltración?', 'el agua que penetra en el suelo y se hace subterránea', ['el agua que corre sobre el terreno', 'el paso de líquido a gas', 'el agua que expulsan las plantas'], 'Se almacena bajo tierra o en acuíferos.', 'cic', '41');
SM('ciclo', '¿Qué es la escorrentía?', 'el agua que circula libremente sobre la superficie del terreno', ['el agua que entra en el suelo', 'el paso de sólido a gas', 'el vapor de las nubes'], 'Escorrentía: sobre la superficie.', 'cic', '41');
SM('ciclo', '¿Qué es la transpiración?', 'el agua que expulsan animales, personas y plantas y vuelve al aire como vapor', ['el agua que cae de las nubes', 'el agua que se congela', 'el agua que baja por los ríos'], 'Vuelve a la atmósfera como vapor.', 'cic', '41');
SM('ciclo', '¿Qué es la sublimación?', 'el paso de sólido a gas sin pasar por líquido', ['el paso de gas a líquido', 'el paso de líquido a sólido', 'el paso de líquido a gas'], 'Los copos de nieve también se convierten en vapor.', 'cic', '41');
SM('ciclo', '¿Cuáles son los tres estados del agua?', 'sólido, líquido y gaseoso', ['frío, templado y caliente', 'lluvia, nieve y granizo', 'dulce, salado y mineral'], 'Sólido (hielo), líquido y gas (vapor).', 'cic', '41');
ST('ciclo', 'El calor del Sol evapora el agua de mares, ríos y lagos.', true, 'Así empieza el ciclo.', 'cic', '41');
ST('ciclo', 'El agua del ciclo solo está en los océanos.', false, 'Circula entre océanos, atmósfera, ríos, lagos, aguas subterráneas y seres vivos.', 'cic', '41');
SM('subt', '¿Cómo se forma un acuífero?', 'el agua de lluvia se filtra hasta encontrar una roca impermeable', ['el agua del mar sube por la costa', 'el agua de un río se congela', 'el agua se evapora bajo tierra'], 'Se acumula sobre la roca impermeable.', 'sub', '60');
SM('subt', '¿Cuáles son los dos peligros principales para las aguas subterráneas?', 'la extracción excesiva y la contaminación', ['el frío y la nieve', 'las mareas y las olas', 'el viento y el sol'], 'Son muy vulnerables a ambas.', 'sub', '61');
SM('subt', '¿Qué es el Acuífero Guaraní?', 'un gran acuífero bajo Brasil, Paraguay, Argentina y Uruguay', ['un río de Europa', 'un lago de montaña', 'un mar cerrado'], 'Diapositiva 61.', 'sub', '61');
ST('subt', 'Las aguas subterráneas alimentan ríos y lagos.', true, 'Y protegen la humedad del suelo.', 'sub', '61');
ST('subt', 'Todas las aguas subterráneas son imposibles de agotar.', false, 'Son vulnerables a la extracción excesiva.', 'sub', '61');

/* ---------- written-answer questions (no choices). [question, accepted answers, shown answer, why, topic, slide, section] ---------- */
const INP = [];
const IQ = (q, acc, shown, why, t, s, sec) => INP.push([q, acc, shown, why, t, s, sec]);
IQ('Del agua del planeta, ¿qué porcentaje es agua salada (mares y océanos)?', ['96,5'], '96,5%', 'Diapositiva 44.', 'agu', '44', 'ciclo2');
IQ('Del agua del planeta, ¿qué porcentaje es agua dulce?', ['2,5'], '2,5%', 'Diapositiva 44.', 'agu', '44', 'ciclo2');
IQ('¿Cuántos millones de km³ de agua dulce hay en la Tierra?', ['10,6'], '10,6 millones de km³', 'Frente a 1385 millones de km³ en mares y océanos.', 'agu', '44', 'ciclo2');
IQ('¿Cuántos millones de km³ de agua hay en mares y océanos?', ['1385'], '1385 millones de km³', 'Diapositiva 44.', 'agu', '44', 'ciclo2');
IQ('¿Qué porcentaje de la población vive en la costa?', ['80'], '80%', 'Diapositiva 36.', 'hum', '36', 'humano');
IQ('¿A menos de cuántos metros de altitud vive la mayoría de la gente?', ['500'], '500 m', 'Diapositiva 36.', 'hum', '36', 'humano');
IQ('¿Hasta unos cuántos metros de profundidad llega la plataforma continental?', ['400'], 'unos 400 m', 'Definición del libro (p. 16-17).', 'rel', '5', 'relieve');
IQ('Escribe cómo se llama el paso de líquido a gas.', ['evaporacion'], 'evaporación', 'El calor del Sol evapora el agua.', 'cic', '41', 'ciclo');
IQ('Escribe cómo se llama el paso de gas a líquido que forma las nubes.', ['condensacion'], 'condensación', 'El vapor se enfría y se condensa.', 'cic', '41', 'ciclo');
IQ('Escribe cómo se llama el paso de sólido a gas sin pasar por líquido.', ['sublimacion'], 'sublimación', 'Ejemplo: los copos de nieve.', 'cic', '41', 'ciclo');
IQ('Escribe cómo se llama el agua que penetra en el suelo y se hace subterránea (el proceso).', ['infiltracion'], 'infiltración', 'Se almacena en acuíferos.', 'cic', '41', 'ciclo');
IQ('Escribe cómo se llama la caída del agua en forma de lluvia, nieve o granizo.', ['precipitacion'], 'precipitación', 'Diapositiva 41.', 'cic', '41', 'ciclo');
IQ('Escribe el nombre de la roca sobre la que se acumula el agua subterránea, para formar un acuífero (una palabra que acaba en -able).', ['impermeable', 'roca impermeable'], 'impermeable', 'El agua se filtra hasta encontrar una roca impermeable.', 'sub', '60', 'subt');
IQ('¿Cómo se llaman los agentes que vienen de dentro de la Tierra? (internos o externos)', ['internos', 'agentes internos', 'interno'], 'internos', 'Volcanes, terremotos y tsunamis.', 'rel', '13', 'esquema');
IQ('Escribe los tres pasos del proceso de los agentes externos: erosión, ... y sedimentación. ¿Cuál falta?', ['transporte'], 'transporte', 'Erosión → transporte → sedimentación.', 'rel', '13', 'esquema');

/* ---------- match-the-numbers sets: [title, topic, slide, section, [[what, figure], ...]] ---------- */
const MATCH = [
  ['Cuánta agua hay', 'agu', '44', 'ciclo2', [['Parte del agua del planeta que es salada', '96,5%'], ['Parte del agua del planeta que es dulce', '2,5%'], ['Agua en mares y océanos', '1385 millones de km³'], ['Agua dulce de toda la Tierra', '10,6 millones de km³'], ['Agua dulce en ríos y lagos', '93 113 km³']]],
  ['Personas y mar', 'hum', '36', 'humano', [['Población que vive en la costa', '80%'], ['Altitud a la que vive la mayoría', 'menos de 500 m'], ['Profundidad de la plataforma continental', 'unos 400 m']]],
];
