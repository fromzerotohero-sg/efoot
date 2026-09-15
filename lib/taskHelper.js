/**
 * Helper per gestione Task (Obiettivi Settimanali)
 *
 * Funzionalità:
 * - Generazione automatica task settimanali
 * - Aggiornamento progresso dopo ogni partita
 * - Validazione completamento
 *
 * REGOLA TASK (obbligatoria):
 * Ogni goal_type generato deve essere calcolabile esclusivamente da:
 * (a) dati partita caricati/salvati dall'utente (formation_played, result, team_stats, data_completeness),
 * (b) log di utilizzo (credit_transactions),
 * (c) profilo utente già compilato (common_problems, ecc.).
 * Non si generano task che dipendono da flag autodichiarati (es. "ho usato la formazione consigliata").
 * use_recommended_formation non viene più generato; la logica di progresso resta per task già esistenti.
 */

import { createClient } from "@supabase/supabase-js";
import { serverTranslations } from "./serverTranslations.js";

/**
 * Helper server-side per traduzioni (senza React)
 * @param {string} key - Chiave traduzione
 * @param {string} lang - Lingua ('it' | 'en', default: 'it')
 * @param {Object} params - Parametri per sostituzione (es. {count: 3})
 * @returns {string} - Testo tradotto
 */
export function translate(key, lang = "it", params = {}) {
  const safeLang = LANG_WHITELIST.includes(lang) ? lang : "it";
  const translation =
    serverTranslations[safeLang]?.[key] || serverTranslations.en?.[key] || key;
  if (typeof translation !== "string") return String(key);
  return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
}

/**
 * Genera obiettivi settimanali per un utente
 * @param {string} userId - User ID
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} serviceKey - Supabase Service Role Key
 * @param {Object} week - { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 * @returns {Promise<Array>} - Array di task generati
 */
/** Whitelist lingua: solo it o en (sicurezza) */
const LANG_WHITELIST = ["it", "en"];

export async function generateWeeklyTasksForUser(
  userId,
  supabaseUrl,
  serviceKey,
  week,
  lang = "it",
) {
  if (!userId || !supabaseUrl || !serviceKey || !week) {
    throw new Error(
      "Missing required parameters: userId, supabaseUrl, serviceKey, week",
    );
  }
  const safeLang = LANG_WHITELIST.includes(lang) ? lang : "it";

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Recupera dati utente necessari
    if (process.env.NODE_ENV !== "production")
      console.log(`[TaskHelper] Fetching profile for user ${userId}`);
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select(
        "user_id, first_name, last_name, common_problems, current_division",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[TaskHelper] Error fetching profile:", profileError);
      console.error(
        "[TaskHelper] Profile error details:",
        JSON.stringify(profileError, null, 2),
      );
      // Non bloccare, continua senza profilo (genererà task generici)
    } else {
      if (process.env.NODE_ENV !== "production")
        console.log(`[TaskHelper] Profile found: ${profile ? "yes" : "no"}`);
    }

    // 2. Recupera ultime 10 partite per analisi
    if (process.env.NODE_ENV !== "production")
      console.log(`[TaskHelper] Fetching matches for user ${userId}`);
    const { data: matches, error: matchesError } = await admin
      .from("matches")
      .select(
        "id, user_id, match_date, result, is_home, team_stats, data_completeness, recommended_formation_used, formation_played",
      )
      .eq("user_id", userId)
      .order("match_date", { ascending: false })
      .limit(10);

    if (matchesError) {
      console.error("[TaskHelper] Error fetching matches:", matchesError);
      console.error(
        "[TaskHelper] Matches error details:",
        JSON.stringify(matchesError, null, 2),
      );
      // Non bloccare, continua con dati parziali
    } else {
      if (process.env.NODE_ENV !== "production")
        console.log(`[TaskHelper] Matches found: ${matches?.length || 0}`);
    }

    // 3. Recupera pattern tattici
    if (process.env.NODE_ENV !== "production")
      console.log(`[TaskHelper] Fetching patterns for user ${userId}`);
    const { data: patterns, error: patternsError } = await admin
      .from("team_tactical_patterns")
      .select(
        "formation_usage, playing_style_usage, recurring_issues, last_50_matches_count",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (patternsError) {
      console.error("[TaskHelper] Error fetching patterns:", patternsError);
      // Non bloccare
    } else {
      if (process.env.NODE_ENV !== "production")
        console.log(`[TaskHelper] Patterns found: ${patterns ? "yes" : "no"}`);
    }

    // 4. Validazione week
    if (!week.start || !week.end) {
      throw new Error("Invalid week: start and end dates required");
    }

    // Validazione formato date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(week.start) || !dateRegex.test(week.end)) {
      throw new Error("Invalid date format in week object");
    }

    // 5. Genera task basati su dati disponibili (lingua da request, whitelist in route)
    const tasks = await generateTasksBasedOnData(
      profile,
      matches || [],
      patterns,
      safeLang,
    );

    if (process.env.NODE_ENV !== "production")
      console.log(
        `[TaskHelper] Generated ${tasks.length} tasks from data analysis`,
      );

    // Safety check: se non ci sono task generati, genera task generici (non dovrebbe mai succedere)
    if (!tasks || tasks.length === 0) {
      console.warn(
        `[TaskHelper] No tasks generated, falling back to generic tasks`,
      );
      const genericTasks = await generateTasksBasedOnData(
        null,
        [],
        null,
        safeLang,
      );
      if (genericTasks && genericTasks.length > 0) {
        tasks.push(...genericTasks);
        if (process.env.NODE_ENV !== "production")
          console.log(
            `[TaskHelper] Added ${genericTasks.length} generic tasks as fallback`,
          );
      } else {
        // Ultimo fallback: task hardcoded (solo tipi data-derived)
        tasks.push({
          goal_type: "complete_matches",
          goal_description: translate("goalCompleteMatches", safeLang, {
            count: 3,
          }),
          target_value: 3,
          difficulty: "easy",
        });
        tasks.push({
          goal_type: "increase_wins",
          goal_description: translate("goalIncreaseWins", safeLang, {
            count: 3,
          }),
          target_value: 3,
          difficulty: "easy",
        });
        tasks.push({
          goal_type: "use_ai_recommendations",
          goal_description: translate("goalUseAIRecommendations", safeLang, {
            count: 2,
          }),
          target_value: 2,
          difficulty: "easy",
        });
        if (process.env.NODE_ENV !== "production")
          console.log(
            `[TaskHelper] Added 3 hardcoded generic tasks as last fallback`,
          );
      }
    }

    // 6. Verifica se ci sono già task per questa settimana (o giorni vicini per tolleranza)
    if (process.env.NODE_ENV !== "production")
      console.log(
        `[TaskHelper] Checking for existing tasks for user ${userId}, week ${week.start}`,
      );

    // Calcola range +/- 3 giorni per tolleranza
    const wStart = new Date(week.start);
    const rangeStart = new Date(wStart);
    rangeStart.setDate(rangeStart.getDate() - 3);
    const rangeEnd = new Date(wStart);
    rangeEnd.setDate(rangeEnd.getDate() + 3);

    const rangeStartStr = rangeStart.toISOString().split("T")[0];
    const rangeEndStr = rangeEnd.toISOString().split("T")[0];

    const { data: existingTasks, error: checkError } = await admin
      .from("weekly_goals")
      .select("id, goal_type")
      .eq("user_id", userId)
      .gte("week_start_date", rangeStartStr)
      .lte("week_start_date", rangeEndStr);

    if (checkError) {
      console.error("[TaskHelper] Error checking existing tasks:", checkError);
      console.error(
        "[TaskHelper] Check error details:",
        JSON.stringify(checkError, null, 2),
      );
      // Continua comunque, potrebbe essere un errore temporaneo
    }

    if (process.env.NODE_ENV !== "production")
      console.log(
        `[TaskHelper] Existing tasks check result: ${existingTasks?.length || 0} tasks found in range ${rangeStartStr} - ${rangeEndStr}`,
      );

    if (existingTasks && existingTasks.length > 0) {
      if (process.env.NODE_ENV !== "production")
        console.log(
          `[TaskHelper] Tasks already exist for week range (found ${existingTasks.length}), skipping generation`,
        );
      // Restituisci i task esistenti invece di array vuoto
      const { data: existingTasksFull, error: fetchError } = await admin
        .from("weekly_goals")
        .select(
          "id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_at, completed_at",
        )
        .eq("user_id", userId)
        .gte("week_start_date", rangeStartStr)
        .lte("week_start_date", rangeEndStr)
        .order("created_at", { ascending: true });

      if (!fetchError && existingTasksFull) {
        if (process.env.NODE_ENV !== "production")
          console.log(
            `[TaskHelper] Returning ${existingTasksFull.length} existing tasks`,
          );
        return existingTasksFull;
      }
      return [];
    }

    if (process.env.NODE_ENV !== "production")
      console.log(
        `[TaskHelper] No existing tasks found for week ${week.start}, proceeding with generation`,
      );

    // 7. Salva task nel database
    if (tasks.length > 0) {
      const tasksToInsert = tasks
        .filter((task) => {
          // Validazione: target_value deve essere > 0
          if (!task.target_value || task.target_value <= 0) {
            console.warn(
              `[TaskHelper] Skipping task with invalid target_value: ${task.target_value}`,
            );
            return false;
          }
          return true;
        })
        .map((task) => ({
          user_id: userId,
          goal_type: task.goal_type,
          goal_description: task.goal_description,
          target_value: task.target_value,
          current_value: 0,
          difficulty: task.difficulty || "medium",
          week_start_date: week.start,
          week_end_date: week.end,
          status: "active",
          created_by: "system",
        }));

      if (process.env.NODE_ENV !== "production")
        console.log(
          `[TaskHelper] Inserting ${tasksToInsert.length} tasks into database for user ${userId}, week ${week.start}`,
        );

      // Usa INSERT ... ON CONFLICT per gestire eventuali duplicati (race condition)
      // Il constraint UNIQUE previene duplicati, ma gestiamo gracefully
      const { data: insertedTasks, error: insertError } = await admin
        .from("weekly_goals")
        .insert(tasksToInsert)
        .select(
          "id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_at",
        );
      // Nota: Supabase non supporta ON CONFLICT direttamente, ma il constraint UNIQUE lo gestirà

      if (insertError) {
        // Se è un errore di constraint UNIQUE (duplicato), non è critico (race condition)
        if (
          insertError.code === "23505" ||
          insertError.message?.includes("unique") ||
          insertError.message?.includes("duplicate")
        ) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[TaskHelper] Duplicate task detected (race condition), recovering existing tasks...",
            );
          }

          // Recupera i task esistenti invece di fallire
          const { data: existingTasksAfterError, error: fetchAfterError } =
            await admin
              .from("weekly_goals")
              .select(
                "id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_at, completed_at",
              )
              .eq("user_id", userId)
              .gte("week_start_date", rangeStartStr)
              .lte("week_start_date", rangeEndStr)
              .order("created_at", { ascending: true });

          if (
            !fetchAfterError &&
            existingTasksAfterError &&
            existingTasksAfterError.length > 0
          ) {
            if (process.env.NODE_ENV !== "production")
              console.log(
                `[TaskHelper] Recovered ${existingTasksAfterError.length} existing tasks after duplicate error`,
              );
            return existingTasksAfterError;
          }
        }

        // Se è un altro tipo di errore, loggalo come errore
        console.error("[TaskHelper] Error inserting tasks:", insertError);
        console.error(
          "[TaskHelper] Insert error details:",
          JSON.stringify(insertError, null, 2),
        );

        throw new Error(
          `Failed to save tasks: ${insertError.message || insertError}`,
        );
      }

      if (!insertedTasks || insertedTasks.length === 0) {
        console.error("[TaskHelper] No tasks were inserted despite no error");
        return [];
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[TaskHelper] Successfully generated and saved ${insertedTasks.length} tasks for user ${userId}, week ${week.start}`,
        );
        console.log(
          `[TaskHelper] Task IDs: ${insertedTasks.map((t) => t.id).join(", ")}`,
        );
      }

      // Inizializza subito current_value dalle partite già esistenti nella settimana.
      // Senza questo, utenti che hanno già partite vedrebbero current_value = 0
      // finché non salvano una nuova partita.
      try {
        await updateTasksProgressAfterMatch(userId, supabaseUrl, serviceKey, {
          id: "list-sync",
        });
        if (process.env.NODE_ENV !== "production")
          console.log(`[TaskHelper] Initial progress backfilled for new tasks`);
      } catch (syncErr) {
        // Non bloccante: i task esistono già, il progresso sarà aggiornato al prossimo salvataggio
        console.warn(
          "[TaskHelper] Initial backfill failed (non-critical):",
          syncErr?.message,
        );
      }

      // Rileggi i task aggiornati con i current_value corretti
      const { data: tasksWithProgress } = await admin
        .from("weekly_goals")
        .select(
          "id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_at, completed_at",
        )
        .eq("user_id", userId)
        .gte("week_start_date", rangeStartStr)
        .lte("week_start_date", rangeEndStr)
        .order("created_at", { ascending: true });

      return tasksWithProgress || insertedTasks;
    }

    console.warn(
      `[TaskHelper] No tasks to insert (tasks array was empty or all filtered out)`,
    );
    return [];
  } catch (error) {
    console.error("[TaskHelper] Error generating tasks:", error);
    throw error;
  }
}

/**
 * Genera task basati su dati utente
 * @param {Object} profile - Profilo utente
 * @param {Array} matches - Ultime partite
 * @param {Object} patterns - Pattern tattici
 * @param {string} lang - Lingua ('it' | 'en', whitelist in chiamante)
 * @returns {Promise<Array>} - Array di task
 */
async function generateTasksBasedOnData(
  profile,
  matches,
  patterns,
  lang = "it",
) {
  const tasks = [];
  const safeLang = LANG_WHITELIST.includes(lang) ? lang : "it";

  if (process.env.NODE_ENV !== "production")
    console.log(
      `[TaskHelper] generateTasksBasedOnData called with: matches=${matches?.length || 0}, profile=${!!profile}, patterns=${!!patterns}`,
    );

  // Se non ci sono abbastanza dati, genera task generici (sempre almeno 3 task)
  if (!matches || matches.length < 3) {
    if (process.env.NODE_ENV !== "production")
      console.log(
        `[TaskHelper] User has ${matches?.length || 0} matches (< 3), generating generic tasks`,
      );

    // Task 1: Completa partite (data: data_completeness)
    tasks.push({
      goal_type: "complete_matches",
      goal_description: translate("goalCompleteMatches", safeLang, {
        count: 3,
      }),
      target_value: 3,
      difficulty: "easy",
    });
    // Task 2: Vinci partite (data: result) — nessun task autodichiarato
    tasks.push({
      goal_type: "increase_wins",
      goal_description: translate("goalIncreaseWins", safeLang, { count: 3 }),
      target_value: 3,
      difficulty: "easy",
    });
    // Task 3: Usa consigli IA (data: credit_transactions)
    tasks.push({
      goal_type: "use_ai_recommendations",
      goal_description: translate("goalUseAIRecommendations", safeLang, {
        count: 2,
      }),
      target_value: 2,
      difficulty: "easy",
    });

    if (process.env.NODE_ENV !== "production")
      console.log(`[TaskHelper] Generated ${tasks.length} generic tasks`);
    return tasks; // Restituisci sempre almeno 3 task generici
  }

  if (process.env.NODE_ENV !== "production")
    console.log(
      `[TaskHelper] User has ${matches.length} matches (>= 3), generating personalized tasks`,
    );

  // Analizza performance
  const avgGoalsConceded = calculateAvgGoalsConceded(matches);
  const avgPossession = calculateAvgPossession(matches);
  const winRate = calculateWinRate(matches);

  // Task 1: Riduci gol subiti (se media > 2.0)
  if (avgGoalsConceded > 2.0) {
    const target = Math.max(0.1, avgGoalsConceded * 0.8); // Riduzione 20%, min 0.1
    if (target > 0 && target < avgGoalsConceded) {
      tasks.push({
        goal_type: "reduce_goals_conceded",
        goal_description: translate("goalReduceGoalsConceded", safeLang, {
          from: avgGoalsConceded.toFixed(1),
          to: target.toFixed(1),
        }),
        target_value: Math.round(target * 100) / 100, // Arrotonda a 2 decimali
        difficulty: "medium",
      });
    }
  }

  // Task 2: Migliora possesso (se < 50%)
  if (avgPossession < 50 && avgPossession >= 0) {
    const target = Math.min(100, avgPossession + 10); // +10%, max 100%
    if (target > avgPossession && target <= 100) {
      tasks.push({
        goal_type: "improve_possession",
        goal_description: translate("goalImprovePossession", safeLang, {
          from: avgPossession.toFixed(0),
          to: target.toFixed(0),
        }),
        target_value: Math.round(target * 100) / 100,
        difficulty: "medium",
      });
    }
  }

  // Task 3: Aumenta vittorie (se win rate < 50%)
  if (winRate < 50 && winRate >= 0) {
    tasks.push({
      goal_type: "increase_wins",
      goal_description: translate("goalIncreaseWins", safeLang, { count: 3 }),
      target_value: 3,
      difficulty: "hard",
    });
  }

  // Task 4: Clean sheet (partite senza gol subiti) - obiettivo semplice e oggettivo
  // Basato solo sui dati, non richiede formazioni specifiche
  const cleanSheets = matches.filter((m) => {
    const goalsConceded = extractGoalsConceded(m);
    return goalsConceded === 0;
  }).length;

  if (cleanSheets < 2) {
    tasks.push({
      goal_type: "clean_sheet_matches",
      goal_description: translate("goalCleanSheets", safeLang, { count: 2 }),
      target_value: 2,
      difficulty: "medium",
    });
  }

  // Task 5: Usa consigli IA (sempre presente)
  tasks.push({
    goal_type: "use_ai_recommendations",
    goal_description: translate("goalUseAIRecommendations", safeLang, {
      count: 2,
    }),
    target_value: 2,
    difficulty: "easy",
  });

  // Limita a 5 task max
  return tasks.slice(0, 5);
}

/**
 * Aggiorna progresso task dopo salvataggio partita
 * @param {string} userId - User ID
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} serviceKey - Supabase Service Role Key
 * @param {Object} matchData - Dati partita appena salvata
 * @returns {Promise<Array>} - Array di task aggiornati/completati
 */
/**
 * matchData: dati partita appena salvata, oppure oggetto sync { id: 'list-sync' } per ricalcolare
 * il progresso senza nuova partita (es. quando l'utente apre la lista task).
 */
export async function updateTasksProgressAfterMatch(
  userId,
  supabaseUrl,
  serviceKey,
  matchData,
) {
  if (!userId || !supabaseUrl || !serviceKey || !matchData) {
    console.warn(
      "[TaskHelper] Missing parameters for updateTasksProgressAfterMatch",
    );
    return [];
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (!matchData.id) {
      console.warn(
        "[TaskHelper] Invalid matchData (missing id) in updateTasksProgressAfterMatch",
      );
      return [];
    }

    // 2. Recupera tutti i task attivi (settimana corrente e passate): niente limite "ultime 2 settimane"
    // così task di settimane vecchie vengono aggiornati al prossimo sync (no task zombie)
    const currentWeek = getCurrentWeek();
    const { data: activeTasks, error: tasksError } = await admin
      .from("weekly_goals")
      .select(
        "id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_at, completed_at",
      )
      .eq("user_id", userId)
      .eq("status", "active")
      .lte("week_start_date", currentWeek.start);

    if (tasksError) {
      console.error("[TaskHelper] Error fetching active tasks:", tasksError);
      return [];
    }

    if (!activeTasks || activeTasks.length === 0) {
      return [];
    }

    // 3. Recupera partite per calcolo metriche:
    // - Ultime 20 partite (per calcoli che non richiedono settimana specifica)
    // - Partite nelle settimane dei task attivi (per calcoli specifici per settimana)
    const { data: recentMatches, error: matchesError } = await admin
      .from("matches")
      .select(
        "id, match_date, result, team_stats, data_completeness, formation_played, recommended_formation_used",
      )
      .eq("user_id", userId)
      .order("match_date", { ascending: false })
      .limit(20); // Ultime 20 per calcoli generali

    if (matchesError) {
      console.error(
        "[TaskHelper] Error fetching recent matches:",
        matchesError,
      );
    }

    // Recupera anche partite nelle settimane dei task attivi (per calcoli specifici)
    // Questo garantisce che anche partite più vecchie nella settimana del task vengano considerate
    const matchesInTaskWeeks = [];
    if (activeTasks && activeTasks.length > 0) {
      const taskWeekDates = activeTasks.map((t) => ({
        start: t.week_start_date,
        end: t.week_end_date,
      }));

      // Unisci tutte le settimane uniche
      const uniqueWeeks = Array.from(
        new Set(taskWeekDates.map((w) => `${w.start}_${w.end}`)),
      ).map((key) => {
        const [start, end] = key.split("_");
        return { start, end };
      });

      // Recupera partite per ogni settimana di task
      for (const week of uniqueWeeks) {
        const { data: weekMatches, error: weekError } = await admin
          .from("matches")
          .select(
            "id, match_date, result, team_stats, data_completeness, formation_played, recommended_formation_used",
          )
          .eq("user_id", userId)
          .gte("match_date", week.start)
          .lte("match_date", week.end)
          .order("match_date", { ascending: false });

        if (!weekError && weekMatches) {
          matchesInTaskWeeks.push(...weekMatches);
        }
      }
    }

    // Combina: recentMatches + matchesInTaskWeeks (rimuovi duplicati per id)
    const allMatchesMap = new Map();
    const allMatchesList = [...(recentMatches || []), ...matchesInTaskWeeks];

    allMatchesList.forEach((m) => {
      if (m && m.id && m.match_date && !allMatchesMap.has(m.id)) {
        allMatchesMap.set(m.id, m);
      }
    });

    const allMatches = Array.from(allMatchesMap.values());

    // Rimuovi newMatch da allMatches per evitare doppio conteggio:
    // dopo il salvataggio la partita è già nel DB → recentMatches la include già,
    // e calculateTaskProgress la aggiunge di nuovo tramite il parametro newMatch.
    const newMatchId =
      matchData && matchData.id && matchData.id !== "list-sync"
        ? matchData.id
        : null;
    const allMatchesForProgress = newMatchId
      ? allMatches.filter((m) => m.id !== newMatchId)
      : allMatches;

    // 4. Aggiorna ogni task attivo
    const updatedTasks = [];
    const completedTasks = [];

    for (const task of activeTasks) {
      try {
        // Validazione task
        if (
          !task.id ||
          !task.goal_type ||
          !task.target_value ||
          task.target_value <= 0
        ) {
          console.warn(`[TaskHelper] Skipping invalid task: ${task.id}`);
          continue;
        }

        const newProgress = await calculateTaskProgress(
          task,
          allMatchesForProgress,
          matchData,
          admin,
          userId,
        );

        // Validazione newProgress
        if (
          !newProgress ||
          typeof newProgress.current_value !== "number" ||
          newProgress.current_value < 0
        ) {
          console.warn(
            `[TaskHelper] Invalid progress calculated for task ${task.id}`,
          );
          continue;
        }

        // Aggiorna solo se progresso è cambiato (con tolleranza per float)
        const progressChanged =
          Math.abs(newProgress.current_value - (task.current_value || 0)) >
          0.01;

        if (progressChanged) {
          const updateData = {
            current_value: Math.round(newProgress.current_value * 100) / 100, // Arrotonda a 2 decimali
            updated_at: new Date().toISOString(),
          };

          // Se target raggiunto E task è ancora active, completa task
          const tolerance = 0.01;
          const roundedCurrent =
            Math.round(newProgress.current_value * 100) / 100;
          const roundedTarget = Math.round(task.target_value * 100) / 100;
          // reduce_goals_conceded: "lower is better" → completo quando current <= target
          const lowerIsBetter = task.goal_type === "reduce_goals_conceded";
          const isCompleted =
            task.target_value > 0 &&
            task.status === "active" &&
            (lowerIsBetter
              ? roundedCurrent <= roundedTarget + tolerance
              : roundedCurrent >= roundedTarget - tolerance);

          if (isCompleted) {
            if (process.env.NODE_ENV !== "production") {
              console.log(
                `[TaskHelper] Task ${task.id} (${task.goal_type}) completed: ${roundedCurrent} ${lowerIsBetter ? "<=" : ">="} ${roundedTarget} (tolerance: ${tolerance})`,
              );
            }
            updateData.status = "completed";
            updateData.completed_at = new Date().toISOString();
            completedTasks.push(task);
          }

          const { data: updatedTasksArray, error: updateError } = await admin
            .from("weekly_goals")
            .update(updateData)
            .eq("id", task.id)
            .select(
              "id, user_id, goal_type, goal_description, target_value, current_value, difficulty, week_start_date, week_end_date, status, created_at, completed_at",
            );

          if (updateError) {
            console.error(
              `[TaskHelper] Error updating task ${task.id}:`,
              updateError,
            );
          } else if (!updatedTasksArray || updatedTasksArray.length === 0) {
            console.warn(
              `[TaskHelper] Update returned no data for task ${task.id} (user ${userId}). Verify task exists and permissions.`,
            );
          } else {
            updatedTasks.push(updatedTasksArray[0]);
          }
        }
      } catch (taskError) {
        // Gestisci errore per singolo task senza bloccare gli altri
        console.error(
          `[TaskHelper] Error processing task ${task.id}:`,
          taskError,
        );
        continue;
      }
    }

    // 5. Se task completati, aggiorna AI Knowledge Score (async non-bloccante)
    // Nota: L'aggiornamento è async per non rallentare la response HTTP
    // Il client riceverà evento 'match-saved' e poi dovrà pollare fino a vedere cambiamento
    if (completedTasks.length > 0) {
      if (process.env.NODE_ENV !== "production")
        console.log(
          `[TaskHelper] ${completedTasks.length} task completati, avvio aggiornamento AI Knowledge...`,
        );

      // Notifica in-app per ogni task completato (fire-and-forget, fail-soft)
      import("./notifyUser")
        .then(async ({ notifyUser }) => {
          for (const task of completedTasks) {
            await notifyUser(userId, {
              type: "weekly_goals",
              title: "Obiettivo settimanale completato",
              body: task.goal_description || null,
              href: "/",
            });
          }
        })
        .catch((err) => {
          console.error("[TaskHelper] Failed to notify completed tasks:", err);
        });

      import("./aiKnowledgeHelper")
        .then(async ({ updateAIKnowledgeScore }) => {
          try {
            const result = await updateAIKnowledgeScore(
              userId,
              supabaseUrl,
              serviceKey,
            );
            if (process.env.NODE_ENV !== "production")
              console.log(
                `[TaskHelper] AI Knowledge aggiornato: score=${result.score}, level=${result.level}`,
              );
          } catch (err) {
            console.error(
              "[TaskHelper] Failed to update AI knowledge score:",
              err,
            );
          }
        })
        .catch((err) => {
          console.error(
            "[TaskHelper] Failed to import aiKnowledgeHelper:",
            err,
          );
        });
    }

    return updatedTasks;
  } catch (error) {
    console.error("[TaskHelper] Error updating tasks progress:", error);
    return [];
  }
}

/** Whitelist description credit_transactions per use_ai_recommendations (stesse operazioni che consumano HP). */
const AI_USAGE_DESCRIPTIONS_WHITELIST = [
  "assistant-chat",
  "analyze-match",
  "generate-countermeasures",
  "extract-formation",
  "extract-match-data",
  "extract-game-analysis",
  "extract-player",
  "extract-coach",
  "coach-feedback-chat",
  "save-coach-feedback",
];

/**
 * Calcola nuovo progresso per un task
 * @param {Object} task - Task da aggiornare
 * @param {Array} recentMatches - Ultime partite (con formation_played, recommended_formation_used se presenti)
 * @param {Object} newMatch - Nuova partita appena salvata
 * @param {Object} admin - Client Supabase service role (per query credit_transactions)
 * @param {string} userId - User ID dal token (solo lettura propri dati)
 * @returns {Promise<Object>} - { current_value: number }
 */
async function calculateTaskProgress(
  task,
  recentMatches,
  newMatch,
  admin,
  userId,
) {
  // Validazione input
  if (!task || !task.goal_type || !task.target_value) {
    console.warn("[TaskHelper] Invalid task in calculateTaskProgress");
    return { current_value: 0 };
  }

  // Validazione: target_value deve essere > 0
  if (task.target_value <= 0) {
    console.warn(
      `[TaskHelper] Invalid target_value for task ${task.id}: ${task.target_value}`,
    );
    return { current_value: 0 };
  }

  let currentValue = 0;

  // Usa settimana del task, non settimana corrente (per supportare task passati)
  const taskWeekStart = new Date(task.week_start_date);
  const taskWeekEnd = new Date(task.week_end_date);
  taskWeekEnd.setHours(23, 59, 59, 999);

  switch (task.goal_type) {
    case "reduce_goals_conceded":
      // Media gol subiti ultimi 5 match nella settimana del task (incluso nuovo se nella settimana)
      const matchesForAvg = recentMatches.filter((m) => {
        if (!m.match_date) return false;
        const matchDate = new Date(m.match_date);
        return matchDate >= taskWeekStart && matchDate <= taskWeekEnd;
      });

      // Aggiungi nuovo match se nella settimana del task
      if (newMatch && newMatch.match_date) {
        const newMatchDate = new Date(newMatch.match_date);
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd) {
          matchesForAvg.push(newMatch);
        }
      }

      // Prendi ultimi 5 match della settimana
      const recent5 = matchesForAvg.slice(0, 5);
      currentValue = calculateAvgGoalsConceded(recent5);
      break;

    case "increase_wins":
      // Conta vittorie nella settimana del task
      const winsInTaskWeek = recentMatches.filter((m) => {
        if (!m.match_date || !m.result) return false;
        const matchDate = new Date(m.match_date);
        return (
          matchDate >= taskWeekStart &&
          matchDate <= taskWeekEnd &&
          isWinForUser(m.result, m.is_home)
        );
      }).length;

      // Aggiungi nuova partita se è vittoria e nella settimana del task
      if (newMatch && newMatch.match_date && newMatch.result) {
        const newMatchDate = new Date(newMatch.match_date);
        if (
          newMatchDate >= taskWeekStart &&
          newMatchDate <= taskWeekEnd &&
          isWinForUser(newMatch.result, newMatch.is_home)
        ) {
          currentValue = winsInTaskWeek + 1;
        } else {
          currentValue = winsInTaskWeek;
        }
      } else {
        currentValue = winsInTaskWeek;
      }
      break;

    case "improve_possession":
      // Media possesso ultimi 5 match nella settimana del task
      const matchesForPoss = recentMatches.filter((m) => {
        if (!m.match_date) return false;
        const matchDate = new Date(m.match_date);
        return matchDate >= taskWeekStart && matchDate <= taskWeekEnd;
      });

      // Aggiungi nuovo match se nella settimana del task
      if (newMatch && newMatch.match_date) {
        const newMatchDate = new Date(newMatch.match_date);
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd) {
          matchesForPoss.push(newMatch);
        }
      }

      const recent5Poss = matchesForPoss.slice(0, 5);
      currentValue = calculateAvgPossession(recent5Poss);
      break;

    case "complete_matches":
      // Conta partite complete nella settimana del task
      const completeInTaskWeek = recentMatches.filter((m) => {
        if (!m.match_date) return false;
        const matchDate = new Date(m.match_date);
        return (
          matchDate >= taskWeekStart &&
          matchDate <= taskWeekEnd &&
          m.data_completeness === "complete"
        );
      }).length;

      // Aggiungi nuova partita se completa e nella settimana del task
      if (
        newMatch &&
        newMatch.match_date &&
        newMatch.data_completeness === "complete"
      ) {
        const newMatchDate = new Date(newMatch.match_date);
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd) {
          currentValue = completeInTaskWeek + 1;
        } else {
          currentValue = completeInTaskWeek;
        }
      } else {
        currentValue = completeInTaskWeek;
      }
      break;

    case "clean_sheet_matches": {
      // Conta clean sheet (partite senza gol subiti) nella settimana del task
      const cleanSheetsInWeek = recentMatches.filter((m) => {
        if (!m || !m.match_date) return false;
        const d = new Date(m.match_date);
        if (d < taskWeekStart || d > taskWeekEnd) return false;
        const goalsConceded = extractGoalsConceded(m);
        return goalsConceded === 0;
      }).length;

      if (newMatch && newMatch.match_date) {
        const newMatchDate = new Date(newMatch.match_date);
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd) {
          const newGoalsConceded = extractGoalsConceded(newMatch);
          if (newGoalsConceded === 0) {
            currentValue = cleanSheetsInWeek + 1;
          } else {
            currentValue = cleanSheetsInWeek;
          }
        } else {
          currentValue = cleanSheetsInWeek;
        }
      } else {
        currentValue = cleanSheetsInWeek;
      }
      break;
    }

    case "use_recommended_formation": {
      const usedInWeek = recentMatches.filter((m) => {
        if (!m || !m.match_date) return false;
        const d = new Date(m.match_date);
        if (d < taskWeekStart || d > taskWeekEnd) return false;
        return m.recommended_formation_used === true;
      }).length;
      if (
        newMatch &&
        newMatch.match_date &&
        newMatch.recommended_formation_used === true
      ) {
        const newMatchDate = new Date(newMatch.match_date);
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd) {
          currentValue = usedInWeek + 1;
        } else {
          currentValue = usedInWeek;
        }
      } else {
        currentValue = usedInWeek;
      }
      break;
    }

    case "use_ai_recommendations": {
      if (!admin || !userId) {
        currentValue = task.current_value || 0;
        break;
      }
      const weekStartTs = taskWeekStart.toISOString();
      const weekEndTs = taskWeekEnd.toISOString();
      const { data: txList, error: txError } = await admin
        .from("credit_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "usage")
        .in("description", AI_USAGE_DESCRIPTIONS_WHITELIST)
        .gte("created_at", weekStartTs)
        .lte("created_at", weekEndTs);
      if (txError) {
        console.warn(
          "[TaskHelper] credit_transactions query failed for use_ai_recommendations:",
          txError.message,
        );
        currentValue = task.current_value || 0;
      } else {
        currentValue = (txList && txList.length) || 0;
      }
      break;
    }

    default:
      currentValue = task.current_value || 0;
  }

  // Validazione: current_value non può essere negativo
  currentValue = Math.max(0, currentValue);

  // Se current_value > target_value ma task non è ancora completato,
  // significa che target è stato superato (OK, verrà completato)
  // Non limitiamo current_value perché potrebbe essere intenzionale (superare target)

  return { current_value: currentValue };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Estrae gol subiti da una singola partita
 * @param {Object} match - Dati partita
 * @returns {number} - Gol subiti o -1 se non calcolabile
 */
function extractGoalsConceded(match) {
  if (!match) return -1;

  // Il risultato salvato dall'app e normalizzato come: gol utente - gol avversario.
  if (match.result && typeof match.result === "string") {
    const parts = match.result.trim().split("-");
    if (parts.length === 2) {
      const userGoals = parseInt(parts[0], 10);
      const opponentGoals = parseInt(parts[1], 10);
      if (!isNaN(userGoals) && !isNaN(opponentGoals)) {
        return opponentGoals;
      }
    }
  }

  const goalsFromStats = match.team_stats?.goals_conceded;
  if (typeof goalsFromStats === "number" && goalsFromStats >= 0) {
    return goalsFromStats;
  }

  return -1;
}

/**
 * Calcola media gol subiti
 */
function calculateAvgGoalsConceded(matches) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return 0;

  let totalGoals = 0;
  let count = 0;

  matches.forEach((match) => {
    if (!match) return;

    if (match.result && typeof match.result === "string") {
      // Parse result: "6-1" -> gol utente - gol avversario.
      const parts = match.result.trim().split("-");
      if (parts.length === 2) {
        const userGoals = parseInt(parts[0], 10);
        const opponentGoals = parseInt(parts[1], 10);
        if (
          !isNaN(userGoals) &&
          !isNaN(opponentGoals) &&
          userGoals >= 0 &&
          opponentGoals >= 0
        ) {
          totalGoals += opponentGoals;
          count++;
        }
      }
    } else {
      const goalsConceded = match.team_stats?.goals_conceded;
      if (typeof goalsConceded === "number" && goalsConceded >= 0) {
        totalGoals += goalsConceded;
        count++;
      }
    }
  });

  return count > 0 ? Math.round((totalGoals / count) * 100) / 100 : 0;
}

/**
 * Calcola media possesso
 */
function calculateAvgPossession(matches) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return 0;

  let totalPossession = 0;
  let count = 0;

  matches.forEach((match) => {
    if (!match) return;

    const possession = match.team_stats?.possession;
    // Validazione: possesso deve essere tra 0 e 100
    if (
      typeof possession === "number" &&
      possession >= 0 &&
      possession <= 100
    ) {
      totalPossession += possession;
      count++;
    }
  });

  return count > 0 ? Math.round((totalPossession / count) * 100) / 100 : 0;
}

/**
 * Calcola win rate
 */
function calculateWinRate(matches) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return 0;

  let wins = 0;
  let validMatches = 0;

  matches.forEach((match) => {
    if (!match || !match.result) return;
    validMatches++;
    if (isWinForUser(match.result, match.is_home)) wins++;
  });

  return validMatches > 0
    ? Math.round((wins / validMatches) * 100 * 100) / 100
    : 0;
}

/**
 * Verifica se risultato è vittoria (team1 vince, formato "X-Y")
 */
function isWin(result) {
  if (!result || typeof result !== "string") return false;
  const upper = result.toUpperCase();
  return (
    upper.includes("W") ||
    upper.includes("VITTORIA") ||
    upper.includes("WIN") ||
    (/^\d+-\d+$/.test(result) &&
      parseInt(result.split("-")[0]) > parseInt(result.split("-")[1]))
  );
}

/**
 * Vittoria per l'utente. `result` e normalizzato come gol utente - gol avversario.
 */
function isWinForUser(result, _isHome) {
  if (!result || typeof result !== "string") return false;
  const upper = result.toUpperCase();
  if (
    upper.includes("W") ||
    upper.includes("VITTORIA") ||
    upper.includes("WIN")
  )
    return true;
  if (
    upper.includes("L") ||
    upper.includes("SCONFITTA") ||
    upper.includes("LOSS")
  )
    return false;
  if (!/^\d+-\d+$/.test(result)) return false;
  const [a, b] = result.split("-").map((s) => parseInt(s, 10));
  return a > b;
}

/**
 * Verifica se risultato è sconfitta (team1 perde)
 */
function isLoss(result) {
  if (!result || typeof result !== "string") return false;
  const upper = result.toUpperCase();
  return (
    upper.includes("L") ||
    upper.includes("SCONFITTA") ||
    upper.includes("LOSS") ||
    (/^\d+-\d+$/.test(result) &&
      parseInt(result.split("-")[0]) < parseInt(result.split("-")[1]))
  );
}

/**
 * Sconfitta per l'utente. `result` e normalizzato come gol utente - gol avversario.
 */
function isLossForUser(result, _isHome) {
  if (!result || typeof result !== "string") return false;
  const upper = result.toUpperCase();
  if (
    upper.includes("L") ||
    upper.includes("SCONFITTA") ||
    upper.includes("LOSS")
  )
    return true;
  if (
    upper.includes("W") ||
    upper.includes("VITTORIA") ||
    upper.includes("WIN")
  )
    return false;
  if (!/^\d+-\d+$/.test(result)) return false;
  const [a, b] = result.split("-").map((s) => parseInt(s, 10));
  return a < b;
}

/**
 * Formatta data come YYYY-MM-DD in UTC
 */
function toUTCDateString(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Ottieni settimana corrente (Lunedì - Domenica) usando UTC
 */
export function getCurrentWeek() {
  const now = new Date();
  // Crea copia per non modificare originale
  const monday = new Date(now);
  const dayOfWeek = monday.getUTCDay();
  const diff = monday.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lunedì
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    start: toUTCDateString(monday),
    end: toUTCDateString(sunday),
  };
}
