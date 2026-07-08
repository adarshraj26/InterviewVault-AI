import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";

const f = createUploadthing();

/**
 * InterviewVault UploadThing file router.
 * Add new route definitions here as needed.
 */
export const ourFileRouter = {
  /**
   * Profile image upload:
   * - Authenticated users only
   * - Accepts PNG, JPG, JPEG, WEBP
   * - Max 4 MB
   */
  profileImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Return the file URL so the client can save it to the DB
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
