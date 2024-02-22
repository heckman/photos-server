// SPDX-FileCopyrightText: 2024 Erik Ben Heckman
// SPDX-PackageDownloadLocation: git://github.com/heckman/photos-server
// SPDX-License-Identifier: GPL-3.0-only
/**
 *
 * photos-server
 *
 * Serve photos via HTTP from Apple's Photos.app on macOS.
 *
 *
 * Copyright (c) 2024 by Erik Ben Heckman <erik@heckman.ca> ("ERIK")
 *
 * Permission to use, copy, modify, and/or distribute this software for
 * any purpose with or without fee is hereby granted, provided that the
 * above copyright notice and this permission notice appear in all
 * copies.
 *
 * THE SOFTWARE IS PROVIDED “AS IS” AND ERIK DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL ERIK BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT
 * OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

import express from "express";
import { mkdir, readdir } from "node:fs/promises";
import { Dirent } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { exec } from "node:child_process";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = express();

// server settings
const port = 6330;

// 0 for silent
// 1 for normal
// 2 for verbose
// 3 for debug--shows complete error contents
const verbosity = 2; // logged to console

// timeout to abort overly-broad photo searches (0 for no timeout)
const get_photo_id_timeout_seconds = 3;

// external commands
const bin_directory = path.join(__dirname, "bin");
const bin_get_id = path.join(bin_directory, "get-photo-id");
const bin_export_photos = path.join(
  bin_directory,
  "export-photos-by-id"
);

// stock images to return on errors
const assets_directory = path.join(__dirname, "assets");
const error_filenames: { [key: string]: string } = {
  404: path.join(assets_directory, "broken-image.svg"),
  500: path.join(assets_directory, "sad-mac.svg"),
};

// identifies the server's temporary directories
const tmp_dir_root = tmpdir();
const tmp_dir_prefix = "photos-server_item_";

// main
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

server.get("/:q", (req: express.Request, res: express.Response) => {
  log(); // blank line to hightlight a new request
  return get_query(req.params.q)
    .then(validate_query)
    .then(get_photo_id)
    .then(get_photo_file)
    .then((filename: string) => respond_with_photo(res, filename))
    .catch((error: { message: string; cause?: any }) =>
      respond_with_error(res, error)
    );
});

// url_path -> id  (or throw 404: invalid URI
async function get_query(q: string): Promise<string> {
  return q;
  // try {
  //   return decodeURI(url_path).slice(1);
  // } catch (e) {
  //   log("error", e, 2);
  //   throw http_error(404, `Poorly-formatted path: ${url_path}`, e);
  // }
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
    bin_get_id,
    "--timeout",
    get_photo_id_timeout_seconds,
    query,
  ])
    .catch((e) => {
      log("error", e, 2);
      throw http_error(500, "ID search timed out", e);
    })
    .then((id) => {
      log("photo id", id);
      if (!id) throw http_error(404, "ID not found");
      return id;
    });
}

// id -> filename  (or throw 500: export failed)
async function get_photo_file(id: string): Promise<string> {
  const directory = path.join(tmp_dir_root, tmp_dir_prefix + id);
  return a_file_in(directory).catch(() =>
    mkdir(directory, { recursive: true })
      .then(() => {
        log("exporting to", directory, 1);
        return call([bin_export_photos, id, directory]);
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

// filename, [status] -> Response object
function respond_with_photo(
  res: express.Response,
  absolute_filename: string,
  status = 200
): void {
  const basename = path.basename(absolute_filename);
  log("sending", basename);
  res.status(status).sendFile(absolute_filename);
}

// { message, cause } -> Response object
// the message is expected to be an HTTP status code
function respond_with_error(
  res: express.Response,
  error: {
    message: string;
    cause?: any;
  }
): void {
  if (!error.message?.match(/^[45][0-9][0-9]$/)) {
    error = http_error(500, "Unknown error", { cause: error });
    log("error", error, 2);
  }
  log(
    "http error",
    error.message + ": " + (error.cause?.message || error.cause)
  );
  const status = Number(error.message);
  return respond_with_photo(
    res,
    error_filenames[error.message],
    status
  );
}

// directory -> filename  ( or throw { message, path } )
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

// a promise wrapping a call to exec with quoted arguments
// [command, args...], options -> stdout from command (or throw some error)
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

// wrap the text in 's after replacing all instances of ' with '"'"'
// raw text -> quoted text
function quoted(text: string) {
  return "'" + String(text).replaceAll("'", "'\"'\"'") + "'";
}

// create a new custom error object
// note that an Error object may be passed as a cause
// status, cause, [error] -> error where message is an HTTP status code
function http_error(status: number, cause: any, error?: any) {
  return new Error(String(status), {
    cause: error ? new Error(cause, { cause: error }) : cause,
  });
}

// verbosity-dependent logging to console
// message, obj, level -> void  (and writes to stderr)
function log(message: string = "", obj: any = "", level: number = 0) {
  // const prefix = "[" + new Date().toISOString() + "]  ";
  if (level >= verbosity) return;
  const prefix = "";
  console.log(
    message ? prefix + message.toUpperCase().padStart(14) : "",
    obj
      ? JSON.stringify(obj, Object.getOwnPropertyNames(obj), "  ")
      : ""
  );
}
