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
  fetch(req) {
    return get_photo_id(get_query(new URL(req.url).pathname))
      .then(get_photo_file)
      .then(respond_with_photo)
      .catch(respond_with_error);
  },
});

// url_path -> id  /  404 not found (no query or invalid URI)
function get_query(url_path: string) {
  try {
    const query = decodeURI(url_path).slice(1); // drop leading slash
    if (!query) throw new Error("No query");
    return query;
  } catch (e) {
    throw new Error("404", { cause: e });
  }
}

// query -> id  /  404 not found or 504 gateway timeout
function get_photo_id(query: string): Promise<string> {
  return call_get_id(query).then((id) => {
    if (!id)
      throw new Error("404", { cause: new Error("ID not found") });
    return id;
  });
}

// query -> id  /  500 (probably a timeout error)
function call_get_id(query: string): Promise<string> {
  return call([
    exe_get_id,
    "--timeout",
    get_photo_id_timeout_seconds,
    query,
  ]).catch((e) => {
    throw new Error("500", { cause: e });
  }); // probably a timeout issue but don't respond gateway timeout or the client might retry
}

// id -> filename  /  500 internal error (export failed)
function get_photo_file(id: string): Promise<string> {
  console.log(`-> photo id: ${id}`);
  const directory = path.join(tmp_dir, tmp_dir_prefix + id);
  return a_file_in(directory)
    .catch(() =>
      call_export_photo(id, directory)
        .then(() => a_file_in(directory))
        .catch((e) => {
          throw new Error("500", {
            cause: new Error("Export failed", { cause: e }),
          });
        })
    )
    .then(async (filename) => path.join(directory, filename));
}

// directory -> filename // Error (no file in directory or file not found)
function a_file_in(directory: string): Promise<string> {
  return readdir(directory).then((file_list) => {
    const filename = file_list
      .filter(
        (filename) => filename.match(/^[^.]/) // ignore hidden files!
      )
      .shift();
    if (!filename)
      throw new Error(`No non-hidden files in ${directory}`);
    return filename;
  });
}

function call_export_photo(
  id: string,
  directory: string
): Promise<string> {
  console.log(`   - exporting to: ${directory}`);
  return call([exe_export_photos, id, directory]);
}

function respond_with_error(exception: Error): Response {
  console.log(
    JSON.stringify(
      exception,
      Object.getOwnPropertyNames(exception),
      "    "
    )
  );
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
  console.log(`   - sending image: ${absolute_filename}`);
  return new Response(Bun.file(absolute_filename), {
    status: status,
    headers: {
      "content-disposition": `inline; filename="${path.basename(
        absolute_filename
      )}"`,
    },
  });
}

// exec Promise wrapper that first quotes all the arguments
// note that the command+args are expected in an array
function call(command: any[], options = {}): Promise<string> {
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
