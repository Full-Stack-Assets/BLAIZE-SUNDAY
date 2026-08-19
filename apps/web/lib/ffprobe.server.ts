import { execFile } from "node:child_process";
import {
  FfprobeInspector,
  type ExecFileLike,
  type TechnicalInspector
} from "@songforge/video";

const DEFAULT_ALLOWED_HOSTS = new Set(["sider-pub.s3.amazonaws.com"]);

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

function allowedFfprobeHosts(): Set<string> {
  const configured = (process.env.VIDEO_FFPROBE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...configured]);
}

function assertAllowedFfprobeInput(input: string): void {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("FFPROBE_INPUT_NOT_ALLOWED");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !allowedFfprobeHosts().has(url.hostname.toLowerCase())
  ) {
    throw new Error("FFPROBE_INPUT_NOT_ALLOWED");
  }
}

export function createNodeFfprobeInspector(
  executor: ExecFileLike = nodeExecFile
): TechnicalInspector {
  const inspector = new FfprobeInspector(executor);
  return {
    async inspect(input: string) {
      assertAllowedFfprobeInput(input);
      return inspector.inspect(input);
    }
  };
}
