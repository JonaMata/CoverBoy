# CoverBoy

Show off the amazing album covers of whatever you're playing using a Raspberry Pi and a LED matrix.
CoverBoy uses the HomeAssistant WebSocket API to retrieve the album cover of the currently playing media and displays it on your LED matrix.

## Setup
Simply run `npm install` in the project directory to install all dependencies.
Create a `.env` file in the project directory and add the following environment variables:
```env
HASS_URL=http://homeassistant.local:8123
ACCESS_TOKEN=your_access_token
```
Replace `http://homeassistant.local:8123` with the URL of your HomeAssistant instance and `your_access_token` with a long live access token (create one on the profile page of your HomeAssistant user.

## Usage
Run `sudo npm start` to start the application. If any media is playing the album cover will be automatically displayed on the LED matrix.

## Run at boot
If you want CoverBoy to automatically start when your Raspberry Pi boots up you can use [pm2](https://pm2.keymetrics.io/). Install pm2 using `sudo npm install -g pm2` and then run `sudo pm2 startup` to set up the startup script. After that you can start CoverBoy using `sudo pm2 start index.js --name CoverBoy` and save the current process list using `sudo pm2 save`.

## Troubleshooting
The LED matrix library requires the soundcard on your Raspberry Pi to be turned off. To do this add `dtparam=audio=off` to your `/boot/config.txt` and reboot your Raspberry Pi.