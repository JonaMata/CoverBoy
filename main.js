import {
    Font,
    GpioMapping,
    HorizontalAlignment,
    LayoutUtils,
    LedMatrix,
    LedMatrixUtils,
    PixelMapperType, VerticalAlignment
} from 'rpi-led-matrix';
import {
    createConnection,
    subscribeEntities,
    createLongLivedTokenAuth,
} from "home-assistant-js-websocket";
import getPixels from "get-pixels";
import sharp from "sharp";
import { buffer } from "node:stream/consumers";

let currentMedia = null;
let zeroCount = 0;

let printTimeout = null;

const matrix = new LedMatrix(
    {
        ...LedMatrix.defaultMatrixOptions(),
        rows: 64,
        cols: 64,
        chainLength: 1,
        hardwareMapping: GpioMapping.Regular,
        pixelMapperConfig: LedMatrixUtils.encodeMappers({
            type: PixelMapperType.ChainLink
        })
    },
    {
        ...LedMatrix.defaultRuntimeOptions(),
        gpioSlowdown: 4,
    }
);

function printState() {
    console.log(currentMedia);
    if (printTimeout) clearTimeout(printTimeout);
    printTimeout = setTimeout(() => {
        printState();
    }, 10000);
}

(async () => {
    const auth = createLongLivedTokenAuth(
        process.env.HASS_URL,
        process.env.ACCESS_TOKEN,
    );

    const connection = await createConnection({auth});
    subscribeEntities(connection, (entities) => {
        for (let device of Object.values(entities)) {
            if (device.entity_id.startsWith("media_player.") && device.state === "playing" && device.attributes.media_content_type === "music") {
                let image = device.attributes.entity_picture;
                if (image && image.startsWith("/")) image = process.env.HASS_URL + image;
                let media = {
                    title: device.attributes.media_title,
                    artist: device.attributes.media_artist,
                    album: device.attributes.media_album_name,
                    image: image,
                }
                if (JSON.stringify(media) !== JSON.stringify(currentMedia)) {
                    currentMedia = media;
                    saveImage(currentMedia.image);
                    printState();
                }
                zeroCount = 0;
                return;
            }
        }
        if (currentMedia) {
            zeroCount++;
            if (zeroCount > 10) {
                currentMedia = null;
                zeroCount = 0;
                printState();
            }
        }
    });
})();

async function showImage(url) {
    fetch(url)
        .then(async response => sharp(await buffer(response.body)).resize(64, 64).jpeg({quality: 100}).toBuffer())
        .then(image => getPixels(image, "image/jpeg", (err, pixels) => {
            if (err) {
                console.error(err);
                return;
            }
            matrix.clear();
            let imageBuffer = Buffer.alloc(64 * 64 * 3);
            for (let i = 0; i < 64; i++) {
                for (let j = 0; j < 64; j++) {
                    imageBuffer[j * 64 * 3 + i * 3] = pixels.get(i, j, 0);
                    imageBuffer[j * 64 * 3 + i * 3 + 1] = pixels.get(i, j, 1);
                    imageBuffer[j * 64 * 3 + i * 3 + 2] = pixels.get(i, j, 2);
                    console.log(pixels.get(i, j, 0), pixels.get(i, j, 1), pixels.get(i, j, 2));
                }
            }
            matrix.drawBuffer(imageBuffer);
        }));
}
