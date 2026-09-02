import { genUploader } from "./extension/shared/uploadthing-client.js";
const uploader = genUploader({ url: "http://localhost:3001/api/uploadthing", package: "web-ui" });
console.log(Object.keys(uploader));
