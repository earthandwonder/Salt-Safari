-- Delete Bull Shark species and its associated photos
-- Cascades automatically: location_species, source_records, species_seasonality, species_alerts, sightings
-- Photos use ON DELETE SET NULL so must be deleted explicitly

DELETE FROM photos
WHERE species_id = (SELECT id FROM species WHERE name ILIKE '%bull shark%');

DELETE FROM species
WHERE name ILIKE '%bull shark%';
