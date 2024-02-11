import { serve } from "bun";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

// where resources are

const assets_directory = path.join(__dirname, "..", "assets");
const missing_image = path.join(assets_directory, "missing.png");
const error_image = path.join(assets_directory, "error.png");

const jxa_directory = path.join(__dirname, "..", "bin");
const exe_get_id = path.join(jxa_directory, "get-photo-id");
const exe_export_photos = path.join(
  jxa_directory,
  "export-photos-by-id"
);

const tmp_dir_prefix = "photos-server-image_";

serve({
  port: 6330,
  fetch(req) {
    var query, id, filename;
    const url = new URL(req.url);
    // blank query returns 404 not found
    console.log("");
    console.log(`-> request: ${url.pathname}`);
    if (!(query = get_query(url.pathname))) return withError(404);
    console.log(`-> query: ${query}`);
    if (!(id = get_photo_id(query))) return withError(404);
    console.log(`-> photo id: ${id}`);
    if (!(filename = get_photo_file(id))) return withError(500);
    console.log(`-> filename: ${filename}`);
    return withImage(filename);
  },
});

function get_query(url_path: string) {
  try {
    var query = decodeURI(url_path.slice(1)); // remove root '/'
    return query;
  } catch (e) {
    return undefined;
  }
}

function get_photo_id(query: string) {
  return quoted_exec([exe_get_id, query]).toString().trim();
}

function get_photo_file(photo_id: string) {
  var filename;
  const directory = path.join(tmpdir(), tmp_dir_prefix + photo_id);
  console.log("   - target directory: " + directory);
  if (!(filename = a_file_in(directory))) {
    console.log("   - didn't find anything");
    export_photo(photo_id, directory);
    if (!(filename = a_file_in(directory))) {
      console.log("   - still didn't find anything");
      return null;
    }
  }
  console.log("   - found " + filename);
  return path.join(directory, filename);
}

function a_file_in(directory: string) {
  try {
    console.log("   - looking for a file");
    return readdirSync(directory)
      .filter(
        (filename) => filename.match(/^[^.]/) // ignore hidden files!
      )
      .shift();
  } catch (e) {
    console.log("   - couldn't read directory");
    return undefined; // directory not found, return undefined
  }
}

function export_photo(photo_id: string, photo_folder: string) {
  console.log("   - making directory for photo");
  mkdirSync(photo_folder, { recursive: true });
  console.log("   - exporting photo ");
  quoted_exec([exe_export_photos, photo_id, photo_folder]);
}

function withError(status: number) {
  console.log("   - error status " + status);
  return withImage(status < 500 ? missing_image : error_image, status);
}

function withImage(filename: string, status = 200) {
  console.log("   - sending image");
  return new Response(Bun.file(filename), {
    status: status,
    headers: {
      // filename is absolute
      "content-disposition": `inline; filename="${path.basename(
        filename
      )}"`,
    },
  });
}

// wrapper to execSync that first quotes all the arguments
// note that the command+args are expected in an array
function quoted_exec(command: any[], options = {}) {
  return execSync(command.map(quoted).join(" "), options);
}

// wrap the text in ' after replacing all instances of ' with '"'"'
function quoted(text: string) {
  return "'" + text.replaceAll("'", "'\"'\"'") + "'";
}