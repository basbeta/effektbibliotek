// Temporary diagnostic route to verify Bugsink/Sentry server-side error
// reporting after CR-012. Remove once confirmed working.
export async function GET() {
  throw new Error("Bugsink server-side test error");
}
