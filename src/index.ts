import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { Writable } from "node:stream";

import type { NetlifyPlugin } from "@netlify/build";

const EMSDK_VERSION = "6.0.9";

// https://github.com/emscripten-core/setup-emsdk/blob/0822153d7a5488b70a269cfa0a631b2a86ab4da2/src/matchers.ts#L2
const ENV_REGEX = /(\S+)=(.+);/;

type PluginInputs = {};

const plugin = {
  onPreBuild: async ({ utils, netlifyConfig }): Promise<void> => {
    const response = await fetch(
      `https://github.com/emscripten-core/emsdk/archive/${EMSDK_VERSION}.tar.gz`,
    );

    if (!response.ok || response.body === null) {
      utils.build.failBuild("Could not fetch Emscripten");
    }

    await response.body!.pipeTo(
      Writable.toWeb(createWriteStream(`/tmp/.emsdk.tar.gz`)),
    );

    const emsdkFolder = "/opt/buildhome/.emsdk";
    await mkdir(emsdkFolder, { recursive: true });
    await utils.run("tar", [
      "--extract",
      "--file",
      "/tmp/.emsdk.tar.gz",
      "--directory",
      emsdkFolder,
      "--strip-components=1",
    ]);

    netlifyConfig.build.environment["EMSDK"] = emsdkFolder;

    await utils.run(`${emsdkFolder}/emsdk`, ["update"]);
    await utils.run(`${emsdkFolder}/emsdk`, ["install", EMSDK_VERSION]);
    await utils.run(`${emsdkFolder}/emsdk`, ["activate", EMSDK_VERSION]);

    const env = await utils.run(`${emsdkFolder}/emsdk`, ["construct_env"]);
    if (env.stdout === "") {
      utils.build.failBuild("Somehow, an env was unable to be constructed");
    }

    env.stdout.split("\n").map((line) => {
      const envResult = ENV_REGEX.exec(line);
      if (envResult !== null) {
        netlifyConfig.build.environment[envResult[1]!] = envResult[2];
      }
    });
  },
} satisfies NetlifyPlugin<PluginInputs>;

export default plugin;
