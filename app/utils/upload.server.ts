import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: File): Promise<UploadApiResponse> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "airbnb-clone", resource_type: "image" },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (result) resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
}

export async function uploadVideo(file: File): Promise<UploadApiResponse> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "airbnb-clone/videos", resource_type: "video" },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (result) resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
}
