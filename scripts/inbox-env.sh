# Sets the two variables scripts/inbox.mjs needs, for this shell session only.
# The key is read from the macOS Keychain, so nothing secret is written to disk here.
#
#   store once:   security add-generic-password -a "$USER" -s cycling-cities-inbox -w '<key>' -U
#   each session: source scripts/inbox-env.sh
#
# This file holds no secret and is committed on purpose.
export SUPABASE_URL="https://opjipfsyxyxghbjvxtur.supabase.co"
if key=$(security find-generic-password -a "$USER" -s cycling-cities-inbox -w 2>/dev/null); then
  export SUPABASE_SERVICE_ROLE_KEY="$key"
  echo "inbox: key loaded from the Keychain for this shell session"
else
  echo "inbox: no key in the Keychain yet. Store it once with:"
  echo "  security add-generic-password -a \"\$USER\" -s cycling-cities-inbox -w '<key>' -U"
fi
