const { genUploader } = require("uploadthing/client");
const fs = require('fs');

async function test() {
  const { uploadFiles } = genUploader({
    url: "https://api.antcapture.anttake.com/api/uploadthing",
    package: "antcapture-extension"
  });

  const file = new File(["test data inside"], "test.txt", { type: "text/plain" });

  try {
    const res = await uploadFiles("media", {
      files: [file],
      input: {
        title: "test capture",
        type: "video",
        mimeType: "text/plain",
        hasAudio: false,
        sizeBytes: 15
      },
      headers: {
        "Authorization": "Bearer TEST_TOKEN"
      }
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

test();
