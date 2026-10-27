# Media Components

- Local JavaScript wrapper: @ffmpeg/ffmpeg0.12.15, MIT, unmodified dist/esm files.
- Source and build recipes: https://github.com/ffmpegwasm/ffmpeg.wasm . NPM lockfile records exact tarball integrity.
- Optional single-thread core: @ffmpeg/core0.12.10, GPL-2.0-or-later. Not bundled or mirrored in this site. After explicit consent, the browser downloads the unmodified official NPM distribution through jsDelivr; expected size and SHA256 are pinned in manifest.json. No media bytes are sent to that CDN. Download failure or checksum mismatch stops processing.
- Official core distribution: https://www.npmjs.com/package/@ffmpeg/core/v/0.12.10 . Official usage/build documentation: https://ffmpegwasm.netlify.app/docs/overview/ . License: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html . FFmpeg sources/build and codec notices are provided by the upstream distribution.
- This site does not install system FFmpeg or change cross-origin isolation. PNG/JPEG/static-WebP editing uses native browser Canvas without downloading the optional core.
