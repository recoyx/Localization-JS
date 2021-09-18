export default function loader(resPath) {
    return new Promise((_, reject) => {
        reject(new Error(`Failed to load resource at ${resPath}`));
    });
}