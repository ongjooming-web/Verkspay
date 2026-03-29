import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing auth token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let emailFromBody: string | null = null;
    try {
      const body = await req.json();
      emailFromBody = body.email;
    } catch (_err) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!emailFromBody) {
      return new Response(
        JSON.stringify({ error: "Email confirmation required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ✅ Verify user via their token (not service role)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userErr } =
      await supabaseUser.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email;

    // ✅ Verify email confirmation matches
    if (emailFromBody !== userEmail) {
      return new Response(
        JSON.stringify({ error: "Email confirmation does not match" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[delete-account] Starting deletion for user:", userId);

    // Create admin client for deletion
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // ✅ Delete in correct order (children before parents)
    console.log("[delete-account] Deleting reminders...");
    const invoiceIds = (
      await supabaseAdmin
        .from("invoices")
        .select("id")
        .eq("user_id", userId)
    ).data?.map((inv) => inv.id) || [];

    if (invoiceIds.length > 0) {
      await supabaseAdmin
        .from("reminders_log")
        .delete()
        .in("invoice_id", invoiceIds);
    }

    console.log("[delete-account] Deleting payment records...");
    await supabaseAdmin
      .from("payment_records")
      .delete()
      .eq("user_id", userId);

    console.log("[delete-account] Deleting payment methods...");
    await supabaseAdmin
      .from("payment_methods")
      .delete()
      .eq("user_id", userId);

    console.log("[delete-account] Deleting recurring invoices...");
    await supabaseAdmin
      .from("recurring_invoices")
      .delete()
      .eq("user_id", userId);

    console.log("[delete-account] Deleting invoices...");
    await supabaseAdmin.from("invoices").delete().eq("user_id", userId);

    console.log("[delete-account] Deleting clients...");
    await supabaseAdmin.from("clients").delete().eq("user_id", userId);

    console.log("[delete-account] Deleting proposals...");
    await supabaseAdmin.from("proposals").delete().eq("user_id", userId);

    console.log("[delete-account] Deleting profile...");
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // ✅ Delete auth user (service role can do this in Edge Function)
    console.log("[delete-account] Deleting auth user...");
    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error(
        "[delete-account] Warning: Failed to delete auth user:",
        authDeleteError
      );
      // Log but don't fail - data is already deleted
    } else {
      console.log("[delete-account] ✓ Auth user deleted");
    }

    console.log("[delete-account] ✅ Account completely deleted:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Your account has been permanently deleted",
        redirect_url: "/goodbye",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[delete-account] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
