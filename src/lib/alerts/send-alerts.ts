import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { render } from "@react-email/components";
import SeasonAlertEmail from "@/emails/season-alert";

type AlertWithDetails = {
  id: string;
  user_id: string;
  species_id: string;
  location_id: string;
  enabled: boolean;
  species: {
    name: string;
    scientific_name: string | null;
    slug: string;
    hero_image_url: string | null;
  };
  locations: {
    name: string;
    slug: string;
    region_id: string;
  };
};

type LocationSpeciesRow = {
  id: string;
  species_id: string;
  location_id: string;
};

type SeasonalityRow = {
  location_species_id: string;
  month: number;
  likelihood: string;
};

type UserRow = {
  id: string;
  display_name: string | null;
  notification_prefs: string;
};

type RegionRow = {
  id: string;
  slug: string;
};

/**
 * Send season alerts to all users who have opted in.
 *
 * Logic: Only notify when a species COMES INTO season —
 * i.e. previous month was rare/absent AND current month is common/occasional.
 */
export async function sendSeasonAlerts(options?: { dryRun?: boolean }) {
  const dryRun = options?.dryRun ?? false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "alerts@saltsafari.app";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://saltsafari.app";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  if (!resendApiKey && !dryRun) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;

  console.log(
    `[alerts] Running for month ${currentMonth} (previous: ${previousMonth}). Dry run: ${dryRun}`
  );

  // 1. Fetch all enabled alerts with species and location info
  const { data: alerts, error: alertsErr } = await supabase
    .from("species_alerts")
    .select(
      "id, user_id, species_id, location_id, enabled, species:species_id(name, scientific_name, slug, hero_image_url), locations:location_id(name, slug, region_id)"
    )
    .eq("enabled", true);

  if (alertsErr) {
    throw new Error(`Failed to fetch alerts: ${alertsErr.message}`);
  }

  if (!alerts || alerts.length === 0) {
    console.log("[alerts] No enabled alerts found.");
    return { sent: 0, skipped: 0 };
  }

  console.log(`[alerts] Found ${alerts.length} enabled alerts.`);

  // 2. Get all unique species+location combos, look up location_species IDs
  const combos = [
    ...new Set(
      (alerts as unknown as AlertWithDetails[]).map(
        (a) => `${a.species_id}|${a.location_id}`
      )
    ),
  ];

  // Batch fetch location_species records
  const speciesIds = [
    ...new Set((alerts as unknown as AlertWithDetails[]).map((a) => a.species_id)),
  ];
  const locationIds = [
    ...new Set(
      (alerts as unknown as AlertWithDetails[])
        .map((a) => a.location_id)
        .filter(Boolean)
    ),
  ];

  // Fetch location_species in batches of 200
  const allLocationSpecies: LocationSpeciesRow[] = [];
  for (let i = 0; i < speciesIds.length; i += 200) {
    const batch = speciesIds.slice(i, i + 200);
    const { data } = await supabase
      .from("location_species")
      .select("id, species_id, location_id")
      .in("species_id", batch)
      .in("location_id", locationIds);
    if (data) allLocationSpecies.push(...(data as LocationSpeciesRow[]));
  }

  // Build lookup: "speciesId|locationId" -> location_species_id
  const lsLookup = new Map<string, string>();
  for (const ls of allLocationSpecies) {
    lsLookup.set(`${ls.species_id}|${ls.location_id}`, ls.id);
  }

  // 3. Fetch seasonality for current and previous month
  const lsIds = [...new Set(allLocationSpecies.map((ls) => ls.id))];
  const allSeasonality: SeasonalityRow[] = [];
  for (let i = 0; i < lsIds.length; i += 200) {
    const batch = lsIds.slice(i, i + 200);
    const { data } = await supabase
      .from("species_seasonality")
      .select("location_species_id, month, likelihood")
      .in("location_species_id", batch)
      .in("month", [currentMonth, previousMonth]);
    if (data) allSeasonality.push(...(data as SeasonalityRow[]));
  }

  // Build lookup: "ls_id|month" -> likelihood
  const seasonLookup = new Map<string, string>();
  for (const s of allSeasonality) {
    seasonLookup.set(`${s.location_species_id}|${s.month}`, s.likelihood);
  }

  // 4. Filter alerts: only where species COMES INTO season
  type QualifiedAlert = AlertWithDetails & { likelihood: string };
  const qualifiedAlerts: QualifiedAlert[] = [];

  for (const alert of alerts as unknown as AlertWithDetails[]) {
    const lsId = lsLookup.get(`${alert.species_id}|${alert.location_id}`);
    if (!lsId) continue;

    const currentLikelihood = seasonLookup.get(`${lsId}|${currentMonth}`);
    const previousLikelihood = seasonLookup.get(`${lsId}|${previousMonth}`);

    // Species must be common or occasional THIS month
    if (
      currentLikelihood !== "common" &&
      currentLikelihood !== "occasional"
    ) {
      continue;
    }

    // AND must NOT have been common or occasional LAST month (transition into season)
    if (
      previousLikelihood === "common" ||
      previousLikelihood === "occasional"
    ) {
      continue;
    }

    qualifiedAlerts.push({
      ...alert,
      likelihood: currentLikelihood,
    });
  }

  console.log(
    `[alerts] ${qualifiedAlerts.length} alerts qualify (species transitioning into season).`
  );

  if (qualifiedAlerts.length === 0) {
    return { sent: 0, skipped: alerts.length };
  }

  // 5. Group by user
  const byUser = new Map<string, QualifiedAlert[]>();
  for (const alert of qualifiedAlerts) {
    const existing = byUser.get(alert.user_id) ?? [];
    existing.push(alert);
    byUser.set(alert.user_id, existing);
  }

  // 6. Fetch user details
  const userIds = [...byUser.keys()];
  const allUsers: UserRow[] = [];
  for (let i = 0; i < userIds.length; i += 200) {
    const batch = userIds.slice(i, i + 200);
    const { data } = await supabase
      .from("users")
      .select("id, display_name, notification_prefs")
      .in("id", batch);
    if (data) allUsers.push(...(data as UserRow[]));
  }

  const userLookup = new Map<string, UserRow>();
  for (const u of allUsers) {
    userLookup.set(u.id, u);
  }

  // Fetch user emails from auth.users via admin API
  const userEmails = new Map<string, string>();
  for (const userId of userIds) {
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(userId);
    if (user?.email) {
      userEmails.set(userId, user.email);
    }
  }

  // 7. Fetch region slugs for location links
  const regionIds = [
    ...new Set(
      qualifiedAlerts
        .map((a) => a.locations?.region_id)
        .filter(Boolean) as string[]
    ),
  ];
  const regionLookup = new Map<string, string>();
  if (regionIds.length > 0) {
    const { data: regions } = await supabase
      .from("regions")
      .select("id, slug")
      .in("id", regionIds);
    if (regions) {
      for (const r of regions as RegionRow[]) {
        regionLookup.set(r.id, r.slug);
      }
    }
  }

  // 8. Send emails
  let sent = 0;
  let skipped = 0;

  for (const [userId, userAlerts] of byUser.entries()) {
    const user = userLookup.get(userId);
    const email = userEmails.get(userId);

    if (!email) {
      console.log(`[alerts] No email for user ${userId}, skipping.`);
      skipped += userAlerts.length;
      continue;
    }

    if (user?.notification_prefs === "none") {
      console.log(`[alerts] User ${userId} has notifications disabled, skipping.`);
      skipped += userAlerts.length;
      continue;
    }

    const displayName = user?.display_name || email.split("@")[0];

    const speciesData = userAlerts.map((a) => ({
      speciesName: a.species.name,
      scientificName: a.species.scientific_name,
      heroImageUrl: a.species.hero_image_url,
      likelihood: a.likelihood,
      locationName: a.locations.name,
      speciesSlug: a.species.slug,
      locationSlug: a.locations.slug,
      regionSlug: regionLookup.get(a.locations.region_id) ?? "",
    }));

    // Subject line
    const subject =
      userAlerts.length === 1
        ? `${userAlerts[0].species.name} are at ${userAlerts[0].locations.name} this month`
        : `${userAlerts.length} species are in season this month`;

    if (dryRun) {
      console.log(
        `[alerts][dry-run] Would send to ${email}: "${subject}" (${speciesData.length} species)`
      );
      sent += userAlerts.length;
      continue;
    }

    try {
      const html = await render(
        SeasonAlertEmail({
          displayName,
          species: speciesData,
          baseUrl,
        })
      );

      await resend!.emails.send({
        from: `Salt Safari <${fromEmail}>`,
        to: email,
        subject,
        html,
      });

      console.log(
        `[alerts] Sent to ${email}: "${subject}" (${speciesData.length} species)`
      );
      sent += userAlerts.length;
    } catch (err) {
      console.error(
        `[alerts] Failed to send to ${email}:`,
        err instanceof Error ? err.message : err
      );
      skipped += userAlerts.length;
    }
  }

  console.log(
    `[alerts] Done. Sent: ${sent}, Skipped: ${skipped}`
  );

  return { sent, skipped };
}
