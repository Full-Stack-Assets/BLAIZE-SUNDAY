import { execFile } from "node:child_process";
import {
  FfprobeInspector,
  type ExecFileLike,
  type TechnicalInspector
} from "@songforge/video";

const nodeExecFile: ExecFileLike = (file, args) =>
  new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
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
  return new FfprobeInspector(executor);
}
