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
exports.rawVideoBucketName = void 0;
exports.setupDirectories = setupDirectories;
exports.convertVideo = convertVideo;
exports.downloadRawVideo = downloadRawVideo;
exports.uploadProcessedVideo = uploadProcessedVideo;
exports.deleteRawVideo = deleteRawVideo;
exports.deleteProcessedVideo = deleteProcessedVideo;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
// Support running npm from either the repository root or this service folder.
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), ".env"), quiet: true });
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), "../.env"), quiet: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured.");
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseSecretKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
exports.rawVideoBucketName = (_a = process.env.SUPABASE_RAW_VIDEO_BUCKET) !== null && _a !== void 0 ? _a : "raw-videos";
const processedVideoBucketName = (_b = process.env.SUPABASE_PROCESSED_VIDEO_BUCKET) !== null && _b !== void 0 ? _b : "processed-videos";
const localRawVideoPath = node_path_1.default.resolve(process.cwd(), "raw-videos");
const localProcessedVideoPath = node_path_1.default.resolve(process.cwd(), "processed-videos");
function setupDirectories() {
    return __awaiter(this, void 0, void 0, function* () {
        yield Promise.all([
            (0, promises_1.mkdir)(localRawVideoPath, { recursive: true }),
            (0, promises_1.mkdir)(localProcessedVideoPath, { recursive: true }),
        ]);
    });
}
function convertVideo(localRawVideoName, localProcessedVideoName) {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(node_path_1.default.join(localRawVideoPath, localRawVideoName))
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions("-vf", "scale=-2:360", "-movflags", "+faststart")
            .format("mp4")
            .on("end", () => resolve())
            .on("error", (error) => reject(error))
            .save(node_path_1.default.join(localProcessedVideoPath, localProcessedVideoName));
    });
}
function downloadRawVideo(storageObjectName, localFileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield supabase.storage
            .from(exports.rawVideoBucketName)
            .download(storageObjectName);
        if (error) {
            throw new Error(`Could not download ${storageObjectName}: ${error.message}`);
        }
        const contents = Buffer.from(yield data.arrayBuffer());
        yield (0, promises_1.writeFile)(node_path_1.default.join(localRawVideoPath, localFileName), contents);
    });
}
function uploadProcessedVideo(storageObjectName, localFileName) {
    return __awaiter(this, void 0, void 0, function* () {
        const contents = yield (0, promises_1.readFile)(node_path_1.default.join(localProcessedVideoPath, localFileName));
        const { error } = yield supabase.storage
            .from(processedVideoBucketName)
            .upload(storageObjectName, contents, {
            contentType: "video/mp4",
            cacheControl: "3600",
            upsert: true,
        });
        if (error) {
            throw new Error(`Could not upload ${storageObjectName}: ${error.message}`);
        }
    });
}
function deleteRawVideo(localFileName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield deleteFile(node_path_1.default.join(localRawVideoPath, localFileName));
    });
}
function deleteProcessedVideo(localFileName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield deleteFile(node_path_1.default.join(localProcessedVideoPath, localFileName));
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
