import { serve } from "bun";
import { mkdir, readdir } from "node:fs/promises";
import { Dirent } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { exec } from "node:child_process";

// server settings
const port = 6330;

// 0 for silent
// 1 for normal
// 2 for verbose
// 3 for debug--shows complete error contents
const verbosity = 2;

// to abort overly-broad photo searches, set to 0 for no timeout
const get_photo_id_timeout_seconds = 3;

// external commands
const bin_directory = path.join(__dirname, "..", "bin");
const exe_get_id = path.join(bin_directory, "get-photo-id");
const exe_export_photos = path.join(
  bin_directory,
  "export-photos-by-id"
);

// stock images to return on errors
const assets_directory = path.join(__dirname, "..", "assets");
const error_filenames: { [key: string]: string } = {
  404: path.join(assets_directory, "broken-image.svg"),
  500: path.join(assets_directory, "sad-mac.svg"),
};

// identifies the server's temporary directories
const tmp_dir_root = tmpdir();
const tmp_dir_prefix = "photos-server_item_";

// main
serve({
  port: port,
  async fetch(req) {
    log(); // blank line to hightlight a new request
    return get_query(new URL(req.url).pathname)
      .then(validate_query)
      .then(get_photo_id)
      .then(get_photo_file)
      .then(respond_with_photo)
      .catch(respond_with_error);
  },
});

// url_path -> id  (or throw 404: invalid URI
async function get_query(url_path: string): Promise<string> {
  try {
    return decodeURI(url_path).slice(1);
  } catch (e) {
    log("error", e, 2);
    throw http_error(404, `Poorly-formatted path: ${url_path}`, e);
  }
}

// query -> query  (or throw 404: empty query)
async function validate_query(query: string): Promise<string> {
  log("query", query);
  if (!query) throw http_error(404, "No query");
  return query;
}

// query -> id  (or throw 500: search timed out)
async function get_photo_id(query: string): Promise<string> {
  return call([
    exe_get_id,
    "--timeout",
    get_photo_id_timeout_seconds,
    query,
  ])
    .catch((e) => {
      log("error", e, 2);
      throw http_error(500, "ID search timed out", e);
    })
    .then((id) => {
      log("id", id);
      if (!id) throw http_error(404, "ID not found");
      return id;
    });
}

// id -> filename  /  500 internal error (export failed)
async function get_photo_file(id: string): Promise<string> {
  const directory = path.join(tmp_dir_root, tmp_dir_prefix + id);
  return a_file_in(directory).catch(() =>
    mkdir(directory, { recursive: true })
      .then(() => {
        log("exporting to", directory, 1);
        return call([exe_export_photos, id, directory]);
      })
      .then(() => {
        return a_file_in(directory);
      })
      .catch((e) => {
        log("error", e, 2);
        throw http_error(500, "Export failed", e);
      })
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

function respond_with_error(error: {
  message: string;
  cause?: any;
}): Response {
  if (!error.message?.match(/^[45][0-9][0-9]$/)) {
    error = http_error(500, "Unknown error", { cause: error });
    log("error", error, 2);
  }
  log(
    "http error",
    error.message + ": " + (error.cause?.message || error.cause)
  );
  const status = Number(error.message);
  return respond_with_photo(error_filenames[error.message], status);
}

// directory -> filename // Error (no file in directory or file not found)
async function a_file_in(directory: string): Promise<string> {
  return readdir(directory, { withFileTypes: true })
    .then((dir_entries: Dirent[]) => {
      const filename = dir_entries
        .filter((dirent) => dirent.isFile())
        .map((dirent) => dirent.name)
        .filter((filename) => filename.match(/^[^.]/)) // ignore hidden files!
        .shift();
      if (!filename)
        throw { message: "no visible files", path: directory };
      const absolute_filename = path.join(directory, filename);
      log("found file", absolute_filename, 1);
      return absolute_filename;
    })
    .catch((e: { path: string }) => {
      log("error", e, 2);
      log("no file in", e.path, 1);
      throw e;
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
        if (!error) {
          resolve(stdout.trim());
        } else {
          error.cause = stderr.trim();
          reject(error);
        }
      }
    );
  });
}

// wrap the text in ' after replacing all instances of ' with '"'"'
function quoted(text: string) {
  return "'" + String(text).replaceAll("'", "'\"'\"'") + "'";
}

function http_error(status: number, cause: any, error?: any) {
  return new Error(String(status), {
    cause: error ? new Error(cause, { cause: error }) : cause,
  });
}

function log(message: string = "", obj: any = "", level: number = 0) {
  // const prefix = "[" + new Date().toISOString() + "]  ";
  if (level >= verbosity) return;
  const prefix = "";
  console.log(
    message ? prefix + message.toUpperCase().padStart(16) : "",
    obj
      ? JSON.stringify(obj, Object.getOwnPropertyNames(obj), "\t")
      : ""
  );
}
