import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

type AlertSpecies = {
  speciesName: string;
  scientificName: string | null;
  heroImageUrl: string | null;
  likelihood: string;
  locationName: string;
  speciesSlug: string;
  locationSlug: string;
  regionSlug: string;
};

interface SeasonAlertEmailProps {
  displayName: string;
  species: AlertSpecies[];
  baseUrl: string;
}

export default function SeasonAlertEmail({
  displayName,
  species,
  baseUrl,
}: SeasonAlertEmailProps) {
  const previewText =
    species.length === 1
      ? `${species[0].speciesName} are at ${species[0].locationName} this month`
      : `${species.length} species are in season this month`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={brandText}>Salt Safari</Text>
          </Section>

          {/* Greeting */}
          <Section style={content}>
            <Heading style={heading}>
              {species.length === 1
                ? `${species[0].speciesName} are in season!`
                : `${species.length} of your watched species are in season!`}
            </Heading>

            <Text style={paragraph}>
              Hi {displayName},
            </Text>

            <Text style={paragraph}>
              {species.length === 1
                ? `Great news — ${species[0].speciesName} have come into season at ${species[0].locationName}.`
                : "Great news — some of the species you're watching have come into season."}
            </Text>

            {/* Species cards */}
            {species.map((s, i) => (
              <Section key={i} style={speciesCard}>
                <Row>
                  {s.heroImageUrl && (
                    <Column style={photoColumn}>
                      <Img
                        src={s.heroImageUrl}
                        alt={s.speciesName}
                        width={80}
                        height={60}
                        style={speciesPhoto}
                      />
                    </Column>
                  )}
                  <Column style={infoColumn}>
                    <Text style={speciesNameText}>{s.speciesName}</Text>
                    {s.scientificName && (
                      <Text style={scientificNameText}>
                        {s.scientificName}
                      </Text>
                    )}
                    <Text style={locationText}>
                      {s.likelihood === "common" ? "Commonly" : "Occasionally"}{" "}
                      seen at {s.locationName}
                    </Text>
                  </Column>
                </Row>
                <Section style={buttonRow}>
                  <Link
                    href={`${baseUrl}/species/${s.speciesSlug}`}
                    style={primaryButton}
                  >
                    View species
                  </Link>
                  <Link
                    href={`${baseUrl}/id?location=${s.locationSlug}`}
                    style={secondaryLink}
                  >
                    ID tool
                  </Link>
                </Section>
              </Section>
            ))}

            {/* CTA */}
            <Section style={ctaSection}>
              <Link href={`${baseUrl}/log`} style={ctaButton}>
                Log your sighting
              </Link>
            </Section>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Based on historical observation data from iNaturalist, ALA, and
              OBIS. Sightings are not guaranteed.
            </Text>
            <Text style={footerText}>
              <Link href={`${baseUrl}/alerts`} style={footerLink}>
                Manage alerts
              </Link>
              {" · "}
              <Link href={`${baseUrl}/alerts`} style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={footerBrand}>Salt Safari</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ─────────────────────────────────────
const body: React.CSSProperties = {
  backgroundColor: "#FFFBF5",
  fontFamily:
    "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
};

const header: React.CSSProperties = {
  backgroundColor: "#062133",
  padding: "24px 32px",
  borderRadius: "12px 12px 0 0",
};

const brandText: React.CSSProperties = {
  color: "#5EEAD4",
  fontSize: "18px",
  fontWeight: 700,
  margin: 0,
  fontFamily:
    "'Fraunces', Georgia, 'Times New Roman', serif",
};

const content: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px",
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#062133",
  margin: "0 0 16px 0",
  fontFamily:
    "'Fraunces', Georgia, 'Times New Roman', serif",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  color: "#475569",
  lineHeight: "1.6",
  margin: "0 0 12px 0",
};

const speciesCard: React.CSSProperties = {
  backgroundColor: "#F8FAFC",
  borderRadius: "12px",
  padding: "16px",
  margin: "16px 0",
  border: "1px solid #E2E8F0",
};

const photoColumn: React.CSSProperties = {
  width: "80px",
  verticalAlign: "top",
  paddingRight: "12px",
};

const infoColumn: React.CSSProperties = {
  verticalAlign: "top",
};

const speciesPhoto: React.CSSProperties = {
  borderRadius: "8px",
  objectFit: "cover" as const,
};

const speciesNameText: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#062133",
  margin: "0 0 2px 0",
  fontFamily:
    "'Fraunces', Georgia, 'Times New Roman', serif",
};

const scientificNameText: React.CSSProperties = {
  fontSize: "12px",
  color: "#94A3B8",
  fontStyle: "italic",
  margin: "0 0 4px 0",
};

const locationText: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748B",
  margin: "0",
};

const buttonRow: React.CSSProperties = {
  marginTop: "12px",
};

const primaryButton: React.CSSProperties = {
  backgroundColor: "#F4845F",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  marginRight: "12px",
};

const secondaryLink: React.CSSProperties = {
  color: "#0D9488",
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  marginTop: "24px",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#0D9488",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "12px 28px",
  borderRadius: "999px",
};

const divider: React.CSSProperties = {
  borderColor: "#E2E8F0",
  margin: "0",
};

const footer: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "24px 32px",
  borderRadius: "0 0 12px 12px",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  color: "#94A3B8",
  lineHeight: "1.5",
  margin: "0 0 8px 0",
  textAlign: "center" as const,
};

const footerLink: React.CSSProperties = {
  color: "#0D9488",
  textDecoration: "underline",
};

const footerBrand: React.CSSProperties = {
  fontSize: "12px",
  color: "#CBD5E1",
  textAlign: "center" as const,
  margin: "12px 0 0 0",
  fontFamily:
    "'Fraunces', Georgia, 'Times New Roman', serif",
};
