import { api } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";
import { compressImage, IMAGE_COMPRESSION } from "@/lib/utils/compress-image";

interface ProfilePhotoResponse {
  data: {
    profile_picture_url: string | null;
  };
}

/** Upload a cropped conductor avatar and return its authoritative public URL. */
export async function uploadConductorProfilePhoto(photo: File): Promise<string | null> {
  const body = new FormData();
  body.set("photo", await compressImage(photo, IMAGE_COMPRESSION.avatar));
  const response = await api.postForm<ProfilePhotoResponse>(CONDUCTOR_API.profilePhoto, body);
  return response.data.profile_picture_url ?? null;
}
