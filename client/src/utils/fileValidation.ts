import type {Accept, FileRejection} from 'react-dropzone';

export const ACCEPTED_FILE_TYPES: Accept = {
    'image/tiff': ['.tiff', '.tif'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpeg', '.jpg'],
};

export const ALLOWED_MIME_TYPES = ['image/tiff', 'image/png', 'image/jpeg'];

export function isAllowedFileType(file: File): boolean {
    return ALLOWED_MIME_TYPES.includes(file.type);
}

export function formatRejectionReasons(rejectedFiles: FileRejection[]): string {
    return rejectedFiles
        .map((rejection) =>
            rejection.errors
                .map((err) => {
                    if (err.code === 'file-invalid-type') {
                        return `${rejection.file.name}: unsupported type`;
                }
                return `${rejection.file.name}: ${err.message}`;
            })
            .join(', ')
        )
        .join('; ');
}