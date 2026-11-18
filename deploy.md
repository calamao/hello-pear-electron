Executed all these commands successfuly, not sure if it was enough

```terminal
pear seed pear://x7cu7u88j6riqkr1in6fcwubo5bx6dztg65sebmzhje4h98x3dqy


pear build --package ./hello-pear-electron/package.json --target ./deploy-out/my-app-1.0.0

cp "./hello-pear-electron/out/make/HelloPear-Electron-1.0.0-x64.AppImage" \
   "./hello-pear-electron/out/make/HelloPear-Electron.AppImage"


pear build \
  --package ./hello-pear-electron/package.json \
  --linux-x64-app ./hello-pear-electron/out/make/HelloPear-Electron.AppImage
  

  pear stage --dry-run pear://x7cu7u88j6riqkr1in6fcwubo5bx6dztg65sebmzhje4h98x3dqy ./hello-jorge-pear-electron-1.0.0
  
  pear stage pear://x7cu7u88j6riqkr1in6fcwubo5bx6dztg65sebmzhje4h98x3dqy ./hello-jorge-pear-electron-1.0.0

```