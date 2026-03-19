import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ACCEPTED_AUDIO_TYPES, MAX_FILE_SIZE } from "@/lib/upload-constants";

/**
 * This route handles Vercel Blob client uploads.
 *
 * It does NOT receive the actual file bytes. Instead, the browser uploads
 * directly to Vercel Blob's servers using the `upload()` function from
 * @vercel/blob/client. This route only handles two things:
 *
 * 1. Token exchange: the client asks "can I upload this file?" and this
 *    route returns a short-lived token that authorizes the upload.
 * 2. Upload completion callback: Vercel Blob notifies this route when
 *    the upload finishes (only works in production, not localhost).
 *
 * This "client upload" pattern exists because Vercel serverless functions
 * have a 4.5MB request body limit. Audio files are often much larger,
 * so we need the browser to upload directly to Blob storage.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // This runs on the server before a client token is generated.
        // We can validate the user, check permissions, restrict file types, etc.
        // For now we just set sensible limits.
        return {
          allowedContentTypes: [...ACCEPTED_AUDIO_TYPES],
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // This callback fires when Vercel Blob finishes storing the file.
        // It only works in production (not localhost) because Vercel's
        // servers need to reach this URL over the internet.
        //
        // We don't rely on it. Instead, the client creates the interview
        // row by POSTing to /api/interviews after upload completes.
        // See TODOS.md for future server-side verification plans.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
