/**
 * CLI script to send season alerts manually.
 * Usage: npm run send-alerts [-- --dry-run]
 */
import { sendSeasonAlerts } from "../src/lib/alerts/send-alerts";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("=== Salt Safari — Season Alert Sender ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log("");

  try {
    const result = await sendSeasonAlerts({ dryRun });
    console.log("");
    console.log(`=== Complete ===`);
    console.log(`Sent: ${result.sent}`);
    console.log(`Skipped: ${result.skipped}`);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
