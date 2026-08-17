**Versión**: 9.0.0 ENTERPRISE | **Fecha**: 17 Agosto 2026 | **Ruleset**: eFootball v6.0.0 | **Idioma**: Español
**Fuentes**: Konami eFootball™ oficial v6.0.0 + conocimiento de producto verificado; las best practice community se declaran como heurísticas y NO como reglas oficiales.
**SOURCE LOCK**: para reglas cambiadas por la v6 prevalece siempre la documentación Konami corriente. No inventar nombres, valores numéricos, compatibilidad o competencias de entrenador no presentes en las fuentes/datos.

# BASE DE DATOS MECÁNICAS eFootball ENTERPRISE - Sistema RAG

## OBJETIVO
Base de datos RAG enterprise para consejos tácticos basados en mecánicas oficiales eFootball.
**Principio fundamental**: Distinguir siempre entre CARACTERÍSTICAS FIJAS (carta) y ELEMENTOS CONFIGURABLES (usuario).

---

## CONTEXTO VIDEOJUEGO (FUNDAMENTAL)

### Qué son los Jugadores en eFootball
Los jugadores en eFootball son **CARTAS DIGITALES** con estadísticas y características **FIJAS**:
- **No son personas reales** → NO tienen "experiencia", "carrera", "madurez"
- **No crecen con el tiempo** → Estadísticas General, Velocidad, Tiro son FIJAS en la carta
- **No entrenan** → No puedes "mejorar" un jugador
- **Solo puedes elegir** → A quién alinear, cómo posicionarlo, qué instrucciones dar

### Diferencia FIJO vs MODIFICABLE

| ELEMENTO | ESTADO | DESCRIPCIÓN |
|----------|--------|-------------|
| **Estadísticas Jugador** | FIJO | General, Velocidad, Tiro, Resistencia, etc. - Inmutables |
| **Estilos de Juego Jugador** | ✅ FIJO EN LA CARTA | En v6 pueden distinguirse en Estilo de juego en ataque y Estilo de juego en defensa; una carta puede tener uno, el otro o ambos (§2) |
| **Habilidades nativas** (de la carta) | ✅ FIJO | Remate de primera, Entrada agresiva, etc. - Inmutables |
| **Habilidades adicionales** | 🔧 MODIFICABLE | Mediante Programas Añadir Habilidad (máx 6 totales; NO para Trending) |
| **Forma Jugador** | ✅ FIJO | Inquebrantable, Normal, etc. - Característica de la carta |
| **Posiciones Originales** | ✅ FIJO | Donde el jugador tiene competencia Alta/Intermedia |
| **Formación** | MODIFICABLE | 4-3-3, 4-2-3-1, 5-2-3, etc. - Elección del usuario |
| **Estilo Equipo** | 🔧 MODIFICABLE | Posesión, Contraataque, Presión total, etc. - Elección del usuario |
| **Instrucciones Individuales** | 🔧 MODIFICABLE | En v6 usar solo las opciones corrientes (§5). Ofensivo y Línea baja pueden aparecer como datos legacy pero no deben aconsejarse |
| **Titulares vs Suplentes** | 🔧 MODIFICABLE | A quién alinear en el campo - Decisión del usuario |
| **Competencia Posición** | 🔧 PARCIAL | Alta/Intermedia fija, pero se puede añadir posición (máx 2) |

**REGLA DE ORO para la IA**: NUNCA sugerir "potenciar", "mejorar", "hacer crecer" un jugador.
Solo puedes sugerir: a quién usar, dónde posicionarlo, qué instrucciones darle.

---

## 1. ESTADÍSTICAS JUGADORES (OFICIAL eFootball)

### 1.1 Estadísticas Técnicas y Ofensivas
- **Remate de cabeza**: Precisión en los remates de cabeza
- **Tiros libres**: Precisión en jugadas a balón parado, penaltis, faltas
- **Efecto**: Capacidad de imprimir efecto al balón
- **Velocidad**: Velocidad máxima del jugador
- **Aceleración**: Rapidez para alcanzar la velocidad máxima
- **Potencia de tiro**: Fuerza del disparo
- **Finalización**: Precisión en el tiro
- **Regate en corto**: Habilidad para cambiar de dirección durante el regate a baja velocidad
- **Pase raso**: Precisión en los pases rasos
- **Pase alto**: Precisión en los pases aéreos
- **Regate**: Control de balón durante el regate en velocidad
- **Control del balón**: Control general, influye en paradas y fintas
- **Ofensivo**: Rapidez de respuesta al balón en ataque

### 1.2 Estadísticas Defensivas
- **Conciencia defensiva**: Rapidez de respuesta en fase defensiva
- **Entradas**: Habilidad para ganar duelos con adversarios
- **Agresividad**: Intensidad para intentar recuperar la posesión
- **Implicación defensiva**: Inclinación a ayudar en fase defensiva

### 1.3 Estadísticas Físicas
- **Resistencia** (NO "Stamina"): Forma física y duración del rendimiento
- **Contacto físico**: Capacidad de contener al adversario y mantener el equilibrio
- **Control corporal**: Habilidad para resistir las entradas
- **Salto**: Altura del salto
- **Equilibrio**: Estabilidad del jugador

### 1.4 Estadísticas Portero
- **Reflejos**: Capacidad de bloquear tiros cercanos
- **Alcance**: Cobertura del área de portería
- **Conciencia**: Rapidez de respuesta al balón
- **Atrapada**: Capacidad de atrapar el balón
- **Despeje**: Habilidad para desviar el balón a zonas seguras

### 1.5 Características Especiales
- **Frec. pierna mala**: Frecuencia de uso de la pierna mala
- **Prec. pierna mala**: Precisión tiros/pases con pierna mala
- **Forma**: Variación condición física ("Inquebrantable" = condición estable)
- **Resist. lesiones**: Probabilidad de sufrir lesiones (valor alto = menor probabilidad)

### 1.6 Umbrales indicativos (parámetros META)
Valores de referencia para construcción de equipo. Las estadísticas permanecen FIJAS en la carta; estos números ayudan a elegir qué carta alinear.
- **Defensores centrales (DFC)**: Velocidad y Aceleración mín. 85 (contraataque dominante)
- **Laterales (LTI/LTD)**: Velocidad 90+ para recuperar ante extremos rápidos
- **Extremos y delanteros**: Velocidad 90+ para dominar 1v1
- **Centrocampistas (MC)**: 80+ para ser competitivos
- **Resistencia**: con valor bajo, la Aceleración baja durante el partido; quien corre/presiona demasiado en el primer tiempo empieza cansado en el segundo.

---

## 2. ESTILOS JUGADOR - Característica carta (FIJOS)

**≠ Estilo equipo** (Posesión, Contraataque, etc.): eso está en §4. Aquí solo **características FIJAS de la carta**.

**IMPORTANTE**: Los estilos jugador (Oportunista, Ancla, Box-to-Box★, etc.) son **CARACTERÍSTICAS FIJAS** de la carta. NO se pueden modificar.

**MODELO v6.0.0 (OBLIGATORIO)**: Konami ha separado los estilos jugador en **Estilo de juego en ataque** y **Estilo de juego en defensa**. Un jugador puede tener un estilo ofensivo, uno defensivo o ambos. La v6 introduce además estilos nuevos: NO uses ya un recuento total fijo como regla de verdad y NO inventes un estilo de fase ausente en los datos de la carta.

**Ejemplo oficial v6**: una carta puede tener un estilo ofensivo como **Oportunista** y un estilo defensivo como **Presión en ataque**. Es un ejemplo de estructura dual, no una regla universal para todos los jugadores.

La tabla siguiente sigue siendo el **catálogo de compatibilidad de los estilos ya gestionados por la plataforma** y sirve para interpretar cartas ya guardadas; no es una lista exhaustiva de los nuevos estilos v6.

**Siglas posiciones — puente IT ↔ EN oficial Konami** (la IA debe reconocer ambas):

| IT (cliente italiano) | EN (cliente inglés / catálogo PSD) | Significado |
|---|---|---|
| P | CF | Delantero centro / Punta |
| SP | SS | Segundo delantero |
| EDA | RWF | Extremo ofensivo derecho |
| ESA | LWF | Extremo ofensivo izquierdo |
| TRQ | AMF | Mediapunta |
| CC | CMF | Centrocampista central |
| CLD | RMF | Exterior de centrocampo derecho |
| CLS | LMF | Exterior de centrocampo izquierdo |
| MED | DMF | Mediocentro / centrocampista defensivo |
| ETD | RB | Lateral derecho |
| ETS | LB | Lateral izquierdo |
| DC | CB | Defensa central |
| PT | GK | Portero |

**Catálogo de compatibilidad de estilos ya gestionados (IT / EN / posiciones / comportamiento / 3 stats clave)**:

**Siglas ES oficiales**:

| ES (cliente español) | EN | Significado |
|---|---|---|
| DC | CF | Delantero centro |
| SD | SS | Segundo delantero |
| ED | RWF | Extremo derecho |
| EI | LWF | Extremo izquierdo |
| MCO | AMF | Mediapunta |
| MC | CMF | Centrocampista central |
| MD | RMF | Mediocampista derecho |
| MI | LMF | Mediocampista izquierdo |
| MCD | DMF | Mediocentro defensivo |
| LTD | RB | Lateral derecho |
| LTI | LB | Lateral izquierdo |
| DFC | CB | Defensa central |
| POR | GK | Portero |

**Tabla canónica 22 estilos (IT / ES / EN / posiciones / comportamiento / 3 stats clave)**:

| Nombre IT (canónico) | Nombre ES | Nombre EN (canónico) | Posiciones activas (ES) | Comportamiento (1 frase) | 3 stats clave |
|---|---|---|---|---|---|
| Opportunista | Oportunista | Goal Poacher | DC (compat. SD) | Ataca constantemente la profundidad | Ataque, Aceleración, Finalización |
| Senza palla | Finta carrera | Dummy Runner | DC/SD/MCO | Mueve continuamente la defensa liberando espacios | Aceleración, Ataque, Resistencia |
| Rapace d'area | Cazagoles | Fox in the Box | DC | Permanece arriba esperando el balón en el área | Finalización, Posicionamiento, Remate de cabeza |
| Attaccante di rientro | Delantero de apoyo | Deep-Lying Forward | DC/SD (compat. MCO) | Retrocede para construir liberando espacio delante | Control del balón, Pase raso, Regate |
| Fulcro di gioco | Hombre objetivo | Target Man | DC | Juega de espaldas haciendo subir al equipo | Contacto físico, Salto, Pase raso |
| Specialista di cross | Especialista en centros | Cross Specialist | ED/EI/MD/MI | Permanece abierto para buscar centros continuos | Centro, Efecto, Pase alto |
| Classico n°10 | Clásico Nº10 | Classic No.10 | SD/MCO (NO MC desde 2024) | Permanece entre líneas priorizando el juego al pie | Control del balón, Pase raso, Regate |
| Regista creativo | Mediapunta creativo | Creative Playmaker | SD/MCO/ED/EI (MD/MI/MC: IA inactiva) | Se acerca al poseedor para crear conexiones ofensivas | Pase raso, Control del balón, Regate |
| Ala prolifica | Extremo prolífico | Prolific Winger | ED/EI (compat. MD/MI) | Parte abierto y recorta hacia la portería | Aceleración, Regate, Finalización |
| Taglio al centro | Extremo interior | Roaming Flank | ED/EI/MD/MI | Se centra pronto buscando juego interior | Regate, Pase raso, Aceleración |
| Tra le linee | Orquestador | Orchestrator | MC/MCD (compat. MCO) | Gestiona la posesión moviéndose para recibir y distribuir | Pase raso, Control del balón, Visión |
| Sviluppo | Construcción | Build Up | DFC (MCD/LTD/LTI: IA inactiva) | Inicia desde atrás abriéndose en construcción | Pase raso, Control del balón, Defensa |
| Frontale extra | Defensa ofensivo | Extra Frontman | DFC (compat. MCD) | Avanza en posesión acompañando la acción | Defensa, Pase raso, Contacto físico |
| Incontrista | Destructor | The Destroyer | MC/MCD/DFC (compat. LTD/LTI) | Agrede al poseedor saliendo de la línea | Entradas, Agresividad, Contacto físico |
| Onnipresente | Box-to-Box★ | Box-to-Box | MC/MCD/MD/MI (compat. MCO) | Cubre todo el campo apoyando ambas fases | Resistencia, Agresividad, Velocidad |
| Collante | Ancla | Anchor Man | MCD (MC/DFC: IA inactiva) | Permanece delante de la defensa protegiendo las transiciones | Defensa, Pase raso, Contacto físico |
| Giocatore chiave | Jugador clave | Hole Player | SD/MCO/MC/MD/MI (NO DC) | Ataca los espacios con desmarques ofensivos | Finalización, Aceleración, Ataque |
| Terzino offensivo | Lateral ofensivo | Attacking Full-back / Offensive Full-back | LTD/LTI (compat. MD/MI) | Avanza constantemente en amplitud | Aceleración, Centro, Resistencia |
| Terzino difensivo | Lateral defensivo | Defensive Full-back | LTD/LTI (compat. DFC) | Se queda atrás protegiendo la línea defensiva | Defensa, Velocidad, Resistencia |
| Terzino mattatore | Lateral finalizador | Full-back Finisher | LTD/LTI | Ataca el interior del campo con desmarques agresivos | Aceleración, Regate, Finalización |
| Portiere offensivo | Portero ofensivo | Offensive Goalkeeper | POR | Sale de la portería y cubre la profundidad | Reflejos, Despeje, Conciencia |
| Portiere difensivo | Portero defensivo | Defensive Goalkeeper | POR | Permanece cerca de la línea de portería y protege el área | Reflejos, Atrapada, Alcance |

**REGLA IA para uso multilingüe**: el cliente italiano del juego usa "Tra le linee" y "Onnipresente". El catálogo español usa "Orquestador" y "Box-to-Box★". Son el **mismo estilo**: al hablar con usuarios italianos usa el nombre IT del cliente; al hablar con usuarios españoles usa el nombre ES. Si un jugador en plantilla aparece con "Orchestrator" u "Orquestador" guardado del catálogo, NO digas "no existe este estilo": es el mismo que "Tra le linee" / "Orquestador".

**NO son estilos carta** (no los uses en la plantilla ni digas "no lo tienes"): *Punta avanzata*, *Adv. Striker*, *Advanced Striker* — términos obsoletos/guias externas. Para **profundidad y desmarques en espacios** usa **Jugador clave**; para **pases filtrados y goles en área** usa **Oportunista**; para **centros/rebotes** usa **Cazagoles**. *Punta arretrata* en chat = nombre viejo: en juego es **Delantero de apoyo** *(Deep-Lying Forward)*.

### 2.1 Estilos Sin Balón (Comportamiento sin posesión)

#### Delanteros y Centrocampistas Ofensivos
- **Oportunista** (CF=DC; compatible SS=SD): Permanece **en línea con el último defensa adversario** (fuera de juego), arranca hacia portería en pase filtrado/ocasión, sobrecarga el área. **NO** significa "jugar como un defensa". **Cuándo usar**: pases filtrados, balones en profundidad, contraataque. *(Goal Poacher)*
- **Finta carrera** (CF/SS/AMF = DC/SD/MCO): Atrae defensores para crear espacios para desmarques. **Cuándo usar**: equipos que buscan imprevisibilidad; crea espacios para compañeros. *(Dummy Runner)*
- **Cazagoles** (CF=DC): Siempre al acecho en el área para finalizar; óptimo en centros y rebotes. **Cuándo usar**: centros, delanteros con centrocampistas/exteriores que dan asistencias. *(Fox in the Box)*
- **Delantero de apoyo** (CF/SS = DC/SD; compatible AMF=MCO): Retrocede al centro del campo para organizar, contribuye a la construcción. **Cuándo usar**: posesión, equipos que construyen desde atrás. **Por qué**: idealmente combinado con extremos rápidos que corren más allá de los defensores. *(Deep-Lying Forward — no "Punta arretrata")*
- **Hombre objetivo** (CF=DC): Protege balón con físico, referencia ofensiva. **Cuándo usar**: juego aéreo, apoyos, delanteros físicos. **Por qué**: presencia física, crea espacio para extremos y mediapuntas. *(Target Man)*
- **Especialista en centros** (RWF/LWF/RMF/LMF = ED/EI/MD/MI): Permanece en la banda para centrar. *(Cross Specialist)*
- **Clásico Nº 10** (SS/AMF = SD/MCO): Playmaker entre líneas, útil para gestionar el ritmo, recibir y finalizar. **v6.0.0**: se ha eliminado el efecto que reducía su implicación defensiva; NO digas ya que el estilo “minimiza el esfuerzo defensivo” o que defiende menos por definición. NO se activa en CMF=MC (desde 2024).
- **Mediapunta creativo** (SS/AMF/RWF/LWF = SD/MCO/ED/EI; compatible RMF/LMF/CMF = MD/MI/MC pero IA inactiva): Se mueve libremente en fase ofensiva, busca espacios para recibir balón y crear ocasiones. **Cuándo usar**: imprevisibilidad ofensiva, desorganizar la defensa adversaria. **Por qué**: movimientos inteligentes de desmarque. *(Creative Playmaker)*
- **Extremo prolífico** (RWF/LWF = ED/EI; compatible RMF/LMF = MD/MI): Se posiciona en la banda y recorta hacia el centro para **recibir** pases filtrados; eficaz en 1v1. *(Prolific Winger)*
- **Extremo interior** (RWF/LWF/RMF/LMF = ED/EI/MD/MI): Tiende a recortar hacia el interior para recibir pases. **Cuándo usar**: extremos que convergen para tiros con efecto o pases filtrados. *(Roaming Flank)*

#### Centrocampistas y Defensores
- **Orquestador** (CMF/DMF = MC/MCD; compatible AMF=MCO): Se posiciona más atrás para dictar el ritmo e iniciar acciones ofensivas, gestiona la posesión moviéndose para recibir y distribuir. *(Orchestrator)*
- **Construcción** (CB=DFC; compatible DMF/RB/LB = MCD/LTD/LTI pero IA inactiva): Defensa que retrocede para organizar la acción con pases largos. **Cuándo usar**: construcción desde atrás, posesión. **Por qué**: radio de pase largo desde atrás. *(Build Up — SOLO CB=DFC para activación plena)*
- **Defensa ofensivo** (CB=DFC; compatible DMF=MCD): Participa en maniobra ofensiva, se superpone. **Cuándo usar**: módulos que empujan la defensa hacia adelante; riesgo: expone la retaguardia. *(Extra Frontman)*
- **Destructor** (CMF/DMF/CB = MC/MCD/DFC; compatible RB/LB = LTD/LTI): Rechaza ataques con presión agresiva. **Cuándo usar**: contraataque rápido, tácticas agresivas orientadas a la recuperación rápida. **Por qué**: presión alta, entradas decididas. *(The Destroyer)*
- **Box-to-Box★** (CMF/RMF/LMF/DMF = MC/MD/MI/MCD; compatible AMF=MCO): Corre de área a área, participa en fase defensiva y ofensiva. Cubre todo el campo. **Cuándo usar**: módulos que requieren centrocampistas completos, equilibrio y cobertura total. **Por qué**: alta resistencia, versatilidad; recupera balón e inicia ataques, llega tarde al área; utilizable en casi todos los módulos. *(Box-to-Box — el cliente italiano del juego muestra "Onnipresente"; el catálogo español muestra "Box-to-Box★". Son el mismo estilo.)*
- **Ancla** (DMF=MCD; compatible CMF/CB = MC/DFC pero IA inactiva): Centrocampista retrasado delante de la defensa, útil defensa/ataque. **Cuándo usar**: escudo defensivo, opción de pase segura en construcción. **Por qué**: fundamental para Bandas (Out Wide) por solidez defensiva. *(Anchor Man — SOLO DMF=MCD para activación plena)*
- **Jugador clave** (SS/AMF/RMF/LMF/CMF = SD/MCO/MD/MI/MC): Olfato de gol, siempre proyectado hacia adelante; busca espacios vacíos al pasar de defensa a ataque, corre hacia portería antes que el delantero. **Cuándo usar**: contraataque rápido. **Por qué**: necesita buena resistencia para repetidas arrancadas; pases rasos precisos para los delanteros. NO se activa en CF=DC. *(Hole Player)*

#### Laterales y Porteros
- **Lateral ofensivo** (RB/LB = LTD/LTI; compatible RMF/LMF = MD/MI): Se une al ataque, superposiciones continuas, avance por banda. **Cuándo usar**: amplitud, centros, dominio territorial. **Riesgo**: deja espacio detrás. *(Attacking Full-back / Offensive Full-back)*
- **Lateral defensivo** (RB/LB = LTD/LTI; compatible CB=DFC): Permanece retrasado para proteger defensa, cobertura prioritaria. **Cuándo usar**: solidez defensiva, contra extremos rápidos adversarios. *(Defensive Full-back)*
- **Lateral finalizador** (RB/LB = LTD/LTI): Se incorpora en acciones ofensivas centrales. **Cuándo usar**: módulos que empujan los laterales al ataque central. *(Full-back Finisher)*
- **Portero ofensivo** (POR): Más adelantado, sale para anticipar; proactivo en las salidas. **Cuándo usar**: línea alta, presión, juego agresivo. **Riesgo**: balones por encima. *(Offensive Goalkeeper)*
- **Portero defensivo** (POR): Permanece cerca de la línea de portería, reactivo. **Cuándo usar**: juego conservador, contra equipos con tiros desde lejos. *(Defensive Goalkeeper)*

### 2.2 Activación estilo y posición (lógica "pasiva apagada si fuera de rol")

**Terminología community**: "Pasiva apagada si fuera de rol" = el estilo jugador (comportamiento automático IA) **no se activa** cuando el jugador está alineado **fuera de su posición de competencia**.

**Mecánica**:
- Los estilos son **comportamientos pasivos** (activados por la IA sin inputs directos); gobiernan movimientos sin balón (§2.1) y con balón (§2.3).
- Cada estilo tiene **posiciones asociadas** (ej. Oportunista → DC; Box-to-Box★ → MC/MCD; Construcción → solo DFC).
- Si el jugador está **en posición de competencia** (Alta o Intermedia): el estilo se activa → movimientos correctos, bonus de posicionamiento.
- Si el jugador está **fuera de rol** (competencia Baja o ausente): el estilo **no se activa** → posicionamiento erróneo, movimientos menos eficaces, caída de fuerza total (§9.4).

**Cuándo citarlo**: Si el usuario pregunta por qué un jugador "no rinde" o "es lento", o si la plantilla tiene jugadores fuera de rol, verificar si el estilo es compatible con la posición efectiva. Si fuera de rol: "Alineando [X] fuera de posición, el estilo [Y] no se activa; el jugador pierde el bonus de posicionamiento y la fuerza total baja. Prueba a usarlo en [posición correcta] o alinea a otro." No uses "pasiva apagada" en la respuesta al usuario; usa "estilo no se activa" o "fuera de rol penaliza".

### 2.3 Estilos de Juego IA (Con Balón)
Comportamiento cuando la IA controla al jugador en posesión:
- **Funambulista**: Experto regate con bicicleta; control de balón ajustado bajo presión
- **Serpenteo**: Aprovecha regate y cambios de dirección; descoloca defensores
- **Tren en carrera**: Rápido, ataca espacios, aceleraciones en profundidad; ideal para contraataque
- **Desmarque**: Usa regate para centrarse y crear ocasiones; recorte hacia el interior
- **Experto balones largos**: Efectúa a menudo pases largos; construcción desde atrás
- **Centrador**: Aprovecha espacios para centrar; ideal en bandas
- **Tirador**: Especialista tiros desde fuera del área; mantiene la defensa honesta

---

## 3. MÓDULOS TÁCTICOS (CONFIGURABLES)

### 3.1 Módulos con 4 Defensores
- **4-3-3**: Tres MC y tres delanteros, posesión y amplitud
- **4-2-3-1**: Dos mediocentros cobertura, tres mediapuntas detrás del delantero
- **4-4-2**: Dos líneas de cuatro, equilibrio defensa/ataque
- **4-1-2-3**: Un MCD, dos interiores, tres delanteros
- **4-5-1**: Densidad centrocampo, único delantero referencia
- **4-4-1-1**: Variante 4-4-2 con mediapunta detrás del delantero
- **4-2-2-2**: Dos mediocentros, dos mediapuntas abiertos, dos delanteros

### 3.2 Módulos con 3 Defensores
- **3-5-2**: Dos delanteros, MC numeroso, exteriores apoyan defensa
- **3-4-3**: Tres delanteros, cuatro MC, juego ofensivo
- **3-1-4-2**: Un MCD, cuatro MC para dominar posesión
- **3-4-1-2**: Mediapunta detrás de dos delanteros, creación juego

### 3.3 Módulos con 5 Defensores
- **5-3-2**: Defensa sólida, tres MC, dos delanteros, contraataque
- **5-4-1**: Máxima cobertura defensiva, único delantero
- **5-2-3**: Variante ofensiva, tres delanteros, dos mediocentros

### 3.4 Límites de alineación por rol (reglas de juego)
- **Ataque (A)**: 1-5 jugadores (máx 2 DC, máx 1 ED/EI)
- **Centrocampo (C)**: 1-6 jugadores (máx 1 MD/MI)
- **Defensa (D)**: 2-5 jugadores (hasta **3 DFC**, máx 1 LTD, máx 1 LTI). **3 DFC son permitidos**. Si quieres alinear un **4° defensa** cuando ya tienes 3 DFC, debe ser un **lateral** (LTD o LTI): prohibido 4° DFC. Con 3 DFC ya en campo, no añadas suplentes DFC si no sale un DFC titular; para aumentar la línea defensiva propón LTD/LTI. Excepción: una carta principal DFC puede usarse de lateral solo si en los datos tiene posición/competencia LTD o LTI, y debe comunicarse como LTD/LTI.
- **Portero (POR)**: posición no modificable

### 3.5 Formación fluida (v6.0.0)
- **Formación fluida / Fluid Formation**: eFootball v6 permite una disposición para la fase ofensiva y otra distinta para la fase defensiva.
- Ejemplo oficial: en posesión un lateral puede adelantarse; sin posesión un exterior puede retrasarse para aumentar el número de defensores.
- **Regla IA**: si la plataforma no entrega dos layouts guardados, explica la mecánica en general pero NO inventes cuáles son las formaciones ataque/defensa del cliente.
- La formación base ya guardada sigue siendo válida; no trates la ausencia de variantes como un error.

### 3.6 Roles y comportamientos tácticos
**Mediocentro defensivo (MCD)**: Delante de la defensa, zona restringida; intercepción y recuperación balón. **Cuándo usar**: escudo defensivo, proteger defensa contra mediapuntas.
**Interior**: Movimiento vertical, desmarques al área. **Cuándo usar**: goles desde centrocampo, superioridad numérica en área.
**Organizador bajo**: Retrasado para construcción, primer pase. **Cuándo usar**: juego elaborado desde el portero, construcción desde atrás.
**Extremo corte**: Recorta hacia el pie fuerte para tirar; corte interior hacia área. **Cuándo usar**: tiros con efecto, pie invertido (diestro a izquierda).
**Extremo puro**: Permanece abierto para centrar; apunta línea de fondo. **Cuándo usar**: servir delanteros centrales, delanteros fuertes de cabeza.

---

## 4. ESTILOS EQUIPO - Táctica (configurables)

**≠ Estilo jugador** (Oportunista, Ancla, etc.): eso está en §2. Aquí solo **estilo táctico de equipo** (Posesión, Contraataque, etc.).

**Define la dirección táctica del equipo. La actitud del entrenador influye en la competencia del estilo.**

**CONFIGURABLES EN APP (team_playing_style) v6.0.0**: estos 6 → Posesión, Contraataque rápido, Contraataque, Balón largo, Bandas, **Presión total (Overload)**. Los otros conceptos abajo (Presión Alta, Gegenpressing, Tiki-Taka, etc.) siguen siendo conceptos/gameplay y NO deben presentarse como team_playing_style seleccionables.

### 4.1 Estilos de equipo actuales (6 tipos)
- **Posesión**: Juego construido con pases cortos y pacientes. **Cuándo usar**: centrocampistas técnicos, mediapuntas creativos. **Por qué**: control partido, paciencia, circulación balón.
- **Contraataque rápido**: Contraataques veloces aprovechando espacios dejados. **Cuándo usar**: delanteros rápidos, defensores con recuperación rápida. **Por qué**: velocidad, pases verticales directos.
- **Contraataque**: Ataque directo con pases verticales rápidos; defensa compacta, contraataques organizados.
- **Balón largo**: Estrategia basada en lanzamientos largos. **Cuándo usar**: oportunistas, delanteros físicos. **Por qué**: verticalidad, juego aéreo.
- **Bandas**: Ataque principalmente por bandas; exteriores permanecen abiertos para estirar la defensa adversaria. **Cuándo usar**: exteriores con centro, delanteros completos (pies + cabeza). **Por qué**: equilibrio entre bandas y centro; no solo centros – construcción también central. Defensa se concentra al centro; útil contra ataques centrales adversarios.
- **Presión total (Overload)**: concentra a los jugadores en el mismo lado del balón para crear superioridad numérica. **En ataque** facilita pases cortos y mantener la posesión incluso en zonas abarrotadas. **En defensa** mantiene una estructura compacta y cierra rápido sobre el portador. **Regla IA**: si en los datos del coach no existe una competencia Presión total/Overload, declárala desconocida y NO inventes un valor. **Heurística Hero, no hecho Konami**: contra un sobrecarga lado balón puede tener sentido buscar el lado débil/cambio de juego si los datos y la situación lo permiten.

### 4.2 Estilos Ofensivos
- **Ataque Directo**: Pases verticales rápidos. **Cuándo usar**: velocidad en ataque.
- **Centro y Finalización**: Estrategia basada en centros para delanteros fuertes de cabeza. **Cuándo usar**: delanteros con Remate de cabeza, exteriores con Centro medido.
- **Ataque Central**: Construcción con combinaciones cortas centrales. **Cuándo usar**: mediapuntas técnicos, posesión.

### 4.3 Estilos Defensivos
- **Presión Alta**: Defensa agresiva para recuperar balón en zona avanzada. **Cuándo usar**: equipo con Resistencia alta; riesgo: espacios detrás.
- **Defensa Baja**: Línea defensiva retrasada para reducir espacios. **Cuándo usar**: contra delanteros rápidos, en ventaja.
- **Presión Selectiva**: Interceptación líneas de pase. **Cuándo usar**: centrocampistas con Interceptación.
- **Contención Defensiva**: Dejar posesión y contraatacar. **Cuándo usar**: contra posesión adversaria.

### 4.4 Construcción desde Atrás
- **Construcción Posicional**: Maniobra razonada con pases cortos. **Cuándo usar**: posesión, portero con saque corto.
- **Lanzamiento Largo**: Pases largos para superar presión. **Cuándo usar**: contra presión alta, delantero físico para apoyos.
- **Construcción en Triángulos**: Pases entre MC para superar presión. **Cuándo usar**: centrocampo técnico.

### 4.5 Tácticas Especiales
- **Gegenpressing**: Recuperación balón inmediata tras perderlo. **Cuándo usar**: equipo con Resistencia alta.
- **Tiki-Taka**: Pases cortos continuos para desorganizar defensa. **Cuándo usar**: posesión, técnica alta.
- **Catenaccio**: Defensa estrecha y contraataques rápidos.
- **Presión Constante**: Equipo siempre agresivo. **Cuándo usar**: Resistencia 85+ para todos.
- **Ataque con Exteriores Altos**: Exteriores permanecen abiertos. **Cuándo usar**: amplitud, centros.
- **Cortes Interiores**: Exteriores convergen hacia centro. **Cuándo usar**: tiros con efecto, espacio central.

---

## 5. INSTRUCCIONES INDIVIDUALES (CONFIGURABLES)

**4 slots totales: 2 ofensivos (en posesión), 2 defensivos (sin posesión)**

**REGLA v6.0.0**: **Ofensivo** y **Línea baja (Deep Line)** se han eliminado de las Instrucciones Individuales corrientes. Pueden seguir apareciendo en el contexto de la plataforma porque algunos usuarios las habían guardado antes de la actualización: en ese caso son **LEGACY**, no deben borrarse automáticamente y sobre todo NO deben aconsejarse ni describirse como seleccionables hoy.

### Slots ofensivos actuales (en posesión)
- **Defensivo**: limita el empuje hacia adelante del jugador
- **Anclaje (Anchoring)**: mantiene al jugador más anclado a su zona

### Slots defensivos actuales (sin posesión)
- **Marcaje estrecho**: limita el espacio del objetivo con marcaje cercano
- **Marcaje al hombre**: asigna un marcaje específico
- **Contraataque / Objetivo contraataque (Counter Target)**: mantiene al jugador como referencia para la transición ofensiva según las reglas actuales del juego

### Gestión de datos legacy en la plataforma
- Si en el perfil aparece **Ofensivo** o **Línea baja**, trátalo como configuración histórica guardada con un ruleset anterior.
- No digas “sigue activa/seleccionable” y no la propongas como solución.
- No la sustituyas automáticamente por otra instrucción: invita al usuario a actualizar la táctica cuando corresponda.
- Si el usuario pregunta directamente “¿puedo usar Línea baja/Ofensivo?”, responde que en la v6 ya no son opciones corrientes de las Instrucciones Individuales.

### Configuraciones Equipo
- **Línea alta/baja**: Subir/bajar línea defensiva con flechas
- **Jugadas a balón parado**: Primer/Segundo/Tercer atacante para centros

---

## 6. JUGADAS A BALÓN PARADO (CONFIGURABLES)

### Mecánica posiciones atacantes (centro/córner)
- **Primer atacante**: va al primer palo
- **Segundo atacante**: va al centro del área
- **Tercer atacante**: va al segundo palo

### 6.1 Faltas Ataque
- **Arranca**: Jugadores alineados lado a lado, primera carrera hacia portería
- **Apoyo al centro**: Carrera arqueada hacia palo lejano
- **Arranca y mantén**: Algunos avanzan, otros en cobertura
- **Balón al ariete**: Estrategia juego aéreo
- **Equilibrado**: Jugadores se adaptan a la situación

### 6.2 Córner Ataque
- **Arranca**: Carrera desde el palo lejano
- **Área pequeña**: Alineados apretados cerca del área
- **Tren**: Dispuestos en vertical antes de atacar
- **Desde medio campo**: Uno retrocede ligeramente detrás del área
- **Dos receptores**: Dos cerca del banderín para pase
- **En diagonal**: Uno solo se acerca lateralmente
- **Córner corto**: Tácticas para jugar córner corto
- **Línea lateral**: Compañero cerca del banderín para pase

### 6.3 Jugadas a Balón Parado Defensa
- **Marcaje al hombre**: 1 contra 1 en área
- **Marcaje en zona**: Defensa sobre áreas designadas
- **Equilibrado**: Mix entre hombre y zona
- **Palo lejano**: Fuertes de cabeza en el palo lejano

---

## 7. MECÁNICAS DE JUEGO AVANZADAS

### 7.1 Defensa Manual (acciones: SOLO qué hacer)
**Nota**: aquí describimos SOLO **acciones** y principios. **Nunca** botones/controles/controller.

**Cabeza a Cabeza**: Sigue al adversario con pasos cortos (sin lanzarte), permanece en trayectoria entre él y la portería y cierra líneas de tiro/pase. Úsalo en 1v1 y cuando defiendes en área para que no te superen.

**Choque de Hombro**: Enfréntate hombro con hombro cuando estás emparejado y en carrera: es la opción más "limpia" para robar balón sin deslizamientos o entradas arriesgadas.

**Presión coordinada**: Llama a un compañero a presionar por pocos segundos **solo** cuando estás cerca del poseedor y tienes cobertura detrás. Si lo haces desde lejos o sin cobertura, abres espacios.

**Protección**: Si te presionan por detrás o de lado, usa el cuerpo para escudar balón y gira para salir de la presión. El éxito aumenta si **Contacto físico** es alto.

**Marcajes**: En jugadas a balón parado defensivas elige marcaje al hombre o en zona según tus defensores (AerialDef, Marcaje, Interceptación).

### 7.2 Comandos Ofensivos Avanzados

**Pared hacia Adelante**: Después de un pase, manda al autor a arrancar en profundidad y devuelve enseguida balón al espacio. Es una base para superar líneas compactas.

**Pase Sensacional**: Pase más rápido e incisivo (riesgo mayor si estás cerrado). Úsalo cuando estás **desmarcado** y tienes una línea de pase clara.

**Tiro Sensacional**: Tiro más potente. Rinde más con habilidades tiro especiales (ej. **Tiro con caída** / **Tiro ascendente**) y cuando tienes tiempo para orientar el cuerpo.

**Tiro Colocado**: Tiro más "ajustado" y delicado. Rinde más con habilidades como **Con efecto lejano** o **Remate con exterior**, y cuando quieres privilegiar precisión respecto a la potencia.

**Control Toque de Balón**: Alterna toques cortos (control) y toques largos (cambio ritmo) para superar la presión. Toques más largos exponen el balón: hazlos solo con espacio.

**Regate de Precisión**: Conducción a toques ajustados manteniendo el cuerpo orientado hacia el ataque. Es más eficaz en espacios reducidos o 1v1 controlados.

### 7.3 Fintas y Skill Moves

**Fintas de Cuerpo**: Usa cambios de dirección y fintas de cuerpo para desequilibrar al defensa antes de la arrancada o del pase.

**Doble Toque**: Skill base para superar adversarios.

**Tap Trick**: Finta rápida manual cerca del defensa: crea una breve vacilación para salir por el lado libre o cambiar dirección. Usarla solo en 1v1 con espacio después de la finta; no es un boost automático y no debe repetirse sin leer la reacción del defensa.

**Elástica / Elástica inversa**: Cambio dirección rápido.

**Sombrero**: Skill avanzada.

**Sombrero y tacón**: Pase alto a uno mismo.

**Giro seco**: Cambio dirección inmediato.

**Elevación de tacón**: Control balón avanzado.

### 7.4 Parada y Recepción

**Gírate hacia portería**: Parada orientada a atacar.

**Finta de parada**: Engaña al defensa.

**Parada y elevación**: Control aéreo.

**Finta con parada**: Cambio dirección tras parada.

### 7.5 Movimientos colectivos
- **Triangulación**: Tres jugadores forman triángulo para posesión; movimiento continuo para opciones pase. **Cuándo usar**: zona densa, mantener posesión bajo presión. **Plantilla**: Mediapunta creativo, Clásico Nº 10, Ancla; Pase de primera, Pase filtrado. **Módulos**: 4-3-3, 4-2-3-1.
- **Superposición**: Jugador supera al compañero con balón; carrera más allá para recibir o atraer marcador. **Cuándo usar**: superioridad numérica en banda, 1v1 en banda. **Plantilla**: Lateral ofensivo, Box-to-Box★, Especialista en centros; Arrancada, Centro medido. **Módulos**: 4-3-3, 3-5-2.
- **Corte**: Movimiento diagonal hacia portería, carrera sin balón en espacio. **Cuándo usar**: recibir pase filtrado, defensa organizada, espacio entre líneas. **Plantilla**: Extremo prolífico + Mediapunta creativo (quien corta + quien pasa); Pase filtrado, Arrancada; vel 85+. **Módulos**: 4-3-3, 4-2-3-1.
- **Amplitud**: Jugadores se abren para ocupar campo; estirar defensa adversaria. **Cuándo usar**: crear espacios centrales, defensa compacta a abrir. **Plantilla**: Especialista en centros, Extremo prolífico; módulos anchos (4-3-3, Bandas). **Módulos**: 4-3-3, 3-5-2.
- **Compacidad**: Equipo se cierra en zona restringida; líneas cercanas. **Cuándo usar**: fase defensiva, proteger resultado. **Plantilla**: Destructor, Ancla, Recuperación; res alta, ent alt. **Módulos**: todos (gestión ventaja).

### 7.6 Situaciones de juego
- **Transición positiva** (recuperación → ataque): aceleración inmediata, pase vertical rápido; primeros 5 segundos críticos. **Plantilla**: vel 90+, acel alta, Arrancada, Pase filtrado; Oportunista, Jugador clave, Extremo prolífico.
- **Transición negativa** (pérdida balón → defensa): repliegue inmediato, presión sobre poseedor; primeros 3 segundos para presión, luego replegar. **Plantilla**: ent altas, Recuperación, Interceptación, Destructor; res alta.
- **Finalización**: 1v1 portero (regate o potencia); área congestionada (tiro al vuelo o desviación); fuera del área (tiro potente colocado). **Plantilla**: Remate de primera, fin alta; Tiro potente, Distancia para fuera del área.
- **Gestión ventaja**: bajar ritmo, posesión segura, pases cortos; últimos 10-15 minutos. **Plantilla**: res alta, Recuperación, Marcador; Ancla, Pase de primera; Compacidad.
- **Recuperación desventaja**: aumentar ritmo, presión alta, laterales altos; últimos 10-20 minutos. **Plantilla**: Jugador clave, Tiro potente, **Super reserva**; hacer entrar game changer; Superposición, Amplitud.
- **Superioridad numérica**: mantener posesión, circular balón, esperar hueco.
- **Inferioridad numérica**: compacidad extrema, defensa zona, contraataque.

### 7.7 Matriz situación × datos × movimientos (enterprise)
Para cada situación: qué datos usar de la plantilla, qué movimientos, output consejo.

| Situación | Datos plantilla | Movimientos | Output |
|------------|-----------------|-------------|--------|
| Transición positiva | vel 90+, acel, Arrancada, Pase filtrado, Oportunista/Jugador clave | Corte, Pase filtrado | A quién poner, a quién dar balón |
| Transición negativa | ent, Interceptación, Recuperación, Destructor, res | Compacidad, Repliegue | Quién presiona, quién cubre |
| Córner ataque | Remate de cabeza, Salto, Dominio balones altos, alt alto | Área pequeña, Arranca, Primer/Segundo palo | Quién en los palos, quién tira (Centro medido) |
| Falta ataque | Tiros libres, Especialista faltas, Remate de cabeza | Arranca, Apoyo, Balón al ariete | Quién tira, quién en área |
| Gestión ventaja | res, Recuperación, Marcador, Ancla | Compacidad, Posesión segura | A quién mantener, instrucciones |
| Recuperación desventaja | Jugador clave, Tiro potente, Super reserva | Superposición, Amplitud | A quién hacer entrar |
| Presión alta | res 85+, Destructor, Interceptación | Presión coordinada | Quién presiona, cuándo |
| Defensa baja | Mediapunta creativo, Pase filtrado, Corte | Triangulación, Corte | Quién crea, quién corta |

### 7.8 Principios tácticos y best practices
- **Ocupación espacio**: cubrir anchura y profundidad campo; nunca más de 4-5 jugadores en fase ofensiva.
- **Apoyo balón**: siempre 2-3 opciones pase cercanas.
- **Compacidad defensiva**: líneas máximo 30-35 metros distancia.
- **Defensa**: marcaje pasivo > presión ciega; ataque: cambio ritmo > velocidad constante.
- **Construcción equipo**: equilibrio ofensivos/defensivos; complementariedad estilos; Resistencia 85+ para 2-3 jugadores si presión.
- **Sustituciones**: 60-70 minutos ideal; antes de que los jugadores estén exhaustos.
- **Errores a evitar**: presión siempre (elegir momentos); sprint constante (agota Resistencia); previsibilidad; zonas descubiertas.

### 7.9 Cruce Estadísticas Análisis (uso comandos últimas 10 partidas) con Plantilla (habilidades, posiciones, estilos)

Cuando en el RESUMEN ANÁLISIS está presente la sección **"Estadísticas de juego (Análisis eFootball, últimas 10 partidas)"**, cruza el **uso comandos** (porcentajes/conteos) con la **Plantilla** (Habilidades en plantilla, posiciones, estilos) para deducir si algunas estadísticas están **subutilizadas o sobreutilizadas respecto al perfil equipo**.

**Mapeo comando (pantalla Análisis) → qué mirar en plantilla**

| Categoría Análisis | Voz alta % / uso | Habilidades / estadísticas relevantes en plantilla | Si en plantilla faltan → consejo |
|-------------------|-------------------|----------------------------------------------------|----------------------------------|
| **Pase** | Pase filtrado raso / alto (ej. 37%+ pase filtrado raso) | **Pase filtrado**, Pase de primera, Pase medido; stat Pase raso/alto | "Usas mucho el pase filtrado; si en plantilla pocos tienen Pase filtrado/Pase de primera, los pases en profundidad pueden ser imprecisos. Diversifica con pase raso corto o alinea a quien tiene esas habilidades; o añádelas con Programas (si no Trending)." |
| **Pase** | Centro / Centro bajo (bajo %) | **Centro medido**, Especialista en centros; stat Pase alto; extremos/laterales con habilidad centro | "Usas poco los centros; si tienes extremos/laterales con Centro medido o Remate de cabeza en área, puedes aprovecharlos más con centros desde la banda." |
| **Tiro** | Normal (ej. 83%+) y Tiro colocado bajo | **Tiro colocado** rinde con **Con efecto lejano**, **Remate con exterior** (§7.2); Finalización; delanteros con habilidad tiro | "Usas sobre todo tiro normal; si tienes delanteros con Efecto / Con efecto lejano, prueba más a menudo el Tiro colocado para ajustar mejor." |
| **Tiro** | Vaselina / Tiro sensacional (bajo %) | Vaselina precisa; Tiro con caída/Tiro ascendente; portero en salida → vaselina | "Vaselina y tiro sensacional poco usados; útiles con portero en salida o desde distancia con jugadores que tienen las habilidades." |
| **Tipo de gol** | Pase filtrado raso (ej. 47% goles) | Como arriba: Pase filtrado, desmarques (estilos Oportunista, Extremo prolífico, Extremo interior) | Coherente con uso pase; verifica que quien recibe tenga estilos/habilidades para los desmarques (Arrancada, Finalización). |
| **Regate** | Arranca (ej. 62%) | Stat **Velocidad**, **Aceleración**, **Control del balón**, **Regate**; habilidad Arrancada | Si Velocidad/Aceleración bajas en plantilla, la Arrancada puede llevar a muchas pérdidas de balón; privilegia conducción "Normal" o posicionamiento. |
| **Regate** | Regate de precisión (bajo %) | **Control con suela**, **Doble toque**, **Tap Trick**, Regate de precisión (§7.2); espacios reducidos | Si tienes jugadores técnicos con Control con suela, Doble toque o Tap Trick, puedes usar más el regate de precisión en 1v1; Tap Trick debe usarse cuando el defensa ya está a distancia de entrada y hay un lado libre. |
| **Defensa** | Presiona / Movimiento / Cabeza a cabeza | **Conciencia defensiva**, **Entradas**, **Agresividad**; habilidades Interceptación, Entrada agresiva, Marcador | Uso equilibrado; si Presiona alto pero pocos en plantilla con Agresividad/Interceptación, la presión puede ser ineficaz → aconseja más Movimiento/posicionamiento. |
| **Comandos especiales** | Llama presión (bajo, ej. 1) | Centrocampistas/delanteros con Implicación defensiva, Agresividad | "Usas poco Llama presión; si tus centrocampistas tienen buena Agresividad/Implicación defensiva, puedes aumentar la presión coordinada." |
| **Comandos especiales** | Cambio cursor (muy alto, ej. 219) | — | Puede indicar defensa muy manual; verifica que no sea compensación por posicionamiento o línea defensiva (compacidad, instrucciones). |

**Regla para la IA**: No inventar porcentajes; usa solo los presentes en "Estadísticas de juego". Si la sección no está (usuario no ha cargado captura), no deduzcas datos de la pantalla Análisis. Al cruzar, cita **Habilidades en plantilla** (lista en el RESUMEN) y, si relevante, posiciones/estilos (ej. "¿tus mediapuntas/MCO tienen Pase filtrado?"). Sugiere siempre de forma constructiva: diversificar uso comandos, alinear a quien tiene las habilidades adecuadas, o añadir habilidades con Programas (si no Trending).

### 7.10 Consejos community Dream Team (Efootball Arena, creadores)

Fuentes: [Efootball Arena – How to Build a Competitive Dream Team](https://efootballarena.blog/how-to-build-a-competitive-efootball-dream-team/), creadores (tipo Mattiotti: Análisis, Build, Votos). Adaptados para **plantilla existente** y consejo táctico.

**Regla para la IA (build / meta)**: No copiar formaciones o build "meta" genéricas. Cada consejo debe ser **funcional** para el cliente: cruza plantilla (estilos carta, stats vel/fin/pas/ent, habilidades), estilo equipo y entrenador (competencia ≥70), Connection, **movimientos** (§7.5–7.7), dificultades declaradas o recurrentes y Estadísticas de juego si están presentes. El bloque "Síntesis plantilla" en el RESUMEN no es la progresión POR (sliders Disparo/Defensa): esa se configura en juego/Gestión plantilla; aquí se aconseja solo en base a datos tácticos disponibles.

**Columna vertebral (prioridad construcción)**: POR → DFC → MC → A → Laterales. Un equipo competitivo se basa en: portero sólido, defensas centrales, centrocampistas, delantero de referencia; los laterales completan.

**Formaciones meta y cuándo sugerirlas**:
- **4-2-2-2**: Equilibrio perfecto para principiantes; genial para equilibrio ataque-defensa.
- **4-2-3-1**: Estabilidad defensiva, focalizado en contraataques; compacto.
- **4-3-3 / 4-3-3 Narrow**: Dominio centrocampo, preferido por profesionales; requiere laterales de calidad.
- **3-5-2**: Superposición centrocampo, arriesgado pero potente; exteriores apoyan defensa.

**Asignación por rol (cuándo sugerir a quién alinear)**:
- Creadores (MCO, organizadores): control del balón y pase maximizados; Pase filtrado, Pase de primera.
- Delanteros: finalización y velocidad; mix entre velocidad/desmarque (Oportunista, Jugador clave) y potencia/área (Hombre objetivo, Cazagoles).
- Centrocampistas: equilibrar defensa y creación; mediocentros versátiles (Ancla, Box-to-Box★).
- Defensa: al menos un MCD/CDM sólido delante de la línea; nunca descuidar los laterales.

**Link-Up Play** (Connection Focal Point + Key Man): mejora sinergia delanteros; posicionamiento 10-15 m durante construcción. Verificar que Focal Point y Key Man estén presentes en plantilla para activar los bonus.

**Errores comunes a evitar** (community):
1. Descuidar la gestión de la Resistencia (sustituciones 60-70', no mantener a quien tiene res baja en los últimos 15').
2. Cambiar formación demasiado a menudo.
3. Ignorar la defensa (siempre al menos un mediocentro sólido).
4. Alinear estrellas fuera de posición (competencia posición influye en fuerza total).
5. Equipo solo ofensivo: sirve equilibrio ataque-defensa.

**Adaptación al meta** (solo tras cruce datos): Si meta defensiva y el cliente pierde en transiciones/extremos → evaluar 4-2-3-1 si la plantilla tiene mediocentros y extremos adecuados; si meta contraataques y tiene delanteros Oportunista/Jugador clave rápidos → 4-2-2-2 puede tener sentido; si posesión y organizadores fuertes → 4-3-3 Narrow. Nunca imponer un módulo sin motivo vinculado a sus datos.

### 7.11 Equipo bloqueado – Checklist y Smart Assist (frustraciones community)

**Equipo bloqueado (ataque estéril, derrotas repetidas)**:
1. Estilo equipo ↔ plantilla: verificar fit (ej. Oportunista + Contraataque; Hombre objetivo + Balón largo).
2. Formación: del historial, ¿qué formación adversaria más común? Aplicar contramedidas específicas y coherentes con §3-§7.
3. Connection: ¿Focal Point y Key Man en campo?
4. Sustituciones: ¿Super reserva en banquillo? ¿A quién hacer entrar al 60' para recuperación desventaja?
5. Habilidades vs uso comandos: cruce §7.9; sugerir alinear a quien tiene habilidades adecuadas o diversificar comandos.
6. Defensa baja adversaria: posesión paciente, Mediapunta creativo, amplitud; 4-3-3 o 4-2-3-1.
7. Gestión ventaja: compacidad, Ancla, res alta; no mantener a quien tiene res baja en los últimos 15'.

**Smart Assist** (muchos jugadores sienten que penaliza a quien no lo usa; Konami prohibido en competitivo 2025):
- Si el usuario lo lamenta: VALIDAR ("Entiendo, muchos en la community lo reportan"), NO negar.
- Si smart_assist=no en el perfil: adaptar los consejos (pases precisos, posicionamiento, habilidades Pase de primera/filtrado, formación que reduce presión en los pases difíciles).
- NO discutir si "es correcto o incorrecto"; ofrecer siempre un paso concreto.

**Tono**: Empatía + acciones concretas. NO comentar scripting o mecánicas de engine.

### 7.12 Mecánicas avanzadas "cancel" y skill trick (Enterprise)

Objetivo: usar técnicas avanzadas de forma profesional, repetible y coherente con el contexto partido, sin coaching "exploit-only".

**Taxonomía fiabilidad términos**:
- **Oficiales (prioridad alta)**: Super Cancel, Kick Cancel, Kick Feint, Double Touch.
- **Community (prioridad media)**: "Tess cancel", "croqueta interrumpida", "double-touch cancel".
- **Regla naming**: en respuesta usar primero el término oficial, luego eventualmente alias community entre paréntesis.

**Mapeo enterprise (término -> interpretación coach)**:
- **Super Cancel**: override manual de la trayectoria/animación. Uso: anticipo en balón suelto, corrección postura defensiva, cambio trayectoria en transición.
- **Kick Cancel**: anulación comando disparo antes del impacto. Uso: evitar forzamientos, crear micro-finta si el defensa anticipa.
- **Kick Feint**: finta ofensiva para hacer desequilibrar al marcador. Uso: definición en área y medio espacio.
- **Double Touch**: skill 1v1 para cambio dirección corto.
- **Double Touch + cancel** (alias community): variación de alto riesgo/alto rendimiento; sugerir solo si el cliente tiene jugadores técnicos y timing estable.

**Micro-tabla operativa (croqueta interrumpida / double touch cancel)**:

| Variante | Nombre a usar en respuesta | Requisitos habilidades (community) | Notas coach enterprise |
|---|---|---|---|
| Base / Controlled | **Double Touch** (croqueta interrumpida) | **Double Touch + Sole Control** | Más estable; usar en 1v1 lateral o salida presión corta. |
| Special / Fast | **Double Touch especial** (croqueta interrumpida avanzada) | **Double Touch + Sole Control + Flip Flap (Elástica)** | Más explosiva pero más arriesgada; evitar spam y usarla solo con timing/conexión buenos. |

Nota fiabilidad: "special double touch" y variantes "tess/croqueta interrumpida" son naming community; Konami documenta los comandos oficiales, no siempre estas etiquetas.

**Política anti-exploit (obligatorias)**:
1. No sugerir spam continuo de la misma skill ("haz siempre croqueta/tess").
2. No sugerir macros, scripts, automatizaciones input, o abuso de bugs.
3. No presentar técnica community como "mejor siempre": debe condicionarse a contexto, nivel usuario y tipo jugador.
4. Si una técnica es controvertida en el meta, declarar trade-off (riesgo pérdida balón, previsibilidad, transición negativa descubierta).

**Gating decisional antes de sugerir cancel trick**:
- Verificar fit jugador: control del balón, regate, equilibrio, aceleración, habilidades coherentes.
- Verificar escenario: 1v1 lateral, definición ajustada, salida presión, no en zona a riesgo balón perdido central.
- Verificar estado partido: si en ventaja y minuto alto, preferir seguridad (protección, pase simple) respecto a trick de alto riesgo.
- Verificar conexión/input delay: con lag alto reducir consejos sobre timing ajustado.

**Plantilla respuesta coach sobre mecánicas avanzadas**:
- 1) **Ahora**: una única acción concreta (ejecución breve, no teoría larga).
- 2) **Si falla**: plan B seguro (pase/salida presión).
- 3) **Próxima pausa**: micro-ajuste coherente (estilo, rol, cambio hombre técnico).

**Ejemplos enterprise (breves)**:
- "Usa Double Touch solo en 1v1 lateral; si el defensa no pica, protege y descarga corto."
- "Kick Cancel en definición solo cuando el central sale agresivo; si permanecen compactos, nada de forzamiento y resetea la posesión."
- "Super Cancel en defensa para cerrar línea pase, no para perseguir al vacío en presión larga."


### 7.13 Aggiornamenti gameplay eFootball v6.0.0 — fatti ufficiali rilevanti per il Coach
- **Dribbling/movimento**: dribbling lento più rapido; maggiore tendenza a usare il piede dominante; cambi di direzione più stabili; velocità massima in sprint con palla leggermente ridotta. Non tradurre questi cambi in bonus numerici inventati.
- **Controllo/ricezione/passaggio**: aggiornati controllo palla, ricezioni e movimenti collegati ai passaggi; migliorata la precisione di alcune conclusioni al volo di prima.
- **Duelli aerei**: modificati colpi di testa e duelli aerei; quando dai consigli considera maggiormente profilo fisico, salto, colpo di testa e qualità del cross, senza inventare percentuali.
- **Tiro**: nuove/aggiornate animazioni di tiro e lieve miglioramento della precisione col piede debole a corta distanza in determinate situazioni; aggiornati anche i piazzati.
- **Difesa/intercetti**: il movimento sulle linee di intercetto dipende maggiormente da **Coinvolgimento difensivo** e dall’abilità **Intercettazione**; i difensori controllati dall’IA si muovono meno spesso automaticamente per intercettare. Per il coaching significa valorizzare posizionamento, lettura e qualità difensive reali della card, non promettere auto-intercetti.
- **Marcature**: i difensori seguono meno “perfettamente” la marcatura; possono comparire più spazi tra difesa e centrocampo e i passaggi di responsabilità sono più naturali. Evita quindi consigli che presuppongono una marcatura automatica infallibile.
- **Reazioni difensive/attaccanti**: nella propria trequarti le reazioni IA sono state ribilanciate e dipendono maggiormente dal Comportamento difensivo; gli attaccanti possono contribuire di più al ripiegamento quando l’avversario attacca profondo. Sono stati rivisti anche tackle, blocchi, transizioni, corse diagonali e movimenti sulla linea del fuorigioco.
- **Supporto offensivo/terzini/AMF**: migliorati posizionamenti di supporto; il TRQ tende meno a scendere innaturalmente quando sono presenti CC/MED; riviste le decisioni di sovrapposizione dei terzini e alcune situazioni 1v1/animazioni del portiere.
- **Classico n°10**: rimosso l’effetto che riduceva il coinvolgimento difensivo. Non usare più la vecchia regola “difende meno per stile”.
- **Contrattacco / stamina**: ribilanciato il consumo di Resistenza dello stile squadra Contrattacco; non assumere più che consumi meno stamina degli altri stili come regola fissa. Leggermente aumentato il recupero di Resistenza dei DC all’intervallo.
- **IA e Smart Assist**: aumentata la difficoltà IA Campione/Champion; Smart Assist può gestire il nuovo tiro al volo dinamico; caratteristiche individuali di corsa e dribbling risultano più evidenti.
- **Volée dinamica / Dynamic Volley**: con palla in aria la v6 permette nuove conclusioni al volo tramite il comando di tiro sensazionale. Il Coach può consigliarne l’uso situazionale, ma non deve inventare skill o requisiti non presenti nei dati.

**Regola di affidabilità**: le voci sopra sono fatti di release; qualunque consiglio META derivato da esse (es. “cambia lato contro Pressing totale”) deve essere presentato come scelta tattica/euristica legata alla situazione e ai dati dell’utente, non come legge ufficiale Konami.

---

## 8. HABILIDADES JUGADORES (MIXTAS: NATIVAS FIJAS + AÑADIBLES)

**REGLA FUNDAMENTAL**:
- **Habilidades nativas**: FIJAS (con las que nace la carta)
- **Habilidades adicionales**: MODIFICABLES mediante "Programas Añadir Habilidad"
- **Máx 6 slots habilidades totales** por jugador
- **NO modificables para jugadores TRENDING**
- **Modificables para**: Destacado, En realce, Épico, Legendario, Estándar

**REGLA IA nombres habilidades (IT/ES/EN)**: los nombres canónicos en esta sección siguen el cliente oficial eFootball (alineados a `playerSkillLabels.js`). En plantilla, catálogo PSD o eFootball Lab pueden aparecer **alias EN/ES** o variantes community: usa el mapeo §8.11 y NO digas "habilidad inexistente" si reconoces el alias.

### 8.1 Habilidades Tiro
- **Remate de primera** *(First-time Shot)*: Tiros precisos de primera intención tras parada. **Cuándo usar**: delanteros, finalizadores rápidos; letal en área con asistencias rápidas.
- **Efecto** *(Curler)*: Tiros con efecto. **Cuándo usar**: ángulos ajustados, palo.
- **Tiro potente** *(Power Shot)*: Tiros con mayor potencia. **Cuándo usar**: fuera del área, portero en salida.
- **Punta de Precisión** *(Pinpoint Shooter)*: Tiros precisos en área. **Cuándo usar**: finalizadores.
- **Tiro con caída** *(Dipping Shot)*: Tiros con trayectoria descendente que baja repentinamente. **Cuándo usar**: tiros de distancia, superar al portero alto.
- **Tiro ascendente** *(Rising Shot)*: Tiros con trayectoria ascendente. **Cuándo usar**: tiros especiales, bajo el travesaño desde fuera del área.
- **Tiro nudillo** *(Knuckle Shot)*: Tiros con trayectoria imprevisible/inestable (efecto knuckle). **Cuándo usar**: tiros de distancia, conclusiones difíciles de descifrar para el portero.
- **Vaselina precisa** *(Chip Shot Control)*: Vaselinas precisas y controladas sobre el portero. **Cuándo usar**: 1v1 en área, portero en salida.
- **Tiro con efecto picado** *(Blitz Curler)*: Tiros con efecto de curva más marcada. **Cuándo usar**: ángulos ajustados, conclusiones controladas desde fuera del área.
- **Con efecto lejano** *(Long-range Curler)*: Tiros con efecto desde fuera del área. **Cuándo usar**: centrocampistas ofensivos; en rebote tira con pie fuerte al segundo palo.
- **Remate con exterior** *(Outside Curler)*: Tiros con efecto con exterior del pie. **Cuándo usar**: ángulos particulares, pie invertido.
- **Cabezazo** *(Heading)*: Remates de cabeza más precisos *en fase de ataque* (tiro de cabeza a portería). **Cuándo usar**: delanteros físicos, centros; mejor timing en balones aéreos. **NOTA**: NO es habilidad defensiva; para duelos aéreos en defensa ver Dominio balones altos (§8.4). Dar Cabezazo al defensa que mandes *hacia adelante* en córners.
- **Finalización acrobática** *(Acrobatic Finishing)*: Tiros acrobáticos (chilenas, etc.) también desde posiciones incómodas o en equilibrio precario. **Cuándo usar**: área congestionada, conclusiones difíciles.
- **Finalización** *(Finishing)*: Precisión en conclusión. **Cuándo usar**: delanteros, puntas.
- **Tiro lejano** *(Long-range Shooting)*: Tiros precisos desde fuera del área. **Cuándo usar**: centrocampistas ofensivos, tiros de distancia.
- **Cañonazo raso** *(Low Screamer)*: Tiro raso rápido cuando la barra potencia es inferior al 50%. **Cuándo usar**: tiros rápidos y precisos desde dentro/fuera del área.
- **Remate aéreo potente** *(Bullet Header)*: Golpear el balón de cabeza aplastándolo hacia la portería, también desde situaciones difíciles. **Cuándo usar**: delanteros en centros, remates de cabeza precisos hacia abajo.
- **Instinto de gol** *(Phenomenal Finishing)*: Aumenta potencia y precisión de las conclusiones intentadas con el cuerpo posicionado de forma atípica. **Cuándo usar**: delanteros que tiran en situaciones difíciles o en equilibrio precario.
- **Fuerza de voluntad** *(Willpower)*: Mejora las habilidades de tiro del jugador cada vez que efectúa un tiro, hasta un máximo de 8 veces. **Cuándo usar**: delanteros que tiran a menudo, acumulación boost durante el partido.

### 8.2 Habilidades Pase

**Estadísticas vs Habilidades (Comunidad)**: La estadística Pase 90+ aumenta la *velocidad de ejecución* del pase; las habilidades Pase de primera y/o Pase filtrado mejoran la *precisión* y desbloquean una *mejor animación*. Un jugador con 90+ en pase pero sin habilidades de pase rinde menos que uno con habilidades correctas.

**Pases iluminados / Pase calculado** (Showtime): NO sustituyen Pase filtrado, de primera o medido. Son **acumulables**; quien tiene Pases iluminados o Pase calculado debería añadir (si no las tiene) Pase de primera, Pase filtrado y Pase medido.

**A quién dar habilidades de pase (Comunidad)**:
- **Delanteros (DC)**: al menos Pase de primera (esencial para intercambios 1-2)
- **DFC**: al menos Pase de primera (animación correcta para distribuir rápido tras interceptar; Pase elevado mejora también el despeje)
- **MCD y laterales**: obligatorias todas las habilidades de pase; laterales ofensivos añadir Centro medido
- **MC**: se puede prescindir de Pase medido (lo aprovechan mejor los mediocentros); añadir Centro medido (box-to-box se encuentran en banda en ataque)
- **MCO y segundos delanteros**: como mediocentros, mejor si las tienen todas (de primera, medido, elevado, filtrado)

- **Pase de primera** *(One-touch Pass)*: Pases rápidos y directos de primera intención. **Cuándo usar**: triangulaciones rápidas, juego de primera, contra defensas compactas.
- **Pase al vuelo** *(Volleyed Pass)*: Control y pase en un solo toque. **Cuándo usar**: triangulaciones rápidas, primera intención.
- **Pase filtrado** *(Through Passing)*: Pases en profundidad precisos. **Cuándo usar**: organizadores, creadores; fundamental para desmarcar delanteros.
- **Pase largo preciso** *(Long Lofted Pass)*: Pases largos precisos. **Cuándo usar**: construcción desde atrás, cambios juego, contraataque.
- **Especialista pase largo** *(Long Ball Expert)*: Mejora precisión y utilidad de los pases largos en situaciones de juego. **Cuándo usar**: organizadores, mediocentros, cambios frente. **NOTA**: habilidad distinta de Pase largo preciso (Long Lofted Pass).
- **Centro medido** *(Pinpoint Crossing)*: Centros desde la banda más precisos. **Cuándo usar**: exteriores, laterales ofensivos; centros normales menos eficaces.
- **Pases iluminados** *(Phenomenal Passing)*: Pases precisos también desde orientación del cuerpo incómoda. **Cuándo usar**: mediapuntas creativos, asistencias difíciles. Alias en plantilla: Pase fenomenal, Pase sensacional.
- **Pase calculado** *(Visionary Pass)*: Pases más seguros; mejora el primer toque del receptor. **Cuándo usar**: organizadores, construcción. Alias: Pase visionario.
- **Pases cruciales** *(Game-changing Pass)*: Mayor precisión en pases bajos/altos en reanudación si empate o desventaja (2° tiempo). **Cuándo usar**: centrocampistas en partidos equilibrados.
- **No-look** *(No Look Pass)*: Pase sin mirar al receptor; descoloca adversarios. **Cuándo usar**: creadores, juego imprevisible. Alias: Pase sin mirar.
- **Pase medido** *(Weighted Pass)*: Pases largos/filtrados con backspin para mejor precisión. **Cuándo usar**: organizadores, cambios juego.
- **Pase elevado** *(Low Lofted Pass)*: Pase raso que supera la línea cuando apropiado. **Cuándo usar**: construcción, filtrados bajos.
- **Centro bombeado** *(Edged Crossing)*: Centro con caída vertical (dip) desde la banda. **Cuándo usar**: exteriores, centros para delanteros en área. Alias: Centro cortante.
- **Rabona** *(Rabona)*: Ejecución en rabona; pase o tiro imprevisible. **Cuándo usar**: creadores técnicos.
- **Golpe de tacón** *(Heel Trick)*: Pase o tiro de tacón también desde posiciones incómodas. **Cuándo usar**: asistencias improvisadas, finalizadores.

### 8.3 Habilidades Regate y Control
- **Doble toque** *(Double Touch)*: Skill base cambio dirección. **Cuándo usar**: extremos, regateadores; eficaz en 1v1.
- **Tap Trick** *(Tap Trick)*: Finta rápida manual que hace vacilar al defensa y abre un lado de salida. **Cuándo usar**: 1v1 cerca del defensa, banda, entrada al área o espacios reducidos con una salida libre. **Cómo razonar**: tras la finta cambia dirección o acelera en el espacio; si el defensa no pica, protege y descarga. **Límites**: no es un boost automático, no usarla con defensa lejano, sin espacio tras la finta o con input delay marcado. No confundirla con **Doble toque** o **Trickster**.
- **Elástica** *(Flip Flap)*: Cambio dirección rápido con exterior. **Cuándo usar**: 1v1, espacios reducidos.
- **Control con suela** *(Sole Control)*: Control balón con suela. **Cuándo usar**: espacios reducidos, protección balón.
- **Corte atrás y giro** *(Cut Behind & Turn)*: Combo avanzada de cambio dirección (Doble toque + Elástica + Control suela). **Cuándo usar**: regateadores técnicos. Alias: Doble toque especial.
- **Regate fulminante** *(Momentum Dribbling)* (Showtime): Mejora las habilidades de regate del jugador cerca del área adversaria. **Cuándo usar**: mediapuntas/delanteros que entran en área. Alias: Regate en impulso.
- **Arrancada explosiva** *(Acceleration Burst)* (Showtime): Permite al jugador ejecutar un toque seco rápido desde parado o en movimiento lento, con animaciones especiales. **Cuándo usar**: delanteros que reciben balón parados y deben acelerar repentinamente.
- **Pies magnéticos** *(Magnetic Feet)* (Showtime): Cuando el jugador tiene el balón, aumenta su capacidad de mantener la posesión en base al número de adversarios en un radio de 5 metros (máx 4 adversarios). **Cuándo usar**: jugadores técnicos bajo presión.
- **Calama en los pies** *(Magnetic Feet)*: mismo efecto de **Pies magnéticos** — no es una habilidad diferente. Usa la descripción de Pies magnéticos arriba. **Cuándo usar**: MCD/MC/MCO que reciben balón en presión o en zonas congestionadas.
- **Parada acrobática** *(Acrobatic Trap)*: Control balón acrobático. **Cuándo usar**: pases difíciles, posiciones incómodas.
- **Finta tiro** *(Feint Shot)*: Finta tiro para engañar al defensa. **Cuándo usar**: 1v1 en área.
- **Finta pase** *(Feint Pass)*: Finta pase. **Cuándo usar**: abrir líneas de pase.
- **Toque seco** *(Burst Touch)*: Empuje balón rápido hacia adelante para cambiar ritmo. **Cuándo usar**: espacio delante, aceleración repentina.
- **Protección** *(Shielding)*: Proteger balón con cuerpo. **Cuándo usar**: presión alta, espaldas a portería.

### 8.4 Habilidades Defensivas
- **Entrada agresiva** *(Aggressive Defence)*: Tackle agresivos con menos faltas respecto a una entrada normal. **Cuándo usar**: mediocentros, defensas centrales, recuperación balón en presión alta.
- **Interceptación** *(Interception)*: Interceptar pases más fácilmente. **Cuándo usar**: defensores, mediocentros; prioritaria para recuperación balón.
- **Marcador** *(Man Marking)*: Marcar adversario específico más eficazmente, reducir el espacio del poseedor de balón. **Cuándo usar**: DFC y mediocentros contra mediapuntas/segundos delanteros; combinar con instrucción individual "Marcaje al hombre" para asignar el directo adversario.
- **Entrada en anticipación** *(Aggressive Pressing)*: Entradas más eficaces con mayor intensidad en el duelo. **Cuándo usar**: defensores que salen en anticipación, mediocentros que presionan alto.
- **Entrada deslizante** *(Slide Tackle)*: Tackle en deslizamiento con mayor precisión y velocidad, conquista el balón más fácilmente. **Cuándo usar**: defensores, tackle agresivos.
- **Tackle en estirada** *(Long-Reach Tackle)*: Aumenta la frecuencia de los tackle de pie, también contra adversarios lejanos, desde parado o en movimiento lento. **Cuándo usar**: defensores que recuperan balones a distancia.
- **Bastión** *(Anchor)*: Habilidad defensiva de anclaje; estabiliza el sector. **Cuándo usar**: mediocentros defensivos, Ancla. **NOTA**: NO confundir con **Fortaleza** (Fortress) que es habilidad Showtime condicional (§8.4 abajo).
- **Fortaleza** *(Fortress)*: Mejora las habilidades defensivas del jugador a partir del segundo tiempo, siempre que el equipo esté en ventaja en el descanso. **Cuándo usar**: defensores para mantener la ventaja. **NOTA**: habilidad distinta de Bastión (Anchor).
- **Defensa elevada** *(Aerial Fort)*: Mejora las habilidades del jugador en los duelos aéreos cuando está posicionado dentro de su propia área. **Cuándo usar**: defensas centrales, duelos aéreos defensivos.
- **Recuperación** *(Track Back)*: Repliega rápidamente en fase defensiva tras fase ofensiva. **Cuándo usar**: centrocampistas, Box-to-Box★, extremos ofensivos.
- **Tapón** *(Blocker)*: Mayor eficacia en bloquear pases y tiros. **Cuándo usar**: defensas centrales, mediocentros.
- **Despeje acrobático** *(Acrobatic Clearance)*: Despejes acrobáticos con los pies también cuando el jugador está en equilibrio precario o en el aire. **Cuándo usar**: defensores, intervenciones de emergencia en área.
- **Dominio balones altos** *(Aerial Superiority)*: Mayor probabilidad de ganar duelos aéreos. **Cuándo usar**: defensas centrales, delanteros físicos, centros. Habilidad *defensiva* para duelos aéreos; **Cabezazo** (§8.1) es en cambio para remate de cabeza en ataque.
- **Presión por detrás** *(Shadow Hunt)* (Showtime, defensa): solo DFC/LTD/LTI/MCD. Se activa automáticamente en pase filtrado detrás de la línea: boost de velocidad para recuperar y perseguir al delantero. **Cuándo usar**: defensores contra delanteros rápidos y desmarques. Alias: Caza a la sombra. No requiere input manual.
- **Entrada a distancia** *(Long-Reach Tackle)*: alias de **Tackle en estirada** — mismo concepto, tackle de pie eficaces también con adversario más lejano, desde parado o en movimiento lento. **Cuándo usar**: DFC/LTD/LTI/MCD.

### 8.5 Habilidades Portero
- **Reflejos felinos** *(Reflexes)*: Paradas cercanas milagrosas. **Cuándo usar**: porteros, 1v1.
- **Atrapada segura** *(Catching)*: Atrapar balón en lugar de rechazar. **Cuándo usar**: reducir rebotes y segundas jugadas.
- **Salida portero** *(Goalkeeper Rush)*: Salidas más seguras. **Cuándo usar**: línea alta, pases filtrados.
- **Parada con pies** *(GK Foot Save)*: Paradas con pies en tiros bajos. **Cuándo usar**: tiros rasos.
- **Colocación** *(GK Positioning)*: Posicionamiento óptimo en portería, lectura del tiro y cobertura óptima del ángulo. **Cuándo usar**: porteros titulares, fundamental para reducir goles "fáciles" en tiros desde fuera del área.
- **Alcance POR** *(GK Reach)*: Cobertura mayor de la portería en las estiradas. **Cuándo usar**: tiros angulados, conclusiones a los extremos de la portería.
- **Parada-penaltis** *(Penalty Saver)*: Permite al jugador una mayor reactividad en parar los penaltis. **Cuándo usar**: porteros.
- **Dirección a la defensa** *(GK Directing Defence)*: Habilidad de portero que mejora las capacidades defensivas de los defensores posicionados cerca del área. **Cuándo usar**: porteros que dirigen la defensa. Alias: Direcciones a la defensa POR.
- **Portero galvanizador** *(GK Spirit Roar)* (Showtime): Habilidad del portero que mejora las capacidades físicas de los defensores cuando el equipo está en ventaja tras el descanso. **Cuándo usar**: porteros con equipo en ventaja en el segundo tiempo. Alias: POR galvanizador.

### 8.6 Habilidades Físicas y Atléticas
- **Arrancada** *(Acceleration)*: Aceleración explosiva en los primeros metros. **Cuándo usar**: delanteros, extremos, contraataque.
- **Resistencia superior** *(Stamina)*: Mayor resistencia a la fatiga. **Cuándo usar**: Box-to-Box★, laterales, presión.
- **Fuerza física** *(Physical Strength)*: Mayor potencia física en los duelos en tierra. **Cuándo usar**: duelos, protección balón, delanteros pivote.
- **Agilidad superior** *(Super Agility)*: Mayor agilidad en los cambios de dirección. **Cuándo usar**: regateadores, 1v1.
- **Salto** *(Jumping)*: Salto más potente en los duelos aéreos. **Cuándo usar**: defensas centrales, delanteros en centros y balones parados.
- **Velocidad** *(Speed)*: Velocidad máxima superior en carrera lanzada. **Cuándo usar**: extremos, delanteros rápidos, contraatacantes.

### 8.7 Habilidades Especiales y Liderazgo
- **Líder** *(Captaincy)*: Inspira compañeros, reduce impacto fatiga equipo. **Cuándo usar**: partidos largos, jugadores clave (capitán).
- **Especialista centros** *(Cross Specialist)*: Centros más precisos y peligrosos. **Cuándo usar**: exteriores, Bandas.
- **Especialista de centros** *(Cross Specialist)*: alias de **Especialista centros** — mismo concepto, mismo efecto.
- **Especialista faltas** *(Set Piece Specialist)*: Faltas más precisas. **Cuándo usar**: lanzadores faltas designados.
- **Especialista penaltis** *(Penalty Specialist)*: Penaltis más seguros. **Cuándo usar**: lanzadores designados. Alias: Especialista penaltis.
- **Saque de banda largo** *(Long Throw)*: Mayor amplitud del lanzamiento con las manos (bandas). **Cuándo usar**: saques rápidos y contraataque desde banda. Alias: Saque largo.
- **Saque del portero** *(GK Long Throw)*: Mayor amplitud del lanzamiento con las manos (portero). **Cuándo usar**: saques rápidos desde el POR. Alias: Saque largo POR.
- **Super reserva** *(Super Sub)*: Prestaciones mejoradas cuando entra en curso de partido. **Cuándo usar**: suplentes de impacto, cambios tácticos.
- **Espíritu combativo** *(Fighting Spirit)*: Prestaciones mejores bajo presión y fatiga. **Cuándo usar**: Box-to-Box★, mediocentros, presión. **Comunidad**: ideal para los 11; fundamental para DFC, MCD y MCO (distribuyen balones en espacios reducidos). Los MCO tienen a menudo Resistencia baja: aunque los sustituyas al 46', Espíritu combativo les ayuda ya en el primer tiempo (alrededor del 30' la Resistencia baja e influye en lucidez y rapidez). Reduce impacto fatiga, mejora también gestión Resistencia.
- **Astucia** (Gamesmanship): Mayor probabilidad de obtener faltas cuando está en posesión de balón. **EVITAR en defensores**: Konami gestiona mal la habilidad, efecto contrario – más faltas en contra. Dar a centrocampistas/delanteros si útil. **NOTA**: NO confundir con "Trickster" (ver §8.11) que es en cambio skill move técnico en 1v1.

### 8.8 Programas Añadir Habilidad
- **Disponible para**: Destacado, En realce, Épico, Legendario, Estándar
- **NO disponible para**: Trending (ya nivel máx)
- **Cómo funciona**: Usa programas para hacer aprender habilidades al jugador
- **Máx slots**: 6 habilidades totales (nativas + añadidas)

### 8.9 Prioridad habilidades por rol (para consejos)
Cuando se aconsejan habilidades a añadir (mediante Programas, si no Trending): **Delanteros** → Remate de primera, Cabezazo (si físico), Finalización acrobática, Vaselina precisa; **Organizadores** → Pase filtrado, Pase de primera, Pase medido; **Mediocentros** → Interceptación, Entrada agresiva, Recuperación, Espíritu combativo; **Defensores** → Interceptación, Marcador, Cabezazo, Dominio balones altos, Tapón; **Extremos** → Doble toque, Centro medido, Recuperación; **Laterales** → Interceptación, Centro medido (si ofensivos); **Suplentes de impacto** → **Super reserva**. Evitar habilidades defensivas en delanteros puros; evitar habilidades ofensivas en defensas centrales; máx 2-3 habilidades regate por jugador.

### 8.10 Habilidades obligatorias por rol (Comunidad)
Carta fuerte sin habilidades correctas no rendirá en juego como debería. **Obligatorias** por rol (el resto es complementario):

**LÍNEA DEFENSIVA**: tapón, marcador, interceptación, dominio balones altos, entrada deslizante, espíritu combativo. Al menos uno en equipo con Líder. **EVITAR Astucia** (gamesmanship) en defensores: Konami gestiona mal, faltas en contra.

**MEDIOCENTRO DEFENSIVO (MCD)**: mismo bloque defensa + **Pase elevado**. **EVITAR Recuperación** en mediocentro central, sobre todo si Ancla: lo transforma en similar box-to-box, va deambulando en zonas no competentes.

**CENTROCAMPO (MC)**: recuperación, dominio balones altos, interceptación, tapón, pase de primera, pase filtrado. Si MC defensivo (casi MCD): añadir marcador. Opcional: centro medido (box-to-box en banda), cabezazo, tiro; Control con suela mejora animaciones también sin skill input.

**MEDIAPUNTAS (MCO) y segundos delanteros**: pase de primera, pase filtrado, pase medido, remate de primera, tiro lejano, espíritu combativo. Opcional: remate con exterior, Con efecto lejano (mejora uso pie fuerte), skill.

**DELANTEROS (DC)**: pase de primera (esencial 1-2), remate de primera, tiro lejano, cabezazo, Con efecto lejano, dominio balones altos (para apoyo en lanzamientos largos de portero/defensores). Opcional: pase filtrado. **Con efecto lejano**: en rebote tira con pie fuerte al segundo palo en lugar del débil al primer palo.

**ESPÍRITU COMBATIVO**: ideal para los 11; fundamental para DFC, MCD, MCO (espacios reducidos; MCO con Resistencia baja bajan ya al 30' – Espíritu combativo ayuda también si sustituidos al 46').

**SUPER RESERVA**: actúa ya desde el primer minuto del segundo tiempo (no solo desde el 60'). Máxima eficacia en game changer: hacerlos entrar en el segundo tiempo es mucho más impactante que alinearlos titulares.

### 8.11 Showtime y habilidades recientes (sinónimos IT/ES/EN)

**Regla para la IA**: si en plantilla aparece un nombre EN (catálogo/EFHub), usa el efecto de la fila IT/ES correspondiente. Muchas voces son **sinónimos** de §8.1–8.4, no habilidades extra a sumar dos veces.

| Nombre en plantilla (ejemplos) | Sinónimo / sección | Efecto (síntesis verificada community/Konami) |
|-------------------------------|-------------------|-----------------------------------------------|
| Pies magnéticos / Magnetic Feet | Pies magnéticos §8.3 | Posesión bajo presión (máx 4 adversarios dentro de ~5 m) |
| Regate en impulso / Momentum Dribbling | Regate fulminante §8.3 | Más toques y control ajustado en último tercio |
| Tap Trick / Tap Trik | Tap Trick §8.3 | Finta manual cercana: hace vacilar al defensa y abre el lado de salida en el duelo |
| Arrancada explosiva / Acceleration Burst | §8.3 | Toque seco rápido desde parado o movimiento lento; cambio dirección |
| Pase fenomenal / Phenomenal Passing | Pases iluminados §8.2 | Pases precisos también desde orientación incómoda |
| Pase sensacional | Pases iluminados §8.2 | Alias community de Phenomenal Passing — mismo efecto |
| Finalización fenomenal / Phenomenal Finishing | Instinto de gol §8.1 | Tiros más precisos desde equilibrio/atípico |
| Pase visionario / Visionary Pass | Pase calculado §8.2 | Pases más seguros; mejora primer toque del receptor |
| Pases cruciales / Game-changing Pass | §8.2 | +precisión pases bajos/altos en reanudación si empate/desventaja (2° tiempo) |
| Centro cortante / Edged Crossing | Centro bombeado §8.2 | Centro con caída vertical (dip), útiles desde banda |
| Tiro con efecto picado / Blitz Curler | §8.1 | Curva más marcada en tiros controlados |
| Tiro nudillo / Knuckle Shot | §8.1 | Trayectoria imprevisible (knuckle) |
| Remate aéreo potente / Bullet Header | §8.1 | Cabezazos hacia abajo más potentes/coherentes |
| Defensa elevada / Aerial Fort | §8.4 | Duelos aéreos mejores **en propia área** |
| Bastión / Anchor | §8.4 | Anclaje defensivo (mediocentro/defensa) |
| Fortaleza / Fortress | §8.4 | +capacidades defensivas en 2° tiempo si en ventaja al descanso |
| Presión por detrás / Shadow Hunt | §8.4 | Recuperación automática en filtrado detrás de la defensa. Alias: Caza a la sombra |
| Entrada a distancia / Long-Reach Tackle | Tackle en estirada §8.4 | Tackle de pie a distancia |
| Cañonazo raso / Low Screamer | §8.1 | Tiro sensacional rápido y bajo con barra potencia <50% |
| Especialista pase largo / Long Ball Expert | §8.2 | Pases largos más eficaces — **NO** es Pase largo preciso |
| Pase largo / Long Lofted Pass | Pase largo preciso §8.2 | Pases largos precisos |
| Centro anticipado / Early Crosser | Centro medido §8.2 | Centros anticipados más eficaces |
| No Look Pass / Pase no look | No-look §8.2 | Pase sin mirar al receptor |
| Low Lofted Pass | Pase elevado §8.2 | Pase raso que supera |
| Heel Trick | Golpe de tacón §8.2 | Pase/tiro de tacón |
| Cut Behind & Turn | Corte atrás y giro §8.3 | Combo cambio dirección avanzada |
| Desmarque incisivo / Incisive Run | — | Corte desde banda hacia portería (trait ofensivo) |
| Carrera embriagadora / Mazing Run | — | Penetración con regate ajustado y giros |
| Proyectil veloz / Speeding Bullet | — | Desmarques y progresiones en velocidad |
| Trickster | §8.3 (técnico) | Skill move / regate flair en 1v1; útil en extremos y MCO técnicos |

**Mapeo adicional (nombres EN que podrían aparecer en el catálogo)**:
- **Willpower** = **Fuerza de voluntad** (§8.1) — boost progresivo habilidades de tiro hasta 8 acumulaciones
- **GK Directing Defense / GK Directing Defence** = **Dirección a la defensa** (§8.5)
- **GK Spirit Roar** = **Portero galvanizador** (§8.5)
- **Attack Trigger** = **Activador de ataque** (trait ofensivo); citar solo el efecto en ficha sin inventar números
- **Gamesmanship** = **Astucia** (§8.7) — NO confundir con Trickster (§8.3)

**Regla general para nombres EN no en lista**: si aparece una habilidad solo en inglés en la carta, reportar el efecto como escrito en la ficha Konami/eFootball Lab sin traducirla de forma creativa.

---

## 9. COMPETENCIAS Y DESARROLLO

### Flechas forma
- **Flecha Arriba**: forma óptima, prestaciones mejoradas
- **Flecha Abajo**: forma escasa, prestaciones reducidas
- **Neutro**: forma normal
La influencia en las prestaciones es significativa; considerar las flechas al elegir titulares.

### 9.1 Tipos Jugadores (Equipo de los Sueños)
- **Trending**: Nivel máximo, inmediatamente alineables
- **Destacado**: Personalizables
- **En realce**: Personalizables y potenciables
- **Épico**: Altas potencialidades crecimiento
- **Legendario**: Prestaciones elevadas y constantes
- **Estándar**: Jugadores base, personalizables

### 9.2 Competencia Posición
**Niveles**:
- **Bajo**: Ningún color
- **Intermedio**: Verde difuminado
- **Alto**: Verde brillante

**Aprendizaje**:
- Máximo 2 slots competencias posición
- Programas Añadir Posición para adquirir nuevas posiciones
- Porteros y campo no intercambiables

**Impacto en estilo (§2.2)**: Con competencia Baja o ausente, el estilo jugador **no se activa** (pasiva apagada si fuera de rol). La fuerza total baja; el jugador se posiciona peor respecto a cuando está en rol. Prioridad: preferir siempre jugadores en posición de competencia; si es inevitable fuera de rol, usar solo palancas tácticas e Instrucciones Individuales corrientes compatibles (p. ej. Anclaje cuando realmente aplique). No sugerir Deep Line: es legacy v6.

### 9.3 Valor Jugador (VJ)
Valoración máxima 5 estrellas (5★). Trending valorados en estadísticas iniciales. Otros tipos en estadísticas + potencial.

### 9.4 Fuerza base y Fuerza total
- **Fuerza base**: valoración pura de las estadísticas del jugador (General, Velocidad, Tiro, etc.).
- **Fuerza total**: tiene en cuenta fuerza base, alquimia de equipo, competencia en la posición, compatibilidad estilo con entrenador. Es el parámetro más representativo de la prestación efectiva en campo. Al aconsejar formación o sustituciones, considerar la fuerza total, no solo la base.

---

## 10. POLÍTICA COACH IA (referencia)

Las políticas de comportamiento para el Coach IA (errores a evitar, terminología, anti-inferencia, ejemplos respuesta) están definidas **en el system prompt** de la ruta `app/api/assistant-chat/route.js` (constantes `COACH_AI_POLICIES_IT` / `COACH_AI_POLICIES_EN`).

**Motivo**: son restricciones siempre activas, no "conocimiento contextual" a recuperar vía RAG. El RAG podría excluirlas por límite caracteres u orden secciones; en el system prompt están garantizadas en cada solicitud chat.

**Contramedidas** (`countermeasuresHelper.js`) y **analyze-match** tienen reglas específicas en los respectivos prompts.

---

**Versión**: 9.0.0 ENTERPRISE | **Fecha**: 17 Agosto 2026 | **Ruleset**: eFootball v6.0.0
**Principio**: FIJO vs CONFIGURABLE | **Terminología**: Oficial eFootball (ES/IT/EN) | **Compatibilidad**: read legacy / no new legacy
**Changelog 9.0.0**: alineación v6.0.0: Presión total/Overload; Formación fluida; modelo estilos jugador ataque/defensa sin recuento fijo; Clásico nº10 actualizado; Ofensivo y Línea baja marcados legacy y ya no recomendables; gameplay v6 §7.13; regla anti-inferencia para competencia coach Presión total.
**Changelog 8.7.0**: Traducción completa al español con terminología oficial eFootball. Añadidas siglas ES (POR/DFC/LTI/LTD/MCD/MC/MI/MD/MCO/EI/ED/DC/SD).
**Changelog 8.6.0**: §2.1 Posiciones activación correctas para TODOS los 24 estilos carta (alineadas a fuentes oficiales eFootball 2026: FIFPlay, Scribd Guide, Konami Help). Eliminadas siglas IT viejas sustituidas por posiciones oficiales EN. Añadidas notas "compatible pero IA inactiva" donde pertinente. Classic No. 10: confirmado SS/AMF only. Ancla: confirmado DMF only.
**Changelog 8.5.4**: §8.3 alias Pies magnéticos = Calamita ai piedi; §8.4 Shadow Hunt y Entrada a distancia; §8.11 tabla Showtime/sinónimos IT-EN para chat/contramedidas; eliminado duplicado Dominio balones altos.
**Changelog 8.5.3**: §7.10 regla build/meta funcional (movimientos, dificultades, datos cliente; Síntesis plantilla ≠ progresión POR).
**Changelog 8.5.2**: §2 alineado a los 24 estilos carta reales: eliminado *Punta avanzata* / Adv. Striker (no existen); *Punta arretrata* → **Delantero de apoyo**; aclarado Oportunista (línea fuera juego, no "defensa").
**Changelog 8.5**: §10 (NOTAS CRÍTICAS) movido de RAG a system prompt assistant-chat. Política Coach IA ahora en COACH_AI_POLICIES_* (siempre activas). RAG contiene solo mecánicas eFootball (§1-9).
**Changelog 8.4**: §2.2 Activación estilo y posición ("pasiva apagada si fuera de rol"): estilo no se activa fuera competencia; §9.2 cross-ref; regla 5 FUERA DE ROL en NOTAS CRÍTICAS; ejemplos respuesta sobre jugador que no rinde.
**Changelog 8.3**: §7.10 Consejos community Dream Team; §7.11 Equipo bloqueado + Smart Assist.
**Changelog 8.2**: §7.5 Movimientos vinculados a plantilla (estilos, habilidades, módulos); §7.6 Situaciones vinculadas a plantilla; §7.7 Matriz situación×datos×movimientos enterprise; contexto buildPersonalContext: forma, alt/peso, adversario para partido, votos partido; output coach: solo solución, sin razonamiento expuesto.
**Changelog 8.1**: Integración consejos community: §8.2 Pases (estadísticas vs habilidades, acumulabilidad iluminado/visionario, a quién dar por rol); §8.1 Cabezazo vs §8.4 Dominio balones altos; §8.7 Espíritu combativo, Super reserva, Astucia (gamesmanship – evitar en defensores); §8.10 Habilidades obligatorias por rol (línea defensiva, mediocentro, centrocampo, mco, delanteros), advertencias Recuperación NO mediocentro/ancla.
**Changelog 8.0**: Descripciones enriquecidas §2 §4 §8; §1.6 Umbrales/build; §9.4 Fuerza base/total; §7.5-7.7 Movimientos, Situaciones; §8.9 Prioridad habilidades.
