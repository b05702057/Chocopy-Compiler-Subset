export NODE_OPTIONS=--openssl-legacy-provider
rm *.js
rm tests/*.js
npm test
cp ./backupfiles/webpack.config.js  ./
