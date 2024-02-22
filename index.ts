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

import { serve } from "bun";
import { mkdir, readdir } from "node:fs/promises";
import { Dirent } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { exec } from "node:child_process";
import { app as osa_app } from "nodeautomation";

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

const mediaitem_filename_filter = new RegExp(
  "\\.(jpeg|jpg|heic)$",
  "i"
);

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
  return Promise.race([
    jxa_get_uuid(query),
    new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        reject(http_error(500, "Search timed out"));
      }, get_photo_id_timeout_seconds * 1000);
    }),
  ]);
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

// { message, cause } -> Response object
// the message is expected to be an HTTP status code
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

// node-JXA functions

// timeout handled elsewhere
async function jxa_get_uuid(query: string): Promise<string> {
  const photos = osa_app("Photos");
  if (looks_like_uuid(query)) {
    const media_item = photos.mediaItems.byId(query);
    return media_item.id();
  } else {
    const matching_ids = photos
      .search({ for: query })
      .filter((item: any) =>
        item.filename().match(mediaitem_filename_filter)
      )
      .map((item: any) => item.id());
    if (!matching_ids.length) throw new Error("No matches.");
    return random_member_of(matching_ids);
  }
}

// allows for garbage following uuid
function looks_like_uuid(possible_uuid) {
  return RegExp(
    "^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}",
    "i"
  ).test(possible_uuid);
}

function random_member_of(an_array) {
  return an_array[Math.floor(Math.random() * an_array.length)];
}
