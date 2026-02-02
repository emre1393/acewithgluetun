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