import {WebSocket} from "ws";
Object.assign(global, {WebSocket});
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
import 'dotenv/config';

let currentMedia = null;
let zeroCount = 0;

let printTimeout = null;

console.log('Inbtiating matrix');
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
console.log('Matrix initiated');

function printState() {
    console.log(currentMedia);
    if (printTimeout) clearTimeout(printTimeout);
    printTimeout = setTimeout(() => {
        printState();
    }, 10000);
}

console.log('Connecting to Home Assistant');
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
                    showImage(currentMedia.image);
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
console.log('Connected to Home Assistant');

async function showImage(url) {
    console.log('showing image', url);
    fetch(url)
        .then(async response => sharp(await buffer(response.body)).resize(64, 64).jpeg({quality: 100}).toBuffer())
        .then(image => getPixels(image, "image/jpeg", (err, pixels) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log('writing to matrix');
            matrix.clear();
            let imageBuffer = Buffer.alloc(64 * 64 * 3);
            for (let i = 0; i < 64; i++) {
                for (let j = 0; j < 64; j++) {
                    matrix.fgColor({r: pixels.get(i, j, 0), g: pixels.get(i, j, 1), b: pixels.get(i, j, 2)}).setPixel(i, j);
                }
            }
            matrix.drawBuffer(imageBuffer);
            console.log('done');
        }));
}
