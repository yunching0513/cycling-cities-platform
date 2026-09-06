# scripts

`inbox.mjs` is the maintainer's side of the contribution inbox described in
`docs/database/README.md`. It needs Node 18 or later and two environment variables for
the length of a shell session. On the maintainer's Mac the key lives in the Keychain and
`inbox-env.sh` loads it:

    security add-generic-password -a "$USER" -s cycling-cities-inbox -w '<key>' -U   # once
    source scripts/inbox-env.sh                                                        # each session

Anywhere else, set the two variables by hand:

    export SUPABASE_URL=https://<project>.supabase.co
    export SUPABASE_SERVICE_ROLE_KEY=<service role key>

The service role key bypasses every database policy. Never write it into a file in this
repository, into `config.js`, or into a deployed page. Either the legacy `service_role`
key or a new-style `sb_secret_…` key works.

    node scripts/inbox.mjs list                       # what is waiting
    node scripts/inbox.mjs show <id>                  # one row in full
    node scripts/inbox.mjs verify <id> --by "Name"    # sign it; refused if the row names no source
    node scripts/inbox.mjs export --dry               # what export would write
    node scripts/inbox.mjs export                     # write data/*.json, then read the diff and commit

Export never touches the published site by itself: it edits the JSON files in the working
tree, and the site changes when the commit is pushed.
