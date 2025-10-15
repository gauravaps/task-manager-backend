import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();



cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key:process.env.CLOUD_API_KEY, 
    api_secret:process.env.CLOUD_API_SECRET,
  });
  
  const uploadonCloudinary = async (localFilepath, folderName = "zentronix") => {
  try {
    if (!localFilepath) return null;

    const response = await cloudinary.uploader.upload(localFilepath, {
      folder: folderName,
      resource_type: "auto",
    });

    

    if (fs.existsSync(localFilepath)) {
      fs.unlinkSync(localFilepath); 
    }
    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    if (fs.existsSync(localFilepath)) {
      fs.unlinkSync(localFilepath);
    }
    return null;
  }
};



export default uploadonCloudinary;