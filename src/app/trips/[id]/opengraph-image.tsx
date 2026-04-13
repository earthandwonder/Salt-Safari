import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "Trip report on Salt Safari";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ─── Trip ID parsing (same as page.tsx) ──────────────────────────
function parseTripId(tripId: string): { userId: string; locationSlug: string; date: string } | null {
  if (tripId.length < 48) return null;
  const userId = tripId.slice(0, 36);
  const date = tripId.slice(-10);
  const locationSlug = tripId.slice(37, -11);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(userId)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!locationSlug) return null;
  return { userId, locationSlug, date };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = parseTripId(id);
  if (!parsed) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#062133", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "white", fontSize: 40, fontFamily: "serif" }}>Salt Safari</span>
      </div>,
      { ...size },
    );
  }

  const supabase = await createClient();

  // Fetch data
  const { data: user } = await supabase
    .from("users")
    .select("display_name, username")
    .eq("id", parsed.userId)
    .single();

  const { data: location } = await supabase
    .from("locations")
    .select("id, name")
    .eq("slug", parsed.locationSlug)
    .single();

  const { data: sightings } = location
    ? await supabase
        .from("sightings")
        .select("species_id")
        .eq("user_id", parsed.userId)
        .eq("location_id", location.id)
        .eq("sighted_at", parsed.date)
    : { data: null };

  if (!user || !location || !sightings) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#062133", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "white", fontSize: 40, fontFamily: "serif" }}>Salt Safari</span>
      </div>,
      { ...size },
    );
  }

  // Fetch species photos (up to 6)
  const speciesIds = sightings.map((s) => s.species_id).slice(0, 6);
  const { data: speciesList } = await supabase
    .from("species")
    .select("hero_image_url, name")
    .in("id", speciesIds);

  const photos = (speciesList ?? [])
    .filter((sp) => sp.hero_image_url)
    .slice(0, 6);

  const { count: totalAtLocation } = await supabase
    .from("location_species")
    .select("id", { count: "exact", head: true })
    .eq("location_id", location.id);

  const displayName = user.display_name || user.username || "A diver";
  const speciesCount = sightings.length;
  const total = totalAtLocation ?? 0;
  const pct = total > 0 ? Math.round((speciesCount / total) * 100) : 0;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #062133 0%, #0a3652 40%, #062133 100%)",
        padding: "48px 56px",
        fontFamily: "serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(244, 132, 95, 0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "rgba(20, 184, 166, 0.06)",
        }}
      />

      {/* Top bar: branding + date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F4845F, #14B8A6)",
            }}
          />
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 20, letterSpacing: 2 }}>
            SALT SAFARI
          </span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }}>
          {formatDate(parsed.date)}
        </span>
      </div>

      {/* Main headline */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              background: "linear-gradient(135deg, #F4845F, #14B8A6)",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1,
            }}
          >
            {speciesCount}
          </span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 28, fontWeight: 400 }}>
            species spotted
          </span>
        </div>

        <span style={{ color: "white", fontSize: 36, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>
          {displayName} at {location.name}
        </span>

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 20, width: 400 }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 6 }}>
              {speciesCount} of {total} species ({pct}%)
            </span>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 4,
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  borderRadius: 4,
                  background: "linear-gradient(90deg, #F4845F, #14B8A6, #10B981)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Species photo strip at bottom */}
      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {photos.map((sp, i) => (
            <div
              key={i}
              style={{
                width: 88,
                height: 88,
                borderRadius: 12,
                overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.15)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sp.hero_image_url!}
                alt=""
                width={88}
                height={88}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            </div>
          ))}
          {speciesCount > 6 && (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.5)",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              +{speciesCount - 6}
            </div>
          )}
        </div>
      )}
    </div>,
    { ...size },
  );
}
