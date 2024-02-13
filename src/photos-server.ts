import { serve } from "bun";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { exec, spawn } from "node:child_process";

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
const tmp_dir_prefix = "photos-server-image_";

serve({
  port: port,
  async fetch(req) {
    return await get_query(new URL(req.url).pathname.slice(1)) // drop leading slash
      .then(get_photo_id)
      .then(get_photo_file)
      .then(respond_with_photo)
      .catch(respond_with_error);
  },
});

async function get_query(url_path: string) {
  try {
    const query = decodeURI(url_path);
    if (!query) throw new Error("No query");
    return query;
  } catch (e) {
    throw new Error("404", { cause: e });
  }
}

// query -> id / 404 not found, 504 gateway timeout
async function get_photo_id(query: string) {
  const id = await call_get_id(query).toString().trim();
  if (!id) throw new Error("404", { cause: new Error("ID not found") });
  return id;
}

async function call_get_id(query: string) {
  try {
    return call([
      exe_get_id,
      "--timeout",
      get_photo_id_timeout_seconds,
      query,
    ]);
  } catch (e) {
    throw new Error("504", { cause: e }); // probably a timeout issue
  }
}

async function get_photo_file(id: string) {
  console.log(`-> photo id: ${id}`);
  const directory = path.join(tmpdir(), tmp_dir_prefix + id);
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

async function a_file_in(directory: string) {
  return readdir(directory)
    .then(async (file_list) => {
      const filename = file_list
        .filter(
          (filename) => filename.match(/^[^.]/) // ignore hidden files!
        )
        .shift();
      if (!filename) throw new Error(`No file in ${directory}`);
      return filename;
    })
    .catch((e) => {
      throw new Error("File not found", { cause: e });
    });
}

async function call_export_photo(id: string, directory: string) {
  console.log(`   - exporting to: ${directory}`);
  return await call([exe_export_photos, id, directory]);
}

function respond_with_error(exception: Error) {
  console.log(JSON.stringify(exception));
  const status = Number(exception.message);
  return respond_with_photo(
    status < 500 ? missing_image : error_image,
    status
  );
}

function respond_with_photo(absolute_filename: string, status = 200) {
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

// wrapper to execSync that first quotes all the arguments
// note that the command+args are expected in an array
async function call(command: any[], options = {}) {
  return exec(command.map(quoted).join(" "), options);
}

// wrap the text in ' after replacing all instances of ' with '"'"'
function quoted(text: string) {
  return "'" + String(text).replaceAll("'", "'\"'\"'") + "'";
}
