import { execFile } from "node:child_process";
import {
  FfprobeInspector,
  type ExecFileLike,
  type TechnicalInspector
} from "@songforge/video";
import { isTrustedVideoMediaUrl } from "./video-media-url";

const nodeExecFile: ExecFileLike = (file, args) =>
  new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        timeout: 15_000
      },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout: String(stdout) });
      }
    );
  });

export function createNodeFfprobeInspector(
  executor: ExecFileLike = nodeExecFile
): TechnicalInspector {
  const inspector = new FfprobeInspector(executor);
  return {
    async inspect(input: string) {
      if (!isTrustedVideoMediaUrl(input)) {
        throw new Error("FFPROBE_INPUT_NOT_ALLOWED");
      }
      return inspector.inspect(input);
    }
  };
}
