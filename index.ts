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
    console.log(`query is ${query}`);
    const mediaItemId = await getMediaItemId(query);
    console.log(`found mediaItem with id ${mediaItemId}`);
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
        if (filename != undefined) {
          console.log(`export successful, found ${filename}`);
          status = 200;
        } else {
          console.log(
            `error: probably a problem exporting from Photos`
          );
          filename = errorFile;
          status = 500;
        }
      }
    } else {
      console.log(`${query} not found, serving missing photo image`);
      filename = missingFile;
      status = 404;
    }
    return new Response(Bun.file(filename), { status: status });
  },
});

// returns a mediaItem, or undefined if none found
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
    console.log("found media item by id");
    return mediaItem.id(); // this might be a movie
  } else {
    console.log("about to do a search");
    var mediaItems = searchPhotos(query); // no movies
    console.log(`found ${mediaItems.length} media items`);
    return mediaItems.length > 1 // return one at random
      ? mediaItems[Math.floor(Math.random() * mediaItems.length)].id()
      : mediaItems[0].id();
  }
});
var exportMediaItem = osa((id: string, posixPath: string) => {
  const mediaItem = Application("Photos").mediaItems.byId(id);
  Application("Photos").export([mediaItem], {
    to: Path(posixPath),
  });
});

// returns the full path to the (first) file in a non-empty directory
function theFileIn(directory: string) {
  try {
    console.log("looking for a file in " + directory);
    const fileList = readdirSync(directory);
    console.log("found " + fileList.length + " files");
    console.log("will use " + fileList[0]);
    return path.join(directory, fileList[0]);
  } catch (e) {
    console.log("couldn't find directory " + directory);
    return; // directory not found, return undefined
  }
}
