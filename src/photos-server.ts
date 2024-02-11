import { serve } from "bun";
import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

// where resources are

const assetsDirectory = path.join(__dirname, "..", "assets");
const missingFile = path.join(assetsDirectory, "missing.png");
const errorFile = path.join(assetsDirectory, "error.png");

const jxa_directory = path.join(__dirname, "..", "bin");
const exe_get_id = path.join(jxa_directory, "get-photo-id");
const exe_export_photos = path.join(
  jxa_directory,
  "export-photos-by-id"
);

const imageDirectoryPrefix = "photos-server-image_";

serve({
  port: 6330,
  fetch(req) {
    var filename;
    var status;
    const url = new URL(req.url);
    const query = decodeURI(url.pathname.slice(1)); // remove root '/'
    console.log("");
    console.log(`query is ${query}`);
    const mediaItemId = quoted_exec([exe_get_id, query])
      .toString()
      .trim();
    if (mediaItemId) {
      const mediaDirectory = path.join(
        tmpdir(),
        imageDirectoryPrefix + mediaItemId
      );
      filename = theFileIn(mediaDirectory);
      if (filename != undefined) {
        console.log(`using previous export of ${filename}`);
      } else {
        mkdirSync(mediaDirectory, { recursive: true });
        console.log(`made the directory ${mediaDirectory}`);
        quoted_exec([exe_export_photos, mediaItemId, mediaDirectory]);
        console.log(
          `exported media item from Photos to ${mediaDirectory}`
        );
        filename = theFileIn(mediaDirectory);
      }
      if (filename) {
        console.log(`serving ${filename}`);
        filename = path.join(mediaDirectory, filename);
        status = 200;
      } else {
        console.log(`ERROR: Problem exporting from Photos`);
        filename = errorFile;
        status = 500;
      }
    } else {
      console.log(`${query} not found, serving missing photo image`);
      filename = missingFile;
      status = 404;
    }
    console.log("");

    return new Response(Bun.file(filename), {
      status: status,
      headers: {
        "content-disposition": `inline; filename="${path.basename(
          filename
        )}"`,
      },
    });
  },
});

// returns the full path to the (first) file in a non-empty directory
// return undefined if the directory doesn't exist or is empty
function theFileIn(directory: string) {
  try {
    console.log("looking for a file in " + directory);
    const fileList = readdirSync(directory).filter(
      (filename) => filename.match(/^[^.]/) // ignore hidden files!
    );
    console.log("found " + fileList.length + " files");
    return fileList[0];
  } catch (e) {
    console.log("couldn't read directory " + directory);
    return undefined; // directory not found, return undefined
  }
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
