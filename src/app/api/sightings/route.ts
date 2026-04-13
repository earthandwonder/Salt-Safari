import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { speciesId, locationId, sightedAt, quantity, notes } = body as {
    speciesId: string;
    locationId: string;
    sightedAt?: string;
    quantity?: number;
    notes?: string;
  };

  if (!speciesId || !locationId) {
    return NextResponse.json(
      { error: "speciesId and locationId are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("sightings")
    .insert({
      user_id: user.id,
      species_id: speciesId,
      location_id: locationId,
      sighted_at: sightedAt || new Date().toISOString().split("T")[0],
      quantity: quantity ?? 1,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const locationId = searchParams.get("locationId");
  const date = searchParams.get("date");

  let query = supabase
    .from("sightings")
    .select(
      "id, species_id, location_id, sighted_at, quantity, notes, created_at"
    )
    .eq("user_id", user.id)
    .order("sighted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (locationId) {
    query = query.eq("location_id", locationId);
  }
  if (date) {
    query = query.eq("sighted_at", date);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
