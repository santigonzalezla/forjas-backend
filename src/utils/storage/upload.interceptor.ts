import {FileInterceptor} from '@nestjs/platform-express';
import {memoryStorage} from 'multer';

// El archivo queda en memoria para procesarlo con sharp antes de subirlo
export const buildUploadInterceptor = (maxBytes: number) =>
    FileInterceptor('file', {storage: memoryStorage(), limits: {fileSize: maxBytes, files: 1}});
