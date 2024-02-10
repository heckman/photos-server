import { serve } from "bun";
import osa from "osa2";
import { mkdirSync, readdirSync } from "fs";
import path from "path";
import { tmpdir } from "os";

const imageDirectoryPrefix = "photos-server-image_";
const missingFile = path.join(__dirname, "/missing.png");
const errorFile = path.join(__dirname, "/error.png");

serve({
  port: 6330,
  async fetch(req) {
    var filename;
    var status;
    const url = new URL(req.url);
    const query = decodeURI(url.pathname.slice(1)); // remove root /
    console.log("");
    console.log(`query is ${query}`);
    const mediaItemId = await getMediaItemId(query);
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
        await exportMediaItem(mediaItemId, mediaDirectory);
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

// JXA function
// returns a mediaItem id, or undefined if none found
var getMediaItemId = osa((query: string) => {
  function getMediaItemById(id: string) {
    return Application("Photos").mediaItems.byId(id);
  }
  function searchPhotos(query: string) {
    console.log(`searching fo ${query}`);
    return Application("Photos")
      .search({ for: query })
      .filter((item: any) =>
        item.filename().match(/\.(jpeg|jpg|heic)$/i)
      );
  }
  var mediaItem = getMediaItemById(query);
  if (mediaItem.exists()) {
    console.log(`found media item with that id`);
    return mediaItem.id(); // this might be a movie
  } else {
    var mediaItems = searchPhotos(query); // no movies
    console.log(`found ${mediaItems.length} media items`);
    if (mediaItems.length == 0) return undefined;
    if (mediaItems.length == 1) return mediaItems[0].id();
    return mediaItems[
      Math.floor(Math.random() * mediaItems.length)
    ].id();
  }
});

// JXA function
// directs Photos to export a specified mediaItem
var exportMediaItem = osa((id: string, posixPath: string) => {
  const mediaItem = Application("Photos").mediaItems.byId(id);
  Application("Photos").export([mediaItem], {
    to: Path(posixPath),
  });
});

// returns the full path to the (first) file in a non-empty directory
// undefined if the directory doesn't exist or is empty
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
