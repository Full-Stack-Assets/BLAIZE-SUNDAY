import { PrismaReleaseRepository, ReleaseCommandService } from "@songforge/release";

export function createReleaseCommandService() {
  return new ReleaseCommandService(new PrismaReleaseRepository());
}
