#!/bin/bash
# Migration Runner Script
# This script helps you run Supabase migrations in the correct order

echo "🚀 AndamanBazaar Database Migration Runner"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: This script will show you the migration SQL."
echo "    You need to copy and paste each migration into Supabase SQL Editor manually."
echo ""
echo "📍 Supabase SQL Editor should be open in your browser."
echo ""

# Array of migration files in order
migrations=(
  "001_recommendations_schema.sql"
  "002_chat_enhancements.sql"
  "003_security_enhancements.sql"
)

migration_dir="$(dirname "$0")"

for i in "${!migrations[@]}"; do
  migration_file="${migrations[$i]}"
  migration_path="$migration_dir/$migration_file"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📄 MIGRATION $((i+1))/3: $migration_file"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  if [ ! -f "$migration_path" ]; then
    echo "❌ Error: Migration file not found: $migration_path"
    exit 1
  fi
  
  echo "📋 INSTRUCTIONS:"
  echo "1. Copy the SQL below (CMD+A, CMD+C)"
  echo "2. Paste into Supabase SQL Editor"
  echo "3. Click 'RUN' button"
  echo "4. Wait for 'Success' message"
  echo "5. Press ENTER here to continue to next migration"
  echo ""
  echo "────────────────────────────────────────────────────"
  echo "SQL TO COPY:"
  echo "────────────────────────────────────────────────────"
  echo ""
  
  # Display the SQL content
  cat "$migration_path"
  
  echo ""
  echo "────────────────────────────────────────────────────"
  echo ""
  
  # Wait for user confirmation
  read -p "✅ Press ENTER after running migration $((i+1))/3 in Supabase..."
  
  echo "✓ Migration $((i+1))/3 marked as complete!"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 All migrations complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 VERIFICATION:"
echo "Run this query in Supabase to verify all tables were created:"
echo ""
echo "SELECT table_name FROM information_schema.tables"
echo "WHERE table_schema = 'public'"
echo "AND table_name IN ("
echo "  'user_interactions', 'recommendations_cache', 'trending_listings',"
echo "  'chat_typing_events', 'rate_limits', 'audit_logs', 'security_events'"
echo ");"
echo ""
echo "Expected: 7 tables"
echo ""
