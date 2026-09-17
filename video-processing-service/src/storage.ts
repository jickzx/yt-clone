import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import ffmpeg from "fluent-ffmpeg";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Support running npm from either the repository root or this service folder.
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), "../.env"), quiet: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SECRET_KEY must be configured."
  );
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const rawVideoBucketName =
  process.env.SUPABASE_RAW_VIDEO_BUCKET ?? "raw-videos";

const processedVideoBucketName =
  process.env.SUPABASE_PROCESSED_VIDEO_BUCKET ?? "processed-videos";

const localRawVideoPath = path.resolve(process.cwd(), "raw-videos");
const localProcessedVideoPath = path.resolve(
  process.cwd(),
  "processed-videos"
);

export async function setupDirectories(): Promise<void> {
  await Promise.all([
    mkdir(localRawVideoPath, { recursive: true }),
    mkdir(localProcessedVideoPath, { recursive: true }),
  ]);
}

export function convertVideo(
  localRawVideoName: string,
  localProcessedVideoName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(path.join(localRawVideoPath, localRawVideoName))
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions("-vf", "scale=-2:360", "-movflags", "+faststart")
      .format("mp4")
      .on("end", () => resolve())
      .on("error", (error) => reject(error))
      .save(path.join(localProcessedVideoPath, localProcessedVideoName));
  });
}

export async function downloadRawVideo(
  storageObjectName: string,
  localFileName: string
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(rawVideoBucketName)
    .download(storageObjectName);

  if (error) {
    throw new Error(
      `Could not download ${storageObjectName}: ${error.message}`
    );
  }

  const contents = Buffer.from(await data.arrayBuffer());
  await writeFile(path.join(localRawVideoPath, localFileName), contents);
}

export async function uploadProcessedVideo(
  storageObjectName: string,
  localFileName: string
): Promise<void> {
  const contents = await readFile(
    path.join(localProcessedVideoPath, localFileName)
  );

  const { error } = await supabase.storage
    .from(processedVideoBucketName)
    .upload(storageObjectName, contents, {
      contentType: "video/mp4",
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Could not upload ${storageObjectName}: ${error.message}`
    );
  }
}

export async function deleteRawVideo(localFileName: string): Promise<void> {
  await deleteFile(path.join(localRawVideoPath, localFileName));
}

export async function deleteProcessedVideo(
  localFileName: string
): Promise<void> {
  await deleteFile(path.join(localProcessedVideoPath, localFileName));
}

async function deleteFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}
