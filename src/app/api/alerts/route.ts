import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/alerts — list the current user's alerts
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("species_alerts")
    .select(
      "id, species_id, location_id, enabled, created_at, species:species_id(id, name, scientific_name, slug, hero_image_url), locations:location_id(id, name, slug, region_id)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: data });
}

// POST /api/alerts/subscribe — create a new alert
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { speciesId, locationId } = body as {
    speciesId: string;
    locationId: string;
  };

  if (!speciesId || !locationId) {
    return NextResponse.json(
      { error: "speciesId and locationId are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("species_alerts")
    .upsert(
      {
        user_id: user.id,
        species_id: speciesId,
        location_id: locationId,
        enabled: true,
      },
      { onConflict: "user_id,species_id,location_id" }
    )
    .select("id, species_id, location_id, enabled, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert: data }, { status: 201 });
}
