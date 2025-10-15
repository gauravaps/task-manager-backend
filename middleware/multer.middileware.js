import multer from 'multer';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/temp'); // Directory where files will be stored
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // File name as it is
    },
});

const allowedMimeTypes = [
    "image/jpeg",  
    "image/png",   
    "image/jpg",   
    "image/gif",   
    "image/webp",  
    "image/bmp",   
    "image/svg+xml" 
];

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Accept file
    } else {
        cb(new Error('Only image files are allowed! PDF files are not accepted.'), false); // Reject file
    }
};

const upload = multer({ storage ,
    fileFilter ,
    limits:{ fileSize: 5 * 1024 * 1024 } ,});


export default upload;