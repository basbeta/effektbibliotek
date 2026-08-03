import * as Sentry from "@sentry/nextjs";

// Temporary diagnostic route to verify Bugsink/Sentry server-side error
// reporting after CR-012. Remove once confirmed working.
export async function GET() {
  const error = new Error("Bugsink server-side test error");
  Sentry.captureException(error);
  const flushed = await Sentry.flush(5000);
  console.log("Sentry flush completed within timeout:", flushed);
  throw error;
}
