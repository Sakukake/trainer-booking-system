"use strict";

const SUPABASE_URL =
  "https://mcjwbiyfueodztctsfmr.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_3xzx8ObuC4aMgUPpMikQvg_Ju26GYjB";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );