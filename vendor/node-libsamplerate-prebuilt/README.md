# node-libsamplerate prebuilt

This package is vendored to avoid long native rebuilds during `npm i` / `npm ci`.

Source upstream: `git+https://github.com/Ebycow/node-libsamplerate.git#b2f38f6`

## Update procedure
1. Rebuild `D:\Projects\NewHanako\node-libsamplerate`.
2. Copy `build/Release/node-libsamplerate.node` to this package.
3. If upstream `index.js` changed, copy it as well.
