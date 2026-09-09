"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDirectories = setupDirectories;
exports.convertVideo = convertVideo;
exports.downloadRawVideo = downloadRawVideo;
exports.uploadProcessedVideo = uploadProcessedVideo;
exports.deleteRawVideo = deleteRawVideo;
exports.deleteProcessedVideo = deleteProcessedVideo;
const supabase_js_1 = require("@supabase/supabase-js");
const promises_1 = require("node:fs/promises");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
const rawVideoBucket = (_a = process.env.SUPABASE_RAW_VIDEO_BUCKET) !== null && _a !== void 0 ? _a : "raw-videos";
const processedVideoBucket = (_b = process.env.SUPABASE_PROCESSED_VIDEO_BUCKET) !== null && _b !== void 0 ? _b : "processed-videos";
const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";
function setupDirectories() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all([
            (0, promises_1.mkdir)(localRawVideoPath, { recursive: true }),
            (0, promises_1.mkdir)(localProcessedVideoPath, { recursive: true }),
        ]);
    });
}
function convertVideo(rawVideoName, processedVideoName) {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(`${localRawVideoPath}/${rawVideoName}`)
            .outputOptions("-vf", "scale=-1:360")
            .on("end", resolve)
            .on("error", reject)
            .save(`${localProcessedVideoPath}/${processedVideoName}`);
    });
}
function downloadRawVideo(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield supabase.storage
            .from(rawVideoBucket)
            .download(fileName);
        if (error) {
            throw new Error(`Could not download ${fileName}: ${error.message}`);
        }
        const contents = Buffer.from(yield data.arrayBuffer());
        yield (0, promises_1.writeFile)(`${localRawVideoPath}/${fileName}`, contents);
    });
}
function uploadProcessedVideo(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const contents = yield (0, promises_1.readFile)(`${localProcessedVideoPath}/${fileName}`);
        const { error } = yield supabase.storage
            .from(processedVideoBucket)
            .upload(fileName, contents, {
            contentType: "video/mp4",
            cacheControl: "3600",
            upsert: true,
        });
        if (error) {
            throw new Error(`Could not upload ${fileName}: ${error.message}`);
        }
    });
}
function deleteRawVideo(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield deleteFile(`${localRawVideoPath}/${fileName}`);
    });
}
function deleteProcessedVideo(fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield deleteFile(`${localProcessedVideoPath}/${fileName}`);
    });
}
function deleteFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, promises_1.unlink)(filePath);
        }
        catch (error) {
            if (!(error instanceof Error) ||
                !("code" in error) ||
                error.code !== "ENOENT") {
                throw error;
            }
        }
    });
}
