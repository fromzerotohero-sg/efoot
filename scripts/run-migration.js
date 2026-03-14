/**
 * Script helper per eseguire migration SQL su Supabase
 * USO: node scripts/run-migration.js migrations/create_team_tactical_settings.sql
 * 
 * ⚠️ ATTENZIONE: Questo script usa SERVICE_ROLE_KEY (bypassa RLS)
 * Usa solo in ambiente di sviluppo o con estrema cautela
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Leggi variabili d'ambiente
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Errore: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere in .env.local')
  process.exit(1)
}

// Leggi file migration da argomento
const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('❌ Errore: Specifica il file migration')
  console.error('   Esempio: node scripts/run-migration.js migrations/create_team_tactical_settings.sql')
  process.exit(1)
}

const migrationPath = path.join(process.cwd(), migrationFile)
if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Errore: File non trovato: ${migrationPath}`)
  process.exit(1)
}

const sql = fs.readFileSync(migrationPath, 'utf8')

// Crea client Supabase con Service Role (bypassa RLS)
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runMigration() {
  console.log(`\n🚀 Esecuzione migration: ${migrationFile}\n`)
  
  try {
    // Supabase non ha un metodo diretto per eseguire SQL arbitrario via JS client
    // Dobbiamo usare REST API o rpc()
    // Alternativa: usa psql o Supabase CLI
    
    console.log('⚠️  Supabase JS client non supporta esecuzione SQL DDL diretto.')
    console.log('📋 Esegui manualmente nel Supabase Dashboard:\n')
    console.log('1. Vai su: https://supabase.com/dashboard/project/[PROJECT_ID]/sql/new')
    console.log('2. Incolla il contenuto del file:')
    console.log('─'.repeat(60))
    console.log(sql)
    console.log('─'.repeat(60))
    console.log('\n✅ Oppure usa Supabase CLI:')
    console.log(`   supabase db push --file ${migrationFile}\n`)
    
    // Verifica se la tabella esiste già
    const { data: tables, error: checkError } = await supabase
      .from('team_tactical_settings')
      .select('id')
      .limit(1)
    
    if (!checkError && tables) {
      console.log('✅ Tabella team_tactical_settings esiste già')
    } else if (checkError?.code === '42P01') {
      console.log('ℹ️  Tabella team_tactical_settings non esiste ancora (normale se migration non eseguita)')
    }
    
  } catch (err) {
    console.error('❌ Errore:', err.message)
    process.exit(1)
  }
}

runMigration()
