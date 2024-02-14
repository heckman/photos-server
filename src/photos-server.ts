import { serve } from "bun";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { exec } from "node:child_process";

// server settings
const port = 6330;

// to abort overly-broad photo searches, set to 0 for no timeout
const get_photo_id_timeout_seconds = 3;

// where resources are
const assets_directory = path.join(__dirname, "..", "assets");
const missing_image = path.join(assets_directory, "broken-image.svg");
const error_image = path.join(assets_directory, "sad-mac.svg");

const jxa_directory = path.join(__dirname, "..", "bin");
const exe_get_id = path.join(jxa_directory, "get-photo-id");
const exe_export_photos = path.join(
  jxa_directory,
  "export-photos-by-id"
);

// identifies the server's temporary directories
const tmp_dir = tmpdir();
// const tmp_dir = path.join("dev", "null");
const tmp_dir_prefix = "photos-server-image_";

serve({
  port: port,
  async fetch(req) {
    try {
      const query = await get_query(new URL(req.url).pathname);
      const photo_id = await get_photo_id(query);
      const filename = await get_photo_file(photo_id);
      return respond_with_photo(filename);
    } catch (error: any) {
      error = wrap_unknown_errors(error);
      log("error", error);
      return respond_with_error(error);
    }
  },
});

function wrap_unknown_errors(error: any) {
  return error.message?.match(/^[45][0-9][0-9]$/)
    ? error
    : new Error("500", { cause: error }); // unknown error
}

function log(message: string = "", obj: any = "") {
  console.log(
    message
      ? "[" + new Date().toISOString() + "]  " + message.padEnd(10)
      : "",
    obj
      ? JSON.stringify(obj, Object.getOwnPropertyNames(obj), "\t")
      : ""
  );
}

// url_path -> id  /  404 not found (no query or invalid URI)
function get_query(url_path: string) {
  log("path", url_path);
  try {
    const query = decodeURI(url_path).slice(1); // drop leading slash
    if (!query) throw new Error("No query");
    log("query", query);
    return query;
  } catch (e) {
    throw new Error("404", { cause: e });
  }
}

// query -> id  /  404 not found or 504 gateway timeout
async function get_photo_id(query: string): Promise<string> {
  const id = await call_get_id(query);
  if (!id) throw new Error("404", { cause: new Error("ID not found") });
  log("id", id);
  return id;
}

// query -> id  /  500 (probably a timeout error)
async function call_get_id(query: string): Promise<string> {
  try {
    return await call([
      exe_get_id,
      "--timeout",
      get_photo_id_timeout_seconds,
      query,
    ]);
  } catch (e) {
    // probably a timeout issue
    // but don't respond gateway timeout or the client might retry
    throw new Error("500", { cause: e });
  }
}

// id -> filename  /  500 internal error (export failed)
async function get_photo_file(id: string): Promise<string> {
  const directory = path.join(tmp_dir, tmp_dir_prefix + id);
  try {
    return await a_file_in(directory);
  } catch (e) {
    log("no files", directory);
    try {
      await mkdir(directory, { recursive: true });
      await call_export_photo(id, directory);
      return await a_file_in(directory);
    } catch (e) {
      throw new Error("500", {
        cause: new Error("Export failed", { cause: e }),
      });
    }
  }
}

// directory -> filename // Error (no file in directory or file not found)
async function a_file_in(directory: string): Promise<string> {
  const filename = (await readdir(directory))
    .filter((filename) => filename.match(/^[^.]/)) // ignore hidden files!
    .shift();
  if (!filename) throw new Error(`No non-hidden files in ${directory}`);
  const absolute_filename = path.join(directory, filename);
  log("filename", absolute_filename);
  return absolute_filename;
}

// id, directory | side-effect: exports a photo from Photos.app
function call_export_photo(
  id: string,
  directory: string
): Promise<string> {
  log("exporting", directory);
  return call([exe_export_photos, id, directory]);
}

function respond_with_error(exception: Error): Response {
  const status = Number(exception.message);
  return respond_with_photo(
    status < 500 ? missing_image : error_image,
    status
  );
}

function respond_with_photo(
  absolute_filename: string,
  status = 200
): Response {
  const basename = path.basename(absolute_filename);
  log("sending", basename);
  return new Response(Bun.file(absolute_filename), {
    status: status,
    headers: {
      "content-disposition": `inline; filename="${basename}"`,
    },
  });
}

// exec Promise wrapper that first quotes all the arguments
// note that the command+args are expected in an array
async function call(command: any[], options = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      command.map(quoted).join(" "),
      options,
      (error, stdout, stderr) => {
        if (error) reject(error);
        resolve(stdout.trim());
      }
    );
  });
}

// wrap the text in ' after replacing all instances of ' with '"'"'
function quoted(text: string) {
  return "'" + String(text).replaceAll("'", "'\"'\"'") + "'";
}
