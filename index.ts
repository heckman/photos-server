import { serve } from "bun";
import osa from "osa2";
import { dirSync, setGracefulCleanup } from "tmp";
import { readdirSync } from "fs";
import path from "path";
setGracefulCleanup();

serve({
  port: 6330,
  async fetch(req) {
    const url = new URL(req.url);
    const query = decodeURI(url.pathname.slice(1));
    const imageDir = dirSync({
      unsafeCleanup: true,
      prefix: "photos-server-image",
    });
    console.log(imageDir.name);
    await exportPhoto(query, imageDir.name);
    const filenames = readdirSync(imageDir.name);
    if (filenames.length) {
      return new Response(
        Bun.file(path.join(imageDir.name, filenames[0]))
      );
    }
    return new Response(
      Bun.file(path.join(__dirname, "/missing.png")),
      { status: 404 }
    );
  },
});

function exportPhoto(query: string, posixPath: string) {
  return osa((query: any, posixPath: string) => {
    function _requestExport(mediaItem: any) {
      Application("Photos").export([mediaItem], {
        to: Path(posixPath),
      });
    }
    try {
      _requestExport(Application("Photos").mediaItems.byId(query));
    } catch (e) {
      const matchingPhotos = Application("Photos")
        .search({ for: query })
        .filter((item: any) =>
          item.filename().match(/\.(jpeg|jpg|heic)$/i)
        );
      if (matchingPhotos.length) {
        _requestExport(
          matchingPhotos[
            Math.floor(Math.random() * matchingPhotos.length)
          ]
        );
      }
    }
  })(query, posixPath);
}
