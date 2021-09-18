import * as fs from 'fs';

export default function load(resPath) {
    return new Promise((resolve, reject) => {
        fs.readFile(resPath, 'utf8', function(error, data) {
            if (!error)
                resolve(JSON.parse(data));
            else reject(new Error(`Failed to load resource at ${resPath}`));
        });
    });
}