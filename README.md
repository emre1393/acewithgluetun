# AceStream HTTP Proxy + Gluetun P2P port forwarding

Gluetun will create a vpn network and provide forwared port info via its api.
Then entrypoint.sh will use this api to run acestream with --port $port argument
In theory, you can also seed the stream while behind an ISP cgnat connection that doesn't let you receive incoming requests.


Forked [martinbjeldbak/acestream-http-proxy](https://github.com/martinbjeldbak/acestream-http-proxy) and edited Dockerfile and entrypoint.sh files.
Also replaced docker-compose.yml file with gluetun + acestream:gluetun (it was for qbittorrent)

Acestream Docker image runs the AceStream Engine and exposes its [HTTP API](https://docs.acestream.net/en/developers/connect-to-engine/).

As a result, you will be able to watch AceStreams over HLS or MPEG-TS, without
needing to install the AceStream player or any other dependencies locally.


## Usage


Ensure you have [Docker](https://www.docker.com) installed and running. 

Download this repo.

```console
git clone https://github.com/emre1393/acewithgluetun.git
cd acewithgluetun
```

Build the image.

```console
docker build --no-cache -t acestream-http-proxy:gluetun .
```

Edit variables in gluetun.env file and save as .env in the same folder. Then deploy the stack.

```console
docker compose up -d
```

You are then able to access AceStreams by pointing your favorite media player
(VLC, IINA, etc.) to either of the below URLs, depending on the desired
streaming protocol. Also you can watch content from other devices if you use lan ip of the server.

For HLS:
```console
http://127.0.0.1:6878/ace/manifest.m3u8?id=dd1e67078381739d14beca697356ab76d49d1a2
```

For MPEG-TS:

```console
http://127.0.0.1:6878/ace/getstream?id=dd1e67078381739d14beca697356ab76d49d1a2
```

where `dd1e67078381739d14beca697356ab76d49d1a2d` is the ID of the AceStream channel.


# It also comes with a Web Player

A modern, responsive web player for streaming HLS content with real-time stream status monitoring. Written by Copilot in VSCode.

```console
http://127.0.0.1:6878/webui/webplayer/index.html
```

<img width="1232" height="1250" alt="image" src="https://github.com/user-attachments/assets/2e11a0ce-f888-46cf-8a09-71f3408b06a9" />




## Features

- **Simple Stream Input**: Enter a stream ID to start playing
- **HLS Streaming**: Built-in HLS.js support
- **Real-time Status**: Monitor stream statistics via hover tooltip
  - Current status (downloading, streaming, etc.)
  - Download/Upload speeds
  - Connected peers
  - Data transferred
- **Modern UI**: Clean, dark-themed interface with smooth animations
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Error Handling**: User-friendly error messages

## Getting Started

### Prerequisites

- A local acestream server running on `http://localhost:6878` 

### Installation

1. No installation needed! This is a static HTML/CSS/JavaScript application.

### Usage

1. Open `http://localhost:6878/webui/webplayer/index.html` in your web browser
2. Enter a stream ID in the input field
3. Click "Play" button (or press Enter)
4. Stream will load and play automatically
5. Hover over the status icon (clock) in the player controls to view real-time statistics

## API Endpoints

### Get Stream Manifest

```
GET /ace/manifest.m3u8?id={streamId}&format=json
```

**Response:**
```json
{
  "response": {
    "infohash": "string",
    "playback_session_id": "string",
    "playback_url": "http://..../stream.m3u8",
    "stat_url": "http://..../stat/sessionId",
    "command_url": "http://..../cmd/sessionId",
    "is_live": 1,
    "is_encrypted": 0,
    "client_session_id": -1
  },
  "error": null
}
```

### Get Stream Status

```
GET /ace/stat/{sessionId}
```

**Response:**
```json
{
  "response": {
    "status": "dl|uploading|idle|streaming|paused",
    "total_progress": 0.0,
    "speed_down": 123456,
    "speed_up": 123,
    "peers": 123,
    "downloaded": 123456,
    "uploaded": 0
  },
  "error": null
}
```

## Architecture

- **index.html** - Main HTML structure with player and controls
- **styles.css** - Modern dark theme with animations and responsive layout
- **app.js** - Application logic including:
  - Stream manifest fetching
  - HLS.js integration
  - Real-time status polling
  - Error handling and UI state management

## Browser Support

- Chrome/Edge 60+
- Firefox 55+
- Safari 12+

## Security Notes

- Uses HLS.js for streaming - supports most video codecs
- CORS requests to localhost server
- No authentication layer (add as needed)
- Stream URLs are exposed in browser (consider HTTPS in production)

## Customization

### Change Update Interval

Modify `STAT_UPDATE_INTERVAL` in `app.js` (default: 1000ms)

### Change API Base URL

Modify `API_BASE` in `app.js` (default: `http://localhost:6878`)

### Customize Colors

Edit CSS variables in `styles.css`:
```css
:root {
    --primary-color: #6366f1;
    --bg-primary: #0f172a;
    --text-primary: #f1f5f9;
    /* ... etc */
}
```

## Troubleshooting

### "Stream failed to load"
- Check that the streaming server is running on localhost:6878
- Verify the stream ID is correct
- Check browser console for CORS errors

### No audio/video
- Verify the playback URL is returning valid HLS stream
- Check HLS.js console messages
- Try a different stream if available

### Status not updating
- Check that the stat_url endpoint is responding
- Verify session ID is valid
- Check network tab for failed requests



## Contributing

First of all, thanks!

Ensure you have Docker installed with support for docker-compose, as outlined
above. This image is simply a simplified wrapper around the
[AceStream][acestream] HTTP API in order to make it more user friendly to get
running. All options supported by the AceStream Engine are supported in this
project. Any contributions to support more configuration is greatly
appreciated!

Dockerfile steps are roughly guided by <https://wiki.acestream.media/Install_Ubuntu>.

For a list of AceStream versions, see here: <https://docs.acestream.net/products/#linux>


[acestream]: https://docs.acestream.net/en/developers/
https://github.com/martinbjeldbak/acestream-http-proxy
