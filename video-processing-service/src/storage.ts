import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import ffmpeg from "fluent-ffmpeg";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const rawVideoBucket =
  process.env.SUPABASE_RAW_VIDEO_BUCKET ?? "raw-videos";

const processedVideoBucket =
  process.env.SUPABASE_PROCESSED_VIDEO_BUCKET ?? "processed-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

export async function setupDirectories() {
  await Promise.all([
    mkdir(localRawVideoPath, { recursive: true }),
    mkdir(localProcessedVideoPath, { recursive: true }),
  ]);
}

export function convertVideo(
  rawVideoName: string,
  processedVideoName: string
) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360")
      .on("end", resolve)
      .on("error", reject)
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  });
}

export async function downloadRawVideo(fileName: string) {
  const { data, error } = await supabase.storage
    .from(rawVideoBucket)
    .download(fileName);

  if (error) {
    throw new Error(`Could not download ${fileName}: ${error.message}`);
  }

  const contents = Buffer.from(await data.arrayBuffer());
  await writeFile(`${localRawVideoPath}/${fileName}`, contents);
}

export async function uploadProcessedVideo(fileName: string) {
  const contents = await readFile(
    `${localProcessedVideoPath}/${fileName}`
  );

  const { error } = await supabase.storage
    .from(processedVideoBucket)
    .upload(fileName, contents, {
      contentType: "video/mp4",
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw new Error(`Could not upload ${fileName}: ${error.message}`);
  }
}

export async function deleteRawVideo(fileName: string) {
  await deleteFile(`${localRawVideoPath}/${fileName}`);
}

export async function deleteProcessedVideo(fileName: string) {
  await deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

async function deleteFile(filePath: string) {
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